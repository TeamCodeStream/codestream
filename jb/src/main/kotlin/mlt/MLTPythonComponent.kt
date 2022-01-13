package com.codestream.mlt

import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.extensions.file
import com.codestream.extensions.lspPosition
import com.codestream.protocols.agent.MethodLevelTelemetryOptions
import com.codestream.protocols.agent.MethodLevelTelemetryParams
import com.codestream.protocols.webview.MethodLevelTelemetryNotifications
import com.codestream.webViewService
import com.intellij.codeInsight.hints.InlayPresentationFactory.ClickListener
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.codeInsight.hints.presentation.PresentationFactory
import com.intellij.codeInsight.hints.presentation.PresentationRenderer
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
import com.intellij.openapi.editor.impl.EditorImpl
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiDocumentManager
import com.intellij.refactoring.suggested.startOffset
import com.jetbrains.python.psi.PyFile
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.Range
import java.awt.Point
import java.awt.event.MouseEvent

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
    private val path = editor.document.file?.path
    private val project = editor.project
    private val inlays = mutableSetOf<Inlay<PresentationRenderer>>()
    private val presentationsByFunction = mutableMapOf<String, InlayPresentation>()

    init {
        loadInlays()
    }

    private fun loadInlays() {
        if (path == null) return
        if (editor !is EditorImpl) return

        project?.agentService?.onDidStart {
            ApplicationManager.getApplication().invokeLater {
                val mltTextsByFunction = mutableMapOf<String, MutableList<String>>()
                val docListener = this
                val presentationFactory = PresentationFactory(editor)

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
                            val texts = mltTextsByFunction.getOrPut(errorRate.functionName) { mutableListOf<String>() }
                            texts.add("Errors per minute: ${errorRate.errorsPerMinute}")
                        }
                        result?.averageDuration?.forEach { averageDuration ->
                            val texts = mltTextsByFunction.getOrPut(averageDuration.functionName) { mutableListOf<String>() }
                            texts.add("Average duration: ${averageDuration.averageDuration}")
                        }
                        result?.throughput?.forEach { throughput ->
                            val texts = mltTextsByFunction.getOrPut(throughput.functionName) { mutableListOf<String>() }
                            texts.add("Requests per minute: ${throughput.requestsPerMinute}")
                        }

                        mltTextsByFunction.forEach { (function, mltTexts) ->
                            val mltText = mltTexts.joinToString()
                            val textPresentation = presentationFactory.text(mltText)
                            presentationsByFunction[function] = textPresentation
                        }

                        if (presentationsByFunction.isNotEmpty()) {
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

            if (editor !is EditorImpl) return@invokeLater

            val project = editor.project ?: return@invokeLater
            val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document)
            val pyFile = psiFile as? PyFile ?: return@invokeLater
            val presentationFactory = PresentationFactory(editor)
            presentationsByFunction.forEach { (function, presentation) ->
                val pyFunction = pyFile.findTopLevelFunction(function) ?: return@forEach
                val referenceOnHoverPresentation = presentationFactory.referenceOnHover(presentation, object : ClickListener {
                    override fun onClick(event: MouseEvent, translated: Point) {
                        val start = editor.document.lspPosition(pyFunction.textRange.startOffset)
                        val end = editor.document.lspPosition(pyFunction.textRange.endOffset)
                        val range = Range(start, end)
                        project.codeStream?.show {
                            project.webViewService?.postNotification(MethodLevelTelemetryNotifications.View(range, function, null, null))
                        }
                    }
                })
                val renderer = PresentationRenderer(referenceOnHoverPresentation)
                val inlay = editor.inlayModel.addBlockElement(pyFunction.startOffset, false, true, 1, renderer)
                inlay.let {
                    inlays.add(it)
                }
            }
        }
    }
}