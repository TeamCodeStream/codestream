package com.codestream.webview

import com.codestream.WEBVIEW_SIDEBAR_PATH
import com.codestream.appDispatcher
import com.codestream.gson
import com.codestream.protocols.webview.WebViewNotification
import com.codestream.settingsService
import com.github.salomonbrys.kotson.jsonObject
import com.google.gson.JsonElement
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.jsonrpc.messages.ResponseError
import java.util.concurrent.CompletableFuture
import javax.swing.UIManager

class WebViewService(project: Project) : BaseWebViewService(project), Disposable {
    private val logger = Logger.getInstance(WebViewService::class.java)
    private val router = WebViewRouter(project)
    private val webViewCreation = CompletableFuture<Unit>()

    lateinit var webView: WebView

    override val webviewName: String = "sidebar"
    override val debugWebViewPath: String? = WEBVIEW_SIDEBAR_PATH


    init {
        logger.info("Initializing WebViewService for project ${project.basePath}")
        appDispatcher.launch {
            webView = createWebView(router)
            webViewCreation.complete(Unit)
        }

        extractAssets()
        generateHtmlFile()

        UIManager.addPropertyChangeListener {
            if (it.propertyName == "lookAndFeel") {
                ApplicationManager.getApplication().invokeLater {
                    extractAssets()
                    generateHtmlFile()
                    webView.loadUrl(htmlFile.url)
                }
            }
        }
    }

    fun onDidCreateWebview(cb: () -> Unit) {
        if (webViewCreation.isDone) cb()
        else webViewCreation.thenRun(cb)
    }

    fun onDidInitialize(cb: () -> Unit) {
        if (router.initialization.isDone) cb()
        else router.initialization.thenRun(cb)
    }

    fun load(resetContext: Boolean = false) {
        logger.info("Loading WebView")
        if (resetContext) {
            project.settingsService?.clearWebViewContext()
        }
        generateHtmlFile()
        appDispatcher.launch {
            try {
                webViewCreation.await()
                webView.loadUrl(htmlFile.url)
            } catch (e: Exception) {
                logger.error(e)
            }
        }
    }

    fun openDevTools() {
        webView.openDevTools()
    }

    fun postNotification(notification: WebViewNotification, force: Boolean? = false) {
        if (router.isReady || force == true) webView.postNotification(notification, force)
    }

    fun postNotification(method: String, params: Any?, force: Boolean? = false) {
        if (router.isReady || force == true) webView.postNotification(method, params, force)
    }

    override fun dispose() {
        try {
            webView.dispose()
        } catch (ignore: Exception) {}
    }

}
