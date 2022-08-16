package com.codestream.clm

import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.extensions.file
import com.codestream.extensions.lspPosition
import com.codestream.protocols.agent.FileLevelTelemetryOptions
import com.codestream.protocols.agent.FileLevelTelemetryParams
import com.codestream.protocols.agent.FileLevelTelemetryResult
import com.codestream.protocols.agent.FunctionLocator
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
import com.intellij.codeInsight.hints.InlayPresentationFactory
import com.intellij.codeInsight.hints.presentation.PresentationFactory
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.Inlay
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.editor.impl.EditorImpl
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiComment
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiWhiteSpace
import com.intellij.psi.SmartPointerManager
import com.intellij.psi.SyntaxTraverser
import com.intellij.refactoring.suggested.endOffset
import com.intellij.refactoring.suggested.startOffset
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.Range
import java.awt.Point
import java.awt.event.MouseEvent

private val OPTIONS = FileLevelTelemetryOptions(true, true, true)

class Metrics {
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

abstract class CLMEditorManager(
    val editor: Editor,
    private val languageId: String,
    private val lookupByClassName: Boolean
) : DocumentListener, GoldenSignalListener, Disposable {
    private val path = editor.document.file?.path
    private val project = editor.project
    private val metricsBySymbol = mutableMapOf<MethodLevelTelemetrySymbolIdentifier, Metrics>()
    private val inlays = mutableSetOf<Inlay<CLMCustomRenderer>>()
    private var lastResult: FileLevelTelemetryResult? = null
    private var analyticsTracked = false
    private val appSettings = ServiceManager.getService(ApplicationSettingsService::class.java)
    private var doPoll = true

    init {
        pollLoadInlays()
        editor.document.addDocumentListener(this)
        project?.agentService?.onDidStart {
            project.sessionService?.onUserLoggedInChanged {
                ApplicationManager.getApplication().invokeLater { this.updateInlays() }
            }
        }
    }

    abstract fun getLookupClassName(psiFile: PsiFile): String?

    fun pollLoadInlays() {
        GlobalScope.launch {
            while (doPoll) {
                if (project?.isDisposed == false && project.sessionService?.userLoggedIn?.user != null) {
                    loadInlays(false)
                }
                delay(60000)
            }
        }
    }

    fun loadInlays(resetCache: Boolean?) {
        if (path == null) return
        if (editor !is EditorImpl) return

        appSettings.addGoldenSignalsListener(this)

        project?.agentService?.onDidStart {
            ApplicationManager.getApplication().invokeLater {

                val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document) ?: return@invokeLater

                val className = if (lookupByClassName) {
                    getLookupClassName(psiFile) ?: return@invokeLater
                } else {
                    null
                }

                GlobalScope.launch {
                    try {
                        val result = project.agentService?.fileLevelTelemetry(
                            FileLevelTelemetryParams(
                                path,
                                languageId,
                                FunctionLocator(className, null),
                                null,
                                null,
                                resetCache,
                                OPTIONS
                            )
                        ) ?: return@launch
                        // result guaranteed to be non-null, don't overwrite previous result if we get a NR timeout
                        lastResult = result
                        metricsBySymbol.clear()

                        lastResult?.errorRate?.forEach { errorRate ->
                            val metrics = metricsBySymbol.getOrPut(errorRate.symbolIdentifier) { Metrics() }
                            metrics.errorRate = errorRate
                        }
                        lastResult?.averageDuration?.forEach { averageDuration ->
                            val metrics = metricsBySymbol.getOrPut(averageDuration.symbolIdentifier) { Metrics() }
                            metrics.averageDuration = averageDuration
                        }
                        lastResult?.throughput?.forEach { throughput ->
                            val metrics = metricsBySymbol.getOrPut(throughput.symbolIdentifier) { Metrics() }
                            metrics.throughput = throughput
                        }
                        ApplicationManager.getApplication().invokeLater {
                            // invokeLater required since we're in coroutine
                            updateInlays()
                        }
                    } catch (ex: Exception) {
                        ex.printStackTrace()
                    }
                }

            }
        }
    }

    private var debouncedRenderBlame: Job? = null
    override fun documentChanged(event: DocumentEvent) {
        debouncedRenderBlame?.cancel()
        debouncedRenderBlame = GlobalScope.launch {
            delay(750L)
            updateInlays()
        }
    }

    private fun _updateInlays() {
        inlays.forEach {
            it.dispose()
        }
        inlays.clear()
        val result = lastResult ?: return
        if (result.error?.type == "NOT_ASSOCIATED") {
            updateInlayNotAssociated()
        } else {
            updateInlaysCore()
        }
    }

    private fun updateInlays() {
        ApplicationManager.getApplication().invokeLater() {
            _updateInlays()
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
        if (project.sessionService?.userLoggedIn?.user == null) return null
        if (path == null) return null
        return DisplayDeps(result, project, path, editor)
    }

    abstract fun findClassFunctionFromFile(
        psiFile: PsiFile,
        namespace: String?,
        className: String,
        functionName: String
    ): PsiElement?

    abstract fun findTopLevelFunction(psiFile: PsiFile, functionName: String): PsiElement?

    private fun updateInlaysCore() {
        val (result, project, path, editor) = displayDeps() ?: return
        if (project.isDisposed) {
            return
        }
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document) ?: return
        val presentationFactory = PresentationFactory(editor)
        val since = result.sinceDateFormatted ?: "30 minutes ago"
        metricsBySymbol.forEach { (symbolIdentifier, metrics) ->
            val symbol = if (symbolIdentifier.className != null) {
                findClassFunctionFromFile(
                    psiFile,
                    symbolIdentifier.namespace,
                    symbolIdentifier.className,
                    symbolIdentifier.functionName
                ) ?:
                // Metrics can have custom name in which case we don't get Module or Class names - just best effort match function name
                findTopLevelFunction(psiFile, symbolIdentifier.functionName)
            } else {
                findTopLevelFunction(psiFile, symbolIdentifier.functionName)
            }
            if (symbol == null) return@forEach

            val text = metrics.format(appSettings.goldenSignalsInEditorFormat, since)
            val range = getTextRangeWithoutLeadingCommentsAndWhitespaces(symbol)
            val smartElement = SmartPointerManager.createPointer(symbol)
            val textPresentation = presentationFactory.text(text)
            val referenceOnHoverPresentation =
                presentationFactory.referenceOnHover(textPresentation, object : InlayPresentationFactory.ClickListener {
                    override fun onClick(event: MouseEvent, translated: Point) {
                        val actualSymbol = smartElement.element
                        if (actualSymbol != null) {
                            val start = editor.document.lspPosition(actualSymbol.textRange.startOffset)
                            val end = editor.document.lspPosition(actualSymbol.textRange.endOffset)
                            val range = Range(start, end)
                            project.codeStream?.show {
                                project.webViewService?.postNotification(
                                    MethodLevelTelemetryNotifications.View(
                                        result.error,
                                        result.repo,
                                        result.codeNamespace,
                                        path,
                                        result.relativeFilePath,
                                        languageId,
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
                    }
                })
            val renderer = CLMCustomRenderer(referenceOnHoverPresentation)
            val inlay = editor.inlayModel.addBlockElement(range.startOffset, false, true, 1, renderer)

            inlay.let {
                inlays.add(it)
                if (!analyticsTracked) {
                    val params = TelemetryParams(
                        "MLT Codelenses Rendered", mapOf(
                            "NR Account ID" to (result.newRelicAccountId ?: 0),
                            "Language" to languageId
                        )
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
            presentationFactory.referenceOnHover(textPresentation, object : InlayPresentationFactory.ClickListener {
                override fun onClick(event: MouseEvent, translated: Point) {
                    project.codeStream?.show {
                        project.webViewService?.postNotification(
                            MethodLevelTelemetryNotifications.View(
                                result.error,
                                result.repo,
                                result.codeNamespace,
                                path,
                                result.relativeFilePath,
                                languageId,
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
            "Associate this repository with an entity from New Relic so that you can see golden signals right in your editor",
            referenceOnHoverPresentation
        )
        val renderer = CLMCustomRenderer(withTooltipPresentation)
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
        doPoll = false
        appSettings.removeGoldenSignalsListener(this)
    }

    /*
     From com.intellij.codeInsight.hints.VcsCodeAuthorInlayHintsCollector
     */
    private fun getTextRangeWithoutLeadingCommentsAndWhitespaces(element: PsiElement): TextRange {
        val start = SyntaxTraverser.psiApi().children(element).firstOrNull { it !is PsiComment && it !is PsiWhiteSpace }
            ?: element

        return TextRange.create(start.startOffset, element.endOffset)
    }
}
