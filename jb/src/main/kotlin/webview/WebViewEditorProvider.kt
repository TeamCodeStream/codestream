package com.codestream.webview

import com.codestream.webViewEditorService
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

const val EDITOR_TYPE_ID = "CodeStreamWebViewEditor"

class WebViewEditorProvider: FileEditorProvider, DumbAware {

    override fun accept(project: Project, file: VirtualFile): Boolean {
        return file is WebViewEditorFile
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return project.webViewEditorService?.createWebViewEditor(file as WebViewEditorFile)!!
//        val editorFuture = CompletableFuture<FileEditor>()
//        val webViewEditorService = project.webViewEditorService
//            try {
//                val editor = webViewEditorService?.createWebViewEditor(file)
//                editorFuture.complete(editor)
//            } catch (ex: Exception) {
//                ex.printStackTrace()
//                editorFuture.completeExceptionally(ex)
//            }
//        return editorFuture.get()
    }

    override fun getEditorTypeId(): String {
        return EDITOR_TYPE_ID
    }

    override fun getPolicy(): FileEditorPolicy {
        return FileEditorPolicy.HIDE_DEFAULT_EDITOR
    }
}
