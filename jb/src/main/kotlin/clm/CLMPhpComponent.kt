package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.jetbrains.php.lang.psi.PhpFileImpl
import com.jetbrains.php.lang.psi.elements.PhpClass
import com.jetbrains.php.lang.psi.elements.PhpNamespace
import com.jetbrains.php.lang.psi.elements.impl.FunctionImpl

class CLMPhpComponent(project: Project) :
    CLMLanguageComponent<CLMPhpEditorManager>(project, PhpFileImpl::class.java, ::CLMPhpEditorManager, PhpSymbolResolver()) {

    private val logger = Logger.getInstance(CLMPhpComponent::class.java)

    init {
        logger.info("Initializing code level metrics for PHP")
    }
}

class PhpSymbolResolver : SymbolResolver {
    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        if (psiFile !is PhpFileImpl) return null
        val namespaceAndClasses = psiFile.topLevelDefs.entrySet().filter { it.value.any { it is PhpClass || it is PhpNamespace } }
        return namespaceAndClasses.map {
            val namespace = it.value.first() as? PhpNamespace
            val lookupName = namespace?.let { it.parentNamespaceName + it.name } ?: it.key
            // remove leading backslash
            lookupName.substring(1)
        }
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
        if (psiFile !is PhpFileImpl) return null
        val definition = psiFile.topLevelDefs.entrySet().find { it.key.substring(1) == className && it.value.any { it is PhpClass } } ?: return null
        val clazz = definition.value.find { it is PhpClass } as? PhpClass ?: return null
        val result = clazz.findOwnMethodByName(functionName)
        return result
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        if (psiFile !is PhpFileImpl) return null
        val entry = psiFile.topLevelDefs.entrySet().find { it.key.substring(1) == functionName && it.value.any { it is FunctionImpl } } ?: return null
        return entry.value.find { it is FunctionImpl }
    }
}

class CLMPhpEditorManager(editor: Editor) : CLMEditorManager(editor, "php", true, false, PhpSymbolResolver()) {

}
