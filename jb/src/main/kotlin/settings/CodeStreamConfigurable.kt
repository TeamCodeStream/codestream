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

            settingsService.autoSignIn = gui.autoSignIn.isSelected
            settingsService.serverUrl = if (gui.serverUrl.text.isNullOrEmpty()) gui.serverUrl.text else gui.serverUrl.text.trimEnd('/')
            settingsService.disableStrictSSL = gui.disableStrictSSL.isSelected
            settingsService.avatars = gui.showAvatars.isSelected
            settingsService.showFeedbackSmiley = gui.showFeedbackSmiley.isSelected
            settingsService.showMarkers = gui.showMarkers.isSelected
            settingsService.showNewCodemarkGutterIconOnHover = showNewCodemarkGutterIconOnHover
            settingsService.autoHideMarkers = gui.autoHideMarkers.isSelected
            settingsService.setProxySupport(gui.proxySupport.selectedItem as ProxySupport)
            settingsService.proxyStrictSSL = gui.proxyStrictSSL.isSelected
            settingsService.jcef = gui.jcef.isSelected
            settingsService.showGoldenSignalsInEditor = gui.showGoldenSignalsInEditor.isSelected
            settingsService.goldenSignalsInEditorFormat = gui.goldenSignalsInEditorFormat.text
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
                goldenSignalsInEditorFormat.text = it.goldenSignalsInEditorFormat
            }
        }

        _gui = gui
        return gui.rootPanel
    }
}
