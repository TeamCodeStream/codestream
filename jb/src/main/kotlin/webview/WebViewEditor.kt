package com.codestream.webview

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorLocation
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefBrowser
import java.beans.PropertyChangeListener
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JPanel


class WebViewEditor(private val file: VirtualFile, val webView: WebView) : FileEditor {
    override fun getComponent(): JComponent {
        return webView.component!!
    }

    override fun getPreferredFocusedComponent(): JComponent? {
        return null
    }

    override fun getName(): String {
        return "name"
    }

    override fun setState(fileEditorState: FileEditorState) {
    }

    override fun isModified(): Boolean {
        return false
    }

    override fun isValid(): Boolean {
        return true
    }

    override fun addPropertyChangeListener(propertyChangeListener: PropertyChangeListener) {
    }

    override fun removePropertyChangeListener(propertyChangeListener: PropertyChangeListener) {
    }

    override fun getCurrentLocation(): FileEditorLocation? {
        return null
    }

    override fun dispose() {
    }

    override fun <T : Any?> getUserData(key: Key<T>): T? {
        return null
    }

    override fun <T : Any?> putUserData(key: Key<T>, t: T?) {
    }

    override fun getFile(): VirtualFile {
        return this.file
    }
}
