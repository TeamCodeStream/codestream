package com.codestream.webview

import ai.grazie.utils.hash
import com.codestream.gson
import com.codestream.protocols.webview.EditorOpenNotification
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonElement
import com.intellij.openapi.fileTypes.PlainTextFileType
import com.intellij.openapi.vfs.VirtualFileSystem
import com.intellij.testFramework.LightVirtualFile

class WebViewEditorFile(name: String, val notification: EditorOpenNotification, val notificationJson: JsonElement) : LightVirtualFile(name) {

    companion object {
        fun create(notificationJson: JsonElement): WebViewEditorFile {
            val notification = gson.fromJson<EditorOpenNotification>(notificationJson)
            var name = ""
            if (notification.panel === "nrql") {
                name = notification.hash ?: "${notification.panel}-${notification.entityGuid}"
            } else {
                name = "${notification.panel}-${notification.entityGuid}"
            }
            return WebViewEditorFile(name, notification, notificationJson)
        }
    }

    override fun getFileSystem(): VirtualFileSystem {
        return WebViewEditorFileSystem
    }

    override fun toString(): String {
        return "WebViewEditorFile: $name"
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is WebViewEditorFile) return false

        return this.name == other.name
    }

    override fun hashCode(): Int {
        return name.hashCode()
    }


}
