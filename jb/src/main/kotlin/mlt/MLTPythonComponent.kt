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
import com.codestream.protocols.agent.MethodLevelTelemetrySymbolIdentifier
import com.codestream.protocols.agent.MethodLevelTelemetryThroughput
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.webview.MethodLevelTelemetryNotifications
import com.codestream.sessionService
import com.codestream.settings.ApplicationSettingsService
import com.codestream.settings.GoldenSignalListener
import com.codestream.webViewService
import com.intellij.codeInsight.hints.InlayPresentationFactory.ClickListener
import com.intellij.codeInsight.hints.presentation.PresentationFactory
import com.intellij.codeInsight.hints.presentation.PresentationRenderer
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
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
                managersByEditor.values.forEach { it.loadInlays(true) }
            }
        }
    }

    override fun editorCreated(event: EditorFactoryEvent) {
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(event.editor.document)
        if (psiFile !is PyFile) return
        managersByEditor[event.editor] = MLTPythonEditorManager(event.editor)
    }

    override fun editorReleased(event: EditorFactoryEvent) {
        managersByEditor.remove(event.editor).also { it?.dispose() }
    }

    override fun dispose() {
        managersByEditor.values.forEach { it.dispose() }
        managersByEditor.clear()
    }
}

class MLTMetrics {
    var errorRate: MethodLevelTelemetryErrorRate? = null
    var averageDuration: MethodLevelTelemetryAverageDuration? = null
    var throughput: MethodLevelTelemetryThroughput? = null

    fun format(template: String, since: String): String {
        val averageDurationStr = averageDuration?.averageDuration?.let { "%.3f".format(it) + "ms" } ?: "n/a"
        val throughputStr = throughput?.requestsPerMinute?.let { "%.3f".format(it) + "rpm" } ?: "n/a"
        val errorRateStr = errorRate?.errorsPerMinute?.let { "%.3f".format(it) + "epm" } ?: "n/a"
        return template.replace("\${averageDuration}", averageDurationStr)
            .replace("\${throughput}", throughputStr)
            .replace("\${errorsPerMinute}", errorRateStr)
            .replace("\${since}", since)
    }

    val nameMapping: MethodLevelTelemetryNotifications.View.MetricTimesliceNameMapping
        get() = MethodLevelTelemetryNotifications.View.MetricTimesliceNameMapping(
            averageDuration?.metricTimesliceName, throughput?.metricTimesliceName, errorRate?.metricTimesliceName
        )
}

class MLTPythonEditorManager(val editor: Editor) : DocumentListener, GoldenSignalListener, Disposable {
    private val path = editor.document.file?.path
    private val project = editor.project
    private val metricsBySymbol = mutableMapOf<MethodLevelTelemetrySymbolIdentifier, MLTMetrics>()
    private val inlays = mutableSetOf<Inlay<PresentationRenderer>>()
    private var lastResult: FileLevelTelemetryResult? = null
    private var analyticsTracked = false
    private val appSettings = ServiceManager.getService(ApplicationSettingsService::class.java)

    init {
        loadInlays(false)
        editor.document.addDocumentListener(this)
    }

    fun loadInlays(resetCache: Boolean?) {
        if (path == null) return
        if (editor !is EditorImpl) return

        appSettings.addGoldenSignalsListener(this)

        project?.agentService?.onDidStart {
            ApplicationManager.getApplication().invokeLater {
                val docListener = this

                GlobalScope.launch {
                    try {
                        lastResult = project.agentService?.fileLevelTelemetry(
                            FileLevelTelemetryParams(
                                path, LANGUAGE_ID, null, null, null, resetCache, OPTIONS
                            )
                        )
                        metricsBySymbol.clear()

                        lastResult?.errorRate?.forEach { errorRate ->
                            val metrics = metricsBySymbol.getOrPut(errorRate.symbolIdentifier) { MLTMetrics() }
                            metrics.errorRate = errorRate
                        }
                        lastResult?.averageDuration?.forEach { averageDuration ->
                            val metrics = metricsBySymbol.getOrPut(averageDuration.symbolIdentifier) { MLTMetrics() }
                            metrics.averageDuration = averageDuration
                        }
                        lastResult?.throughput?.forEach { throughput ->
                            val metrics = metricsBySymbol.getOrPut(throughput.symbolIdentifier) { MLTMetrics() }
                            metrics.throughput = throughput
                        }

                        updateInlays()
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
            val result = lastResult ?: return@invokeLater
            if (result.error?.type == "NOT_ASSOCIATED") {
                updateInlayNotAssociated()
            } else {
                updateInlaysCore()
            }

        }
    }

    data class DisplayDeps(
        val result: FileLevelTelemetryResult,
        val project: Project,
        val path: String,
        val editor: EditorImpl
    )

    private fun displayDeps(): DisplayDeps? {
        if (!appSettings.showGoldenSignalsInEditor) return null
        if (editor !is EditorImpl) return null
        val result = lastResult ?: return null
        val project = editor.project ?: return null
        if (path == null) return null
        return DisplayDeps(result, project, path, editor)
    }

    private fun updateInlaysCore() {
        val (result, project, path, editor) = displayDeps() ?: return
        val presentationFactory = PresentationFactory(editor)
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document)
        val pyFile = psiFile as? PyFile ?: return
        val since = result.sinceDateFormatted ?: "30 minutes ago"
        metricsBySymbol.forEach { (symbolIdentifier, metrics) ->
            val symbol = if (symbolIdentifier.className != null) {
                val clazz = pyFile.findTopLevelClass(symbolIdentifier.className)
                clazz?.findMethodByName(symbolIdentifier.functionName, false, null)
            } else {
                pyFile.findTopLevelFunction(symbolIdentifier.functionName)
            }
            if (symbol == null) return@forEach

            val text = metrics.format(appSettings.goldenSignalsInEditorFormat, since)
            val textPresentation = presentationFactory.text(text)
            val referenceOnHoverPresentation =
                presentationFactory.referenceOnHover(textPresentation, object : ClickListener {
                    override fun onClick(event: MouseEvent, translated: Point) {
                        val start = editor.document.lspPosition(symbol.textRange.startOffset)
                        val end = editor.document.lspPosition(symbol.textRange.endOffset)
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
                                    symbolIdentifier.functionName,
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
            val inlay = editor.inlayModel.addBlockElement(symbol.startOffset, false, true, 1, renderer)
            inlay.let {
                inlays.add(it)
                if (!analyticsTracked) {
                    val params = TelemetryParams(
                        "MLT Codelenses Rendered", mapOf("NR Account ID" to (result.newRelicAccountId ?: 0))
                    )
                    project.agentService?.agent?.telemetry(params)
                    analyticsTracked = true
                }
            }
        }
    }

    private fun updateInlayNotAssociated() {
        val (result, project, path, editor) = displayDeps() ?: return
        val presentationFactory = PresentationFactory(editor)
        val text = "Click to configure golden signals from New Relic"
        val textPresentation = presentationFactory.text(text)
        val referenceOnHoverPresentation =
            presentationFactory.referenceOnHover(textPresentation, object : ClickListener {
                override fun onClick(event: MouseEvent, translated: Point) {
                    project.codeStream?.show {
                        project.webViewService?.postNotification(
                            MethodLevelTelemetryNotifications.View(
                                result.error,
                                result.repo,
                                result.codeNamespace,
                                path,
                                result.relativeFilePath,
                                LANGUAGE_ID,
                                null,
                                null,
                                result.newRelicAccountId,
                                result.newRelicEntityGuid,
                                OPTIONS,
                                null
                            )
                        )
                    }
                }
            })
        val withTooltipPresentation = presentationFactory.withTooltip(
            "Associate this repository with an entity from New Relic One so that you can see golden signals right in your editor",
            referenceOnHoverPresentation
        )
        val renderer = PresentationRenderer(withTooltipPresentation)
        val inlay = editor.inlayModel.addBlockElement(0, false, true, 1, renderer)
        inlays.add(inlay)
    }

    override fun setEnabled(value: Boolean) {
        updateInlays()
    }

    override fun setMLTFormat(value: String) {
        updateInlays()
    }

    override fun dispose() {
        appSettings.removeGoldenSignalsListener(this)
    }
}