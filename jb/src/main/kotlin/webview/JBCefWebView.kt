package com.codestream.webview

import com.codestream.DEBUG
import com.codestream.agentService
import com.codestream.extensions.escapeUnicode
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.system.Platform
import com.codestream.system.SPACE_ENCODED
import com.codestream.system.platform
import com.google.gson.JsonElement
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.callback.CefContextMenuParams
import org.cef.callback.CefMenuModel
import org.cef.handler.CefContextMenuHandlerAdapter
import org.cef.handler.CefLoadHandler
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.handler.CefRequestHandlerAdapter
import org.cef.network.CefRequest

private const val BASE_ZOOM_LEVEL = 1.0

class JBCefWebView(val jbCefBrowser: JBCefBrowserBase, override val router: WebViewRouter, val project: Project) : WebView {

    override val logger = Logger.getInstance(JBCefWebView::class.java)
    private var routerConnected = false

    val routerQuery: JBCefJSQuery = JBCefJSQuery.create(jbCefBrowser).also {
        it.addHandler { message: String ->
            router.handle(message, null)
            null
        }

    }
    override val component = jbCefBrowser.component

    init {
        logger.info("Initializing JBCef WebView")
        router.webView = this
        jbCefBrowser.cefBrowser
        if (platform != Platform.LINUX_X64 && platform != Platform.LINUX_ARM64) {
            // we needed this to work around some blank webview glitches in the past,
            // but now it causes the very same glitch on Linux
            jbCefBrowser.cefBrowser.createImmediately()
        }
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
            override fun onLoadError(
                browser: CefBrowser?,
                frame: CefFrame?,
                errorCode: CefLoadHandler.ErrorCode?,
                errorText: String?,
                failedUrl: String?
            ) {
                val properties = mapOf(
                    "errorCode" to errorCode,
                    "errorText" to errorText,
                    "failedUrl" to failedUrl
                )
                val eventName = "JCEF load error"
                logger.warn("$eventName (${properties.entries.joinToString()})")
            }

            override fun onLoadingStateChange(
                browser: CefBrowser?,
                isLoading: Boolean,
                canGoBack: Boolean,
                canGoForward: Boolean
            ) {
                if (isLoading || jbCefBrowser.cefBrowser.url == "about:blank") return
                if (routerConnected) {
                    val isOwnBrowser = jbCefBrowser.cefBrowser == browser
                    val eventName = "Unexpected JCEF loading state changed"
                    val properties = mapOf(
                        "url" to browser?.url,
                        "isOwnBrowser" to isOwnBrowser
                    )
                    logger.warn("$eventName (${properties.entries.joinToString()})")
                    
                    return
                }

                browser?.executeJavaScript(
                    """
                        console.log("Connecting router");
                        window.acquireHostApi = function() {
                            return {
                                postMessage: function(message, origin) {
                                    let json = JSON.stringify(message);
                                    json = json.replace(/[\u007F-\uFFFF]/g, function(chr) {
                                        return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
                                    });
                                    ${routerQuery.inject("json")}
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
                routerConnected = true
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
                return if (request?.url?.startsWith("file://") == true || request?.url?.contains("/dns-query") == true) {
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
        routerConnected = false
        jbCefBrowser.loadURL(url)
    }

    override fun dispose() {
        routerQuery.dispose()
        jbCefBrowser.dispose()
    }

    override fun postMessage(message: JsonElement) {
        jbCefBrowser.cefBrowser.executeJavaScript(
            "window.postMessage(${message.toString().escapeUnicode()},'*');",
            jbCefBrowser.cefBrowser.url,
            0
        )
    }

    override fun focus() {
        component?.grabFocus()
    }

    override fun openDevTools() {
        jbCefBrowser.openDevtools()
    }

    private var zoomLevel = BASE_ZOOM_LEVEL

    override fun zoomIn() {
        zoomLevel += 0.1
        jbCefBrowser.zoomLevel = zoomLevel
    }

    override fun zoomOut() {
        zoomLevel -= 0.1
        jbCefBrowser.zoomLevel = zoomLevel
    }

    override fun resetZoom() {
        zoomLevel = BASE_ZOOM_LEVEL
        jbCefBrowser.zoomLevel = zoomLevel
    }
}
