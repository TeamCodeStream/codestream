package com.codestream.webview

import com.codestream.WEBVIEW_EDITOR_PATH
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project

class WebViewEditorService(project: Project): BaseWebViewService(project) {

    override val webviewName: String = "editor"
    override val debugWebViewPath: String? = WEBVIEW_EDITOR_PATH

    fun createWebViewEditor(file: WebViewEditorFile): WebViewEditor {
        val webView = createWebView(WebViewRouter(project))
        extractAssets()
        generateHtmlFile {
            it.replace("{csInitialization}", "window._cs = ${file.notificationJson?.toString()}")
        }

        webView.loadUrl(htmlFile.url)
//        ApplicationManager.getApplication().invokeLater {
//            webView.openDevTools()
//        }
        return WebViewEditor(file, webView)
    }

}
