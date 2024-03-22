package com.codestream.actions

import com.codestream.agentService
import com.codestream.appDispatcher
import com.codestream.authentication.CSLogoutReason
import com.codestream.authenticationService
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction
import kotlinx.coroutines.launch

class SignOut : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        appDispatcher.launch {
            e.project?.let {
                it.authenticationService?.logout(CSLogoutReason.SIGN_OUT_ACTION)
                it.agentService?.onDidStart {
                    it.webViewService?.load(true)
                }
            }
        }
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}
