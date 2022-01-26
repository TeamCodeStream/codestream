package com.codestream.settings

import com.codestream.agentService
import com.codestream.protocols.agent.TelemetryParams
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.project.ProjectManager
import javax.swing.JComponent

class CodeStreamConfigurable : SearchableConfigurable {
    private var _gui: CodeStreamConfigurableGUI? = null

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
        val settingsService = ServiceManager.getService(ApplicationSettingsService::class.java)
        val state = settingsService.state
        val gui = _gui
        gui?.let {
            val showNewCodemarkGutterIconOnHover = gui.showNewCodemarkGutterIconOnHover.isSelected
            if (state.showNewCodemarkGutterIconOnHover != showNewCodemarkGutterIconOnHover) {
                val params = TelemetryParams("Hover Compose Setting Changed", mapOf("Enabled" to showNewCodemarkGutterIconOnHover))
                ProjectManager.getInstance().openProjects.firstOrNull()?.agentService?.agent?.telemetry(params)
            }

            state.autoSignIn = gui.autoSignIn.isSelected
            state.serverUrl = if (gui.serverUrl.text.isNullOrEmpty()) gui.serverUrl.text else gui.serverUrl.text.trimEnd('/')
            state.disableStrictSSL = gui.disableStrictSSL.isSelected
            state.avatars = gui.showAvatars.isSelected
            state.showFeedbackSmiley = gui.showFeedbackSmiley.isSelected
            state.showMarkers = gui.showMarkers.isSelected
            state.showNewCodemarkGutterIconOnHover = showNewCodemarkGutterIconOnHover
            state.autoHideMarkers = gui.autoHideMarkers.isSelected
            state.proxySupport = gui.proxySupport.selectedItem as ProxySupport
            state.proxyStrictSSL = gui.proxyStrictSSL.isSelected
            state.jcef = gui.jcef.isSelected
            state.showGoldenSignalsInEditor = gui.showGoldenSignalsInEditor.isSelected
        }
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
                showAvatars.isSelected = it.avatars
                showFeedbackSmiley.isSelected = it.showFeedbackSmiley
                showMarkers.isSelected = it.showMarkers
                showNewCodemarkGutterIconOnHover.isSelected = it.showNewCodemarkGutterIconOnHover
                autoHideMarkers.isSelected = it.autoHideMarkers
                proxySupport.selectedItem = it.proxySupport
                proxyStrictSSL.isSelected = it.proxyStrictSSL
                jcef.isSelected = it.jcef
                showGoldenSignalsInEditor.isSelected = it.showGoldenSignalsInEditor
            }
        }

        _gui = gui
        return gui.rootPanel
    }
}
