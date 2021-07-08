package com.codestream.agent

import com.codestream.agentService
import com.codestream.authenticationService
import com.codestream.codeStream
import com.codestream.editorService
import com.codestream.extensions.workspaceFolders
import com.codestream.gson
import com.codestream.notificationComponent
import com.codestream.protocols.agent.EnvironmentInfo
import com.codestream.protocols.agent.LoginResult
import com.codestream.reviewService
import com.codestream.sessionService
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.github.salomonbrys.kotson.get
import com.github.salomonbrys.kotson.jsonObject
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import git4idea.GitUtil
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.ConfigurationParams
import org.eclipse.lsp4j.MessageActionItem
import org.eclipse.lsp4j.MessageParams
import org.eclipse.lsp4j.MessageType
import org.eclipse.lsp4j.PublishDiagnosticsParams
import org.eclipse.lsp4j.RegistrationParams
import org.eclipse.lsp4j.ShowMessageRequestParams
import org.eclipse.lsp4j.TextDocumentIdentifier
import org.eclipse.lsp4j.UnregistrationParams
import org.eclipse.lsp4j.WorkspaceFolder
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest
import org.eclipse.lsp4j.services.LanguageClient
import java.util.concurrent.CompletableFuture

class CodeStreamLanguageClient(private val project: Project) : LanguageClient {

    private val logger = Logger.getInstance(CodeStreamLanguageClient::class.java)

    @JsonNotification("codestream/didChangeDocumentMarkers")
    fun didChangeDocumentMarkers(notification: DidChangeDocumentMarkersNotification) {
        notification.textDocument.uri?.let {
            project.editorService?.updateMarkers(it)
        }
        project.webViewService?.postNotification("codestream/didChangeDocumentMarkers", notification)
    }

    @JsonNotification("codestream/didChangePullRequestComments")
    fun didChangePullRequestComments(notification: DidChangePullRequestCommentsNotification) {
        project.editorService?.updatePullRequestDiffMarkers()
    }

    @JsonNotification("codestream/didChangeData")
    fun didChangeData(json: JsonElement) {
        project.webViewService?.postNotification("codestream/didChangeData", json)

        val session = project.sessionService ?: return
        val notification = gson.fromJson<DidChangeDataNotification>(json)

        when (notification.type) {
            "unreads" -> session.didChangeUnreads(gson.fromJson(notification.data))
            "posts" -> session.didChangePosts(gson.fromJson(notification.data))
            "preferences" -> {
                session.didChangePreferences(gson.fromJson(notification.data))
                project.editorService?.updateMarkers()
            }
            "pullRequests" -> session.didChangePullRequests(gson.fromJson(notification.data))
        }
    }

    @JsonNotification("codestream/didChangeConnectionStatus")
    fun didChangeConnectionStatus(json: JsonElement) {
        project.webViewService?.postNotification("codestream/didChangeConnectionStatus", json)
    }

    @JsonNotification("codestream/didChangeVersionCompatibility")
    fun didChangeVersionCompatibility(json: JsonElement) {
        ApplicationManager.getApplication().invokeLater {
            project.codeStream?.show {
                project.webViewService?.postNotification("codestream/didChangeVersionCompatibility", json, true)
            }
        }
    }

    @JsonNotification("codestream/didChangeApiVersionCompatibility")
    fun didChangeApiVersionCompatibility(json: JsonElement) {
        val notification = gson.fromJson<DidChangeApiVersionCompatibilityNotification>(json)
        project.authenticationService?.onApiVersionChanged(notification)
    }

    @JsonNotification("codestream/didEncounterMaintenanceMode")
    fun didEncounterMaintenanceMode(json: JsonElement) {
        ApplicationManager.getApplication().invokeLater {
            project.codeStream?.show {
                project.webViewService?.postNotification("codestream/didEncounterMaintenanceMode", json, true)
                GlobalScope.launch {
                    project.authenticationService?.logout()
                }
            }
        }
    }

    @JsonNotification("codestream/didChangeServerUrl")
    fun didChangeServerUrl(json: JsonElement) {
        project.webViewService?.postNotification("codestream/didChangeServerUrl", json, true)
    }

    @JsonNotification("codestream/didStartLogin")
    fun didStartLogin(json: JsonElement?) {}

    @JsonNotification("codestream/didFailLogin")
    fun didFailLogin(json: JsonElement?) {}

    @JsonNotification("codestream/didLogin")
    fun didLogin(json: JsonElement) {
        val notification = gson.fromJson<DidLoginNotification>(json)
        project.agentService?.onDidStart {
            project.authenticationService?.completeLogin(notification.data)
        }
    }

    @JsonNotification("codestream/didLogout")
    fun didLogout(notification: DidLogoutNotification) = GlobalScope.launch {
        project.authenticationService?.logout()

        if (notification.reason === LogoutReason.TOKEN) {
            project.agentService?.onDidStart {
                project.webViewService?.load(true)
            }
        }
    }

    @JsonNotification("codestream/userDidCommit")
    fun userDidCommit(notification: UserDidCommitNotification) {
        project.reviewService?.createReviewFromExternalCommit()
    }

    @JsonNotification("codestream/didDetectUnreviewedCommits")
    fun didDetectUnreviewedCommits(notification: DidDetectUnreviewedCommitsNotification) {
        project.notificationComponent?.didDetectUnreviewedCommits(notification.message, notification.sequence, notification.openReviewId)
    }

    @JsonNotification("codestream/didChangeBranch")
    fun didChangeBranch(notification: DidChangeBranchNotification) {
        GitUtil.getRepositoryManager(project).repositories.forEach {
            it.update()
        }
    }

    @JsonNotification("codestream/restartRequired")
    fun restartRequired(json: JsonElement) = GlobalScope.launch {
        project.agentService?.restart()
    }

	@JsonRequest("codestream/url/open")
    fun openUrl(json: JsonElement): CompletableFuture<Boolean?> {
		val request = gson.fromJson<OpenUrlRequest>(json[0])
        BrowserUtil.browse(request.url)
        return CompletableFuture.completedFuture(true)
    }

    @JsonNotification("codestream/didSetEnvironment")
    fun didSetEnvironment(environmentInfo: EnvironmentInfo) {
        project.sessionService?.environmentInfo = environmentInfo
    }

    override fun workspaceFolders(): CompletableFuture<MutableList<WorkspaceFolder>> {
        val folders = project.workspaceFolders.toMutableList()
        logger.info("Workspace folders: ${folders.joinToString()}")
        return CompletableFuture.completedFuture(folders)
    }

    override fun configuration(configurationParams: ConfigurationParams): CompletableFuture<List<Any>> {
        return CompletableFuture.completedFuture(emptyList())
    }

    override fun registerCapability(params: RegistrationParams): CompletableFuture<Void> {
        params.registrations.forEach {
            logger.info("Language server wants to register ${it.method}")
        }
        return CompletableFuture.completedFuture(null)
    }

    override fun unregisterCapability(params: UnregistrationParams?): CompletableFuture<Void> {
        params?.unregisterations?.forEach {
            logger.info("Language server wants to unregister ${it.method}")
        }
        return CompletableFuture.completedFuture(null)
    }

    override fun showMessageRequest(requestParams: ShowMessageRequestParams?): CompletableFuture<MessageActionItem> {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun telemetryEvent(`object`: Any?) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun logMessage(message: MessageParams?) {
        when (message?.type) {
            MessageType.Log -> logger.info(message.message)
            MessageType.Info -> logger.info(message.message)
            MessageType.Warning -> logger.warn(message.message)
            MessageType.Error -> logger.warn(message.message)
        }
    }

    override fun showMessage(messageParams: MessageParams?) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun publishDiagnostics(diagnostics: PublishDiagnosticsParams?) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }
}

class DidChangeDocumentMarkersNotification(
    val textDocument: TextDocumentIdentifier
)

class DidChangePullRequestCommentsNotification(
    val pullRequestId: String?,
    val commentId: String?,
    val filePath: String?
)

class DidChangeDataNotification(
    val type: String,
    val data: JsonElement
)

class DidChangeUnreadsNotification(
    val totalMentions: Int,
    val totalUnreads: Int
)

class DidLoginNotification(val data: LoginResult)

class DidLogoutNotification(val reason: LogoutReason)

enum class LogoutReason {
    @SerializedName("token")
    TOKEN,
    @SerializedName("unknown")
    UNKNOWN,
    @SerializedName("unsupportedVersion")
    UNSUPPORTED_VERSION,
    @SerializedName("unsupportedApiVersion")
    UNSUPPORTED_API_VERSION
}

class UserDidCommitNotification(val sha: String)

class DidDetectUnreviewedCommitsNotification(val message: String, val sequence: Int, val openReviewId: String?)

class DidChangeBranchNotification(val repoPath: String, val branch: String)

class DidChangeApiVersionCompatibilityNotification(
    val compatibility: ApiVersionCompatibility,
    val missingCapabilities: JsonObject = jsonObject()
)

class OpenUrlRequest(val url: String)

enum class ApiVersionCompatibility {
    @SerializedName("apiCompatible")
    API_COMPATIBLE,
    @SerializedName("apiUpgradeRecommended")
    API_UPGRADE_RECOMMENDED,
    @SerializedName("apiUpgradeRequired")
    API_UPGRADE_REQUIRED
}
