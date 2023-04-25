package com.codestream.actions

import com.codestream.appDispatcher
import com.codestream.codeStream
import com.codestream.editorService
import com.codestream.extensions.getDefaultPrCommentText
import com.codestream.extensions.inlineTextFieldManager
import com.codestream.extensions.isPullRequest
import com.codestream.extensions.isSelectionWithinDiffRange
import com.codestream.extensions.selectionOrCurrentLine
import com.codestream.extensions.uri
import com.codestream.protocols.CodemarkType
import com.codestream.protocols.webview.CodemarkNotifications
import com.codestream.settingsService
import com.codestream.webViewService
import com.intellij.codeInsight.intention.IntentionAction
import com.intellij.codeInsight.intention.LowPriorityAction
import com.intellij.model.SideEffectGuard.SideEffectNotAllowedException
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.util.Iconable
import com.intellij.psi.PsiFile
import kotlinx.coroutines.launch
import java.awt.event.KeyEvent

abstract class NewCodemark(val name: String, val type: CodemarkType) : AnAction(name), IntentionAction, LowPriorityAction, Iconable {

    override fun getText(): String = name

    var telemetrySource: String? = null

    private fun execute(project: Project, source: String) {
        try {
            ApplicationManager.getApplication().invokeLater {
                project.editorService?.activeEditor?.run {
                    val line = selectionOrCurrentLine.start.line
                    if (!this.selectionModel.hasSelection()) {
                        val startOffset = this.document.getLineStartOffset(line)
                        val endOffset = this.document.getLineEndOffset(line)
                        this.selectionModel.setSelection(startOffset, endOffset)
                    }

                    val isReview = isPullRequest() && isSelectionWithinDiffRange()
                    appDispatcher.launch {
                        inlineTextFieldManager?.showTextField(isReview, line, getDefaultPrCommentText())
                            ?: project.codeStream?.show {
                                project.webViewService?.postNotification(
                                    CodemarkNotifications.New(
                                        document.uri,
                                        selectionOrCurrentLine,
                                        type,
                                        telemetrySource ?: source
                                    )
                                )
                            }

                    }

                }
            }
        } catch (e: SideEffectNotAllowedException) {
            // When using new UI (Beta) the intention is executed once in "preview" via IntentionPreviewComputable
            // and uses a copy of the editor and is called with computeWithoutSideEffects. None of this makes sense.
            // The intention is invoked again without the preview mode so we can ignore this exception.
            return
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val source = when {
            ActionPlaces.isPopupPlace(e.place) -> "Context Menu"
            e.inputEvent is KeyEvent -> "Shortcut"
            else -> "Action List"
        }
        e.project?.let { execute(it, source) }
    }

    override fun invoke(project: Project, editor: Editor?, file: PsiFile?) {
        execute(project, "Lightbulb Menu")
    }

    override fun startInWriteAction() = true

    override fun getFamilyName() = "CodeStream"

    override fun isAvailable(project: Project, editor: Editor?, file: PsiFile?) = true
}

class AddComment : NewCodemark("Add comment", CodemarkType.COMMENT) {
    override fun getIcon(flags: Int) = IconLoader.getIcon("/images/marker-comment.svg", this::class.java)
}

class CreateIssue : NewCodemark("Create issue", CodemarkType.ISSUE) {
    override fun getIcon(flags: Int) = IconLoader.getIcon("/images/marker-issue.svg", this::class.java)

    override fun update(e: AnActionEvent) {
        val virtualFile = CommonDataKeys.VIRTUAL_FILE.getData(e.dataContext)
        val canCreateIssue = e.project?.settingsService?.webViewContext?.canCreateIssue == true
        e.presentation.isVisible = virtualFile?.isInLocalFileSystem == true && canCreateIssue
    }
}

class GetPermalink : NewCodemark("Get permalink", CodemarkType.LINK) {
    override fun getIcon(flags: Int) = IconLoader.getIcon("/images/marker-permalink.svg", this::class.java)

    override fun update(e: AnActionEvent) {
        val virtualFile = CommonDataKeys.VIRTUAL_FILE.getData(e.dataContext)
        val canCreatePermalink = e.project?.settingsService?.webViewContext?.canCreatePermalink == true
        e.presentation.isVisible = virtualFile?.isInLocalFileSystem == true && canCreatePermalink
    }
}
