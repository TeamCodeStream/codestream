package com.codestream.clm

import com.codestream.agent.TEST_MODE
import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.editor.aqua
import com.codestream.editor.green
import com.codestream.editor.orange
import com.codestream.extensions.file
import com.codestream.extensions.lspPosition
import com.codestream.extensions.uri
import com.codestream.protocols.agent.ClmParams
import com.codestream.protocols.agent.ClmResult
import com.codestream.protocols.agent.CSLocation
import com.codestream.protocols.agent.CSMarkerLocation
import com.codestream.protocols.agent.CSReferenceLocation
import com.codestream.protocols.agent.ComputeCurrentLocationsRequest
import com.codestream.protocols.agent.ComputeCurrentLocationsResult
import com.codestream.protocols.agent.FileLevelTelemetryOptions
import com.codestream.protocols.agent.FileLevelTelemetryParams
import com.codestream.protocols.agent.FileLevelTelemetryResult
import com.codestream.protocols.agent.FileLevelTelemetryResultError
import com.codestream.protocols.agent.FunctionLocator
import com.codestream.protocols.agent.Markerish
import com.codestream.protocols.agent.MethodLevelTelemetryAverageDuration
import com.codestream.protocols.agent.MethodLevelTelemetryData
import com.codestream.protocols.agent.MethodLevelTelemetryErrorRate
import com.codestream.protocols.agent.MethodLevelTelemetrySampleSize
import com.codestream.protocols.agent.MethodLevelTelemetrySymbolIdentifier
import com.codestream.protocols.agent.NOT_ASSOCIATED
import com.codestream.protocols.agent.NOT_CONNECTED
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.webview.MethodLevelTelemetryNotifications
import com.codestream.protocols.webview.ObservabilityAnomalyNotifications
import com.codestream.review.LOCAL_PATH
import com.codestream.sessionService
import com.codestream.settings.ApplicationSettingsService
import com.codestream.settings.GoldenSignalListener
import com.codestream.webViewService
import com.codestream.workaround.HintsPresentationWorkaround
import com.intellij.codeInsight.hints.InlayPresentationFactory
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.lang.javascript.psi.impl.JSFunctionExpressionImpl
import com.intellij.codeInsight.hints.presentation.PresentationFactory
import com.intellij.codeInsight.hints.presentation.PresentationRenderer
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorCustomElementRenderer
import com.intellij.openapi.editor.Inlay
import com.intellij.openapi.editor.LogicalPosition
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.editor.impl.EditorImpl
import com.intellij.openapi.editor.markup.HighlighterLayer
import com.intellij.openapi.editor.markup.HighlighterTargetArea
import com.intellij.openapi.editor.markup.RangeHighlighter
import com.intellij.openapi.editor.markup.TextAttributes
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiComment
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiWhiteSpace
import com.intellij.psi.SmartPointerManager
import com.intellij.psi.SyntaxTraverser
import com.intellij.psi.util.findParentOfType
import com.intellij.refactoring.suggested.endOffset
import com.intellij.refactoring.suggested.startOffset
import com.intellij.ui.JBColor
import com.intellij.util.concurrency.NonUrgentExecutor
import kotlinx.collections.immutable.toImmutableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.Position
import kotlinx.coroutines.withContext
import org.eclipse.lsp4j.Range
import java.awt.Font
import java.awt.Point
import java.awt.event.FocusEvent
import java.awt.event.FocusListener
import java.awt.event.MouseEvent
import java.util.concurrent.Callable

private val OPTIONS = FileLevelTelemetryOptions(true, true, true)

fun prettyRange(range: Range): String {
    return "${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}"
}

data class RenderElements(
    val range: TextRange,
    val referenceOnHoverPresentation: InlayPresentation,
    val isAnomaly: Boolean,
    val type: String?
)

data class ClmElements(
    val range: TextRange,
    val text: String,
    val isAnomaly: Boolean,
    val type: String?
)

data class MetricLocation(
    val metrics: Metrics,
    var range: Range, // TODO val
)

data class MetricSource(
    val column: Long,
    val lineno: Long,
    val commit: String,
    val functionName: String,
    val uri: String,
)

class Metrics {
    var errorRate: MethodLevelTelemetryErrorRate? = null
    var averageDuration: MethodLevelTelemetryAverageDuration? = null
    var sampleSize: MethodLevelTelemetrySampleSize? = null

    fun format(template: String, since: String): Pair<String, Boolean> {
        val functionName = errorRate?.functionName ?: averageDuration?.functionName ?: sampleSize?.functionName
        ?: "<unknown>"
        if (errorRate?.anomaly != null || averageDuration?.anomaly != null) {
            val anomalyTexts = mutableListOf<String>()
            errorRate?.anomaly?.let {
                anomalyTexts += "error rate +%.2f%%".format((it.ratio - 1) * 100)
            }
            averageDuration?.anomaly?.let {
                anomalyTexts += "avg duration +%.2f%%".format((it.ratio - 1) * 100)
            }
            val since = errorRate?.anomaly?.sinceText ?: averageDuration?.anomaly?.sinceText
            val text = anomalyTexts.joinToString() + " since $since"
            return Pair(text, true)
        }

        val sampleSizeStr = sampleSize?.sampleSize?.toString() ?: "0"
        val averageDurationStr = averageDuration?.averageDuration?.let { "%.3f".format(it) + "ms" } ?: "n/a"
        val errorRateValue = errorRate?.errorRate ?: 0f
        val errorRateStr = "%.1f".format(errorRateValue * 100) + "%"
        val text = template.replace("\${averageDuration}", averageDurationStr)
            .replace("\${errorRate}", errorRateStr)
            .replace("\${sampleSize}", sampleSizeStr)
            .replace("\${since}", since) + " - $functionName"
        return Pair(text, false)
    }

    val nameMapping: MethodLevelTelemetryNotifications.View.MetricTimesliceNameMapping
        get() = MethodLevelTelemetryNotifications.View.MetricTimesliceNameMapping(
            averageDuration?.metricTimesliceName, sampleSize?.metricTimesliceName, errorRate?.metricTimesliceName, sampleSize?.source
        )
}

abstract class CLMEditorManager(
    val editor: Editor,
    private val languageId: String,
    private val lookupByClassName: Boolean,
    private val lookupBySpan: Boolean = false,
    private val symbolResolver: SymbolResolver,
) : DocumentListener, GoldenSignalListener, Disposable, FocusListener {
    private val tasksCoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.EDT)
    private val path = editor.document.getUserData(LOCAL_PATH) ?: editor.document.file?.path
    private val project = editor.project
    private var metricsBySymbol = mapOf<MethodLevelTelemetrySymbolIdentifier, Metrics>()
    private var clmResult: ClmResult? = null
    // Todo - don't key on range - key on colno / lineno / commit
    // Store range in value so we can update locations when file changes
    private var metricsByLocation = mapOf<MetricSource, MetricLocation>()
    private val inlays = mutableSetOf<Inlay< out EditorCustomElementRenderer>>()
    private var lastResult: FileLevelTelemetryResult? = null
    private var currentError: FileLevelTelemetryResultError? = null
    private var analyticsTracked = false
    private val appSettings = ServiceManager.getService(ApplicationSettingsService::class.java)
    private var doPoll = true
    private var lastFetchAttempt: Long = 0

    private val logger = Logger.getInstance(CLMEditorManager::class.java)

    init {
        pollLoadInlays()
        editor.document.addDocumentListener(this)
        editor.contentComponent.addFocusListener(this)
        project?.agentService?.onDidStart {
            project.sessionService?.onUserLoggedInChanged {
                this.updateInlays()
            }
        }
        appSettings.addGoldenSignalsListener(this)
    }

    fun pollLoadInlays() {
        tasksCoroutineScope.launch {
            while (doPoll) {
                if (project?.isDisposed == false && project.sessionService?.userLoggedIn?.user != null) {
                    loadInlays(false)
                }
                delay(60000)
            }
        }
    }

    fun runInBackground(toExecute: Callable<Unit>) {
        ReadAction.nonBlocking(toExecute).submit(NonUrgentExecutor.getInstance())
    }

    private suspend fun updateLocations() {
        if (project == null) return
        for (item in metricsByLocation) {
            val metricSource = item.key
            val currentLocations = computeCurrentLocationsResult(
                metricSource.column,
                metricSource.lineno,
                metricSource.commit,
                metricSource.functionName,
                metricSource.uri,
                project
            )
            if (currentLocations != null && currentLocations.locations.isNotEmpty()) {
                // TODO multiple results
                val location = currentLocations.locations.entries.first()
                // TODO computeCurrentLocationsResult tries to grab whole line so it has something good to track when the
                //  code is repositioned. Somehow need to keep this range more precise and hit the symbol rather
                //  than the whole line for the highlighting to work
                val range = Range(
                    Position(location.value.lineStart.toInt() - 1,
                        0), //location.value.colStart.toInt()),
                    Position(location.value.lineEnd.toInt() - 1,
                        0)) //location.value.colEnd.toInt()))
                item.value.range = range // TODO Mutable update
            }
        }
    }

    fun loadInlays(resetCache: Boolean = false, skipStaleCheck: Boolean = false) {
        if (path == null) return
        if (editor !is EditorImpl) return
        if (project == null || project.isDisposed) return
        if (!skipStaleCheck && !isStale()) return

        // Slow operations are prohibited on EDT
        val psiFile = ApplicationManager.getApplication().runReadAction<PsiFile> {
            PsiDocumentManager.getInstance(project).getPsiFile(editor.document)
        } ?: return

        project.agentService?.onDidStart {
            tasksCoroutineScope.launch {
                if (project.isDisposed) return@launch
                if (!TEST_MODE && !editor.component.isShowing) return@launch
                logger.info("loadInlays $path didStart launch isShowing")

                val classNames = if (lookupByClassName) {
                    withContext(Dispatchers.Default) { // Switch out of EDT thread
                        ApplicationManager.getApplication().runReadAction<List<String>> { // Requires read action
                            // Kotlin psi internals run stuff not compatible with EDT thread
                            symbolResolver.getLookupClassNames(psiFile)
                        }
                    }
                } else {
                    null
                }

                val spanSuffixes = if (lookupBySpan) {
                    withContext(Dispatchers.Default) { // Switch out of EDT thread
                        ApplicationManager.getApplication().runReadAction<List<String>> { // Requires read action
                            symbolResolver.getLookupSpanSuffixes(psiFile)
                        }
                    }
                } else {
                    null
                }

                logger.info("spanSuffixes $spanSuffixes")

                try {
                    lastFetchAttempt = System.currentTimeMillis()
                    if (project.sessionService?.userLoggedIn?.user == null) {
                        return@launch
                    }
                    // logger.info("=== Calling fileLevelTelemetry for ${editor.document.uri} resetCache: $resetCache")
                    // next.js file path is like posts/[id].tsx - IntelliJ won't create an uri for this file name!
                    val uri = editor.document.uri ?: "file://${editor.document.file?.path}"
                    val result = project.agentService?.fileLevelTelemetry(
                        FileLevelTelemetryParams(
                            uri,
                            languageId,
                            FunctionLocator(classNames, null),
                            null,
                            null,
                            resetCache,
                            OPTIONS
                        )
                    ) ?: return@launch
                    // result guaranteed to be non-null, don't overwrite previous result if we get a NR timeout
                    if (result.error != null) {
                        currentError = result.error
                        if (result.error?.type == NOT_ASSOCIATED || result.error?.type == NOT_CONNECTED) {
                            metricsBySymbol = mapOf()
                            updateInlays()
                        }
                        logger.info("Not updating CLM metrics due to error ${result.error?.type}")
                        return@launch
                    } else {
                        currentError = null
                    }

                    lastResult = result
                    metricsBySymbol = mapOf()

                    val updatedMetrics = mutableMapOf<MethodLevelTelemetrySymbolIdentifier, Metrics>()
                    val updatedMetricsByLocation = mutableMapOf<MetricSource, MetricLocation>()

                    lastResult?.errorRate?.forEach { errorRate ->
                        if (errorRate.functionName == "(anonymous)" && errorRate.column != null &&
                            errorRate.lineno != null && errorRate.commit != null) {
                            val currentLocations = computeCurrentLocationsResult(errorRate.column,
                                errorRate.lineno,
                                errorRate.commit,
                                errorRate.functionName,
                                uri,
                                project)
                            if (currentLocations != null && currentLocations.locations.isNotEmpty()) {
                                // TODO multiple results
                                val location = currentLocations.locations.entries.first()
                                val range = Range(
                                    Position(location.value.lineStart.toInt() - 1,
                                        0), //location.value.colStart.toInt()),
                                    Position(location.value.lineEnd.toInt() - 1,
                                        0)) //location.value.colEnd.toInt()))
                                // TODO multiple per same line (map to array)
                                val metricSource = MetricSource(errorRate.column,
                                    errorRate.lineno,
                                    errorRate.commit,
                                    errorRate.functionName,
                                    uri)
                                val metricLocation = updatedMetricsByLocation.getOrPut(metricSource) { MetricLocation(Metrics(), range) }
                                metricLocation.metrics.errorRate = errorRate
                                    logger.info("*** added anonymous errorRate $errorRate to ${prettyRange(range)}")
                                } else {
                                    logger.info("*** no currentLocations for anonymous errorRate $errorRate")
                                }
                            } else {
                                val metrics = updatedMetrics.getOrPut(errorRate.symbolIdentifier) { Metrics() }
                                metrics.errorRate = errorRate
                            }
                        }
                        lastResult?.averageDuration?.forEach { averageDuration ->
                            if (averageDuration.functionName == "(anonymous)" && averageDuration.column != null
                                && averageDuration.lineno != null && averageDuration.commit != null) {
                                val currentLocations = computeCurrentLocationsResult(
                                    averageDuration.column,
                                    averageDuration.lineno,
                                    averageDuration.commit,
                                    averageDuration.functionName,
                                    uri,
                                    project)
                                if (currentLocations != null && currentLocations.locations.isNotEmpty()) {
                                    // val startOffset = editor.logicalPositionToOffset(LogicalPosition(it.value.lineStart.toInt(), it.value.colStart.toInt()))
                                    // val endOffset = editor.logicalPositionToOffset(LogicalPosition(it.value.lineEnd.toInt(), it.value.colEnd.toInt()))
                                    val location = currentLocations.locations.entries.first()
                                    val range = Range(
                                        Position(location.value.lineStart.toInt() - 1,
                                            0), //location.value.colStart.toInt()),
                                        Position(location.value.lineEnd.toInt() - 1,
                                            0)) //location.value.colEnd.toInt()))
                                    // TODO multiple per same line (map to array)
                                    val metricSource = MetricSource(averageDuration.column,
                                        averageDuration.lineno,
                                        averageDuration.commit,
                                        averageDuration.functionName,
                                        uri)
                                    val metricLocation = updatedMetricsByLocation.getOrPut(metricSource) { MetricLocation(Metrics(), range) }
                                    metricLocation.metrics.averageDuration = averageDuration
                                    logger.info("*** added anonymous averageDuration $averageDuration to ${prettyRange(range)}")
                            } else {
                                logger.info("*** no currentLocations for anonymous averageDuration $averageDuration")
                            }
                        } else {
                            val metrics = updatedMetrics.getOrPut(averageDuration.symbolIdentifier) { Metrics() }
                            metrics.averageDuration = averageDuration
                        }

                    }
                    lastResult?.sampleSize?.forEach { sampleSize ->
                        val metrics = updatedMetrics.getOrPut(sampleSize.symbolIdentifier) { Metrics() }
                        metrics.sampleSize = sampleSize
                    }
                    metricsBySymbol = updatedMetrics.toImmutableMap()
                    metricsByLocation = updatedMetricsByLocation.toImmutableMap()
                    clmResult = project.agentService?.clm(ClmParams(
                        result.newRelicEntityGuid!!
                    ))
                    updateInlays()
                } catch (ex: Exception) {
                    logger.error("Error getting fileLevelTelemetry", ex)
                }
            }
        }
    }

    private suspend fun computeCurrentLocationsResult(
        column: Long,
        lineno: Long,
        commit: String,
        functionName: String,
        uri: String,
        project: Project): ComputeCurrentLocationsResult? {
        val id = "$uri:${lineno}:${column}:${commit}:${functionName}"
        val currentLocations = project.agentService?.computeCurrentLocations(
            ComputeCurrentLocationsRequest(
                uri,
                commit,
                arrayOf(
                    Markerish(
                        id,
                        arrayOf(
                            CSReferenceLocation(
                                commit,
                                CSLocation(
                                    // lineStart, colStart, lineEnd, colEnd
                                    arrayOf(
                                        lineno,
                                        0, //averageDuration.column,
                                        lineno + 1,
                                        0), null)
                            )
                        )
                    )
                )
            )
        )
        logger.info("*** got some currentLocations $currentLocations")
        return currentLocations
    }

    private var debouncedRenderBlame: Job? = null
    override fun documentChanged(event: DocumentEvent) {
        logger.info("*** documentChanged")
        debouncedRenderBlame?.cancel()
        debouncedRenderBlame = tasksCoroutineScope.launch {
            delay(750L)
            logger.info("*** debouncedRenderBlame updateInlays")
            updateInlays()
        }
    }

    private fun _clearInlays() {
        inlays.forEach {
            it.dispose()
        }
        inlays.clear()
    }

    private fun _updateInlays() {
        // For timeout and other transient errors keep showing previous CLM metrics
        if (currentError?.type == "NOT_ASSOCIATED") {
            ApplicationManager.getApplication().invokeLaterOnWriteThread {
                _clearInlays()
                updateInlayNotAssociated()
            }
        } else if (currentError == null) {
            updateInlaysCore()
        }
    }

    private fun updateInlays() {
        val thing = tasksCoroutineScope.async { updateLocations() }
        thing.invokeOnCompletion {
            runInBackground {
                _updateInlays()
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
        if (project.sessionService?.userLoggedIn?.user == null) return null
        if (path == null) return null
        return DisplayDeps(result, project, path, editor)
    }

    open suspend fun findSymbols(psiFile: PsiFile, names: List<String>): Map<String, String> {
        return mapOf<String, String>()
    }

    fun resolveSymbol(
        symbolIdentifier: MethodLevelTelemetrySymbolIdentifier,
        psiFile: PsiFile
    ): PsiElement? {
        val functionName = symbolIdentifier.functionName ?: return null
        return symbolIdentifier.className?.let { className ->
            symbolResolver.findClassFunctionFromFile(psiFile, symbolIdentifier.namespace, className, functionName)
        } ?: run {
            // Metrics can have custom name in which case we don't get Module or Class names - just best effort match function name
            symbolResolver.findTopLevelFunction(psiFile, functionName)
        }
    }

    private fun updateInlaysCore() {
        val (result, project, path, editor) = displayDeps() ?: return
        if (project.isDisposed || editor.isDisposed) {
            return
        }
        logger.info("*** updateInlaysCore actual")
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document) ?: return

        val clmElements: List<ClmElements> = symbolResolver.clmElements(psiFile, clmResult)

        val presentationFactory = HintsPresentationWorkaround.newPresentationFactory(editor)
        val since = result.sinceDateFormatted?.replace(" ago", "") ?: "30 minutes"
        val toRender: List<RenderElements> = metricsBySymbol.mapNotNull { (symbolIdentifier, metrics) ->
            val symbol = resolveSymbol(symbolIdentifier, psiFile) ?: return@mapNotNull null

            val formatted = metrics.format(appSettings.goldenSignalsInEditorFormat, since)
            val anomaly = metrics.averageDuration?.anomaly ?: metrics.errorRate?.anomaly
            val range = getTextRangeWithoutLeadingCommentsAndWhitespaces(symbol)
//            logger.info("got range $range for function ${symbolIdentifier.functionName} and textRange " +
//                "${symbol.textRange} and lspPosition ${editor.document.lspPosition(symbol.textRange.startOffset)} " +
//                "${editor.document.lspPosition(symbol.textRange.endOffset)}")
            val smartElement = SmartPointerManager.createPointer(symbol)
            val textPresentation = presentationFactory.text(formatted.first)
            val referenceOnHoverPresentation =
                presentationFactory.referenceOnHover(textPresentation, object : InlayPresentationFactory.ClickListener {
                    override fun onClick(event: MouseEvent, translated: Point) {
                        val actualSymbol = smartElement.element
                        if (actualSymbol != null) {
                            val start = editor.document.lspPosition(actualSymbol.textRange.startOffset)
                            val end = editor.document.lspPosition(actualSymbol.textRange.endOffset)
                            val range = Range(start, end)
                            project.codeStream?.show {
                                val notification = if (anomaly != null) {
                                    ObservabilityAnomalyNotifications.View(
                                        anomaly,
                                        result.newRelicEntityGuid!!
                                    )
                                } else {
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
                                }
                                project.webViewService?.postNotification(notification)
                            }
                        }
                    }
                }
                )
            RenderElements(range, referenceOnHoverPresentation, anomaly != null, null)
        }

        val clmPresentationFactory = HintsPresentationWorkaround.newPresentationFactory(editor)
        val clmToRender: List<RenderElements> = clmElements.map {
            val textPresentation = clmPresentationFactory.text(it.text)
            val smallPresentation = clmPresentationFactory.roundWithBackgroundAndSmallInset(textPresentation)
            val insetPresentation = clmPresentationFactory.inset(smallPresentation)
            RenderElements(it.range, insetPresentation, false, it.type)
        }


        val toRenderByLocation: List<RenderElements> = metricsByLocation.mapNotNull { (metricSource, metricLocation) ->
            val range = metricLocation.range
            val metrics = metricLocation.metrics
            val formatted = metrics.format(appSettings.goldenSignalsInEditorFormat, since)
            val anomaly = metrics.averageDuration?.anomaly ?: metrics.errorRate?.anomaly
            val textPresentation = presentationFactory.text(formatted.first)
            val referenceOnHoverPresentation =
                CLMInlayPresentation(editor, textPresentation, { event, translated ->
                    project.codeStream?.show {
                        val notification = if (anomaly != null) {
                            ObservabilityAnomalyNotifications.View(
                                anomaly,
                                result.newRelicEntityGuid!!
                            )
                        } else {
                            MethodLevelTelemetryNotifications.View(
                                result.error,
                                result.repo,
                                result.codeNamespace,
                                path,
                                result.relativeFilePath,
                                languageId,
                                range,
                                "(anonymous)", // TODO Get for "real"
                                result.newRelicAccountId,
                                result.newRelicEntityGuid,
                                OPTIONS,
                                metrics.nameMapping
                            )
                        }
                        project.webViewService?.postNotification(notification)
                    }
                }, object : InlayPresentationFactory.HoverListener {
                    var highlighter: RangeHighlighter? = null
                    override fun onHover(event: MouseEvent, translated: Point) {
                        // TODO better in gathering section above (find the element)
//                        val offset = metricLocation.
                        val offset = editor.logicalPositionToOffset(LogicalPosition(metricSource.lineno.toInt() - 1, metricSource.column.toInt() - 1))
                        val element = psiFile.findElementAt(offset)
                        val parentFunction = element?.findParentOfType<JSFunctionExpressionImpl<*>>()
//                        if (element != null) {
//                            logger.info("hovered element ${element.text} at ${element.textRange}")
//                        }
//                        val parent = element?.parent
//                        if (parent != null) {
//                            logger.info("hovered parent ${parent.text} at ${parent.textRange}")
//                        }
//
//                        val grandParent = parent?.parent
                        if (parentFunction != null) {
                            logger.info("hovered parentFunction ${parentFunction.text} at ${parentFunction.textRange}")
                            highlighter = editor.markupModel.addRangeHighlighter(
                                parentFunction.textRange.startOffset,
                                parentFunction.textRange.endOffset,
                                HighlighterLayer.LAST,
                                TextAttributes(
                                    null,
                                    JBColor(0x447F7F7F, 0x447F7F7F),
                                    null,
                                    null,
                                    Font.PLAIN
                                ),
                                HighlighterTargetArea.EXACT_RANGE,
                            )
//                            highlighter?.errorStripeMarkColor = green
//                            highlighter?.isThinErrorStripeMark = true
                        }

                        logger.info("onHover ${metricSource.lineno}:${metricSource.column} ${metricSource.functionName}")
                    }

                    override fun onHoverFinished() {
                        logger.info("onHoverFinished ${metricSource.lineno}:${metricSource.column} ${metricSource.functionName}")
                        highlighter?.let {
                            editor.markupModel.removeHighlighter(it)
                            highlighter = null
                        }
                    }
                }
                )
            val textRange = TextRange.create(
                editor.logicalPositionToOffset(LogicalPosition(range.start.line, range.start.character)),
                editor.logicalPositionToOffset(LogicalPosition(range.end.line, range.end.character)))
            RenderElements(textRange, referenceOnHoverPresentation, anomaly != null, null)
        }

        ApplicationManager.getApplication().invokeLaterOnWriteThread {
            if (!analyticsTracked && toRender.isNotEmpty()) {
                val params = TelemetryParams(
                    "MLT Codelenses Rendered", mapOf(
                    "NR Account ID" to (result.newRelicAccountId ?: 0),
                    "Language" to languageId,
                    "Codelense Count" to toRender.size
                )
                )
                project.agentService?.agent?.telemetry(params)
                analyticsTracked = true
            }
            _clearInlays()
            for ((range, referenceOnHoverPresentation, isAnomaly) in toRender) {
                val renderer = CLMCustomRenderer(referenceOnHoverPresentation, isAnomaly)

                val inlay = editor.inlayModel.addBlockElement(range.startOffset, false, true, 1, renderer)

                inlay.let {
                    inlays.add(it)
                }
            }
            for ((range, referenceOnHoverPresentation, isAnomaly) in toRenderByLocation) {
                val renderer = CLMCustomRenderer(referenceOnHoverPresentation, isAnomaly)

                val inlay = editor.inlayModel.addBlockElement(range.startOffset, false, true, 1, renderer)

                inlay.let {
                    inlays.add(it)
                }
            }
            for ((range, referenceOnHoverPresentation, isAnomaly, type) in clmToRender) {
                val inlay = if (type == "methodCall") {
                    val renderer = PresentationRenderer(referenceOnHoverPresentation)
                    editor.inlayModel.addInlineElement(range.startOffset, false, renderer)
                } else if (type === "class") {
                    val renderer = CLMCustomRenderer(referenceOnHoverPresentation, isAnomaly)
                    editor.inlayModel.addBlockElement(range.startOffset, false, true, 1, renderer)
                } else {
                    null
                }
                inlay?.let {
                    inlays.add(it)
                }
            }
        }
    }

    private fun updateInlayNotAssociated() {
        val (result, project, path, editor) = displayDeps() ?: return
        val presentationFactory = HintsPresentationWorkaround.newPresentationFactory(editor)
        val text = "Click to configure code-level metrics from New Relic"
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
            "Select the service on New Relic that is built from this repository to see how it's performing.",
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

    private fun isStale(): Boolean {
        return System.currentTimeMillis() - lastFetchAttempt > 60 * 1000
    }

    override fun focusGained(event: FocusEvent?) {
        if (event != null) {
            // logger.info("=== loadInlays from focus event for ${editor.displayPath}")
            tasksCoroutineScope.launch {
                loadInlays(false)
            }
        }
    }

    override fun focusLost(event: FocusEvent?) {
        // Ignore
    }
}
