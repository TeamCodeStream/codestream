package com.codestream.clm

import com.codestream.extensions.lspPosition
import com.codestream.git.getCSGitFile
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range
import org.jetbrains.kotlin.idea.core.util.toPsiFile
import org.jetbrains.kotlin.idea.inspections.findExistingEditor
import org.jetbrains.plugins.ruby.ruby.lang.psi.holders.RContainer
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.RFileImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.classes.RClassImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.methods.RMethodImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.methods.RSingletonMethodImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.modules.RModuleImpl
import java.net.URL

class CLMRubyComponent(project: Project) :
    CLMLanguageComponent<CLMRubyEditorManager>(project, RFileImpl::class.java, ::CLMRubyEditorManager) {

    private val logger = Logger.getInstance(CLMRubyComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Ruby")
    }

    override fun findSymbolInFile(uri: String, functionName: String, ref: String?): FindSymbolInFileResponse? {
        val virtFile = if (ref != null) getCSGitFile(uri, ref, project) else VfsUtil.findFileByURL(URL(uri))

        if (virtFile == null) {
            logger.warn("Could not find file for uri $uri")
            return null
        }

        val psiFile = virtFile.toPsiFile(project) ?: return null
        val editor = psiFile.findExistingEditor() ?: return null
        val clmRubyEditorManager = this.editorFactory(editor)
        // TODO Try findClassFunctionFromFile before findTopLevelFunction
        val element = clmRubyEditorManager.findTopLevelFunction(psiFile, functionName) ?: return null
        val document = element.findExistingEditor()?.document
        if (document == null) {
            // When document is null we will return a bogus range of 0,0 to 0,0
            logger.warn("Document null")
        }
        val start = document?.lspPosition(element.textRange.startOffset) ?: Position(0, 0)
        val end = document?.lspPosition(element.textRange.endOffset) ?: Position(0, 0)
        val range = Range(start, end)
        return FindSymbolInFileResponse(element.text, range)
    }
}

class CLMRubyEditorManager(editor: Editor) : CLMEditorManager(editor, "ruby", false) {

    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        return null
    }

    override fun getLookupSpanSuffixes(psiFile: PsiFile): List<String>? {
        return null
    }

    override fun findClassFunctionFromFile(
        psiFile: PsiFile,
        namespace: String?,
        className: String,
        functionName: String
    ): NavigatablePsiElement? {
        if (psiFile !is RFileImpl) return null
        val module: RModuleImpl? = if (namespace != null) {
            psiFile.structureElements.find { it is RModuleImpl && it.name == namespace } as RModuleImpl?
        } else {
            null
        }

        val searchElements = module?.structureElements ?: psiFile.structureElements

        val clazz = searchElements.find { it is RClassImpl && it.name == className }
            ?: return null
        val rClazz = clazz as RClassImpl
        return if (functionName.startsWith("self.")) {
            val searchFor = functionName.removePrefix("self.")
            rClazz.structureElements.find { it is RSingletonMethodImpl && it.name == searchFor }
        } else {
            rClazz.structureElements.find { it is RMethodImpl && it.name == functionName }
        }
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        if (psiFile !is RFileImpl) return null
        val justFunctionName = functionName.removePrefix("self.")
        return findAnyFunction(psiFile, justFunctionName)
    }

    private fun findAnyFunction(container: RContainer, functionName: String): NavigatablePsiElement? {
        for (element in container.structureElements) {
            if (element is RMethodImpl || element is RSingletonMethodImpl) {
                if (element.name == functionName) {
                    return element
                }
            } else {
                if (element is RContainer) {
                    val result = findAnyFunction(element, functionName)
                    if (result != null) {
                        return result
                    }
                }
            }
        }
        return null
    }

}
