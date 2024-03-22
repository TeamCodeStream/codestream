package com.codestream.actions

import com.codestream.DEBUG
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class OpenDevTools : DumbAwareAction() {
    override fun update(e: AnActionEvent) {
        e.presentation.isVisible = DEBUG
    }

    override fun actionPerformed(e: AnActionEvent) {
        e.project?.webViewService?.openDevTools()
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}
