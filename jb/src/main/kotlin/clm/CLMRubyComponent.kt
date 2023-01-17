package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import org.jetbrains.plugins.ruby.ruby.lang.psi.holders.RContainer
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.RFileImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.classes.RClassImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.methods.RMethodImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.methods.RSingletonMethodImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.modules.RModuleImpl

class CLMRubyComponent(project: Project) :
    CLMLanguageComponent<CLMRubyEditorManager>(project, RFileImpl::class.java, ::CLMRubyEditorManager) {

    private val logger = Logger.getInstance(CLMRubyComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Ruby")
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
                    return findAnyFunction(element, functionName)
                }
            }
        }
        return null
    }
}
