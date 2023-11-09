package com.codestream.clm.java

import com.codestream.clm.CLMElementsProvider
import com.codestream.protocols.agent.CodeLevelMetric
import com.intellij.psi.JavaPsiFacade
import com.intellij.psi.JavaRecursiveElementVisitor
import com.intellij.psi.PsiClass
import com.intellij.psi.PsiClassType
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiLiteralExpression
import com.intellij.psi.PsiMethodCallExpression
import com.intellij.psi.util.InheritanceUtil
import com.intellij.psi.util.PsiUtil

class CLMJavaSpringDatastore : CLMElementsProvider {

    override fun provideElements(psiFile: PsiFile, codeLevelMetrics: List<CodeLevelMetric>): List<Pair<PsiElement, CodeLevelMetric>> {
        return codeLevelMetrics.map { provideElementForMetric(psiFile, it) }.flatten()
    }

    private fun provideElementForMetric(psiFile: PsiFile, codeLevelMetric: CodeLevelMetric): List<Pair<PsiElement, CodeLevelMetric>> {
        val elements = mutableListOf<Pair<PsiElement, CodeLevelMetric>>()

        if (!codeLevelMetric.name.startsWith("Datastore/")) return elements
        val parts = codeLevelMetric.name.split("/")
        val metricTableName = parts[3]
        val metricOperation = parts[4]

        psiFile.accept(object : JavaRecursiveElementVisitor() {
            override fun visitMethodCallExpression(expression: PsiMethodCallExpression) {
                super.visitMethodCallExpression(expression)

                val method = expression.resolveMethod()
                val methodOperation = getDatastoreOperation(method?.name)
                if (methodOperation != metricOperation) return

                method?.let { resolvedMethod ->
                    val declaringClass = resolvedMethod.containingClass
                    declaringClass?.let { clazz ->
                        val repositoryClass = JavaPsiFacade.getInstance(expression.project)
                            .findClass("org.springframework.data.repository.Repository", expression.resolveScope)

                        if (repositoryClass != null && InheritanceUtil.isInheritorOrSelf(clazz, repositoryClass, true)) {
                            findModelClass(clazz)?.let { modelClass ->
                                modelClass?.let { model ->
                                    val tableName = getTableName(model)
                                    if (metricTableName == tableName) {
                                        elements += Pair(expression, codeLevelMetric)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            override fun visitClass(aClass: PsiClass) {
                super.visitClass(aClass)
                val classTableName = getTableName(aClass)
                if (classTableName == metricTableName) {
                    elements += Pair(aClass, codeLevelMetric)
                }
            }

        })

        return elements
    }

    private fun findModelClass(clazz: PsiClass): PsiClass? {
        val repositoryClass = JavaPsiFacade.getInstance(clazz.project)
            .findClass("org.springframework.data.repository.Repository", clazz.resolveScope)

        val typeParameters = clazz.superTypes
            .mapNotNull { it as? PsiClassType }
            .filter { InheritanceUtil.isInheritorOrSelf(it.resolve(), repositoryClass, true) }
            .flatMap { it.parameters.asSequence() }
            .toList()

        // Usually, the model class is the first type parameter of the Repository interface
        return PsiUtil.resolveClassInType(typeParameters.getOrNull(0))
    }

    private fun getTableName(modelClass: PsiClass): String? {
        val tableAnnotation = modelClass.getAnnotation("javax.persistence.Table")
        if (tableAnnotation != null) {
            val nameAttribute = tableAnnotation.findAttributeValue("name")
            if (nameAttribute is PsiLiteralExpression) {
                return nameAttribute.value as String?
            }
        }
        return null
    }

    private fun getDatastoreOperation(method: String?): String? {
        return when {
            method == null -> null
            method == "findAll" -> "select"
            method.startsWith("findBy") -> "select"
            else -> null
        }
    }

}
