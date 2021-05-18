package com.codestream.authentication

import com.codestream.agent.ApiVersionCompatibility
import com.codestream.agent.DidChangeApiVersionCompatibilityNotification
import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.extensions.merge
import com.codestream.gson
import com.codestream.protocols.agent.LoginResult
import com.codestream.protocols.agent.LoginWithTokenParams
import com.codestream.protocols.webview.BootstrapResponse
import com.codestream.protocols.webview.Capabilities
import com.codestream.protocols.webview.DidChangeApiVersionCompatibility
import com.codestream.protocols.webview.Ide
import com.codestream.protocols.webview.UserSession
import com.codestream.sessionService
import com.codestream.settings.ApplicationSettingsService
import com.codestream.settingsService
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.credentialStore.Credentials
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.future.await

class AuthenticationService(val project: Project) {

    private val extensionCapabilities: JsonElement get() = gson.toJsonTree(Capabilities())
    private val appSettings = ServiceManager.getService(ApplicationSettingsService::class.java)

    private val logger = Logger.getInstance(AuthenticationService::class.java)
    private var mergedCapabilities: JsonElement = extensionCapabilities
    private var apiVersionCompatibility: ApiVersionCompatibility? = null
    private var missingCapabilities: JsonObject? = null

    fun bootstrap(): Any? {
        val settings = project.settingsService ?: return Unit
        val session = project.sessionService ?: return Unit

        return BootstrapResponse(
            UserSession(session.userLoggedIn?.userId),
            mergedCapabilities,
            appSettings.webViewConfigs,
            settings.getWebViewContextJson(),
            appSettings.extensionInfo.versionFormatted,
            Ide(appSettings.ideInfo.name, appSettings.ideInfo.detail),
            apiVersionCompatibility,
            missingCapabilities
        )
    }

    /**
     * Attempts to auto-sign in using a token stored in the password safe. Returns false
     * only if the token login fails or in case of an exception. If the auto-login fails for
     * other reasons such as an error retrieving the token, it will log the reason but still return true.
     */
    suspend fun autoSignIn(): Boolean {
        val settings = project.settingsService
            ?: return true.also { logger.warn("Auto sign-in failed: settings service not available") }
        if (!appSettings.autoSignIn)
            return true.also { logger.warn("Auto sign-in failed: auto sign-in disabled") }
        val tokenStr = PasswordSafe.instance.getPassword(appSettings.credentialAttributes)
            ?: return true.also { logger.warn("Auto sign-in failed: unable to retrieve token from password safe") }
        val agent = project.agentService?.agent
            ?: return true.also { logger.warn("Auto sign-in failed: agent service not available") }

        try {
            val token = gson.fromJson<JsonObject>(tokenStr)
            val loginResult =
                agent.loginToken(
                    LoginWithTokenParams(
                        token,
                        settings.state.teamId,
                        appSettings.team
                    )
                ).await()

            return if (loginResult.error != null) {
                logger.warn(loginResult.error)
                settings.state.teamId = null
                saveAccessToken(null)
                logger.info("Auto sign-in failed: ${loginResult.error}")
                false
            } else {
                completeLogin(loginResult)
                logger.info("Auto sign-in successful")
                true
            }
        } catch (err: Exception) {
            logger.warn(err)
            return false
        }
    }

    fun completeLogin(result: LoginResult) {
        if (project.sessionService?.userLoggedIn == null) {
            result.state?.let {
                mergedCapabilities = extensionCapabilities.merge(it.capabilities)
                project.settingsService?.state?.teamId = it.teamId
                saveAccessToken(it.token)
            }
            project.sessionService?.login(result.userLoggedIn)
        }
    }

    suspend fun logout() {
        val agent = project.agentService ?: return
        val session = project.sessionService ?: return
        val settings = project.settingsService ?: return

        session.logout()
        agent.restart()
        settings.state.teamId = null
        saveAccessToken(null)
    }

    fun onApiVersionChanged(notification: DidChangeApiVersionCompatibilityNotification) {
        apiVersionCompatibility = notification.compatibility
        if (notification.compatibility == ApiVersionCompatibility.API_UPGRADE_RECOMMENDED) {
            missingCapabilities = notification.missingCapabilities
        }

        project.webViewService?.postNotification(DidChangeApiVersionCompatibility())
        if (notification.compatibility != ApiVersionCompatibility.API_COMPATIBLE) {
            ApplicationManager.getApplication().invokeLater {
                project.codeStream?.show()
            }
        }
    }

    private fun saveAccessToken(accessToken: JsonObject?) {
        if (accessToken != null) {
            logger.info("Saving access token to password safe")
        } else {
            logger.info("Clearing access token from password safe")
        }

        val credentials = accessToken?.let {
            Credentials(null, it.toString())
        }

        PasswordSafe.instance.set(
            appSettings.credentialAttributes,
            credentials
        )
    }
}
