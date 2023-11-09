package com.codestream.settings

import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.options.SearchableConfigurable
import javax.swing.JComponent

data class RestartOpts(
    val needsRestart: Boolean,
    val resetContext: Boolean
)

class CodeStreamConfigurable : SearchableConfigurable {
    private var _gui: CodeStreamConfigurableGUI? = null
    private val logger = Logger.getInstance(CodeStreamConfigurable::class.java)
    private val settingsService = ServiceManager.getService(ApplicationSettingsService::class.java)
    private val startingState = settingsService.state.copy()

    override fun isModified(): Boolean {
        return true
    }

    override fun getId(): String {
        return "preferences.CodeStreamConfigurable"
    }

    override fun getDisplayName(): String {
        return "CodeStream"
    }

    override fun apply() {
        val gui = _gui
        gui?.let {
            val serverUrl =
                if (gui.serverUrl.text.isNullOrEmpty()) gui.serverUrl.text else gui.serverUrl.text.trimEnd('/')
            val proxySupport = gui.proxySupport.selectedItem as ProxySupport
            val showNewCodemarkGutterIconOnHover = gui.showNewCodemarkGutterIconOnHover.isSelected
            settingsService.autoSignIn = gui.autoSignIn.isSelected
            settingsService.serverUrl = serverUrl
            settingsService.disableStrictSSL = gui.disableStrictSSL.isSelected
            settingsService.extraCerts = gui.extraCerts.text
            settingsService.showMarkers = gui.showMarkers.isSelected
            settingsService.showNewCodemarkGutterIconOnHover = showNewCodemarkGutterIconOnHover
            settingsService.setProxySupport(proxySupport)
            settingsService.proxyStrictSSL = gui.proxyStrictSSL.isSelected
            settingsService.jcef = gui.jcef.isSelected
            settingsService.showGoldenSignalsInEditor = gui.showGoldenSignalsInEditor.isSelected
            settingsService.goldenSignalsInEditorFormat = gui.goldenSignalsInEditorFormat.text
        }
    }

    private fun needsAgentRestart(): RestartOpts {
        val needsRestart = settingsService.serverUrl != startingState.serverUrl ||
            settingsService.disableStrictSSL != startingState.disableStrictSSL ||
            settingsService.proxyStrictSSL != startingState.proxyStrictSSL ||
            settingsService.proxySupport != startingState.proxySupport.value ||
            settingsService.extraCerts != startingState.extraCerts
        val needsResetContext = settingsService.serverUrl != startingState.serverUrl
        return RestartOpts(needsRestart, needsResetContext)
    }

    private fun checkAgentRestartNeeded() {
        val restartOpts = needsAgentRestart()
        if (restartOpts.needsRestart) {
            logger.info("Opening restart notification")
            settingsService.fireCriticalConfigChange(restartOpts.resetContext)
        }
    }

    // Check if restart needed on "close" / disposeUIResources
    override fun disposeUIResources() {
        checkAgentRestartNeeded()
        super.disposeUIResources()
    }

    override fun createComponent(): JComponent? {
        val gui = CodeStreamConfigurableGUI()
        val settingsService = ServiceManager.getService(ApplicationSettingsService::class.java)
        val state = settingsService.state

        state.let {
            gui.apply {
                autoSignIn.isSelected = it.autoSignIn
                serverUrl.text = it.serverUrl
                disableStrictSSL.isSelected = it.disableStrictSSL
                extraCerts.text = it.extraCerts
                showMarkers.isSelected = it.showMarkers
                showNewCodemarkGutterIconOnHover.isSelected = it.showNewCodemarkGutterIconOnHover
                proxySupport.selectedItem = it.proxySupport
                proxyStrictSSL.isSelected = it.proxyStrictSSL
                jcef.isSelected = it.jcef
                showGoldenSignalsInEditor.isSelected = it.showGoldenSignalsInEditor
                goldenSignalsInEditorFormat.text = it.goldenSignalsInEditorFormat
            }
        }

        _gui = gui
        return gui.rootPanel
    }
}
