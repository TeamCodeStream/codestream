package com.codestream.widgets

import com.codestream.codeStream
import com.codestream.sessionService
import com.codestream.settings.ApplicationSettingsService
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.util.Consumer
import java.awt.Component
import java.awt.event.MouseEvent

class CodeStreamStatusBarWidget(val project: Project) : StatusBarWidget, StatusBarWidget.TextPresentation {

    private val appSettings = ServiceManager.getService(ApplicationSettingsService::class.java)
    var myStatusBar: StatusBar? = null

    init {
        project.sessionService?.let {
            it.onEnvironmentInfoChanged { refresh() }
            it.onUserLoggedInChanged { refresh() }
            it.onMentionsChanged { refresh() }
        }
    }

    fun refresh() {
        myStatusBar?.updateWidget(ID())
    }

    override fun ID() = "CodeStream.StatusBar"

    override fun getPresentation(type: StatusBarWidget.PlatformType) = this

    override fun install(statusBar: StatusBar) {
        myStatusBar = statusBar
        refresh()
    }

    override fun dispose() = Unit

    override fun getTooltipText() = "Click to open CodeStream"

    override fun getMaxPossibleText() = tooltipText

    override fun getClickConsumer() = Consumer<MouseEvent> {
        project.codeStream?.toggleVisible()
    }

    override fun getText(): String {
        val sessionService = project.sessionService ?: return ""

        val prefix = sessionService.environmentInfo.let {
            when(it.environment) {
                "prod", "us", "eu", "unknown" -> "CodeStream: "
                else -> "${it.environment.toUpperCase()}: "
            }
        }

        val userLoggedIn = sessionService.userLoggedIn ?: return "$prefix Sign in..."
        val username = if (userLoggedIn.companiesCount == 1) {
            userLoggedIn.user.username
        } else {
            userLoggedIn.user.username + " - " + userLoggedIn.company.name
        }

        val suffix = when (sessionService.mentions) {
            0 -> ""
            in 1..19 -> "(${sessionService.mentions})"
            else -> "(20+)"
        }

        return "$prefix $username $suffix"
    }

    override fun getAlignment(): Float {
        return Component.RIGHT_ALIGNMENT
    }
}
