package com.codestream.webview

import com.codestream.gson
import com.codestream.protocols.webview.EditorOpenRequest
import com.codestream.protocols.webview.EditorRangeHighlightRequest
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonElement
import com.intellij.openapi.fileTypes.PlainTextFileType
import com.intellij.openapi.vfs.VirtualFileSystem
import com.intellij.testFramework.LightVirtualFile

class WebViewEditorFile(val params: JsonElement) : LightVirtualFile("path", PlainTextFileType.INSTANCE, "") {

    override fun getFileSystem(): VirtualFileSystem {
        return WebViewEditorFileSystem
    }

    override fun toString(): String {
        return "WebViewEditorFile: $name"
    }

    val editorOpenRequest: EditorOpenRequest by lazy {
        gson.fromJson<EditorOpenRequest>(params)
    }

}
