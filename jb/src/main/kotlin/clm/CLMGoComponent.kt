package com.codestream.clm

import com.codestream.protocols.agent.ClmResult
import com.goide.psi.GoFile
import com.goide.psi.GoFunctionDeclaration
import com.goide.psi.GoPackageClause
import com.goide.stubs.index.GoFunctionIndex
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.psi.stubs.StringStubIndexExtension


class CLMGoComponent(project: Project) :
    CLMLanguageComponent<CLMGoEditorManager>(project, GoFile::class.java, ::CLMGoEditorManager, GoSymbolResolver()) {

    private val logger = Logger.getInstance(CLMGoComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Go")
    }

    override fun findSymbol(codeFilepath: String?, codeNamespace: String?, codeFunction: String?): NavigatablePsiElement? {
        if (codeNamespace == null || codeFunction == null) return null
        val qualifiedFunctionName = "$codeNamespace.$codeFunction"

        val scope = GlobalSearchScope.allScope(project)
        val allFunctionDeclarations = GoFunctionIndex.find(codeFunction, project, scope, null)

        val goFunctionDeclaration: GoFunctionDeclaration? = allFunctionDeclarations.firstOrNull { functionDeclaration ->
            functionDeclaration.qualifiedName == qualifiedFunctionName
        }

        return goFunctionDeclaration as NavigatablePsiElement?
    }
}

class GoSymbolResolver : SymbolResolver {
    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        if (psiFile !is GoFile) return null
        val pkg = psiFile.children.find { it is GoPackageClause } as GoPackageClause?
        return pkg?.identifier?.text?.let { listOf(it) }
    }

    override fun getLookupSpanSuffixes(psiFile: PsiFile): List<String>? {
        return null
    }

    override fun findClassFunctionFromFile(
        psiFile: PsiFile,
        namespace: String?,
        className: String,
        functionName: String
    ): PsiElement? {
        if (psiFile !is GoFile) return null
        psiFile.children.find { it is GoPackageClause && it.identifier?.text == className } as GoPackageClause?
            ?: return null
        val function = psiFile.children.find { it is GoFunctionDeclaration && it.name == functionName }
        return function

    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): PsiElement? {
        if (psiFile !is GoFile) return null
        val function = psiFile.children.find { it is GoFunctionDeclaration && it.name == functionName }
        return function
    }

    override fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements> {
        return listOf()
    }
}

class CLMGoEditorManager(editor: Editor) : CLMEditorManager(editor, "go", true, false, GoSymbolResolver()) {


}
