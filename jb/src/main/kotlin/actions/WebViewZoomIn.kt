package com.codestream.actions

import com.codestream.webViewService
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class WebViewZoomIn : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        e.project?.webViewService?.webView?.zoomIn()
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}
