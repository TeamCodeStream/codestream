package com.codestream.webview

import com.google.gson.JsonElement
import com.intellij.openapi.fileTypes.PlainTextFileType
import com.intellij.openapi.vfs.VirtualFileSystem
import com.intellij.testFramework.LightVirtualFile

class WebViewEditorFile(val params: JsonElement?) : LightVirtualFile("path", PlainTextFileType.INSTANCE, "") {

    override fun getFileSystem(): VirtualFileSystem {
        return WebViewEditorFileSystem
    }

    override fun toString(): String {
        return "WebViewEditorFile: $name"
    }
}
