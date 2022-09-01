package com.codestream.editor

import com.codestream.actions.AddComment
import com.codestream.actions.CreateIssue
import com.codestream.actions.GetPermalink
import com.codestream.actions.NewCodemark
import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.extensions.addCommentToReviewText
import com.codestream.extensions.addSingleCommentText
import com.codestream.extensions.file
import com.codestream.extensions.hasPendingPullRequestReview
import com.codestream.extensions.inlineTextFieldManager
import com.codestream.extensions.isSelectionWithinDiffRange
import com.codestream.extensions.selectionOrCurrentLine
import com.codestream.extensions.startReviewText
import com.codestream.extensions.uri
import com.codestream.protocols.CodemarkType
import com.codestream.protocols.webview.CodemarkNotifications
import com.codestream.review.PULL_REQUEST
import com.codestream.review.ReviewDiffVirtualFile
import com.codestream.settingsService
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.ActionGroup
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.markup.GutterDraggableObject
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.vfs.VirtualFile
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.awt.Cursor
import java.awt.dnd.DragSource
import java.util.concurrent.CompletableFuture
import javax.swing.Icon

val ICON = IconLoader.getIcon("/images/marker-add-comment-green.svg")

class NewCodemarkGutterIconRenderer(
    val editor: Editor,
    var line: Int,
    val onClick: () -> Unit,
    val onStartDrag: () -> Unit,
    val onStopDrag: () -> Unit
) : GutterIconRenderer() {

    override fun getIcon(): Icon {
        return ICON
    }

    override fun equals(other: Any?): Boolean {
        val otherRenderer = other as? NewCodemarkGutterIconRenderer ?: return false
        return line == otherRenderer.line
    }

    override fun hashCode(): Int {
        return line.hashCode()
    }

    override fun getClickAction(): AnAction? {
        return if (editor.document.getUserData(PULL_REQUEST) != null) {
            null
        } else if (editor.document.file is ReviewDiffVirtualFile) {
            NewInlineCodemarkGutterIconRendererClickAction(editor, line, onClick)
        } else {
            null
        }
    }

    override fun getPopupMenuActions(): ActionGroup? {
        val pullRequest = editor.document.getUserData(PULL_REQUEST)
        val isInPrRange = editor.isSelectionWithinDiffRange()
        return if (pullRequest != null) {
            val future = CompletableFuture<DefaultActionGroup>()
            GlobalScope.launch {
                val startReviewAction = PullRequestCommentAction(editor.startReviewText, true, editor, line, onClick)
                val addSingleCommentAction =
                    PullRequestCommentAction(editor.addSingleCommentText, false, editor, line, onClick)
                val addCommentToReviewAction = PullRequestCommentAction(editor.addCommentToReviewText, true, editor, line, onClick)
                if (!isInPrRange) {
                    future.complete(DefaultActionGroup(addSingleCommentAction))
                } else if (editor.hasPendingPullRequestReview()) {
                    future.complete(DefaultActionGroup(addCommentToReviewAction))
                } else {
                    future.complete(DefaultActionGroup(startReviewAction, addSingleCommentAction))
                }
            }
            future.join()
        } else {
            val actions = mutableListOf<NewCodemark>(AddComment().also { it.telemetrySource = "Gutter" })
            if (editor.project?.settingsService?.webViewContext?.canCreateIssue == true) {
                actions.add(CreateIssue().also { it.telemetrySource = "Gutter" })
            }
            if (editor.project?.settingsService?.webViewContext?.canCreatePermalink == true) {
                actions.add(GetPermalink().also { it.telemetrySource = "Gutter" })
            }
            DefaultActionGroup(actions)
        }
    }

    override fun getDraggableObject(): GutterDraggableObject {
        onStartDrag()
        return NewCodemarkGutterIconRendererDraggableObject(editor, this.line, onStopDrag)
    }

    override fun getAlignment() = Alignment.LEFT
}

class PullRequestCommentAction(
    val name: String,
    val isReview: Boolean,
    val editor: Editor,
    val line: Int,
    val onClick: () -> Unit
) : AnAction(name) {
    override fun actionPerformed(e: AnActionEvent) {
        editor.inlineTextFieldManager?.showTextField(isReview, line, name)
    }
}

class NewInlineCodemarkGutterIconRendererClickAction(
    val editor: Editor,
    val line: Int,
    val onClick: () -> Unit
) :
    DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        editor.inlineTextFieldManager?.showTextField(false, line)
    }
}

class NewCodemarkGutterIconRendererDraggableObject(
    private val editor: Editor,
    private val originalLine: Int,
    private val onStopDrag: () -> Unit
) : GutterDraggableObject {

    override fun copy(line: Int, file: VirtualFile?, actionId: Int): Boolean {
        val project = editor.project
        onStopDrag()
        ApplicationManager.getApplication().invokeLater {
            project?.codeStream?.show {
                project.webViewService?.postNotification(
                    CodemarkNotifications.New(
                        editor.document.uri,
                        editor.selectionOrCurrentLine,
                        CodemarkType.COMMENT,
                        "Gutter"
                    )
                )
            }
        }
        return true
    }

    override fun getCursor(line: Int, actionId: Int): Cursor {
        ApplicationManager.getApplication().invokeLater {
            if (line < originalLine) {
                val startOffset = editor.document.getLineStartOffset(line)
                val endOffset = editor.document.getLineEndOffset(originalLine)
                editor.selectionModel.setSelection(startOffset, endOffset)
            } else {
                val startOffset = editor.document.getLineStartOffset(originalLine)
                val endOffset = editor.document.getLineEndOffset(line)
                editor.selectionModel.setSelection(startOffset, endOffset)
            }
        }
        return DragSource.DefaultMoveDrop
    }

    override fun remove() {
        onStopDrag()
    }
}
