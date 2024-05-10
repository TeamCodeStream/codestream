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

const val CSHARP_FILE_CLASS_NEW = "com.jetbrains.rider.languages.fileTypes.csharp.psi.impl.CSharpFileImpl"
const val CSHARP_FILE_CLASS_OLD = "com.jetbrains.rider.ideaInterop.fileTypes.csharp.psi.impl.CSharpFileImpl"

private var fileTypeClassName : String
private val fileTypeClass: Class<PsiFile> = try {
    fileTypeClassName = CSHARP_FILE_CLASS_NEW
    CLMCSharpComponent::class.java.classLoader.loadClass(CSHARP_FILE_CLASS_NEW) as Class<PsiFile>
} catch (e: ClassNotFoundException) {
    fileTypeClassName = CSHARP_FILE_CLASS_OLD
    CLMCSharpComponent::class.java.classLoader.loadClass(CSHARP_FILE_CLASS_OLD) as Class<PsiFile>
}

class CLMCSharpComponent(project: Project) :
    CLMLanguageComponent<CLMCSharpEditorManager>(
        project,
        "csharp",
        fileTypeClassName,
        ::CLMCSharpEditorManager,
        CSharpSymbolResolver()) {

    private val logger = Logger.getInstance(CLMCSharpComponent::class.java)

    init {
        logger.info("Initializing code level metrics for CSharp")
    }
}

class CSharpSymbolResolver : SymbolResolver {
    private val logger = Logger.getInstance(CSharpSymbolResolver::class.java)

    /*
        This is actually ONLY getting namespaces from the file and not classes
     */
    override fun getLookupClassNames(psiFile: PsiFile): List<String>? {
        if (!isPsiFileSupported(psiFile)) return null

        val namespaces = traverseForElementsOfType(psiFile, setOf("NAMESPACE_KEYWORD"))
        val elementList = mutableListOf<String>()
        for (namespace in namespaces) {
            val namespaceName = getNamespaceQualifiedName(namespace) ?: continue
            elementList.add(namespaceName)
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
                searchNode = namespaceNode
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
        // Yes, technically, but unlikely to be seen in an enterprise .NET application)
        return null
    }

    override fun findParentFunction(psiElement: PsiElement): PsiElement? {
       return findParentOfPredicate(psiElement, ::isFunction)
    }

    private fun traverseForElementsOfType(element: PsiElement, elementTypes: Set<String>): List<PsiElement> {
        return element.descendants(true).filter {
            elementTypes.contains(it.elementType.toString())
        }.toList()
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

    private fun traverseForNamespace(element: PsiElement, namespaceToMatch: String): PsiElement? {
        val namespaces = traverseForElementsOfType(element, setOf("NAMESPACE_KEYWORD"))
        for (namespace in namespaces) {
            val namespaceName = getNamespaceQualifiedName(namespace) ?: continue

            if(namespaceToMatch.equals(namespaceName, ignoreCase = true)) {
                return element
            }
        }
        return null
    }

    private fun getNamespaceQualifiedName(element: PsiElement): String? {
        if(!isCsharpNamespace(element)){
            return null
        }

        val namespaceIdentifier = findFirstSiblingOfType(element, setOf("cs:id-role"))
        return namespaceIdentifier?.text ?: null
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
        "NAMESPACE_KEYWORD" === psiElement.elementType.toString()

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

    private fun isPsiFileSupported(psiFile: PsiFile): Boolean {
        return fileTypeClass.isAssignableFrom(psiFile::class.java)
    }

    override fun clmElements(psiFile: PsiFile, clmResult: ClmResult?): List<ClmElements> {
        return listOf()
    }
}

class CLMCSharpEditorManager(editor: Editor, languageId: String) : CLMEditorManager(editor, languageId, true, false, CSharpSymbolResolver())
