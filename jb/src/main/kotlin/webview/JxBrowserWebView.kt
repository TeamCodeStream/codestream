package com.codestream.webview

import com.google.gson.JsonElement
import com.intellij.openapi.diagnostic.Logger
import com.teamdev.jxbrowser.browser.Browser
import com.teamdev.jxbrowser.browser.callback.InjectJsCallback
import com.teamdev.jxbrowser.js.JsObject
import com.teamdev.jxbrowser.view.swing.BrowserView

class JxBrowserWebView(val jxBrowser: Browser, val router: WebViewRouter) : WebView {

    private val logger = Logger.getInstance(JxBrowserWebView::class.java)

    override val component: BrowserView by lazy {
        BrowserView.newInstance(jxBrowser)
    }

    init {
        logger.info("Initializing JxBrowser WebView")
        jxBrowser.set(InjectJsCallback::class.java, InjectJsCallback {
            val frame = it.frame()

            val window = frame.executeJavaScript<JsObject>("window")!!
            window.putProperty("csRouter", router)

            frame.executeJavaScript<Unit>(
                """
                    window.acquireHostApi = function() {
                        return {
                            postMessage: function(message, origin) {
                                window.csRouter.handle(JSON.stringify(message), origin);
                            }
                        }
                    }
                """.trimIndent()
            )

            InjectJsCallback.Response.proceed()
        })
    }

    override fun loadUrl(url: String) {
        jxBrowser.navigation().loadUrl(url)
    }

    override fun dispose() {
        logger.info("Disposing JxBrowser instance")
        jxBrowser.close()
    }

    override fun postMessage(message: JsonElement) {
        jxBrowser.mainFrame().ifPresent {
            it.executeJavaScript<Unit>("window.postMessage($message,'*');")
        }
    }

    override fun focus() {
        component.grabFocus()
    }

    override fun openDevTools() {
        logger.warn("Open webview dev tools action is not supported in JxBrowser webviews")
    }

    override fun zoomIn() {
    }

    override fun zoomOut() {
    }

    override fun resetZoom() {
    }
}
