package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.psi.util.findParentOfType
import org.jetbrains.kotlin.psi.psiUtil.findDescendantOfType
import org.jetbrains.plugins.ruby.ruby.lang.psi.controlStructures.classes.RClass
import org.jetbrains.plugins.ruby.ruby.lang.psi.controlStructures.methods.RMethod
import org.jetbrains.plugins.ruby.ruby.lang.psi.controlStructures.modules.RModule
import org.jetbrains.plugins.ruby.ruby.lang.psi.holders.RContainer
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.RFileImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.classes.RClassImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.methods.RMethodImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.methods.RSingletonMethodImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.impl.controlStructures.modules.RModuleImpl
import org.jetbrains.plugins.ruby.ruby.lang.psi.indexes.RubyClassModuleNameIndex

class CLMRubyComponent(project: Project) :
    CLMLanguageComponent<CLMRubyEditorManager>(project, RFileImpl::class.java, ::CLMRubyEditorManager, RubySymbolResolver()) {

    private val logger = Logger.getInstance(CLMRubyComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Ruby")
    }

    override fun findSymbol(codeFilepath: String?, codeNamespace: String?, codeFunction: String?): NavigatablePsiElement? {
        if (codeNamespace == null || codeFunction == null) return null
        val projectScope = GlobalSearchScope.allScope(project)
        val reversedParts = codeNamespace.split("::").reversed()
        val clazz = RubyClassModuleNameIndex.findOne(project, reversedParts[0], projectScope) { it ->
            (it as? RClass)?.matchesModuleHierarchy(reversedParts.drop(1)) ?: false
        }
        (clazz as? RClass)?.let {
            val method = it.findDescendantOfType<RMethod> { method -> method.methodName?.name == codeFunction }
            return method ?: clazz
        }
        return null
    }
}

private fun RClass.matchesModuleHierarchy(modules: List<String>): Boolean {
    var psiElement: PsiElement = this
    for (moduleName in modules) {
        val module = psiElement.findParentOfType<RModule>()
        if (module?.moduleName?.name != moduleName) {
            return false
        }
        psiElement = module
    }
    return true
}

class RubySymbolResolver : SymbolResolver {
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

class CLMRubyEditorManager(editor: Editor) : CLMEditorManager(editor, "ruby", false, false, RubySymbolResolver()) {

}
