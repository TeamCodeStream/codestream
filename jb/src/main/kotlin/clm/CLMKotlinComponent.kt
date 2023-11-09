package com.codestream.clm

import com.codestream.protocols.agent.ClmResult
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import org.jetbrains.kotlin.asJava.elements.KtLightMethodImpl
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtFunction
import org.jetbrains.kotlin.psi.psiUtil.getChildrenOfType

class CLMKotlinComponent(project: Project) :
    CLMLanguageComponent<CLMKotlinEditorManager>(project, KtFile::class.java, ::CLMKotlinEditorManager, KotlinSymbolResolver()) {

    private val logger = Logger.getInstance(CLMKotlinComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Kotlin")
    }
}

class KotlinSymbolResolver : SymbolResolver {
    private val logger = Logger.getInstance(KotlinSymbolResolver::class.java)

    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        if (psiFile !is KtFile || psiFile.classes.isEmpty()) return null
        return psiFile.classes.mapNotNull { it.qualifiedName }
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
        if (psiFile !is KtFile) return null
        val clazz = psiFile.classes.find { it.qualifiedName == className }
        val result = clazz?.findMethodsByName(functionName, false)
        return if (!result.isNullOrEmpty()) {
            result[0]
        } else {
            null
        }
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        if (psiFile !is KtFile) return null
        val functions = psiFile.getChildrenOfType<KtLightMethodImpl>()
        val result = functions.find { it.name == functionName }
        if (result != null) {
            logger.info("Found top level KtLightMethodImpl function for $functionName")
            return result
        }
        val functions2 = psiFile.getChildrenOfType<KtFunction>()
        val result2 = functions2.find { it.name == functionName }
        if (result2 != null) {
            logger.info("Found top level KtFunction function for $functionName")
            return result2
        }
        return null
    }

    override fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements> {
        return listOf()
    }
}

class CLMKotlinEditorManager(editor: Editor) : CLMEditorManager(editor, "kotlin", true, false, KotlinSymbolResolver()) {

}
