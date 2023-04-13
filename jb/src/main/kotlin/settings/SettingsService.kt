package com.codestream.settings

import com.codestream.agentService
import com.codestream.appDispatcher
import com.codestream.codeStream
import com.codestream.gson
import com.codestream.protocols.webview.ShowProgressIndicator
import com.codestream.protocols.webview.WebViewContext
import com.codestream.sessionService
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.github.salomonbrys.kotson.jsonObject
import com.github.salomonbrys.kotson.set
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.credentialStore.CredentialAttributes
import com.intellij.credentialStore.generateServiceName
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import kotlinx.coroutines.launch
import kotlin.properties.Delegates

const val INLINE_CODEMARKS = "viewCodemarksInline"

data class SettingsServiceState(
    var teamId: String? = null,
    var webViewConfig: MutableMap<String, String?> = mutableMapOf(
        INLINE_CODEMARKS to "true"
    ),
    var webViewContext: String = "{}"
)

@State(name = "CodeStream", storages = [Storage("codestream.xml")])
class SettingsService(val project: Project) : PersistentStateComponent<SettingsServiceState>, ConfigChangeListener {
    private val logger = Logger.getInstance(SettingsService::class.java)
    private val applicationSettings = ServiceManager.getService(ApplicationSettingsService::class.java)
    private var _state = SettingsServiceState()

    init {
        applicationSettings.addConfigChangeListener(this)
        Disposer.register(project) {
            applicationSettings.removeConfigChangeListener(this)
        }
    }

    override fun getState(): SettingsServiceState = _state

    override fun loadState(state: SettingsServiceState) {
        _state = state
    }

    override fun onCriticalConfigurationChange(resetContext: Boolean) {
        restartAgent(resetContext)
    }

    val currentStreamId get() = webViewContext?.currentStreamId
    val currentCodemarkId get() = webViewContext?.currentCodemarkId

    var webViewContext by Delegates.observable<WebViewContext?>(null) { _, _, new ->
        _webViewContextObservers.forEach { it(new) }
    }

    fun credentialAttributes(includeTeam: Boolean = true, serverUrl: String? = null, teamId: String? = null, userName: String? = null): CredentialAttributes {
        val actualTeamId = teamId ?: state.teamId ?: applicationSettings.state.teamId
        val teamSuffix = if (includeTeam && actualTeamId != null) actualTeamId.let { "|${it}" } else ""
        val actualServerUrl = serverUrl ?: applicationSettings.state.serverUrl;
        val actualUserName = userName ?: applicationSettings.state.email
        val serviceName = generateServiceName("CodeStream", actualServerUrl + teamSuffix)
        return CredentialAttributes(serviceName, actualUserName)
    }

    fun storedTeamId(): String? {
        return state.teamId ?: applicationSettings.state.teamId
    }

    // 💩: I HATE THIS
    fun set(name: String, value: String?) {
        if (state.webViewConfig.containsKey(name)) {
            state.webViewConfig[name] = value
        }
    }

    private fun restartAgent(resetContext: Boolean) {
        logger.info("Restarting agent on config change, resetContext: $resetContext")
        if (resetContext) {
            clearWebViewContext()
            project.sessionService?.logout() // clear out project.sessionService?.userLoggedIn?.team?.id
            state.teamId = null
            applicationSettings.state.teamId = null
        }
        appDispatcher.launch {
            try {
                project.webViewService?.postNotification(
                    ShowProgressIndicator.Start()
                )
                project.agentService?.restart(null, applicationSettings.autoSignIn)
                project.agentService?.onDidStart {
                    project.webViewService?.load()
                }
            } catch (t: Throwable) {
                logger.error("Error restarting agent", t)
            }
        }
    }

    fun getWebViewContextJson(): JsonElement {
        var jsonObject = gson.fromJson<JsonObject>(state.webViewContext)
        project.sessionService?.userLoggedIn?.team?.id.let {
            jsonObject["currentTeamId"] = it
        }
        val codeStream = project.codeStream
        jsonObject["hasFocus"] =
            if (codeStream != null) codeStream.isVisible && codeStream.isFocused
            else false

        jsonObject["__teamless__"] = jsonObject["__teamless__"] ?: JsonObject()
        val teamless = jsonObject["__teamless__"].asJsonObject
        val selectedRegion = teamless["selectedRegion"]
        if (selectedRegion == null || selectedRegion.isJsonNull || selectedRegion.asString.isNullOrBlank()) {
            project.sessionService?.environmentInfo?.environmentHosts?.let { hosts ->
                val shortNames = hosts.map { it.shortName }
                teamless["selectedRegion"] =
                    shortNames.find { it.lowercase().contains("us") } ?: shortNames.firstOrNull()
            }
        }

        return jsonObject
    }

    fun clearWebViewContext() {
        setWebViewContextJson(jsonObject())
    }

    fun setWebViewContextJson(json: JsonElement) {
        state.webViewContext = json.toString()
        webViewContext = gson.fromJson(json)
    }

    private val _webViewContextObservers = mutableListOf<(WebViewContext?) -> Unit>()
    fun onWebViewContextChanged(observer: (WebViewContext?) -> Unit) {
        _webViewContextObservers += observer
    }
}
