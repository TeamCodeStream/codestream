package com.codestream.editor

import com.codestream.editorService
import com.codestream.lineLevelBlameService
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.project.Project

class EditorFactoryListenerImpl(val project: Project) : EditorFactoryListener {

    override fun editorCreated(event: EditorFactoryEvent) {
        try {
            if (event.editor.project == project) {
                project.editorService?.add(event.editor)
                project.lineLevelBlameService?.add(event.editor)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun editorReleased(event: EditorFactoryEvent) {
        try {
            if (event.editor.project == project) {
                project.editorService?.remove(event.editor)
                project.lineLevelBlameService?.remove(event.editor)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
