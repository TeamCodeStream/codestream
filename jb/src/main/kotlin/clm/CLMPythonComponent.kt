package com.codestream.clm

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.jetbrains.python.psi.PyFile

class CLMPythonComponent(project: Project) :
    CLMLanguageComponent<CLMPythonEditorManager>(project, PyFile::class.java, ::CLMPythonEditorManager) {

    private val logger = Logger.getInstance(CLMPythonComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Python")
    }
}

class CLMPythonEditorManager(editor: Editor) : CLMEditorManager(editor, "python", false) {

    override fun getLookupClassName(psiFile: PsiFile): String? {
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