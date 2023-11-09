package com.codestream.clm

import com.codestream.agentService
import com.codestream.extensions.prettyRange
import com.codestream.extensions.startWithName
import com.codestream.extensions.stats
import com.codestream.extensions.toRangeIgnoreColumn
import com.codestream.protocols.agent.CSReferenceLocation
import com.codestream.protocols.agent.ComputeCurrentLocationsRequest
import com.codestream.protocols.agent.ComputeCurrentLocationsResult
import com.codestream.protocols.agent.FileLevelTelemetryResult
import com.codestream.protocols.agent.Markerish
import com.codestream.protocols.agent.MethodLevelTelemetryAverageDuration
import com.codestream.protocols.agent.MethodLevelTelemetryErrorRate
import com.codestream.protocols.agent.MethodLevelTelemetrySampleSize
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.collections.immutable.ImmutableMap
import kotlinx.collections.immutable.toImmutableMap

class MetricsByLocationManager {
    private val logger = Logger.getInstance(MetricsByLocationManager::class.java)

    suspend fun getMetricsByLocation(fileLevelTelemetry: FileLevelTelemetryResult,
                                     uri: String,
                                     project: Project): ImmutableMap<MetricSource, MetricLocation> {
        val updatedMetricsByLocation = mutableMapOf<MetricSource, MetricLocation>()
        val metricsByLocationCalculationsStopwatch = startWithName("metricsByLocationCalculations")
        if (fileLevelTelemetry.errorRate != null) {
            processErrorRate(fileLevelTelemetry.errorRate, uri, project, updatedMetricsByLocation, fileLevelTelemetry.deploymentCommit)
        }
        if (fileLevelTelemetry.averageDuration != null) {
            processAverageDuration(fileLevelTelemetry.averageDuration, uri, project, updatedMetricsByLocation, fileLevelTelemetry.deploymentCommit)
        }
        if (fileLevelTelemetry.sampleSize != null) {
            processSampleSize(fileLevelTelemetry.sampleSize, uri, updatedMetricsByLocation)
        }
        metricsByLocationCalculationsStopwatch.stop()
        logger.debug(metricsByLocationCalculationsStopwatch.stats())
        return updatedMetricsByLocation.toImmutableMap()
    }

    private suspend fun processErrorRate(
        errorRates: List<MethodLevelTelemetryErrorRate>,
        uri: String,
        project: Project,
        updatedMetricsByLocation: MutableMap<MetricSource, MetricLocation>,
        deploymentCommit: String?) {
        for (errorRate in errorRates) {
            val theCommit = errorRate.commit ?: deploymentCommit
            if (errorRate.functionName == "(anonymous)" && errorRate.column != null &&
                errorRate.lineno != null && theCommit != null) {
                val currentLocations = computeCurrentLocationsResult(
                    errorRate.lineno,
                    errorRate.column,
                    theCommit,
                    errorRate.functionName,
                    uri,
                    project)
                if (currentLocations != null &&
                    currentLocations.locations.isNotEmpty() &&
                    currentLocations.locations.entries.first().value.meta?.entirelyDeleted != true) {
//                    currentLocations.locations.entries.first().value.meta?.startWasDeleted != true) {
                    // TODO multiple results
                    val location = currentLocations.locations.entries.first()
                    val range = location.value.toRangeIgnoreColumn()
                    val metricSource = MetricSource(errorRate.lineno,
                        errorRate.column,
                        theCommit,
                        errorRate.functionName,
                        uri)
                    val metricLocation = updatedMetricsByLocation.getOrPut(metricSource) {
                        MetricLocation(Metrics(), range)
                    }
                    metricLocation.metrics.errorRate = errorRate
                    logger.debug("added anonymous errorRate $errorRate to ${range.prettyRange()}")
                } else {
                    logger.debug("no currentLocations for anonymous errorRate $errorRate")
                }
            }
        }
    }

    private suspend fun processAverageDuration(
        averageDurations: List<MethodLevelTelemetryAverageDuration>,
        uri: String,
        project: Project,
        updatedMetricsByLocation: MutableMap<MetricSource, MetricLocation>,
        deploymentCommit: String?
    ) {
        for (averageDuration in averageDurations) {
            val theCommit = averageDuration.commit ?: deploymentCommit
            if (averageDuration.functionName == "(anonymous)" && averageDuration.column != null
                && averageDuration.lineno != null && theCommit != null) {
                val currentLocations = computeCurrentLocationsResult(
                    averageDuration.lineno,
                    averageDuration.column,
                    theCommit,
                    averageDuration.functionName,
                    uri,
                    project)
                if (currentLocations != null &&
                    currentLocations.locations.isNotEmpty() &&
                    currentLocations.locations.entries.first().value.meta?.entirelyDeleted != true)// &&
                // currentLocations.locations.entries.first().value.meta?.startWasDeleted != true)
                {
                    // val startOffset = editor.logicalPositionToOffset(LogicalPosition(it.value.lineStart, it.value.colStart))
                    // val endOffset = editor.logicalPositionToOffset(LogicalPosition(it.value.lineEnd, it.value.colEnd))
                    val location = currentLocations.locations.entries.first()
                    val range = location.value.toRangeIgnoreColumn()
                    // TODO multiple per same line? (map to array)
                    val metricSource = MetricSource(averageDuration.lineno,
                        averageDuration.column,
                        theCommit,
                        averageDuration.functionName,
                        uri)
                    val metricLocation = updatedMetricsByLocation.getOrPut(metricSource) {
                        MetricLocation(Metrics(), range)
                    }
                    metricLocation.metrics.averageDuration = averageDuration
                    logger.debug("added anonymous averageDuration $averageDuration to ${range.prettyRange()}")
                } else {
                    logger.debug("no currentLocations for anonymous averageDuration $averageDuration")
                }
            }
        }
    }

    private fun processSampleSize(
        sampleSizes: List<MethodLevelTelemetrySampleSize>,
        uri: String,
        updatedMetricsByLocation: MutableMap<MetricSource, MetricLocation>
    ) {
        for (sampleSize in sampleSizes) {
            if (sampleSize.functionName == "(anonymous)" && sampleSize.column != null
                && sampleSize.lineno != null && sampleSize.commit != null) {
                val metricSource = MetricSource(sampleSize.lineno,
                    sampleSize.column,
                    sampleSize.commit,
                    sampleSize.functionName,
                    uri)
                val metricLocation = updatedMetricsByLocation.get(metricSource)
                if (metricLocation != null) {
                    metricLocation.metrics.sampleSize = sampleSize
                    logger.debug("added anonymous sampleSize $sampleSize to ${metricLocation.range.prettyRange()}")
                } else {
                    logger.debug("no metricLocation for anonymous sampleSize $sampleSize")
                }
            }
        }
    }

    private suspend fun computeCurrentLocationsResult(
        lineno: Int,
        column: Int,
        commit: String,
        functionName: String,
        uri: String,
        project: Project): ComputeCurrentLocationsResult? {
        // TODO determine if agent caches these lookups, otherwise we should cache per invocation since each error,
        //  duration, and sampleSize will be for the same location
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
                                // lineStart, colStart, lineEnd, colEnd, meta
                                arrayOf(
                                    lineno,
                                    0, //averageDuration.column,
                                    lineno, // lineno + 1,
                                    0,
                                    null)

                            )
                        )
                    )
                )
            )
        )
        return currentLocations
    }
}
