package com.codestream.clm

import com.codestream.protocols.agent.ClmResult
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.NavigatablePsiElement
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.util.descendants
import com.intellij.psi.util.elementType
import kotlin.reflect.KProperty1
import kotlin.reflect.full.functions

const val CSHARP_FILE_CLASS = "com.jetbrains.rider.ideaInterop.fileTypes.csharp.psi.impl.CSharpFileImpl"
const val CSHARP_NAMESPACE_CLASS =
    "com.jetbrains.rider.ideaInterop.fileTypes.csharp.psi.impl.CSharpNamespaceDeclarationImpl"

class CLMCSharpComponent(project: Project) :
    CLMLanguageComponent<CLMCSharpEditorManager>(
        project,
        "csharp",
        CSHARP_FILE_CLASS,
        ::CLMCSharpEditorManager,
        CSharpSymbolResolver()) {

    private val logger = Logger.getInstance(CLMCSharpComponent::class.java)

    init {
        logger.info("Initializing code level metrics for CSharp")
    }
}

class CSharpSymbolResolver : SymbolResolver {
    private val logger = Logger.getInstance(CSharpSymbolResolver::class.java)

    private val fileTypeClass =
        CLMCSharpComponent::class.java.classLoader.loadClass(CSHARP_FILE_CLASS) as Class<PsiFile>

    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        if (!isPsiFileSupported(psiFile)) return null
        val elements = traverseForElementsOfType(psiFile, "CLASS_KEYWORD")
        val elementList = mutableListOf<String>();
        for (element in elements) {
            val classNameNode = findFirstSiblingOfType(element, setOf("IDENTIFIER", "DECLARATION_IDENTIFIER", "cs:id-role"))
                ?: continue
            val namespaceNode = findParentOfType(classNameNode, setOf("NAMESPACE_DECLARATION", "cs:namespace-block-declaration")) ?: continue
            val namespaceText = getNamespaceQualifiedName(namespaceNode) ?: continue
            elementList.add("${namespaceText}.${classNameNode.text}")
        }
        return elementList
    }

    override fun getLookupSpanSuffixes(psiFile: PsiFile): List<String>? {
        return null
    }

    override fun findClassFunctionFromFile(
        psiFile: PsiFile, namespace: String?, className: String, functionName: String
    ): PsiElement? {
        if (!isPsiFileSupported(psiFile)) return null
        var searchNode: PsiElement? = null
        if (namespace != null) {
            val namespaceNode = traverseForNamespace(psiFile, namespace)
            if (namespaceNode != null) {
                searchNode = namespaceNode.lastChild // TODO search instead of assume lastChild
            }
        }
        if (searchNode == null) {
            searchNode = psiFile
        }

        val classNode = traverseForName(searchNode, className)
        if (classNode != null && classNode.parent != null) {
            searchNode = classNode.parent
        }
        val result = traverseForFunctionByName(searchNode!!, functionName)
        if (logger.isDebugEnabled) {
            logger.debug("findClassFunctionFromFile: $result")
        }
        return result
    }

    override fun findTopLevelFunction(psiFile: PsiFile, functionName: String): NavigatablePsiElement? {
        // No top level methods in C#?
        return null
    }

    override fun findParentFunction(psiElement: PsiElement): PsiElement? {
       return findParentOfPredicate(psiElement, ::isFunction)
    }

    private fun traverseForElementsOfType(element: PsiElement, elementType: String): List<PsiElement> {
        return element.descendants(true).filter { it.elementType.toString() == elementType }.toList()
    }

    private fun findFirstSiblingOfType(element: PsiElement, elementType: Set<String>): PsiElement? {
        var searchNode: PsiElement? = element
        do {
            searchNode = searchNode?.nextSibling
        } while (searchNode != null && !elementType.contains(searchNode.elementType.toString()))
        return if (elementType.contains(searchNode.elementType.toString())) {
            searchNode
        } else {
            null
        }
    }

    private fun traverseForName(element: PsiElement, name: String): PsiElement? {
        if (element.text == name) {
            return element
        }
        element.children.forEach { child ->
            // if (child.elementType.toString() != "WHITE_SPACE") {
            //     println("traverseForName type: ${child.elementType.toString()} text: ${child.text.take(40)} ")
            // }
            if (child.text == name) {
                return child
            }
            if (child.children.isNotEmpty()) {
                child.children.forEach { grandChildren ->
                    val result = traverseForName(grandChildren, name)
                    if (result != null) {
                        return result
                    }
                }
            }
        }
        return null
    }

    private fun traverseForFunctionByName(element: PsiElement, name: String): PsiElement? {
        if (element.text == name && isFunction(element)) {
            return element
        }
        element.children.forEach { child ->
            // if (child.elementType.toString() != "WHITE_SPACE") {
            //     println("traverseForName type: ${child.elementType.toString()} text: ${child.text.take(40)} ")
            // }
            if (child.text == name && isFunction(child)) {
                return child
            }
            if (child.children.isNotEmpty()) {
                child.children.forEach { grandChildren ->
                    val result = traverseForFunctionByName(grandChildren, name)
                    if (result != null) {
                        return result
                    }
                }
            }
        }
        return null
    }

    private fun traverseForNamespace(element: PsiElement, namespace: String): PsiElement? {
        if (isCsharpNamespace(element) && getNamespaceQualifiedName(element) == namespace) {
            return element
        }
        element.children.forEach { child ->
            // if (child.elementType.toString() != "WHITE_SPACE") {
            //     println(child.elementType.toString())
            // }
            if (isCsharpNamespace(child) && getNamespaceQualifiedName(child) == namespace) {
                return child
            }
            if (child.children.isNotEmpty()) {
                child.children.forEach { grandChildren ->
                    val result = traverseForNamespace(grandChildren, namespace)
                    if (result != null) {
                        return result
                    }
                }
            }
        }
        return null
    }

    private fun isFunction(element: PsiElement) = isClassicFunction(element) || isLambdaFunction(element)

    /*
   Check if next non-whitespace token is an open paren indicating it is probably a function
    */
    private fun isClassicFunction(element: PsiElement): Boolean {
        val declarations = setOf("PUBLIC_KEYWORD", "PRIVATE_KEYWORD", "PROTECTED_KEYWORD")
        var searchElement: PsiElement? = element
        do {
            searchElement = searchElement?.prevSibling
        } while (searchElement != null && !declarations.contains(searchElement.elementType.toString()))

        val declarationResult = declarations.contains(searchElement?.elementType.toString())

        searchElement = element
        do {
            searchElement = searchElement?.nextSibling
        } while (searchElement != null &&
            searchElement.elementType.toString() != "LPARENTH" &&
            searchElement.firstChild?.elementType.toString() != "LPARENTH")

        val lparenResult = searchElement.elementType.toString() == "LPARENTH" ||
            searchElement?.firstChild?.elementType.toString() == "LPARENTH"

        if (logger.isDebugEnabled) {
            logger.debug("${element.text} is function: $declarationResult && $lparenResult")
        }
        return declarationResult && lparenResult
    }

    /*
    Check is previous non-whitespace token is a lambda function arrow =>
     */
    private fun isLambdaFunction(element: PsiElement): Boolean {
        val ignore = setOf("WHITE_SPACE", "LPARENTH", "RPARENTH")
        var searchElement: PsiElement? = element
        do {
            searchElement = searchElement?.nextSibling
        } while (searchElement != null && ignore.contains(searchElement.elementType.toString()))
        val result = searchElement?.elementType.toString() == "LAMBDA_ARROW"
        if (logger.isDebugEnabled) {
            logger.debug("${element.text} is function: $result")
        }
        return result
    }

    private fun isCsharpNamespace(psiElement: PsiElement): Boolean =
        "NAMESPACE_DECLARATION" === psiElement.elementType.toString()

    private fun findParentOfType(element: PsiElement, searchElements: Set<String>): PsiElement? {
        var searchNode: PsiElement? = element
        do {
            searchNode = searchNode?.parent
        } while (searchNode != null && searchNode !is PsiFile && !searchElements.contains(searchNode.elementType.toString()))
        return if (searchElements.contains(searchNode.elementType.toString())) {
            searchNode
        } else {
            null
        }
    }

    private fun findParentOfPredicate(element: PsiElement, predicate: (element: PsiElement) -> Boolean): PsiElement? {
        var searchNode: PsiElement? = element
        do {
            searchNode = searchNode?.parent
        } while (searchNode != null && searchNode !is PsiFile && !predicate(searchNode))
        return if (searchNode != null && predicate(searchNode)) {
            searchNode
        } else {
            null
        }
    }

    private fun getNamespaceQualifiedName(namespaceNode: PsiElement): String? {
        return getNamespaceQualifiedNameMethodOne(namespaceNode) ?: getNamespaceQualifiedNameMethodTwo(namespaceNode)
    }

    private fun getNamespaceQualifiedNameMethodTwo(namespaceNode: PsiElement): String? {
        val elements = findAllSiblingsOfType(namespaceNode.firstChild, setOf("IDENTIFIER", "DECLARATION_IDENTIFIER", "DOT", "cs:id-role"))
        return elements.joinToString("") { it.text }
    }

    @Suppress("UNCHECKED_CAST")
    private fun getNamespaceQualifiedNameMethodOne(namespaceNode: PsiElement): String? {
        val kClass = namespaceNode::class
        val qualifiedNameProperty = kClass.members.find { it.name == "qualifiedName" } as KProperty1<Any, *>
        // com.jetbrains.rider.ideaInterop.fileTypes.csharp.psi.impl.CSharpReferenceNameImpl
        val cSharpReferenceName = qualifiedNameProperty.get(namespaceNode) ?: return null
        val getTextFunction = cSharpReferenceName::class.functions.find { it.name == "getText" } ?: return null
        return getTextFunction.call(cSharpReferenceName) as String?
    }

    private fun isPsiFileSupported(psiFile: PsiFile): Boolean {
        return fileTypeClass.isAssignableFrom(psiFile::class.java)
    }

    private fun findAllSiblingsOfType(element: PsiElement, elementTypes: Set<String>): List<PsiElement> {
        var searchNode: PsiElement? = element
        val elements = mutableListOf<PsiElement>()
        do {
            searchNode = searchNode?.nextSibling
            if (searchNode != null && elementTypes.contains(searchNode.elementType.toString())) {
                elements.add(searchNode)
            }
        } while (searchNode != null)
        return elements
    }

    override fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements> {
        return listOf()
    }

}

class CLMCSharpEditorManager(editor: Editor, languageId: String) : CLMEditorManager(editor, languageId, true, false, CSharpSymbolResolver()) {

}
