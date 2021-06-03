package com.codestream.webview

import com.codestream.DEBUG
import com.codestream.system.SPACE_ENCODED
import com.google.gson.JsonElement
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.diagnostic.Logger
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.callback.CefContextMenuParams
import org.cef.callback.CefMenuModel
import org.cef.handler.CefContextMenuHandlerAdapter
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.handler.CefRequestHandlerAdapter
import org.cef.network.CefRequest

class JBCefWebView(val jbCefBrowser: JBCefBrowser, val router: WebViewRouter) : WebView {

    private val logger = Logger.getInstance(JBCefWebView::class.java)
    private var loadedUrl: String? = null

    val routerQuery: JBCefJSQuery = JBCefJSQuery.create(jbCefBrowser).also {
        it.addHandler { message: String ->
            router.handle(message, null)
            null
        }

    }
    override val component = JBCefWebViewPanel(jbCefBrowser)

    init {
        logger.info("Initializing JBCef WebView")
        jbCefBrowser.cefBrowser.createImmediately()
        jbCefBrowser.jbCefClient.addContextMenuHandler(object : CefContextMenuHandlerAdapter(){
            override fun onBeforeContextMenu(
                browser: CefBrowser?,
                frame: CefFrame?,
                params: CefContextMenuParams?,
                model: CefMenuModel?
            ) {
                if (!DEBUG) {
                    model?.clear()
                }
            }
        }, jbCefBrowser.cefBrowser)
        jbCefBrowser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadingStateChange(
                browser: CefBrowser?,
                isLoading: Boolean,
                canGoBack: Boolean,
                canGoForward: Boolean
            ) {
                if (isLoading || jbCefBrowser.cefBrowser.url == "about:blank") return

                browser?.executeJavaScript(
                    """
                        console.log("Connecting router");
                        window.acquireHostApi = function() {
                            return {
                                postMessage: function(message, origin) {
                                    ${routerQuery.inject("JSON.stringify(message)")}
                                }
                            }
                        }
                        window.api = acquireHostApi();
                        if (window.messageQueue) {
                            console.log("Flushing " + messageQueue.length + " queued message(s)");
                            for (const message of messageQueue) {
                                api.postMessage(message)
                            }
                            window.messageQueue = [];
                        }
                        console.log("Router connected");
                    """.trimIndent(), browser.url, 0
                )
                logger.info("Router connected")
            }
        }, jbCefBrowser.cefBrowser)

        jbCefBrowser.jbCefClient.addRequestHandler(object : CefRequestHandlerAdapter() {
            override fun onBeforeBrowse(
                browser: CefBrowser?,
                frame: CefFrame?,
                request: CefRequest?,
                user_gesture: Boolean,
                is_redirect: Boolean
            ): Boolean {
                return if (request?.url?.startsWith("file://") == true) {
                    super.onBeforeBrowse(browser, frame, request, user_gesture, is_redirect)
                } else {
                    request?.url?.let {
                        BrowserUtil.browse(it.replace(" ", SPACE_ENCODED))
                    }
                    true
                }
            }
        }, jbCefBrowser.cefBrowser)
    }

    override fun loadUrl(url: String) {
        loadedUrl = url
        jbCefBrowser.loadURL(url)
    }

    override fun dispose() {
        routerQuery.dispose()
        jbCefBrowser.dispose()
    }

    override fun postMessage(message: JsonElement) {
        jbCefBrowser.cefBrowser.executeJavaScript("window.postMessage($message,'*');", jbCefBrowser.cefBrowser.url, 0)
    }

    override fun focus() {
        component.focus()
    }

    override fun openDevTools() {
        jbCefBrowser.openDevtools()
    }
}
