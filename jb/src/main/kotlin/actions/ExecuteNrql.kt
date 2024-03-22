package com.codestream.actions

import com.codestream.editorService
import com.codestream.extensions.file
import com.codestream.protocols.webview.NrqlNotifications
import com.codestream.sessionService
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.ActionUpdateThreadAware
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class ExecuteNrql : DumbAwareAction(), ActionUpdateThreadAware {
    override fun update(e: AnActionEvent) {
        val editor = e.project?.editorService?.activeEditor
        val isNrql = editor?.document?.file?.extension?.equals("nrql", true) == true
        val isNotBlank = editor?.selectionModel?.selectedText?.isNotBlank() == true
        val isLoggedIn = e.project?.sessionService?.userLoggedIn != null

        e.presentation.isVisible = isNrql && isNotBlank && isLoggedIn
    }

    override fun actionPerformed(e: AnActionEvent) {
        val nrql = e.project?.editorService?.activeEditor?.selectionModel?.selectedText
        e.project?.webViewService?.postNotification(NrqlNotifications.Execute(nrql))
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }

}
