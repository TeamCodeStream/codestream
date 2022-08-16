package com.codestream.actions

import com.codestream.codeStream
import com.codestream.protocols.agent.PixieDynamicLoggingFunctionParameter
import com.codestream.protocols.webview.PixieNotifications
import com.codestream.webViewService
import com.goide.psi.GoFunctionOrMethodDeclaration
import com.goide.psi.GoMethodDeclaration
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.psi.util.parentsOfType

class PixieDynamicLoggingAction : DumbAwareAction() {

    override fun update(e: AnActionEvent) {
        val psiElement = CommonDataKeys.PSI_ELEMENT.getData(e.dataContext)
        e.presentation.isVisible = psiElement?.parentsOfType<GoFunctionOrMethodDeclaration>(true)?.firstOrNull() != null
    }

    override fun actionPerformed(e: AnActionEvent) = ApplicationManager.getApplication().invokeLater {
        val psiElement = CommonDataKeys.PSI_ELEMENT.getData(e.dataContext)
        val declaration = psiElement?.parentsOfType<GoFunctionOrMethodDeclaration>(true)?.firstOrNull()
        if (declaration !is GoFunctionOrMethodDeclaration) {
            return@invokeLater
        }
        val name = declaration.name
        val parameters = declaration.signature?.parameters?.definitionList?.map {
            PixieDynamicLoggingFunctionParameter(it.name!!, it.elementType.debugName)
        }
        val receiver = (declaration as? GoMethodDeclaration)?.receiver?.type?.text
        val pkg = declaration.containingFile.`package`?.name

        e.project?.codeStream?.show {
            e.project?.webViewService?.postNotification(
                PixieNotifications.DynamicLogging(
                    name!!,
                    parameters!!,
                    receiver,
                    pkg!!
                )
            )
        }
        // catalogue: 00000008-0000-1a41-0000-0000072e8792
        // simple gotracing: 00000004-0000-3d9e-0000-000001e9f7b4
    }

}

