package com.codestream.clm

import com.codestream.protocols.agent.ClmResult
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiManager
import com.intellij.psi.search.FilenameIndex
import com.intellij.psi.search.GlobalSearchScope
import com.jetbrains.php.lang.psi.PhpFile
import com.jetbrains.php.lang.psi.PhpFileImpl
import com.jetbrains.php.lang.psi.elements.Function
import com.jetbrains.php.lang.psi.elements.PhpClass
import com.jetbrains.php.lang.psi.elements.PhpNamespace
import com.jetbrains.php.lang.psi.elements.impl.FunctionImpl

class CLMPhpComponent(project: Project) :
    CLMLanguageComponent<CLMPhpEditorManager>(project, "php", PhpFileImpl::class.java, ::CLMPhpEditorManager, PhpSymbolResolver()) {

    private val logger = Logger.getInstance(CLMPhpComponent::class.java)

    init {
        logger.info("Initializing code level metrics for PHP")
    }

    override fun findSymbol(codeFilepath: String?, codeNamespace: String?, codeFunction: String?): NavigatablePsiElement? {
        if (codeFilepath == null || codeFunction == null) return null
        val projectSearchScope = GlobalSearchScope.projectScope(project)
        val parts = codeFilepath.replace("\\", "/").split("/")
        val search = parts.last()
        val virtualFiles = FilenameIndex.getVirtualFilesByName(search, projectSearchScope)
        val symbolsAndPathScores = virtualFiles.map {
            symbolAndPathScore(it, codeFilepath, codeNamespace, codeFunction)
        }.filter {
            it.first != null
        }.sortedByDescending {
            it.second
        }
        return symbolsAndPathScores.firstOrNull()?.first
    }

    private fun symbolAndPathScore(virtualFile: VirtualFile, codeFilepath: String, codeNamespace: String?, codeFunction: String): Pair<NavigatablePsiElement?, Int> {
        val phpFile = PsiManager.getInstance(project).findFile(virtualFile) as? PhpFile
        val symbol = phpFile?.let {
            for (element in phpFile.children) {
                if (element is Function && element.name == codeFunction) {
                    return@let element
                }
            }
            null
        } ?: return Pair(null, 0)

        var score = 0;
        val parts = codeFilepath.replace("\\", "/").split("/").toMutableList()
        var currentFileOrDir = virtualFile
        while (currentFileOrDir != null) {
            val part = parts.removeLastOrNull()
            if (currentFileOrDir.name == part) {
                score++
                currentFileOrDir = currentFileOrDir.parent
            } else {
                break;
            }
        }

        return Pair(symbol, score)
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

    override fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements> {
        return listOf()
    }
}

class CLMPhpEditorManager(editor: Editor, languageId: String) : CLMEditorManager(editor, languageId, true, false, PhpSymbolResolver()) {

}
