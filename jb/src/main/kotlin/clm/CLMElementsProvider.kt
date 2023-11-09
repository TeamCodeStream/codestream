package com.codestream.clm

import com.codestream.protocols.agent.CodeLevelMetric
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile

interface CLMElementsProvider {
    fun provideElements(psiFile: PsiFile, codeLevelMetrics: List<CodeLevelMetric>): List<Pair<PsiElement, CodeLevelMetric>>

}
