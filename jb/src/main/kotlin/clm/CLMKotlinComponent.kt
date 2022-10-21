package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import org.jetbrains.kotlin.psi.KtFile

class CLMKotlinComponent(project: Project) :
    CLMLanguageComponent<CLMKotlinEditorManager>(project, KtFile::class.java, ::CLMKotlinEditorManager) {

    private val logger = Logger.getInstance(CLMKotlinComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Kotlin")
    }
}

class CLMKotlinEditorManager(editor: Editor) : CLMEditorManager(editor, "java", true) {
    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        if (psiFile !is KtFile || psiFile.classes.isEmpty()) return null
        return psiFile.classes.mapNotNull { it.qualifiedName }
    }

    override fun findClassFunctionFromFile(
        psiFile: PsiFile,
        namespace: String?,
        className: String,
        functionName: String
    ): NavigatablePsiElement? {
        if (psiFile !is KtFile) return null
        val clazz = psiFile.classes.find { it.qualifiedName == className }
        val result = clazz?.findMethodsByName(functionName, false)?.get(0)
        return result
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        return null
    }
}
