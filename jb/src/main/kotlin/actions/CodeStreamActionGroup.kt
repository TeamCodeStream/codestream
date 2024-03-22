package com.codestream.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup

class CodeStreamActionGroup : DefaultActionGroup() {
    override fun update(event: AnActionEvent) {
        // workaround for https://youtrack.jetbrains.com/issue/IDEA-253297
        event.presentation.isVisible = true
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}
