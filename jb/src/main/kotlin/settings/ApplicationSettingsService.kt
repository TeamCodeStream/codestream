package com.codestream.settings

import com.codestream.DEBUG
import com.codestream.protocols.agent.Extension
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
const val DEFAULT_GOLDEN_SIGNALS_FORMAT =
    "avg duration: \${averageDuration} | throughput: \${throughput} | error rate: \${errorsPerMinute} - since \${since}"

enum class ProxySupport(val value: String, val label: String) {
    ON("on", "On"),
    OFF("off", "Off");

    override fun toString() = label
}

interface GoldenSignalListener {
    fun setEnabled(value: Boolean)
    fun setMLTFormat(value: String)
}

interface ConfigChangeListener {
    fun onCriticalConfigurationChange(resetContext: Boolean);
}

data class ApplicationSettingsServiceState(
    var autoSignIn: Boolean = true,
    var email: String? = null,
    var serverUrl: String = API_PROD,
    var disableStrictSSL: Boolean = false,
    var extraCerts: String? = null,
    var avatars: Boolean = true,
    var showFeedbackSmiley: Boolean = true,
    var showMarkers: Boolean = true,
    var showNewCodemarkGutterIconOnHover: Boolean = true,
    var showGitBlame: Boolean = true,
    var autoHideMarkers: Boolean = false,
    var proxySupport: ProxySupport = ProxySupport.ON,
    var proxyStrictSSL: Boolean = true,
    var firstRun: Boolean = true,
    var jcef: Boolean = true,
    var createReviewOnCommit: Boolean = true,
    var showGoldenSignalsInEditor: Boolean = true,
    var goldenSignalsInEditorFormat: String = DEFAULT_GOLDEN_SIGNALS_FORMAT,
)

@State(name = "CodeStream", storages = [Storage("codestream.xml")])
class ApplicationSettingsService : PersistentStateComponent<ApplicationSettingsServiceState> {
    private var _state = ApplicationSettingsServiceState()
    private val logger = Logger.getInstance(ApplicationSettingsService::class.java)
    private val goldenSignalListeners = mutableSetOf<GoldenSignalListener>()
    private val configChangeListeners = mutableSetOf<ConfigChangeListener>()

    override fun getState(): ApplicationSettingsServiceState = _state

    override fun loadState(state: ApplicationSettingsServiceState) {
        state.serverUrl = if (state.serverUrl.isNullOrEmpty()) state.serverUrl else state.serverUrl.trimEnd('/')
        _state = state
    }

    fun addGoldenSignalsListener(listener: GoldenSignalListener) {
        goldenSignalListeners.add(listener)
    }

    fun removeGoldenSignalsListener(listener: GoldenSignalListener) {
        goldenSignalListeners.remove(listener)
    }

    fun addConfigChangeListener(listener: ConfigChangeListener) {
        configChangeListeners.add(listener)
    }

    fun removeConfigChangeListener(listener: ConfigChangeListener) {
        configChangeListeners.remove(listener)
    }

    val environmentVersion: String
        get() = PluginManager.getPlugin(
            PluginId.findId("com.codestream.jetbrains-codestream")
        )!!.version

    val extensionInfo get() = Extension(environmentVersion)

    val traceLevel get() = if (logger.isDebugEnabled) TraceLevel.DEBUG else TraceLevel.VERBOSE

    val isDebugging get() = DEBUG

    var autoHideMarkers
        get() = state.autoHideMarkers
        set(value) {
            state.autoHideMarkers = value
        }

    var showMarkers
        get() = state.showMarkers
        set(value) {
            state.showMarkers = value
        }

    var showNewCodemarkGutterIconOnHover
        get() = state.showNewCodemarkGutterIconOnHover
        set(value) {
            state.showNewCodemarkGutterIconOnHover = value
        }

    var showGitBlame
        get() = state.showGitBlame
        set(value) {
            state.showGitBlame = value
        }
    var serverUrl
        get() = state.serverUrl
        set(value) {
            state.serverUrl = value
        }

    var disableStrictSSL
        get() = state.disableStrictSSL
        set(value) {
            state.disableStrictSSL = value
        }

    var extraCerts
        get() = state.extraCerts
        set(value) {
            state.extraCerts = value
        }

    val email get() = state.email

    var showFeedbackSmiley
        get() = state.showFeedbackSmiley
        set(value) {
            state.showFeedbackSmiley = value
        }

    var autoSignIn
        get() = state.autoSignIn
        set(value) {
            state.autoSignIn = value
        }

    var avatars
        get() = state.avatars
        set(value) {
            state.avatars = value
        }

    var jcef
        get() = state.jcef
        set(value) {
            state.jcef = value
        }

    var showGoldenSignalsInEditor
        get() = state.showGoldenSignalsInEditor
        set(value) {
            val changed = state.showGoldenSignalsInEditor != value
            state.showGoldenSignalsInEditor = value
            if (changed) {
                fireGoldenSignalEnabledChange(value)
            }
        }
    var goldenSignalsInEditorFormat
        get() = state.goldenSignalsInEditorFormat
        set(value) {
            val changed = state.goldenSignalsInEditorFormat != value
            state.goldenSignalsInEditorFormat = value
            if (changed) {
                fireGoldenSignalFormatChange(value)
            }
        }

    private fun fireGoldenSignalFormatChange(value: String) {
        for (listener in goldenSignalListeners) {
            listener.setMLTFormat(value)
        }
    }

    private fun fireGoldenSignalEnabledChange(value: Boolean) {
        for (listener in goldenSignalListeners) {
            listener.setEnabled(value)
        }
    }

    fun fireCriticalConfigChange(resetContext: Boolean) {
        for (listener in configChangeListeners) {
            listener.onCriticalConfigurationChange(resetContext)
        }
    }

    var firstRun
        get() = state.firstRun
        set(value) {
            state.firstRun = value
        }

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

    val proxySupport: String
        get() =
            if (state.proxySupport == ProxySupport.ON && proxySettings != null)
                "override"
            else
                state.proxySupport.value

    // proxySupport get() property is returns a string for "override" case - different function here for ProxySupport type
    fun setProxySupport(value: ProxySupport) {
        state.proxySupport = value
    }

    var proxyStrictSSL
        get() = state.proxyStrictSSL
        set(value) {
            state.proxyStrictSSL = value
        }

    val credentialAttributes: CredentialAttributes
        get() {
            val serviceName = generateServiceName("CodeStream", state.serverUrl)
            val userName = state.email
            return CredentialAttributes(serviceName, userName)
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
