package com.codestream.mlt

import com.codestream.agentService
import com.codestream.extensions.file
import com.codestream.protocols.agent.MethodLevelTelemetryOptions
import com.codestream.protocols.agent.MethodLevelTelemetryParams
import com.intellij.codeInsight.daemon.impl.HintRenderer
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiDocumentManager
import com.intellij.refactoring.suggested.startOffset
import com.jetbrains.python.psi.PyFile
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class MLTPythonComponent(val project: Project) : EditorFactoryListener, Disposable {

    private val logger = Logger.getInstance(MLTPythonComponent::class.java)

    init {
        logger.info("Initializing method-level telemetry for Python")
        if (!project.isDisposed) {
            EditorFactory.getInstance().addEditorFactoryListener(
                this, this
            )
        }
    }

    override fun editorCreated(event: EditorFactoryEvent) {
        val path = event.editor.document.file?.path ?: return
        project.agentService?.onDidStart {
            ApplicationManager.getApplication().invokeLater {
                val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(event.editor.document)
                val pyFile = psiFile as? PyFile ?: return@invokeLater
                val hintsByFunction = mutableMapOf<String, MutableList<String>>()

                GlobalScope.launch {
                    try {
                        val result = project.agentService?.methodLevelTelemetry(
                            MethodLevelTelemetryParams(
                                path,
                                "python",
                                null,
                                null,
                                null,
                                MethodLevelTelemetryOptions(true, true, true)
                            )
                        )

                        result?.errorRate?.forEach { errorRate ->
                            val hints = hintsByFunction.getOrPut(errorRate.function) { mutableListOf<String>() }
                            hints.add("Errors per minute: ${errorRate.errorsPerMinute}")
                        }
                        result?.averageDuration?.forEach { averageDuration ->
                            val hints = hintsByFunction.getOrPut(averageDuration.function) { mutableListOf<String>() }
                            hints.add("Average duration: ${averageDuration.averageDuration}")
                        }
                        result?.throughput?.forEach { throughput ->
                            val hints = hintsByFunction.getOrPut(throughput.function) { mutableListOf<String>() }
                            hints.add("Requests per minute: ${throughput.requestsPerMinute}")
                        }

                        hintsByFunction.forEach { (function, hints) ->
                            val hintText = hints.joinToString()
                            val hint = HintRenderer(hintText)

                            ApplicationManager.getApplication().invokeLater {
                                val pyFunction = pyFile.findTopLevelFunction(function) ?: return@invokeLater
                                event.editor.inlayModel.addBlockElement(pyFunction.startOffset, false, true, 1, hint)
                            }
                        }
                    } catch (ex: Exception) {
                        ex.printStackTrace()
                    }
                }
            }
        }
    }

    override fun dispose() {
    }
}