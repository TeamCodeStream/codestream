package com.codestream.clm

import com.codestream.clmService
import com.codestream.extensions.file
import com.codestream.extensions.uri
import com.codestream.review.ReviewDiffVirtualFile
import com.codestream.sessionService
import com.intellij.openapi.Disposable
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile

val testMode: Boolean = System.getProperty("idea.system.path")?.endsWith("system-test") ?: false

abstract class CLMLanguageComponent<T : CLMEditorManager>(
    val project: Project, private val fileType: Class<out PsiFile>, val editorFactory: (editor: Editor) -> T
) : EditorFactoryListener, Disposable {
    private val managersByEditor = mutableMapOf<Editor, CLMEditorManager>()

    @Suppress("UNCHECKED_CAST")
    constructor(project: Project, fileType: String, editorFactory: (editor: Editor) -> T) : this(
        project,
        CLMLanguageComponent::class.java.classLoader.loadClass(fileType) as Class<PsiFile>,
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
            project.clmService?.registerLanguageComponent(this)
        }
    }

    fun isPsiFileSupported(psiFile: PsiFile): Boolean {
        return fileType.isAssignableFrom(psiFile::class.java)
    }

    override fun editorCreated(event: EditorFactoryEvent) {
        if (event.editor.project != project) return
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(event.editor.document) ?: return
        if (!isPsiFileSupported(psiFile)) return
        if (!testMode) {
            // Ignore library sources (eg: files in .jar). Might need extra work to do the same with "node_modules", etc.
            val reviewFile = event.editor.document.file as? ReviewDiffVirtualFile

            if (reviewFile != null) {
                if (!reviewFile.canCreateMarker) return
            } else {
                // next.js file path is like posts/[id].tsx - IntelliJ won't create an uri for this file name!
                if (event.editor.document.uri != null &&
                    event.editor.document.uri?.startsWith("file://") != true) return
            }
        }
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

    open fun filterNamespaces(namespaces: List<String>): List<String> = emptyList()
}
