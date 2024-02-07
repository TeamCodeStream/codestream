package com.codestream.webview

import com.codestream.gson
import com.codestream.protocols.webview.WebViewNotification
import com.github.salomonbrys.kotson.jsonObject
import com.google.gson.JsonElement
import com.intellij.openapi.diagnostic.Logger
import javax.swing.JComponent

interface WebView {

    val logger: Logger
    val component: JComponent?
    val router: WebViewRouter
    fun loadUrl(url: String)
    fun dispose()
    fun postMessage(message: JsonElement)
    fun focus()
    fun openDevTools()
    fun zoomIn()
    fun zoomOut()
    fun resetZoom()

    fun postNotification(notification: WebViewNotification, force: Boolean? = false) {
        logger.debug("Posting ${notification.getMethod()}")
        val message = jsonObject(
            "method" to notification.getMethod(),
            "params" to gson.toJsonTree(notification)
        )
        postMessage(message, force)
    }

    fun postNotification(method: String, params: Any?, force: Boolean? = false) {
        logger.debug("Posting $method")
        val message = jsonObject(
            "method" to method,
            "params" to gson.toJsonTree(params)
        )
        postMessage(message, force)
    }

    private fun postMessage(message: JsonElement, force: Boolean? = false) {
        if (router.isReady || force == true) postMessage(message)
    }
}
