package com.codestream.clm

import com.codestream.clm.java.CLMJavaSpringDatastore
import com.codestream.protocols.agent.ClmResult
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.JavaPsiFacade
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiClass
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiJavaFile
import com.intellij.psi.PsiMethodCallExpression
import com.intellij.psi.PsiMethod
import com.intellij.psi.impl.source.PsiJavaFileImpl
import com.intellij.psi.impl.source.tree.java.PsiMethodCallExpressionImpl
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.psi.util.findParentOfType

class CLMJavaComponent(project: Project) :
    CLMLanguageComponent<CLMJavaEditorManager>(
        project,
        "java",
        PsiJavaFileImpl::class.java,
        ::CLMJavaEditorManager,
        JavaSymbolResolver()) {

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

    override fun findParentFunction(psiElement: PsiElement): PsiElement? {
        return psiElement.findParentOfType<PsiMethod>()
    }
    private val clmElementsProviders: List<CLMElementsProvider> = listOf(
        CLMJavaSpringDatastore()
    )

    override fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements> {
        if (psiFile !is PsiJavaFile) return listOf()
        if (clmResult == null) return listOf()

        val infoBySymbol = mutableMapOf<PsiElement, MutableList<String>>()

        val elementsAndMetrics = clmElementsProviders.map { it.provideElements(psiFile, clmResult.codeLevelMetrics) }.flatten()
        for ((element, codeLevelMetric) in elementsAndMetrics) {
            val infos = infoBySymbol.getOrDefault(element, mutableListOf())
            if (element is PsiMethodCallExpression) {
                infos += "%.2fms".format(codeLevelMetric.duration)
            } else if (element is PsiClass) {
                val operation = codeLevelMetric.name.split("/")[4]
                infos += "$operation: %.2fms ".format(codeLevelMetric.duration)
            }
            infoBySymbol.set(element, infos)
        }

        val clmElements: List<ClmElements> = infoBySymbol.map {
            val type = if (it.key is PsiMethodCallExpression) {
                "methodCall"
            } else if (it.key is PsiClass) {
                "class"
            } else {
                null
            }
            val range = if (it.key is PsiMethodCallExpression) {
                it.key.children[0].children[3].textRange
            } else if (it.key is PsiClass) {
                it.key.textRange
            } else {
                it.key.textRange
            }


            ClmElements(
                range,
                it.value.joinToString("\n"),
                false,
                type
            )
        }

        return clmElements
    }
}

class CLMJavaEditorManager(editor: Editor, languageId: String) : CLMEditorManager(editor, languageId, true, false, JavaSymbolResolver()) {
    override suspend fun findSymbols(psiFile: PsiFile, names: List<String>): Map<String, String> {
        if (psiFile !is PsiJavaFileImpl) return mapOf<String, String>()
        val foo = psiFile.findChildrenByClass(PsiMethodCallExpressionImpl::class.java)
        println(foo)
        return super.findSymbols(psiFile, names)
    }
}
