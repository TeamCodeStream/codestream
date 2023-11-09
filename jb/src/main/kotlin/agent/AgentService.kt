package com.codestream.agent

import com.codestream.AGENT_PATH
import com.codestream.DEBUG
import com.codestream.appDispatcher
import com.codestream.authenticationService
import com.codestream.codeStream
import com.codestream.extensions.baseUri
import com.codestream.extensions.workspaceFolders
import com.codestream.gson
import com.codestream.protocols.agent.CSUser
import com.codestream.protocols.agent.ClmParams
import com.codestream.protocols.agent.ClmResult
import com.codestream.protocols.agent.CreatePermalinkParams
import com.codestream.protocols.agent.CreatePermalinkResult
import com.codestream.protocols.agent.CreateShareableCodemarkParams
import com.codestream.protocols.agent.CreateShareableCodemarkResult
import com.codestream.protocols.agent.DocumentMarkersParams
import com.codestream.protocols.agent.DocumentMarkersResult
import com.codestream.protocols.agent.ExecuteThirdPartyRequestParams
import com.codestream.protocols.agent.FileLevelTelemetryParams
import com.codestream.protocols.agent.FileLevelTelemetryResult
import com.codestream.protocols.agent.FollowReviewParams
import com.codestream.protocols.agent.FollowReviewResult
import com.codestream.protocols.agent.GetAllReviewContentsParams
import com.codestream.protocols.agent.GetAllReviewContentsResult
import com.codestream.protocols.agent.GetBlameParams
import com.codestream.protocols.agent.GetBlameResult
import com.codestream.protocols.agent.GetCommitParams
import com.codestream.protocols.agent.GetCommitResult
import com.codestream.protocols.agent.GetFileContentsAtRevisionParams
import com.codestream.protocols.agent.GetFileContentsAtRevisionResult
import com.codestream.protocols.agent.GetLocalReviewContentsParams
import com.codestream.protocols.agent.GetPostParams
import com.codestream.protocols.agent.GetPullRequestReviewIdParams
import com.codestream.protocols.agent.GetReviewContentsParams
import com.codestream.protocols.agent.GetReviewContentsResult
import com.codestream.protocols.agent.GetReviewParams
import com.codestream.protocols.agent.GetStreamParams
import com.codestream.protocols.agent.GetUserParams
import com.codestream.protocols.agent.GetUsersParams
import com.codestream.protocols.agent.Ide
import com.codestream.protocols.agent.InitializationOptions
import com.codestream.protocols.agent.PixieDynamicLoggingParams
import com.codestream.protocols.agent.PixieDynamicLoggingResult
import com.codestream.protocols.agent.Post
import com.codestream.protocols.agent.PullRequestFile
import com.codestream.protocols.agent.ReportMessageParams
import com.codestream.protocols.agent.ReportMessageRequestError
import com.codestream.protocols.agent.ResolveStackTraceLineParams
import com.codestream.protocols.agent.ResolveStackTraceLineResult
import com.codestream.protocols.agent.ResponseTimesParams
import com.codestream.protocols.agent.ResponseTimesResult
import com.codestream.protocols.agent.Review
import com.codestream.protocols.agent.ReviewCoverageParams
import com.codestream.protocols.agent.ReviewCoverageResult
import com.codestream.protocols.agent.ScmRangeInfoParams
import com.codestream.protocols.agent.ScmRangeInfoResult
import com.codestream.protocols.agent.ScmSha1RangesParams
import com.codestream.protocols.agent.ScmSha1RangesResult
import com.codestream.protocols.agent.SetServerUrlParams
import com.codestream.protocols.agent.SetServerUrlResult
import com.codestream.protocols.agent.Stream
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.agent.getPullRequestFilesChangedParams
import com.codestream.protocols.agent.getPullRequestFilesParams
import com.codestream.settings.ApplicationSettingsService
import com.codestream.system.Platform
import com.codestream.system.platform
import com.codestream.telemetry.environment
import com.codestream.telemetryService
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
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
import org.reflections.Reflections
import org.reflections.scanners.Scanners
import org.reflections.util.ConfigurationBuilder
import org.reflections.util.FilterBuilder
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.nio.file.Files
import java.nio.file.attribute.PosixFilePermission
import java.nio.file.attribute.PosixFilePermissions
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.Collections
import java.util.Scanner
import java.util.concurrent.CompletableFuture
import java.util.concurrent.atomic.AtomicInteger

private val posixPermissions = setOf(
    PosixFilePermission.OWNER_READ,
    PosixFilePermission.OWNER_WRITE,
    PosixFilePermission.OWNER_EXECUTE
)

data class CrashDetails (val details: String, val dateTime: OffsetDateTime)

val TEST_MODE = System.getenv("TEST_MODE") == "true"

val serverUrlMigrations = hashMapOf(
    "https://staging-api.codestream.us" to "https://codestream-stg.staging-service.newrelic.com",
    "https://api.codestream.com" to "https://codestream-us1.service.newrelic.com",
    "https://eu-api.codestream.com" to "https://codestream-eu1.service.eu.newrelic.com"
)

class AgentService(private val project: Project) : Disposable {

    companion object {
        private var debugPortSeed = AtomicInteger(6010)
        private val debugPort get() = debugPortSeed.getAndAdd(1)
    }

    private val logger = Logger.getInstance(AgentService::class.java)
    private var initialization = CompletableFuture<Unit>()
    private var isDisposing = false
    private var isRestarting = false
    private var restartCount = 0
    private var lastLaunchedNodePath: String? = null

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
        if (!TEST_MODE) {
            appDispatcher.launch {
                initAgent()
            }
        }
    }

    fun onDidStart(cb: () -> Unit) {
        if (initialization.isDone)
            cb()
        else initialization.thenRun(cb)
    }

    private suspend fun initAgent(newServerUrl: String? = null, autoSignIn: Boolean = true) {
        try {
            logger.info("Initializing CodeStream LSP agent")
            // bootstrap CodeStreamProjectService
            project.codeStream
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
                this.initializeResult = agent.initialize(getInitializeParams(newServerUrl)).await()
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

    suspend fun restart(newServerUrl: String? = null, autoSignIn: Boolean = false) {
        logger.info("Restarting CodeStream LSP agent")
        isRestarting = true
        if (initialization.isDone) {
            initialization = CompletableFuture()
        }
        try {
            agent.shutdown().await()
        } catch (ex: Exception) {
            logger.warn(ex)
        }
        try {
            agent.exit()
        } catch (ex: Exception) {
            logger.warn(ex)
        }
        initAgent(newServerUrl, autoSignIn)
        isRestarting = false
        _restartObservers.forEach { it() }
    }

    private fun getAgentEnv(): Map<String, String> {
        val settings = ServiceManager.getService(ApplicationSettingsService::class.java)
        val agentEnv: MutableMap<String, String> = mutableMapOf("NODE_OPTIONS" to "")
        agentEnv["NODE_TLS_REJECT_UNAUTHORIZED"] = if (settings.disableStrictSSL) "0" else "1"
        settings.extraCerts?.let {
            agentEnv["NODE_EXTRA_CA_CERTS"] = it
        }

        agentEnv.putAll(project.telemetryService?.telemetryOptions?.agentOptions().environment())

        return Collections.unmodifiableMap(agentEnv)
    }

    private fun createProcess(): Process {
        val agentEnv = getAgentEnv()
        val process = if (DEBUG) {
            createDebugProcess(agentEnv)
        } else {
            createProductionProcess(agentEnv)
        }

        captureErrorStream(process)
        captureExitCode(process)

        return process
    }

    private fun deleteAllExcept(dir: File, prefix: String, except: String) {
        for (file in dir.listFiles { _, name -> name.startsWith(prefix) }!!) {
            if (file.name != except) {
                try {
                    file.delete()
                } catch (ex: Exception) {
                    logger.warn("Could not delete " + file.name, ex)
                }
            }
        }
    }

    private fun createProductionProcess(agentEnv: Map<String, String>): Process {
        val settings = ServiceManager.getService(ApplicationSettingsService::class.java)
        val agentVersion = settings.environmentVersion
        val userHomeDir = File(System.getProperty("user.home"))
        val agentDir = userHomeDir.resolve(".codestream").resolve("agent")

        if (!agentDir.exists()) {
            Files.createDirectories(agentDir.toPath())
        }

        val agentJsDestFile = File(agentDir, "agent-$agentVersion.js")
        val webJsMap = File(agentDir, "index.js.map")
        val agentJsMap = File(agentDir, "agent.js.map")
        deleteAllExcept(agentDir, "agent", agentJsDestFile.name)

        FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/agent/agent.js"), agentJsDestFile)
        FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/agent/agent.js.map"), agentJsMap)
        FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/webview/index.js.map"), webJsMap)

        if (platform == Platform.MAC_X64 || platform == Platform.MAC_ARM64) {
            try {
                logger.info("Extracting extraLibs")
                val reflections = Reflections(ConfigurationBuilder()
                    .forPackage("agent.node_modules")
                    .filterInputsBy(FilterBuilder().includePackage("agent.node_modules"))
                    .setScanners(Scanners.Resources))
                val resourceList = reflections.getResources(".*")
                logger.info("Copying ${resourceList.size} files to node_modules")
                val baseDir = userHomeDir.resolve(".codestream")
                resourceList.forEach {
                    val dest = baseDir.resolve(it)
                    if (!dest.parentFile.exists()) {
                        Files.createDirectories(dest.parentFile.toPath())
                    }
                    FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/$it"), dest)
                    if (platform.isPosix && it.endsWith(".node")) {
                        val executable = PosixFilePermissions.fromString("rwxr-xr-x")
                        Files.setPosixFilePermissions(dest.toPath(), executable)
                    }
                }
            } catch (t: Throwable) {
                logger.error("Error copying extra libs", t)
            }
        }

        getNodeResourcePath()?.let {
            val nodeDestFile = getNodeDestFile(agentDir, agentVersion)
            deleteAllExcept(agentDir, "node", nodeDestFile.name)

            if (!nodeDestFile.exists()) {
                FileUtils.copyToFile(AgentService::class.java.getResourceAsStream(it), nodeDestFile)
                if (platform.isPosix) {
                    Files.setPosixFilePermissions(nodeDestFile.toPath(), posixPermissions)
                }
                logger.info("Node.js for CodeStream LSP agent extracted to ${nodeDestFile.absolutePath}")

                if (platform == Platform.LINUX_X64) {
                    val xdgOpen = File(agentDir, "xdg-open")
                    FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/agent/xdg-open"), xdgOpen)
                    Files.setPosixFilePermissions(xdgOpen.toPath(), posixPermissions)
                    logger.info("xdg-open extracted to ${xdgOpen.absolutePath}")
                }
            }
            lastLaunchedNodePath = nodeDestFile.absolutePath
            return GeneralCommandLine(
                nodeDestFile.absolutePath,
                "--nolazy",
                agentJsDestFile.absolutePath,
                "--stdio"
            ).withEnvironment(agentEnv).createProcess()
        } ?: return GeneralCommandLine(
            // if we don't ship Node.js for the user's platform, fallback to system-installed node
            "node",
            "--nolazy",
            agentJsDestFile.absolutePath,
            "--stdio"
        ).withEnvironment(agentEnv).createProcess().also {
            logger.info("Falling back to system-installed node")
            lastLaunchedNodePath = "node"
        }
    }

    private fun createDebugProcess(agentEnv: Map<String, String>): Process {
        val agentDir = if (AGENT_PATH != null) {
            File(AGENT_PATH)
        } else {
            createTempDir("codestream").also {
                it.deleteOnExit()
            }
        }

        val agentJs = File(agentDir, "agent.js")
        val agentJsMap = File(agentDir, "agent.js.map")
        val webJsMap = File(agentDir, "index.js.map")

        if (AGENT_PATH == null) {
            FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/agent/agent.js"), agentJs)
            try {
                FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/agent/agent.js.map"), agentJsMap)
                FileUtils.copyToFile(AgentService::class.java.getResourceAsStream("/webview/index.js.map"), webJsMap)
            } catch (ex: Exception) {
                logger.warn("Could not extract agent.js.map", ex)
            }
            logger.info("CodeStream LSP agent extracted to ${agentJs.absolutePath}")
        }

        val port = if (AGENT_PATH == null) {
            debugPort
        } else {
            debugPortSeed // fixed on 6010 so we can just keep "Attach to agent" running
        }
        lastLaunchedNodePath = "node"
        return GeneralCommandLine(
            "node",
            "--nolazy",
            "--inspect=$port",
            agentJs.absolutePath,
            "--stdio"
        ).withEnvironment(agentEnv).createProcess()
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

    private fun getNodeVersion(): String {
        if (lastLaunchedNodePath == null) return "<unknown>"
        return try {
            val process = GeneralCommandLine(lastLaunchedNodePath, "-v").createProcess()
            val version = process.inputStream.bufferedReader().readLine()
            process.waitFor()
            version
        } catch (e: Exception) {
            "<unknown>"
        }
    }

    private fun getAgenCrashDetails(): CrashDetails? {
        val file = File(System.getProperty("user.home"), ".codestream/agent-crash.txt")
        if (!file.exists()) return null
        return try {
            val dateTime = OffsetDateTime.ofInstant(Instant.ofEpochMilli(file.lastModified()), ZoneId.systemDefault())
            CrashDetails(file.readText(), dateTime)
        } catch (e: Exception) {
            null
        }
    }

    private fun captureExitCode(process: Process) {
        Thread(Runnable {
            val code = process.waitFor()
            logger.info("LSP agent terminated with exit code $code")
            if (!isDisposing && !isRestarting) {
                val nodeVersion = getNodeVersion()
                val agentCrashDetails = getAgenCrashDetails()
                logger.info("LSP agent will be restarted in 15 seconds (restart count: ${++restartCount}) (node version: $nodeVersion)")
                Thread.sleep(15000)
                appDispatcher.launch {
                    restart(null, true)
                    onDidStart {
                        val params = mutableMapOf(
                            "Exit Code" to code,
                            "OS Name" to SystemInfo.OS_NAME,
                            "OS Version" to SystemInfo.OS_VERSION,
                            "OS Arch" to SystemInfo.OS_ARCH,
                            "Node Version" to nodeVersion,
                            "Restart Count" to restartCount,
                        )
                        if (agentCrashDetails != null) {
                            params["Crash Details"] = agentCrashDetails.details
                            params["Crash Date"] = agentCrashDetails.dateTime.toString()
                        }
                        agent.telemetry(TelemetryParams("Agent Restarted", params))
                    }
                }
            }
        }).start()
    }

    private fun getNodeResourcePath(): String? {
        return when (platform) {
            Platform.LINUX_X64 -> "/agent/node-linux-x64/node"
            Platform.MAC_ARM64 -> "/agent/node-darwin-arm64/node"
            Platform.MAC_X64 -> "/agent/node-darwin-x64/node"
            Platform.WIN_X64 -> "/agent/node-win-x64/node.exe"
            else -> null
        }
    }

    private fun getNodeDestFile(agentFolder: File, version: String): File {
        // By naming the Node.js executable after the CodeStream version,
        // we don't need to update the AgentService code when the Node.js
        // version changes. The Node.js version is defined in build.gradle.
        return when (platform) {
            Platform.WIN_X64 -> File(agentFolder, "node.$version.exe")
            else -> File(agentFolder, "node.$version")
        }.also {
            it.setExecutable(true)
        }
    }

    private fun getInitializeParams(newServerUrl: String?): InitializeParams {
        val workspaceClientCapabilities = WorkspaceClientCapabilities()
        workspaceClientCapabilities.configuration = true
        workspaceClientCapabilities.didChangeConfiguration = DidChangeConfigurationCapabilities(false)
        workspaceClientCapabilities.workspaceFolders = true
        val textDocumentClientCapabilities = TextDocumentClientCapabilities()
        val clientCapabilities =
            ClientCapabilities(workspaceClientCapabilities, textDocumentClientCapabilities, null)

        val initParams = InitializeParams()
        initParams.capabilities = clientCapabilities
        initParams.initializationOptions = initializationOptions(newServerUrl).also {
            logger.info("NewRelic telemetry enabled: ${it?.newRelicTelemetryEnabled}")
        }
        initParams.rootUri = project.baseUri
        return initParams
    }

    private fun initializationOptions(newServerUrl: String?): InitializationOptions? {
        val settings = ServiceManager.getService(ApplicationSettingsService::class.java)
        val migratedServer = serverUrlMigrations[settings.serverUrl]
        if (migratedServer != null) {
            project.authenticationService?.copyInternalAccessToken(settings.serverUrl, migratedServer)
            settings.serverUrl = migratedServer
        }
        val gitProjectSettings = GitVcsSettings.getInstance(project)
        val gitApplicationSettings = GitVcsApplicationSettings.getInstance()
        val gitApplicationDetectedPath = GitExecutableManager.getInstance().pathToGit
        val gitApplicationSavedPath = gitApplicationSettings.savedPathToGit
        val gitProjectDetectedPath = GitExecutableManager.getInstance().getPathToGit(project)
        val gitProjectPath = gitProjectSettings.pathToGit

        val gitPath = gitProjectPath ?: gitProjectDetectedPath ?: gitApplicationSavedPath ?: gitApplicationDetectedPath

        return InitializationOptions(
            settings.extensionInfo,
            Ide,
            DEBUG,
            settings.proxySettings,
            settings.proxySupport,
            newServerUrl ?: settings.serverUrl,
            settings.disableStrictSSL,
            settings.traceLevel.value,
            gitPath,
            project.workspaceFolders,
            project.telemetryService?.telemetryOptions?.agentOptions() != null
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

    suspend fun getUsers(): List<CSUser> {
        val json = remoteEndpoint
            .request("codestream/users", GetUsersParams())
            .await() as JsonObject
        return gson.fromJson(json.get("users"))
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

    suspend fun getPullRequestReviewId(prId: String, providerId: String): JsonElement? {
        val json = remoteEndpoint
            .request(
                "codestream/provider/generic",
                ExecuteThirdPartyRequestParams("getPullRequestReviewId", providerId, GetPullRequestReviewIdParams(prId)))
            .await()
        return json as JsonElement?
    }

    suspend fun setServerUrl(params: SetServerUrlParams): SetServerUrlResult? {
        val json = remoteEndpoint
            .request("codestream/set-server", params)
            .await() as JsonObject?
        return json?.let { gson.fromJson(it) }
    }

    suspend fun getFileContentsAtRevision(params: GetFileContentsAtRevisionParams): GetFileContentsAtRevisionResult {
        val json = remoteEndpoint
            .request("codestream/scm/file/diff", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun followReview(params: FollowReviewParams): FollowReviewResult {
        val json = remoteEndpoint
            .request("codestream/review/follow", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun resolveStackTraceLine(params: ResolveStackTraceLineParams): ResolveStackTraceLineResult {
        val json = remoteEndpoint
            .request("codestream/nr/resolveStackTraceLine", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun pixieDynamicLogging(params: PixieDynamicLoggingParams): PixieDynamicLoggingResult {
        val json = remoteEndpoint
            .request("codestream/pixie/dynamicLogging", params)
            .await() as JsonObject
        return gson.fromJson(json)
    }

    suspend fun fileLevelTelemetry(params: FileLevelTelemetryParams): FileLevelTelemetryResult? {
        val json: JsonObject = remoteEndpoint
            .request("codestream/newrelic/fileLevelTelemetry", params)
            .await() as JsonObject? ?: return null
        return gson.fromJson(json)
    }

    suspend fun clm(params: ClmParams): ClmResult? {
        if (System.getProperty("com.codestream.debug") != "true") return null
        val json: JsonObject = remoteEndpoint
            .request("codestream/newrelic/clm", params)
            .await() as JsonObject? ?: return null
        return gson.fromJson(json)
    }

    suspend fun responseTimes(params: ResponseTimesParams): ResponseTimesResult? {
        val json: JsonObject = remoteEndpoint
            .request("codestream/newrelic/responseTimes", params)
            .await() as JsonObject? ?: return null
        return gson.fromJson(json)
    }

    suspend fun scmRangeInfo(params: ScmRangeInfoParams): ScmRangeInfoResult {
        val json = remoteEndpoint
            .request("codestream/scm/range/info", params)
            .await() as JsonObject?
        return gson.fromJson(json!!)
    }

    suspend fun scmSha1Ranges(params: ScmSha1RangesParams): List<ScmSha1RangesResult> {
        val json = remoteEndpoint
            .request("codestream/scm/sha1/ranges", params)
            .await() as JsonElement
        return gson.fromJson(json)
    }

    suspend fun createShareableCodemark(params: CreateShareableCodemarkParams): CreateShareableCodemarkResult {
        val json = remoteEndpoint
            .request("codestream/codemarks/sharing/create", params)
            .await() as JsonObject?
        return gson.fromJson(json!!)
    }

    suspend fun getBlame(params: GetBlameParams): GetBlameResult {
        val json = remoteEndpoint
            .request("codestream/scm/blame", params)
            .await() as JsonObject?
        return gson.fromJson(json!!)
    }

    suspend fun getCommit(params: GetCommitParams): GetCommitResult {
        val json = remoteEndpoint
            .request("codestream/scm/commit", params)
            .await() as JsonObject?
        return gson.fromJson(json!!)
    }

    suspend fun reportMessage(t: Throwable) {
        val sw = StringWriter()
        val pw = PrintWriter(sw)
        t.printStackTrace(pw)
        val error = ReportMessageRequestError(
            t.message ?: "",
            sw.toString()
        )

        val params = ReportMessageParams(
            "error",
            error,
            null,
            "extension",
            mapOf(
                "ideName" to Ide.name,
                "ideVersion" to Ide.version,
                "ideDetail" to Ide.detail
            )
        )

        remoteEndpoint
            .request("codestream/reporting/message", params)
            .await()
    }

    private val _restartObservers = mutableListOf<() -> Unit>()
    fun onRestart(observer: () -> Unit) {
        _restartObservers += observer
    }
}
