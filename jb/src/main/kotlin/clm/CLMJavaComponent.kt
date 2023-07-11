package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.JavaPsiFacade
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.impl.source.PsiJavaFileImpl
import com.intellij.psi.impl.source.tree.java.PsiMethodCallExpressionImpl
import com.intellij.psi.search.GlobalSearchScope

class CLMJavaComponent(project: Project) :
    CLMLanguageComponent<CLMJavaEditorManager>(project, PsiJavaFileImpl::class.java, ::CLMJavaEditorManager, JavaSymbolResolver()) {

    private val logger = Logger.getInstance(CLMJavaComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Java")
    }

    override fun filterNamespaces(namespaces: List<String>): List<String> {
        val filteredNamespaces = mutableListOf<String>()
        namespaces.forEach {
            val projectScope = GlobalSearchScope.projectScope(project)
            val psiFacade = JavaPsiFacade.getInstance(project)
            val clazz = psiFacade.findClass(it, projectScope)
            if (clazz != null) {
                filteredNamespaces.add(it)
            }
        }
        return filteredNamespaces
    }

    override fun findSymbol(codeFilepath: String?, codeNamespace: String?, codeFunction: String?): NavigatablePsiElement? {
        if (codeNamespace == null || codeFunction == null) return null
        val projectScope = GlobalSearchScope.projectScope(project)
        val psiFacade = JavaPsiFacade.getInstance(project)
        val clazz = psiFacade.findClass(codeNamespace, projectScope)
        if (clazz != null) {
            val methods = clazz.findMethodsByName(codeFunction, true)
            return methods.firstOrNull()
        }
        return null
    }
}

class JavaSymbolResolver : SymbolResolver {
    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        if (psiFile !is PsiJavaFileImpl || psiFile.classes.isEmpty()) return null
        val clazz = psiFile.classes[0]
        return clazz.qualifiedName?.let { listOf(it) }
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
        if (psiFile !is PsiJavaFileImpl) return null
        val clazz = psiFile.classes.find { it.qualifiedName == className }
        val result = clazz?.findMethodsByName(functionName, false)?.firstOrNull()
        return result
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        return null
    }

}

class CLMJavaEditorManager(editor: Editor) : CLMEditorManager(editor, "java", true, false, JavaSymbolResolver()) {
    override suspend fun findSymbols(psiFile: PsiFile, names: List<String>): Map<String, String> {
        if (psiFile !is PsiJavaFileImpl) return mapOf<String, String>()
        val foo = psiFile.findChildrenByClass(PsiMethodCallExpressionImpl::class.java)
        println(foo)
        return super.findSymbols(psiFile, names)
    }
}
