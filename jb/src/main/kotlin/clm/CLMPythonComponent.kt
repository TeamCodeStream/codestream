package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiManager
import com.intellij.psi.search.FilenameIndex
import com.intellij.psi.search.GlobalSearchScope
import com.jetbrains.python.psi.PyFile

class CLMPythonComponent(project: Project) :
    CLMLanguageComponent<CLMPythonEditorManager>(project, PyFile::class.java, ::CLMPythonEditorManager, PythonSymbolResolver()) {

    private val logger = Logger.getInstance(CLMPythonComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Python")
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
        val pyFile = PsiManager.getInstance(project).findFile(virtualFile) as? PyFile
        val symbol = pyFile?.let {
            if (codeNamespace != null) {
                val className = codeNamespace.split(".").last()
                val clazz = pyFile.findTopLevelClass(className)
                clazz?.findMethodByName(codeFunction, false, null) ?: pyFile.findTopLevelFunction(codeFunction)
            } else {
                pyFile.findTopLevelFunction(codeFunction)
            }
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

class PythonSymbolResolver : SymbolResolver {
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
        if (psiFile !is PyFile) return null
        val clazz = psiFile.findTopLevelClass(className)
        return clazz?.findMethodByName(functionName, false, null)
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        if (psiFile !is PyFile) return null
        return psiFile.findTopLevelFunction(functionName)
    }
}

class CLMPythonEditorManager(editor: Editor) : CLMEditorManager(editor, "python", false, false, PythonSymbolResolver()) {

}
