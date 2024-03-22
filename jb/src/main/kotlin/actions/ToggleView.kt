package com.codestream.actions

import com.codestream.codeStream
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class ToggleView : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        e.project?.codeStream?.toggleVisible()
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}
