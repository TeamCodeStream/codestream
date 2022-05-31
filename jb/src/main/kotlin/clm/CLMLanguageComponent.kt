package com.codestream.clm

import com.codestream.sessionService
import com.intellij.openapi.Disposable
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile

abstract class CLMLanguageComponent<T : CLMEditorManager>(
    val project: Project, private val fileType: String, val editorFactory: (editor: Editor) -> T
) : EditorFactoryListener, Disposable {
    private val managersByEditor = mutableMapOf<Editor, CLMEditorManager>()

    constructor(project: Project, fileType: Class<out PsiFile>, editorFactory: (editor: Editor) -> T) : this(
        project,
        fileType.canonicalName,
        editorFactory
    )

    init {
        if (!project.isDisposed) {
            EditorFactory.getInstance().addEditorFactoryListener(
                this, this
            )
            project.sessionService?.onCodelensChanged {
                managersByEditor.values.forEach { it.loadInlays(true) }
            }
        }
    }

    fun isPsiFileSupported(psiFile: PsiFile): Boolean = fileType == psiFile::class.java.canonicalName

    override fun editorCreated(event: EditorFactoryEvent) {
        if (event.editor.project != project) return
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(event.editor.document) ?: return
        if (!isPsiFileSupported(psiFile)) return
        managersByEditor[event.editor] = editorFactory(event.editor)
    }

    override fun editorReleased(event: EditorFactoryEvent) {
        if (event.editor.project != project) return
        managersByEditor.remove(event.editor).also { it?.dispose() }
    }

    override fun dispose() {
        managersByEditor.values.forEach { it.dispose() }
        managersByEditor.clear()
    }
}