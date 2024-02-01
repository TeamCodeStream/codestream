package com.codestream.webview

import com.intellij.openapi.vfs.DeprecatedVirtualFileSystem
import com.intellij.openapi.vfs.VirtualFile

object WebViewEditorFileSystem : DeprecatedVirtualFileSystem() {
    override fun getProtocol(): String = "codestream-webview"

    override fun findFileByPath(path: String): VirtualFile? = null

    override fun refreshAndFindFileByPath(path: String): VirtualFile? = null

    override fun refresh(asynchronous: Boolean) { }
}
