package com.codestream.clm

import com.codestream.extensions.lspPosition
import com.codestream.git.getCSGitFile
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.psi.JavaPsiFacade
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiMethod
import com.intellij.psi.impl.source.PsiJavaFileImpl
import com.intellij.psi.impl.source.tree.java.PsiMethodCallExpressionImpl
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.psi.util.descendantsOfType
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range
import org.jetbrains.kotlin.idea.core.util.toPsiFile
import org.jetbrains.kotlin.idea.inspections.findExistingEditor
import java.net.URL

class CLMJavaComponent(project: Project) :
    CLMLanguageComponent<CLMJavaEditorManager>(project, PsiJavaFileImpl::class.java, ::CLMJavaEditorManager) {

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

    override fun findSymbol(className: String?, functionName: String?): NavigatablePsiElement? {
        if (className == null || functionName == null) return null
        val projectScope = GlobalSearchScope.projectScope(project)
        val psiFacade = JavaPsiFacade.getInstance(project)
        val clazz = psiFacade.findClass(className, projectScope)
        if (clazz != null) {
            val methods = clazz.findMethodsByName(functionName, true)
            return methods.firstOrNull()
        }
        return null
    }

    override fun findSymbolInFile(uri: String, functionName: String, ref: String?): FindSymbolInFileResponse? {

        val virtFile = if (ref != null)  getCSGitFile(uri, ref, project) else VfsUtil.findFileByURL(URL(uri))

        if (virtFile == null) {
            logger.warn("Could not find file for uri $uri")
            return null
        }

        val psiFile = virtFile.toPsiFile(project)
        if (psiFile !is PsiJavaFileImpl) return null
        // TODO handle name conflicts in different inner classes, static methods
        val functions = psiFile.descendantsOfType<PsiMethod>()
        val split = functionName.split(".")
        val function = split.last()
//        val className = split.dropLast(1).joinToString(".")
        val targetFunction = functions.find { it.name == function }
        if (targetFunction != null) {
            val document = targetFunction.findExistingEditor()?.document
            if (document == null) {
                // When document is null we will return a bogus range of 0,0 to 0,0
                logger.warn("Document null")
            }
            val start = document?.lspPosition(targetFunction.textRange.startOffset) ?: Position(0, 0)
            val end = document?.lspPosition(targetFunction.textRange.endOffset) ?: Position(0, 0)
            val range = Range(start, end)
            return FindSymbolInFileResponse(targetFunction.text, range)
        }
//        }
        return null
    }
}

class CLMJavaEditorManager(editor: Editor) : CLMEditorManager(editor, "java", true) {
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

    override suspend fun findSymbols(psiFile: PsiFile, names: List<String>): Map<String, String> {
        if (psiFile !is PsiJavaFileImpl) return mapOf<String, String>()
        val foo = psiFile.findChildrenByClass(PsiMethodCallExpressionImpl::class.java)
        println(foo)
        return super.findSymbols(psiFile, names)
    }
}
