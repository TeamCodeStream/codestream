package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.impl.source.PsiJavaFileImpl

class CLMJavaComponent(project: Project) :
    CLMLanguageComponent<CLMJavaEditorManager>(project, PsiJavaFileImpl::class.java, ::CLMJavaEditorManager) {

    private val logger = Logger.getInstance(CLMJavaComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Java")
    }
}

class CLMJavaEditorManager(editor: Editor) : CLMEditorManager(editor, "java", true) {
    private val logger = Logger.getInstance(CLMJavaEditorManager::class.java)
    override fun getLookupClassName(psiFile: PsiFile): String? {
        if (psiFile !is PsiJavaFileImpl) return null
        val clazz = psiFile.classes[0]
        return clazz.qualifiedName
    }

    override fun findClassFunctionFromFile(
        psiFile: PsiFile,
        namespace: String?,
        className: String,
        functionName: String
    ): NavigatablePsiElement? {
        if (psiFile !is PsiJavaFileImpl) return null
        val clazz = psiFile.classes.find { it.qualifiedName == className }
        val result = clazz?.findMethodsByName(functionName, false)?.get(0)
        return result
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        return null
    }
}