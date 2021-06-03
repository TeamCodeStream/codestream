package com.codestream.webview

import com.google.gson.JsonElement
import java.awt.Component

interface WebView {
    val component: Component
    fun loadUrl(url: String)
    fun dispose()
    fun postMessage(message: JsonElement)
    fun focus()
    fun openDevTools()
}
