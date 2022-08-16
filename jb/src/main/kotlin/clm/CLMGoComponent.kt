package com.codestream.clm

import com.goide.psi.GoFile
import com.goide.psi.GoFunctionDeclaration
import com.goide.psi.GoPackageClause
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile

class CLMGoComponent(project: Project) :
    CLMLanguageComponent<CLMGoEditorManager>(project, GoFile::class.java, ::CLMGoEditorManager) {

    private val logger = Logger.getInstance(CLMGoComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Go")
    }
}

class CLMGoEditorManager(editor: Editor) : CLMEditorManager(editor, "go", true) {

    override fun getLookupClassName(psiFile: PsiFile): String? {
        if (psiFile !is GoFile) return null
        val pkg = psiFile.children.find { it is GoPackageClause } as GoPackageClause?
        return pkg?.identifier?.text
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

}