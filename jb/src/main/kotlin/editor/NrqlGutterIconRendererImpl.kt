package com.codestream.editor

import com.codestream.protocols.webview.NrqlNotifications
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

private val logger = Logger.getInstance(GutterIconRendererImpl::class.java)

class NrqlGutterIconRendererImpl(val editor: Editor, val line: Int, val query: String) : GutterIconRenderer() {

    override fun isNavigateAction(): Boolean {
        return true
    }

    override fun getClickAction(): AnAction = NrqlGutterIconAction(editor, query)

    override fun getTooltipText(): String? {
        return "Run NRQL query"
    }

    override fun getIcon(): Icon {
        return IconLoader.getIcon("/images/run.svg", javaClass)
    }

    override fun getAlignment() = Alignment.RIGHT

    override fun equals(other: Any?): Boolean {
        val otherRenderer = other as? NrqlGutterIconRendererImpl ?: return false
        return line == otherRenderer.line
    }

    override fun hashCode(): Int {
        return line.hashCode()
    }

}

class NrqlGutterIconAction(val editor: Editor, val query: String) : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = editor.project ?: return
        project.webViewService?.postNotification(NrqlNotifications.Execute(query, "nrql_file"))
    }
}
