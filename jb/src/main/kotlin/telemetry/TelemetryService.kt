package com.codestream.telemetry

import com.codestream.gson
import com.codestream.protocols.agent.Ide
import com.codestream.settings.ApplicationSettingsService
import com.github.salomonbrys.kotson.fromJson
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.util.io.HttpRequests

class TelemetryService(val project: Project) {

    private val logger = Logger.getInstance(TelemetryService::class.java)

    val telemetryOptions: TelemetryOptions? by lazy {
        fetchTelemetryOptions()
    }

    private fun fetchTelemetryOptions(): TelemetryOptions? {
        try {
            val settings = ServiceManager.getService(ApplicationSettingsService::class.java) ?: return null
            val url = settings.serverUrl
            val jsonStr = HttpRequests
                .request("${url.trim()}/no-auth/nr-ingest-key")
                .tuner { c -> c.setRequestProperty("X-CS-Plugin-IDE", Ide.name) }
                .tuner { c -> c.setRequestProperty("X-CS-Override-Maintenance-Mode", "xyz123") }
                .connectTimeout(5000)
                .readTimeout(5000)
                .readString()

            return gson.fromJson<TelemetryOptions>(jsonStr).also {
                it.error?.let {
                    logger.warn(it)
                }
            }
        } catch (e: Exception) {
            logger.warn(e)
            return null
        }
    }

}