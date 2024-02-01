package com.codestream.clm

import com.codestream.protocols.agent.ClmResult
import com.intellij.lang.javascript.psi.JSFile
import com.intellij.lang.javascript.psi.JSFunction
import com.intellij.lang.javascript.psi.ecmal4.JSClass
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.util.descendantsOfType

val httpMethods = arrayOf("post", "patch", "put", "get", "delete")

class CLMNodeComponent(project: Project) :
    CLMLanguageComponent<CLMNodeEditorManager>(
        project,
        "javascript",
        JSFile::class.java,
        ::CLMNodeEditorManager,
        NodeSymbolResolver()) {

    private val logger = Logger.getInstance(CLMNodeComponent::class.java)

    init {
        logger.info("Initializing code level metrics for Node")
    }
}

class NodeSymbolResolver : SymbolResolver {
    private val logger = Logger.getInstance(CLMNodeEditorManager::class.java)
    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        return null
    }

    override fun getLookupSpanSuffixes(psiFile: PsiFile): List<String>? {
        return null
//        if (psiFile !is JSFile) return null
//        val callExpressions = psiFile.collectDescendantsOfType<JSCallExpression>()
//
//        return callExpressions.mapNotNull { exp ->
//            val ref = exp.findDescendantOfType<JSReferenceExpression>()
//            val httpMethod = getHttpMethod(ref?.text)
//            if (httpMethod != null) {
//                val args = exp.findDescendantOfType<JSArgumentList>()
//                val firstArg = args?.findDescendantOfType<JSLiteralExpression>()
//                if (firstArg != null) {
//                    "$httpMethod ${firstArg.text}"
//                } else {
//                    null
//                }
//            } else {
//                null
//            }
//
//        }
    }

    override fun findClassFunctionFromFile(
        psiFile: PsiFile,
        namespace: String?,
        className: String,
        functionName: String
    ): NavigatablePsiElement? {
        if (psiFile !is JSFile) return null
        val clazz = psiFile.children.filterIsInstance<JSClass>().filter { it.node.text == className }
        val result = clazz.filterIsInstance<JSFunction>().find { it.name == functionName }
        return result
    }

    private fun getHttpMethod(arg: String?): String? {
        if (arg == null) {
            return null
        }
        for (method in httpMethods) {
            if (arg.endsWith(".${method}")) {
                return method.uppercase()
            }
        }
        return null
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        if (psiFile !is JSFile) return null

        val functions = psiFile.descendantsOfType<JSFunction>()
        val result = functions.find { it.name == functionName }
        if (result != null) {
            logger.info("Found top level JSFunction function for $functionName")
            return result
        }
        return null
    }

    override fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements> {
        return listOf()
    }
}

class CLMNodeEditorManager(editor: Editor, languageId: String) : CLMEditorManager(editor, languageId, false, true, NodeSymbolResolver()) {

}
