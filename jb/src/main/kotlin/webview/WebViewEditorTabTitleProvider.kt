package com.codestream.webview

import com.intellij.openapi.fileEditor.impl.EditorTabTitleProvider
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class WebViewEditorTabTitleProvider : EditorTabTitleProvider {

    override fun getEditorTabTitle(project: Project, file: VirtualFile): String? {
        if (file is WebViewEditorFile) {
            return "CodeStream (${file.notification.title})"
        }
        return null
    }
}
