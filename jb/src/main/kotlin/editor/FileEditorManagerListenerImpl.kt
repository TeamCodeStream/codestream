package com.codestream.editor

import com.codestream.editorService
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.project.Project

class FileEditorManagerListenerImpl(val project: Project) : FileEditorManagerListener {

    override fun selectionChanged(event: FileEditorManagerEvent) {
        ApplicationManager.getApplication().invokeLater {
            val textEditor = (event.newEditor as? TextEditor)
            val editor = textEditor?.editor
            if (editor?.isDisposed == false) {
                project.editorService?.activeEditor = editor
            }
        }
    }
}
