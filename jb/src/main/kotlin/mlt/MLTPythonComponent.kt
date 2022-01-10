package com.codestream.mlt

import com.codestream.agentService
import com.codestream.extensions.file
import com.codestream.protocols.agent.MethodLevelTelemetryOptions
import com.codestream.protocols.agent.MethodLevelTelemetryParams
import com.intellij.codeInsight.daemon.impl.HintRenderer
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.Inlay
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
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
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(event.editor.document)
        if (psiFile !is PyFile) return
        MLTPythonEditorManager(event.editor)
    }

    override fun dispose() {
    }
}

class MLTPythonEditorManager(val editor: Editor) : DocumentListener {
    val path = editor.document.file?.path
    val project = editor.project
    val inlays = mutableSetOf<Inlay<HintRenderer>>()
    val hintsByFunction = mutableMapOf<String, HintRenderer>()

    init {
        loadInlays()
    }

    private fun loadInlays() {
        if (path == null) return
        project?.agentService?.onDidStart {
            ApplicationManager.getApplication().invokeLater {
                val hintTextsByFunction = mutableMapOf<String, MutableList<String>>()
                val docListener = this

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
                            val hints = hintTextsByFunction.getOrPut(errorRate.functionName) { mutableListOf<String>() }
                            hints.add("Errors per minute: ${errorRate.errorsPerMinute}")
                        }
                        result?.averageDuration?.forEach { averageDuration ->
                            val hints = hintTextsByFunction.getOrPut(averageDuration.functionName) { mutableListOf<String>() }
                            hints.add("Average duration: ${averageDuration.averageDuration}")
                        }
                        result?.throughput?.forEach { throughput ->
                            val hints = hintTextsByFunction.getOrPut(throughput.functionName) { mutableListOf<String>() }
                            hints.add("Requests per minute: ${throughput.requestsPerMinute}")
                        }

                        hintTextsByFunction.forEach { (function, hints) ->
                            val hintText = hints.joinToString()
                            val hint = HintRenderer(hintText)
                            hintsByFunction[function] = hint
                        }

                        if (hintsByFunction.isNotEmpty()) {
                            updateInlays()
                            editor.document.addDocumentListener(docListener)
                        }
                    } catch (ex: Exception) {
                        ex.printStackTrace()
                    }
                }

            }
        }
    }

    override fun documentChanged(event: DocumentEvent) {
        updateInlays()
    }

    private fun updateInlays() {
        ApplicationManager.getApplication().invokeLater {
            inlays.forEach {
                it.dispose()
            }
            inlays.clear()

            val project = editor.project ?: return@invokeLater
            val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document)
            val pyFile = psiFile as? PyFile ?: return@invokeLater
            hintsByFunction.forEach { (function, hint) ->
                val pyFunction = pyFile.findTopLevelFunction(function) ?: return@forEach
                val inlay = editor.inlayModel.addBlockElement(pyFunction.startOffset, false, true, 1, hint)
                inlay?.let {
                    inlays.add(it)
                }
            }
        }
    }
}