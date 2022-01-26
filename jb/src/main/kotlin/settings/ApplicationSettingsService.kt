package com.codestream.settings

import com.codestream.DEBUG
import com.codestream.protocols.agent.Extension
import com.codestream.protocols.agent.Ide
import com.codestream.protocols.agent.ProxySettings
import com.codestream.protocols.agent.TraceLevel
import com.codestream.protocols.webview.Configs
import com.intellij.credentialStore.CredentialAttributes
import com.intellij.credentialStore.generateServiceName
import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.extensions.PluginId
import com.intellij.util.io.encodeUrlQueryParameter
import com.intellij.util.net.HttpConfigurable

const val API_PD = "https://pd-api.codestream.us"
const val API_QA = "https://qa-api.codestream.us"
const val API_PROD = "https://api.codestream.com"

enum class ProxySupport(val value: String, val label: String) {
    ON("on", "On"),
    OFF("off", "Off");

    override fun toString() = label
}

data class ApplicationSettingsServiceState(
    var autoSignIn: Boolean = true,
    var email: String? = null,
    var serverUrl: String = API_PROD,
    var disableStrictSSL: Boolean = false,
    var avatars: Boolean = true,
    var showFeedbackSmiley: Boolean = true,
    var showMarkers: Boolean = true,
    var showNewCodemarkGutterIconOnHover: Boolean = true,
    var autoHideMarkers: Boolean = false,
    var proxySupport: ProxySupport = ProxySupport.ON,
    var proxyStrictSSL: Boolean = true,
    var firstRun: Boolean = true,
    var jcef: Boolean = true,
    var createReviewOnCommit: Boolean = true,
    var showGoldenSignalsInEditor: Boolean = true
)

@State(name = "CodeStream", storages = [Storage("codestream.xml")])
class ApplicationSettingsService : PersistentStateComponent<ApplicationSettingsServiceState> {
    private var _state = ApplicationSettingsServiceState()
    private val logger = Logger.getInstance(ApplicationSettingsService::class.java)

    override fun getState(): ApplicationSettingsServiceState = _state

    override fun loadState(state: ApplicationSettingsServiceState) {
        state.serverUrl = if (state.serverUrl.isNullOrEmpty()) state.serverUrl else state.serverUrl.trimEnd('/')
        _state = state
    }

    val environmentVersion: String
        get() = PluginManager.getPlugin(
            PluginId.findId("com.codestream.jetbrains-codestream")
        )!!.version
    val extensionInfo get() = Extension(environmentVersion)
    val ideInfo get() = Ide()
    val traceLevel get() = if (logger.isDebugEnabled) TraceLevel.DEBUG else TraceLevel.VERBOSE
    val isDebugging get() = DEBUG
    val autoHideMarkers get() = state.autoHideMarkers
    val showMarkers get() = state.showMarkers
    val showNewCodemarkGutterIconOnHover get() = state.showNewCodemarkGutterIconOnHover
    var serverUrl
        get() = state.serverUrl
        set(value) { state.serverUrl = value }
    var disableStrictSSL
        get() = state.disableStrictSSL
        set(value) { state.disableStrictSSL = value }
    val email get() = state.email
    val showFeedbackSmiley get() = state.showFeedbackSmiley
    val autoSignIn get() = state.autoSignIn
    val jcef get() = state.jcef
    var firstRun
        get() = state.firstRun
        set(value) { state.firstRun = value }

    val proxySettings
        get(): ProxySettings? {
            val httpConfig = HttpConfigurable.getInstance()
            return if (httpConfig.USE_HTTP_PROXY && !httpConfig.PROXY_HOST.isNullOrBlank()) {
                val url = StringBuilder("http://")

                if (httpConfig.PROXY_AUTHENTICATION) {
                    val login = httpConfig.proxyLogin?.encodeUrlQueryParameter()
                    val password = httpConfig.plainProxyPassword?.encodeUrlQueryParameter()
                    url.append("${login}:${password}@")
                }

                url.append(httpConfig.PROXY_HOST)

                if (httpConfig.PROXY_PORT != null) {
                    url.append(":${httpConfig.PROXY_PORT}")
                }

                return ProxySettings(url.toString(), state.proxyStrictSSL)
            } else {
                null
            }
        }

    val proxySupport
        get(): String? =
            if (state.proxySupport == ProxySupport.ON && proxySettings != null)
                "override"
            else
                state.proxySupport.value

    val credentialAttributes: CredentialAttributes
        get() {
            // https://youtrack.jetbrains.com/issue/IDEA-223257?p=WI-48781
            val constructor = CredentialAttributes::class.constructors.first()
            val serviceName = generateServiceName("CodeStream", state.serverUrl)
            val userName = state.email
            return if (constructor.parameters.size == 4) {
                constructor.call(serviceName, userName, null, false)
            } else {
                constructor.call(serviceName, userName, null, false, true)
            }
        }

    val webViewConfigs
        get() = Configs(
            state.serverUrl,
            state.email,
            state.avatars,
            isDebugging,
            state.showFeedbackSmiley,
            state.showGoldenSignalsInEditor
        )
}
