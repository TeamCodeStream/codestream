package com.codestream.mlt

import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.extensions.file
import com.codestream.extensions.lspPosition
import com.codestream.protocols.agent.FileLevelTelemetryOptions
import com.codestream.protocols.agent.FileLevelTelemetryParams
import com.codestream.protocols.agent.FileLevelTelemetryResult
import com.codestream.protocols.agent.MethodLevelTelemetryAverageDuration
import com.codestream.protocols.agent.MethodLevelTelemetryErrorRate
import com.codestream.protocols.agent.MethodLevelTelemetryThroughput
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.webview.MethodLevelTelemetryNotifications
import com.codestream.sessionService
import com.codestream.webViewService
import com.intellij.codeInsight.hints.InlayPresentationFactory.ClickListener
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

private const val LANGUAGE_ID = "python"
private val OPTIONS = FileLevelTelemetryOptions(true, true, true)

class MLTPythonComponent(val project: Project) : EditorFactoryListener, Disposable {

    private val logger = Logger.getInstance(MLTPythonComponent::class.java)
    private val managersByEditor = mutableMapOf<Editor, MLTPythonEditorManager>()

    init {
        logger.info("Initializing method-level telemetry for Python")
        if (!project.isDisposed) {
            EditorFactory.getInstance().addEditorFactoryListener(
                this, this
            )
            project.sessionService?.onCodelensChanged {
                managersByEditor.values.forEach { it.loadInlays() }
            }
        }
    }

    override fun editorCreated(event: EditorFactoryEvent) {
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(event.editor.document)
        if (psiFile !is PyFile) return
        managersByEditor[event.editor] = MLTPythonEditorManager(event.editor)
    }

    override fun editorReleased(event: EditorFactoryEvent) {
        managersByEditor.remove(event.editor)
    }

    override fun dispose() {
        managersByEditor.clear()
    }
}

class MLTMetrics {
    var errorRate: MethodLevelTelemetryErrorRate? = null
    var averageDuration: MethodLevelTelemetryAverageDuration? = null
    var throughput: MethodLevelTelemetryThroughput? = null

    val nameMapping: MethodLevelTelemetryNotifications.View.MetricTimesliceNameMapping
        get() =
            MethodLevelTelemetryNotifications.View.MetricTimesliceNameMapping(
                averageDuration?.metricTimesliceName,
                throughput?.metricTimesliceName,
                errorRate?.metricTimesliceName
            )

    val text: String
        get() {
            val parts = mutableListOf<String>()
            val averageDurationStr = averageDuration?.averageDuration?.let { "%.3f".format(it) + "ms" } ?: "n/a"
            parts += "avg duration: $averageDurationStr"
            val throughputStr = throughput?.requestsPerMinute?.let { "%.3f".format(it) + "rpm" } ?: "n/a"
            parts += "throughput: $throughputStr"
            val errorRateStr = errorRate?.errorsPerMinute?.let { "%.3f".format(it) + "epm" } ?: "n/a"
            parts += "error rate: $errorRateStr"
            return parts.joinToString(" | ")
        }
}

class MLTPythonEditorManager(val editor: Editor) : DocumentListener {
    private val path = editor.document.file?.path
    private val project = editor.project
    private val metricsByFunction = mutableMapOf<String, MLTMetrics>()
    private val inlays = mutableSetOf<Inlay<PresentationRenderer>>()
    private var lastResult: FileLevelTelemetryResult? = null
    private var analyticsTracked = false

    init {
        loadInlays()
    }

    fun loadInlays() {
        if (path == null) return
        if (editor !is EditorImpl) return

        project?.agentService?.onDidStart {
            ApplicationManager.getApplication().invokeLater {
                val docListener = this

                GlobalScope.launch {
                    try {
                        lastResult = project.agentService?.fileLevelTelemetry(
                            FileLevelTelemetryParams(
                                path,
                                LANGUAGE_ID,
                                null,
                                null,
                                null,
                                OPTIONS
                            )
                        )

                        lastResult?.errorRate?.forEach { errorRate ->
                            val metrics = metricsByFunction.getOrPut(errorRate.functionName) { MLTMetrics() }
                            metrics.errorRate = errorRate
                        }
                        lastResult?.averageDuration?.forEach { averageDuration ->
                            val metrics =
                                metricsByFunction.getOrPut(averageDuration.functionName) { MLTMetrics() }
                            metrics.averageDuration = averageDuration
                        }
                        lastResult?.throughput?.forEach { throughput ->
                            val metrics = metricsByFunction.getOrPut(throughput.functionName) { MLTMetrics() }
                            metrics.throughput = throughput
                        }

                        if (metricsByFunction.isNotEmpty()) {
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
            if (path == null) return@invokeLater

            val result = lastResult ?: return@invokeLater
            val project = editor.project ?: return@invokeLater
            val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document)
            val pyFile = psiFile as? PyFile ?: return@invokeLater
            val presentationFactory = PresentationFactory(editor)
            val since = result.sinceDateFormatted ?: "30 minutes ago"
            metricsByFunction.forEach { (functionName, metrics) ->
                val pyFunction = pyFile.findTopLevelFunction(functionName) ?: return@forEach
                val text = "${metrics.text} - since $since"
                val textPresentation = presentationFactory.text(text)
                val referenceOnHoverPresentation =
                    presentationFactory.referenceOnHover(textPresentation, object : ClickListener {
                        override fun onClick(event: MouseEvent, translated: Point) {
                            val start = editor.document.lspPosition(pyFunction.textRange.startOffset)
                            val end = editor.document.lspPosition(pyFunction.textRange.endOffset)
                            val range = Range(start, end)
                            project.codeStream?.show {
                                project.webViewService?.postNotification(
                                    MethodLevelTelemetryNotifications.View(
                                        result.error,
                                        result.repo,
                                        result.codeNamespace,
                                        path,
                                        result.relativeFilePath,
                                        LANGUAGE_ID,
                                        range,
                                        functionName,
                                        result.newRelicAccountId,
                                        result.newRelicEntityGuid,
                                        OPTIONS,
                                        metrics.nameMapping
                                    )
                                )
                            }
                        }
                    })
                val renderer = PresentationRenderer(referenceOnHoverPresentation)
                val inlay = editor.inlayModel.addBlockElement(pyFunction.startOffset, false, true, 1, renderer)
                inlay.let {
                    inlays.add(it)
                    if (!analyticsTracked) {
                        val params = TelemetryParams("MLT Codelenses Rendered", mapOf("NR Account ID" to (result.newRelicAccountId ?: 0)))
                        project.agentService?.agent?.telemetry(params)
                        analyticsTracked = true
                    }
                }
            }
        }
    }
}