package com.codestream.extensions

import com.codestream.agentService
import com.codestream.editor.InlineTextFieldManager
import com.codestream.editorService
import com.codestream.protocols.webview.EditorMargins
import com.codestream.protocols.webview.EditorSelection
import com.codestream.review.DIFF_RANGES
import com.codestream.review.PULL_REQUEST
import com.codestream.review.ReviewDiffVirtualFile
import com.google.gson.JsonElement
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.LogicalPosition
import com.intellij.openapi.editor.markup.TextAttributes
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.impl.EditorWindowHolder
import com.intellij.openapi.util.text.StringUtil
import com.intellij.ui.ColorUtil
import com.intellij.ui.tabs.impl.JBTabsImpl
import com.intellij.util.DocumentUtil
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range
import java.awt.Container
import java.awt.Font
import java.awt.Point
import java.util.concurrent.CompletableFuture

val Editor.displayPath: String?
    get() = FileDocumentManager.getInstance().getFile(document)?.name

fun Editor.getOffset(position: Position): Int {
    val line = position.line
    if (document.lineCount == 0) return 0
    if (line >= document.lineCount) {
        return document.getLineEndOffset(document.lineCount - 1)
    }
    val lineText = document.getText(DocumentUtil.getLineTextRange(document, line))
    val endIndex = Math.min(lineText.length, position.character)
    val lineTextForPosition = lineText.substring(0, endIndex)
    val tabs = StringUtil.countChars(lineTextForPosition, '\t')
    val tabSize = settings.getTabSize(project)
    val column = tabs * tabSize + lineTextForPosition.length - tabs
    val offset = logicalPositionToOffset(LogicalPosition(line, column))
    if (position.character >= lineText.length) {
        // println("LSPPOS outofbounds : $pos line : $lineText column : $column offset : $offset")
    }
    val docLength = document.textLength
    if (offset > docLength) {
        println("Offset greater than text length : $offset > $docLength")
    }
    return offset.coerceIn(0, docLength)
}

val Editor.margins: EditorMargins
    get() {
        var withTabHeaders = this.component as Container?
        while (withTabHeaders != null && withTabHeaders !is JBTabsImpl) {
            withTabHeaders = withTabHeaders.parent
        }

        var withBreadcrumbs = this.component as Container?
        while (withBreadcrumbs != null && withBreadcrumbs !is EditorWindowHolder) {
            withBreadcrumbs = withBreadcrumbs.parent
        }

        val height = this.component.height
        val heightWithBreadcrumbs = withBreadcrumbs?.height ?: height
        val heightWithTabHeaders = withTabHeaders?.height ?: height
        val tabRowHeight = ((withTabHeaders as? JBTabsImpl)?.myInfo2Label?.values?.firstOrNull()?.height ?: 27) + 1

        var bottom: Int
        var top: Int
        if (this.document.file is ReviewDiffVirtualFile) {
            top = (heightWithTabHeaders - tabRowHeight - height).coerceAtLeast(0)
            bottom = 0
        } else {
            top = (heightWithTabHeaders - heightWithBreadcrumbs - tabRowHeight).coerceAtLeast(0)
            bottom = (heightWithBreadcrumbs - height).coerceAtLeast(0)
        }

        return EditorMargins(top, 0, bottom, 0)
    }

val Editor.selections: List<EditorSelection>
    get() {
        return listOf(
            EditorSelection(
                document.lspPosition(selectionModel.selectionStart),
                document.lspPosition(selectionModel.selectionEnd),
                document.lspPosition(caretModel.offset)
            )
        )
    }

val Editor.highlightTextAttributes: TextAttributes
    get() {
        val bg = colorsScheme.defaultBackground
        val highlight =
            if (ColorUtil.isDark(bg)) bg.lighten(7)
            else bg.darken(7)
        return TextAttributes(
            null,
            highlight,
            null,
            null,
            Font.PLAIN
        )
    }

val Editor.selectionOrCurrentLine: Range
    get() = if (selectionModel.hasSelection()) {
        Range(document.lspPosition(selectionModel.selectionStart), document.lspPosition(selectionModel.selectionEnd))
    } else {
        val logicalPos = caretModel.currentCaret.logicalPosition
        val startOffset = logicalPositionToOffset(LogicalPosition(logicalPos.line, 0))
        val endOffset = logicalPositionToOffset(LogicalPosition(logicalPos.line, Int.MAX_VALUE))
        Range(document.lspPosition(startOffset), document.lspPosition(endOffset))
    }

val Editor.visibleRanges: List<Range>
    get() {
        val visibleArea = scrollingModel.visibleArea

        val viewportStartPoint = visibleArea.location
        val startLogicalPos = xyToLogicalPosition(viewportStartPoint)
        val startOffset = logicalPositionToOffset(startLogicalPos)
        val startLspPos = document.lspPosition(startOffset)

        val viewportEndPoint = Point(
            visibleArea.location.x + visibleArea.width,
            visibleArea.location.y + visibleArea.height
        )
        val endLogicalPos = xyToLogicalPosition(viewportEndPoint)

        // getOffset will coerce it within document length
        val endLspPos = document.lspPosition(getOffset(Position(endLogicalPos.line, endLogicalPos.column)))

        val fullRange = Range(
            startLspPos,
            endLspPos
        )

        val ranges = mutableListOf<Range>()
        var range = Range(fullRange.start, fullRange.end)

        val collapsedRegions = foldingModel.allFoldRegions.filter { !it.isExpanded }
        for (collapsed in collapsedRegions) {
            if (collapsed.end < fullRange.start) {
                continue
            }
            if (collapsed.start > fullRange.end) {
                break
            }

            val previousExpandedOffset = getOffset(collapsed.start) - 1
            val nextExpandedOffset = (getOffset(collapsed.end) + 1).coerceAtMost(document.textLength)
            if (previousExpandedOffset >= 0) {
                range.end = document.lspPosition(previousExpandedOffset)
                if (range.start < range.end) {
                    ranges += range
                }

                range = Range()
                range.start = document.lspPosition(nextExpandedOffset)
                range.end = fullRange.end
            } else {
                ranges += Range(range.start, range.start)
                range.start = document.lspPosition(nextExpandedOffset)
            }
        }

        ranges += range

        return ranges
    }

fun Editor.isRangeVisible(range: Range): Boolean {
    val ranges = this.visibleRanges
    val firstRange = ranges.first()
    val lastRange = ranges.last()
    return range.start.line >= firstRange.start.line && range.end.line <= lastRange.end.line
}

val Editor.inlineTextFieldManager: InlineTextFieldManager?
    get() = this.project?.editorService?.getInlineTextFieldManager(this)

fun Editor.isSelectionWithinDiffRange(): Boolean {
    val diffRanges = document.getUserData(DIFF_RANGES) ?: return false
    val selection = selectionOrCurrentLine

    val selectionStart = selection.start.line + 1
    val selectionEnd = selection.end.line + 1

    diffRanges.forEach {
        if (it.end >= it.start) {
            if ((it.start <= selectionStart && selectionStart <= it.end) ||
                (it.start <= selectionEnd && selectionEnd <= it.end) ||
                (selectionStart <= it.start && it.end <= selectionEnd)) {
                return true
            }
        }
    }
    return false
}

val Editor.isGitLab: Boolean
    get() {
        val pullRequest = document.getUserData(PULL_REQUEST)
        return pullRequest?.providerId?.lowercase()?.contains("gitlab") == true
    }


val Editor.addSingleCommentText
    get() = if (isGitLab) "Add comment now" else "Add single comment"

val Editor.addCommentToReviewText: String
    get() = "Add comment to review"

val Editor.startReviewText: String
    get() = "Start a review"

suspend fun Editor.getDefaultPrCommentText(): String? {
    val textFuture = CompletableFuture<String>()
    ApplicationManager.getApplication().invokeLater {
        val isSelectionWithinDiffRange = isSelectionWithinDiffRange()
        GlobalScope.launch {
            val text = when {
                isPullRequest() -> {
                    if (isSelectionWithinDiffRange) {
                        if (hasPendingPullRequestReview()) {
                            addCommentToReviewText
                        } else {
                            startReviewText
                        }
                    } else {
                        addSingleCommentText
                    }
                }
                else -> {
                    null
                }
            }
            textFuture.complete(text)
        }
    }
    return textFuture.await()
}

suspend fun Editor.getPullRequestReviewId(): JsonElement? {
    val agent = project?.agentService ?: return null
    val pullRequest = document.getUserData(PULL_REQUEST) ?: return null
    return agent.getPullRequestReviewId(pullRequest.id, pullRequest.providerId)
}

suspend fun Editor.hasPendingPullRequestReview(): Boolean {
    val reviewId = getPullRequestReviewId()
    // GH returns a string ID or null. GL returns true or false.
    return !(reviewId == null || reviewId.isJsonNull || (reviewId.isJsonPrimitive && reviewId.asJsonPrimitive.isBoolean && !reviewId.asBoolean))
}

fun Editor.isPullRequest(): Boolean {
    return document.getUserData(PULL_REQUEST) != null
}
