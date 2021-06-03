package com.codestream.webview

import com.codestream.agentService
import com.codestream.webViewService
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import java.awt.BorderLayout
import javax.swing.JLabel
import javax.swing.JPanel

class CodeStreamToolWindowFactory : ToolWindowFactory, DumbAware {
    private val logger = Logger.getInstance(CodeStreamToolWindowFactory::class.java)

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        logger.info("Creating tool window content")
        val csPanel = JPanel(BorderLayout())
        val loadingLabel = JLabel("Loading...", IconLoader.getIcon("/images/codestream.svg"), JLabel.CENTER)
        csPanel.add(loadingLabel)

        project.agentService?.onDidStart {
            logger.info("Scheduling webview attachment to tool window")
            val webViewService = project.webViewService ?: return@onDidStart
            webViewService.onDidCreateWebview {
                ApplicationManager.getApplication().invokeLater {
                    try {
                        logger.info("Attaching webview to tool window")
                        csPanel.remove(loadingLabel)
                        csPanel.add(webViewService.webView.component)
                        logger.info("Webview attached to tool window")
                    } catch (e: Exception) {
                        logger.error(e)
                    }
                }
            }
        } ?: logger.info("Unable to schedule webview attachment - project is disposed")

        toolWindow.contentManager.addContent(
            toolWindow.contentManager.factory.createContent(
                csPanel,
                "",
                false
            )
        )
    }
}
