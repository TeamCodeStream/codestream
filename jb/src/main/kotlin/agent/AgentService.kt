package com.codestream.agent

import com.codestream.DEBUG
import com.codestream.authenticationService
import com.codestream.extensions.baseUri
import com.codestream.extensions.workspaceFolders
import com.codestream.gson
import com.codestream.protocols.agent.CSUser
import com.codestream.protocols.agent.CreatePermalinkParams
import com.codestream.protocols.agent.CreatePermalinkResult
import com.codestream.protocols.agent.CreateReviewsForUnreviewedCommitsParams
import com.codestream.protocols.agent.CreateReviewsForUnreviewedCommitsResult
import com.codestream.protocols.agent.DocumentMarkersParams
import com.codestream.protocols.agent.DocumentMarkersResult
import com.codestream.protocols.agent.FollowReviewParams
import com.codestream.protocols.agent.FollowReviewResult
import com.codestream.protocols.agent.GetAllReviewContentsParams
import com.codestream.protocols.agent.GetAllReviewContentsResult
import com.codestream.protocols.agent.GetFileContentsAtRevisionParams
import com.codestream.protocols.agent.GetFileContentsAtRevisionResult
import com.codestream.protocols.agent.GetLocalReviewContentsParams
import com.codestream.protocols.agent.GetPostParams
import com.codestream.protocols.agent.GetReviewContentsParams
import com.codestream.protocols.agent.GetReviewContentsResult
import com.codestream.protocols.agent.GetReviewParams
import com.codestream.protocols.agent.GetStreamParams
import com.codestream.protocols.agent.GetUserParams
import com.codestream.protocols.agent.Ide
import com.codestream.protocols.agent.InitializationOptions
import com.codestream.protocols.agent.Post
import com.codestream.protocols.agent.PullRequestFile
import com.codestream.protocols.agent.Review
import com.codestream.protocols.agent.ReviewCoverageParams
import com.codestream.protocols.agent.ReviewCoverageResult
import com.codestream.protocols.agent.SetServerUrlParams
import com.codestream.protocols.agent.SetServerUrlResult
import com.codestream.protocols.agent.Stream
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.agent.getPullRequestFilesChangedParams
import com.codestream.protocols.agent.getPullRequestFilesParams
import com.codestream.settings.ApplicationSettingsService
import com.codestream.system.Platform
import com.codestream.system.platform
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.SystemInfo
import git4idea.config.GitExecutableManager
import git4idea.config.GitVcsApplicationSettings
import git4idea.config.GitVcsSettings
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import org.apache.commons.io.FileUtils
import org.eclipse.lsp4j.ClientCapabilities
import org.eclipse.lsp4j.DidChangeConfigurationCapabilities
import org.eclipse.lsp4j.InitializeParams
import org.eclipse.lsp4j.InitializeResult
import org.eclipse.lsp4j.ServerCapabilities
import org.eclipse.lsp4j.TextDocumentClientCapabilities
import org.eclipse.lsp4j.TextDocumentSyncKind
import org.eclipse.lsp4j.TextDocumentSyncOptions
import org.eclipse.lsp4j.WorkspaceClientCapabilities
import org.eclipse.lsp4j.jsonrpc.RemoteEndpoint
import org.eclipse.lsp4j.jsonrpc.messages.Either
import org.eclipse.lsp4j.launch.LSPLauncher
import java.io.File
import java.nio.file.Files
import java.nio.file.attribute.PosixFilePermission
import java.util.Scanner
import java.util.concurrent.CompletableFuture
import java.util.concurrent.atomic.AtomicInteger

class AgentService(private val project: Project) : Disposable {

    companion object {
        private var debugPortSeed = AtomicInteger(6010)
        private val debugPort get() = debugPortSeed.getAndAdd(1)
    }

    private val logger = Logger.getInstance(AgentService::class.java)
    private var initialization = CompletableFuture<Unit>()
    private var isDisposing = false
    private var isRestarting = false

    lateinit var initializeResult: InitializeResult
    lateinit var agent: CodeStreamLanguageServer
    lateinit var remoteEndpoint: RemoteEndpoint

    val capabilities: ServerCapabilities by lazy {
        initializeResult.capabilities
    }

    val syncKind: TextDocumentSyncKind? by lazy {
        val syncOptions: Either<TextDocumentSyncKind, TextDocumentSyncOptions> = capabilities.textDocumentSync
        when {
            syncOptions.isRight -> syncOptions.right.change
            syncOptions.isLeft -> syncOptions.left
            else -> null
        }
    }

    init {
        GlobalScope.launch {
            initAgent()
        }
    }

    fun onDidStart(cb: () -> Unit) {
        if (initialization.isDone)
            cb()
        else initialization.thenRun(cb)
    }

    private suspend fun initAgent(autoSignIn: Boolean = true) {
        try {
            logger.info("Initializing CodeStream LSP agent")
            val process = createProcess()
            val client = CodeStreamLanguageClient(project)
            val launcher = LSPLauncher.Builder<CodeStreamLanguageServer>()
                .setLocalService(client)
                .setRemoteInterface(CodeStreamLanguageServer::class.java)
                .setInput(process.inputStream)
                .setOutput(process.outputStream)
                .create()

            agent = launcher.remoteProxy
            remoteEndpoint = launcher.remoteEndpoint
            launcher.startListening()

            if (!project.isDisposed) {
                logger.info("Initializing language server")
                this.initializeResult = agent.initialize(getInitializeParams()).await()
                if (autoSignIn) {
                    project.authenticationService?.let {
                        val success = it.autoSignIn()
                        if (success) {
                            logger.info("CodeStream LSP agent initialization complete")
                            initialization.complete(Unit)
                        } else {
                            logger.info("CodeStream LSP agent restarting (auto sign-in failed)")
                            restart()
                        }
                    }
                } else {
                    logger.info("CodeStream LSP agent initialization complete (no auto sign-in)")
                    initialization.complete(Unit)
                }
            } else {
                logger.info("Skipping language server initialization - project is disposed")
            }
        } catch (e: Exception) {
            logger.error(e)
            e.printStackTrace()
        }
    }

    override fun dispose() {
        logger.info("Shutting down CodeStream LSP agent")
        isDisposing = true
        onDidStart { agent.exit() }
    }

    suspend fun restart(autoSignIn: Boolean = false) {
        logger.info("Restarting CodeStream LSP agent")
        isRestarting = true
        if (initialization.isDone) {
            initialization = CompletableFuture()
        }
        try { agent.shutdown().await() } catch (ex: Exception) { logger.warn(ex) }
        try { agent.exit() } catch (ex: Exception) { logger.warn(ex) }
        initAgent(autoSignIn)
        isRestarting = false
        _restartObservers.forEach { it() }
    }

    private fun createProcess(): Process {
        val process = if (DEBUG) {
            val temp = createTempDir("codestream")
            temp.deleteOnExit()

            val agentJs = File(temp, "agent.js")
            val agentJsMap = File(temp, "agent.js.map")
            // val agentLog = File(temp, "agent.log")
            FileUtils.copyToFile(javaClass.getResourceAsStream("/agent/agent.js"), agentJs)
            try {
                FileUtils.copyToFile(javaClass.getResourceAsStream("/agent/agent.js.map"), agentJsMap)
            } catch (ex: Exception) {
                logger.warn("Could not extract agent.js.map", ex)
            }
            logger.info("CodeStream LSP agent extracted to ${agentJs.absolutePath}")
            GeneralCommandLine(
                "node",
                "--nolazy",
                "--inspect=$debugPort",
                agentJs.absolutePath,
                "--stdio"
            ).withEnvironment("NODE_OPTIONS", "").createProcess()
        } else {
            val settings = ServiceManager.getService(ApplicationSettingsService::class.java)
            val agentVersion = settings.environmentVersion
            val userHomeDir = File(System.getProperty("user.home"))
            val agentDir = userHomeDir.resolve(".codestream").resolve("agent")

            if (!agentDir.exists()) {
                Files.createDirectories(agentDir.toPath())
            }

            val perms = setOf(
                PosixFilePermission.OWNER_READ,
                PosixFilePermission.OWNER_WRITE,
                PosixFilePermission.OWNER_EXECUTE
            )
            val agentDestFile = getAgentDestFile(agentDir, agentVersion)
            for (file in agentDir.listFiles()) {
                if (file.name != agentDestFile.name) {
                    try {
                        file.delete()
                    } catch (ex: Exception) {
                        logger.warn("Could not delete " + file.name, ex)
                    }
                }
            }

            if (!agentDestFile.exists()) {
                FileUtils.copyToFile(javaClass.getResourceAsStream(getAgentResourcePath()), agentDestFile)
                if (platform == Platform.MAC || platform == Platform.LINUX) {
                    Files.setPosixFilePermissions(agentDestFile.toPath(), perms)
                }
                logger.info("CodeStream LSP agent extracted to ${agentDestFile.absolutePath}")

                if (platform == Platform.LINUX) {
                    val xdgOpen = File(agentDir, "xdg-open")
                    FileUtils.copyToFile(javaClass.getResourceAsStream("/agent/xdg-open"), xdgOpen)
                    Files.setPosixFilePermissions(xdgOpen.toPath(), perms)
                    logger.info("xdg-open extracted to ${xdgOpen.absolutePath}")
                }
            }

            GeneralCommandLine(
                agentDestFile.absolutePath,
                "--stdio"
            ).withEnvironment("NODE_OPTIONS", "").createProcess()
        }

        captureErrorStream(process)
        captureExitCode(process)

        return process
    }

    private fun captureErrorStream(process: Process) {
        Thread(Runnable {
            val sc = Scanner(process.errorStream)
            while (sc.hasNextLine()) {
                val nextLine = sc.nextLine()
                logger.warn(nextLine)
            }
        }).start()
    }

    private fun captureExitCode(process: Process) {
        Thread(Runnable {
            val code = process.waitFor()
            logger.info("LSP agent terminated with exit code $code")
            if (!isDisposing && !isRestarting) {
                logger.info("LSP agent will be restarted")
                GlobalScope.launch {
                    restart(true)
                    onDidStart {
                        agent.telemetry(TelemetryParams("Agent Restarted", mapOf(
                            "Exit Code" to code,
                            "OS Name" to SystemInfo.OS_NAME,
                            "OS Version" to SystemInfo.OS_VERSION,
                            "OS Arch" to SystemInfo.OS_ARCH)))
                    }
                }
            }
        }).start()
    }

    private fun getAgentResourcePath(): String {
        return when (platform) {
            Platform.LINUX -> "/agent/agent-linux-x64"
            Platform.MAC -> "/agent/agent-macos-x64"
            Platform.WIN32 -> "/agent/agent-win-x86.exe"
            Platform.WIN64 -> "/agent/agent-win-x64.exe"
        }
    }

    private fun getAgentDestFile(agentFolder: File, version: String): File {
        return when (platform) {
            Platform.LINUX -> File(agentFolder, "codestream-agent.$version")
            Platform.MAC -> File(agentFolder, "codestream-agent.$version")
            Platform.WIN32 -> File(agentFolder, "codestream-agent.$version.exe")
            Platform.WIN64 -> File(agentFolder, "codestream-agent.$version.exe")
        }.also {
            it.setExecutable(true)
        }
    }

    private fun getInitializeParams(): InitializeParams {
        val workspaceClientCapabilities = WorkspaceClientCapabilities()
        workspaceClientCapabilities.configuration = true
        workspaceClientCapabilities.didChangeConfiguration = DidChangeConfigurationCapabilities(false)
        workspaceClientCapabilities.workspaceFolders = true
        val textDocumentClientCapabilities = TextDocumentClientCapabilities()
        val clientCapabilities =
            ClientCapabilities(workspaceClientCapabilities, textDocumentClientCapabilities, null)

        val initParams = InitializeParams()
        initParams.capabilities = clientCapabilities
        initParams.initializationOptions = initializationOptions()
        initParams.rootUri = project.baseUri
        return initParams
    }

    private fun initializationOptions(): InitializationOptions? {
        val settings = ServiceManager.getService(ApplicationSettingsService::class.java)
        val gitProjectSettings = GitVcsSettings.getInstance(project)
        val gitApplicationSettings = GitVcsApplicationSettings.getInstance()
        val gitApplicationDetectedPath = GitExecutableManager.getInstance().pathToGit
        val gitApplicationSavedPath = gitApplicationSettings.savedPathToGit
        val gitProjectDetectedPath = GitExecutableManager.getInstance().getPathToGit(project)
        val gitProjectPath = gitProjectSettings.pathToGit

        val gitPath = gitProjectPath ?: gitProjectDetectedPath ?: gitApplicationSavedPath ?: gitApplicationDetectedPath

        return InitializationOptions(
            settings.extensionInfo,
            Ide(),
            DEBUG,
            settings.proxySettings,
            settings.proxySupport,
            settings.serverUrl,
            settings.disableStrictSSL,
            settings.traceLevel.value,
            gitPath,
            project.workspaceFolders
        )
    }

    suspend fun documentMarkers(params: DocumentMarkersParams): DocumentMarkersResult {
        val json = remoteEndpoint
            .request("codestream/textDocument/markers", params)
            .await() as JsonObject
        val result = gson.fromJson<DocumentMarkersResult>(json)

        // Numbers greater than Integer.MAX_VALUE are deserialized as -1. It should not happen,
        // but some versions of the plugin might do that trying to represent a whole line.
        for (marker in result.markers) {
            if (marker.range.end.character == -1) {
                marker.range.end.character = Integer.MAX_VALUE
            }
        }

        return result
    }

    suspend fun reviewCoverage(params: ReviewCoverageParams): ReviewCoverageResult {
        val json = remoteEndpoint
            .request("codestream/review/coverage", params)
            .await() as JsonObject
        val result = gson.fromJson<ReviewCoverageResult>(json)

        return result

    }

    suspend fun getStream(id: String): Stream {
        val json = remoteEndpoint
            .request("codestream/stream", GetStreamParams(id))
            .await() as JsonObject
        return gson.fromJson(json.get("stream"))
    }

    suspend fun getUser(id: String): CSUser {
        val json = remoteEndpoint
            .request("codestream/user", GetUserParams(id))
            .await() as JsonObject
        return gson.fromJson(json.get("user"))
    }

    suspend fun getPost(streamId: String, id: String): Post {
        val json = remoteEndpoint
            .request("codestream/post", GetPostParams(streamId, id))
            .await() as JsonObject
        return gson.fromJson(json.get("post"))
    }

    suspend fun createPermalink(params: CreatePermalinkParams): CreatePermalinkResult {
        val json = remoteEndpoint
            .request("codestream/textDocument/markers/create/link", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun getReview(id: String): Review {
        val json = remoteEndpoint
            .request("codestream/review", GetReviewParams(id))
            .await() as JsonObject
        return gson.fromJson(json.get("review"))
    }

    suspend fun getReviewContents(params: GetReviewContentsParams): GetReviewContentsResult {
        val json = remoteEndpoint
            .request("codestream/review/contents", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun getAllReviewContents(params: GetAllReviewContentsParams): GetAllReviewContentsResult {
        val json = remoteEndpoint
            .request("codestream/review/allContents", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun getLocalReviewContents(params: GetLocalReviewContentsParams): GetReviewContentsResult {
        val json = remoteEndpoint
            .request("codestream/review/contentsLocal", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun getPullRequestFiles(prId: String, providerId: String): List<PullRequestFile> {
        val json = remoteEndpoint
            .request(
                "codestream/provider/generic",
                getPullRequestFilesParams("getPullRequestFilesChanged", providerId, getPullRequestFilesChangedParams(prId)))
            .await() as JsonArray
        return gson.fromJson(json)
    }

    suspend fun setServerUrl(params: SetServerUrlParams): SetServerUrlResult {
        val json = remoteEndpoint
            .request("codestream/set-server", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun getFileContentsAtRevision(params: GetFileContentsAtRevisionParams): GetFileContentsAtRevisionResult {
        val json = remoteEndpoint
            .request("codestream/scm/file/diff", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun createReviewsForUnreviewedCommits(params: CreateReviewsForUnreviewedCommitsParams): CreateReviewsForUnreviewedCommitsResult {
        val json = remoteEndpoint
            .request("codestream/review/createForUnreviewedCommits", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun followReview(params: FollowReviewParams): FollowReviewResult {
        val json = remoteEndpoint
            .request("codestream/review/follow", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    private val _restartObservers = mutableListOf<() -> Unit>()
    fun onRestart(observer: () -> Unit) {
        _restartObservers += observer
    }
}
