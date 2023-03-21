package com.codestream.clm

import com.codestream.agentService
import com.codestream.clmService
import com.codestream.extensions.file
import com.codestream.extensions.lspPosition
import com.codestream.extensions.uri
import com.codestream.git.getCSGitFile
import com.codestream.protocols.agent.ClmResult
import com.codestream.protocols.agent.GetCommitParams
import com.codestream.review.ReviewDiffVirtualFile
import com.codestream.sessionService
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiManager
import com.intellij.psi.codeStyle.CodeStyleManager
import com.intellij.util.concurrency.annotations.RequiresEdt
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.Range
import java.net.URI
import java.net.URL
import java.util.concurrent.CompletableFuture

val testMode: Boolean = System.getProperty("idea.system.path")?.endsWith("system-test") ?: false

class FindSymbolInFileResponse(
    val functionText: String,
    val range: Range,
    val language: String?,
)

interface SymbolResolver {
    fun getLookupClassNames(psiFile: PsiFile): List<String>?
    fun getLookupSpanSuffixes(psiFile: PsiFile): List<String>?
    fun findClassFunctionFromFile(
        psiFile: PsiFile,
        namespace: String?,
        className: String,
        functionName: String
    ): PsiElement?

    fun findTopLevelFunction(psiFile: PsiFile, functionName: String): PsiElement?
    fun findParentFunction(psiElement: PsiElement): PsiElement?
    fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements>
}

abstract class CLMLanguageComponent<T : CLMEditorManager>(
    val project: Project,
    val languageId: String,
    private val fileType: Class<out PsiFile>,
    val editorFactory: (editor: Editor, languageId: String) -> T,
    private val symbolResolver: SymbolResolver
) : EditorFactoryListener, Disposable {
    private val logger = Logger.getInstance(CLMLanguageComponent::class.java)
    private val managersByEditor = mutableMapOf<Editor, CLMEditorManager>()

    @Suppress("UNCHECKED_CAST")
    constructor(project: Project,
                languageId: String,
                fileType: String,
                editorFactory: (editor: Editor, languageId: String) -> T,
                symbolResolver: SymbolResolver) : this(
        project,
        languageId,
        CLMLanguageComponent::class.java.classLoader.loadClass(fileType) as Class<PsiFile>,
        editorFactory,
        symbolResolver
    )

    init {
        if (!project.isDisposed) {
            EditorFactory.getInstance().addEditorFactoryListener(
                this, this
            )
            project.sessionService?.onCodelensChanged {
                managersByEditor.values.forEach { it.loadInlays(true, true) }
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
        managersByEditor[event.editor] = editorFactory(event.editor, languageId)
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

    open fun findSymbol(codeFilepath: String?, codeNamespace: String?, codeFunction: String?): NavigatablePsiElement? = null

    open suspend fun copySymbolInFile(uri: String, namespace: String?, functionName: String, ref: String?): FindSymbolInFileResponse? {
        val filePath = URI.create(uri).path
        val sha = ref?.let {
            project.agentService?.getCommit(GetCommitParams(filePath, ref))?.scm?.revision
        }
        val virtFile = if (sha != null) getCSGitFile(uri, sha, project) else VfsUtil.findFileByURL(URL(uri))

        if (virtFile == null) {
            logger.warn("Could not find file for uri $uri")
            return null
        }

        val future = CompletableFuture<FindSymbolInFileResponse?>()
        ApplicationManager.getApplication().invokeLater {
            future.complete(copySymbolEdtOperations(virtFile, namespace, functionName))
        }
        return future.await()
    }

    open suspend fun replaceSymbolInFile(uri: String, symbolName: String, codeBlock: String, namespace: String?): Boolean {
        val virtFile = VfsUtil.findFileByURL(URL(uri))

        if (virtFile == null) {
            logger.warn("Could not find file for uri $uri")
            return false
        }

        val future = CompletableFuture<Boolean>()
        ApplicationManager.getApplication().invokeLaterOnWriteThread {
            future.complete(replaceSymbolEdtOperations(virtFile, symbolName, codeBlock, namespace))
        }
        return future.await()
    }

    @RequiresEdt
    private fun copySymbolEdtOperations(virtFile: VirtualFile, namespace: String?, functionName: String): FindSymbolInFileResponse? {
        val psiFile = virtFile.let { PsiManager.getInstance(project).findFile(it) } ?: return null
        if (!isPsiFileSupported(psiFile)) return null
        val editorManager = FileEditorManager.getInstance(project)
        val editor = editorManager.openTextEditor(OpenFileDescriptor(project, virtFile), false)
            ?: return null
        // val editor = psiFile.findExistingEditor() ?: return null
        val element = (if (namespace != null)
            symbolResolver.findClassFunctionFromFile(psiFile, null, namespace, functionName)
        else
            symbolResolver.findTopLevelFunction(psiFile, functionName))
            ?: return null
        val document = editor.document
        val start = document.lspPosition(element.textRange.startOffset)
        val end = document.lspPosition(element.textRange.endOffset)
        val range = Range(start, end)
        return FindSymbolInFileResponse(element.text, range, languageId)
    }

    @RequiresEdt
    private fun replaceSymbolEdtOperations(virtFile: VirtualFile,
                                           functionName: String,
                                           codeBlock: String,
                                           namespace: String?): Boolean {
        val psiFile = virtFile.let { PsiManager.getInstance(project).findFile(it) } ?: return false
        if (!isPsiFileSupported(psiFile)) return false
        val editorManager = FileEditorManager.getInstance(project)
        val editor = editorManager.openTextEditor(OpenFileDescriptor(project, virtFile), false)
            ?: return false
        // val editor = psiFile.findExistingEditor() ?: return null
        val element = (if (namespace != null)
            symbolResolver.findClassFunctionFromFile(psiFile, null, namespace, functionName)
        else
            symbolResolver.findTopLevelFunction(psiFile, functionName))
            ?: return false
        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.replaceString(element.textRange.startOffset, element.textRange.endOffset, codeBlock)
            CodeStyleManager.getInstance(project).reformatText(
                psiFile,
                element.textRange.startOffset,
                element.textRange.startOffset + codeBlock.length)
        }
        return true
    }
}
