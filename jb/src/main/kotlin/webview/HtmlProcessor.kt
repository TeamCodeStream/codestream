package com.codestream.webview

interface HtmlProcessor {
    fun process(html: String): String
}
