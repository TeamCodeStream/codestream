package agent

import com.codestream.agent.AgentService
import com.codestream.agent.CodeStreamLanguageClient
import com.codestream.gson
import com.codestream.protocols.agent.CSCompany
import com.codestream.protocols.agent.CSTeam
import com.codestream.protocols.agent.CSUser
import com.codestream.protocols.agent.EnvironmentHost
import com.codestream.protocols.agent.EnvironmentInfo
import com.codestream.protocols.agent.LoginState
import com.codestream.protocols.agent.UserLoggedIn
import com.codestream.sessionService
import com.codestream.webview.JxBrowserEngineService
import com.codestream.webview.WebViewService
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.intellij.testFramework.TestDataPath
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.testFramework.fixtures.IdeaTestFixtureFactory
import com.intellij.testFramework.fixtures.impl.LightTempDirTestFixtureImpl
import com.intellij.testFramework.registerServiceInstance
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import kotlin.io.path.Path

@Suppress("UnstableApiUsage")
@TestDataPath("csTestData")
class CodeStreamLanguageClientTest : BasePlatformTestCase() {
    val mockAgentService = mockk<AgentService>(relaxed = true)
    val mockJxBrowserEngineService = mockk<JxBrowserEngineService>(relaxed = true)
    val mockWebViewService = mockk<WebViewService>(relaxed = true)

    init {
        // IntelliJ index easily corrupted in tests...
        val toDelete = Path("build/idea-sandbox/system-test/index").toFile()
        if (toDelete.exists()) {
            toDelete.deleteRecursively()
        }
    }

    override fun getTestDataPath(): String {
        return "csTestData"
    }

    override fun setUp() {

        val factory = IdeaTestFixtureFactory.getFixtureFactory()
        val fixtureBuilder = factory.createLightFixtureBuilder(projectDescriptor, getTestName(false))
        val fixture = fixtureBuilder.fixture

        myFixture = IdeaTestFixtureFactory.getFixtureFactory().createCodeInsightFixture(fixture, LightTempDirTestFixtureImpl(true))

        myFixture.testDataPath = testDataPath
        myFixture.setUp()
    }

    fun initMocks() {
        project.registerServiceInstance(AgentService::class.java, mockAgentService)
        project.registerServiceInstance(JxBrowserEngineService::class.java, mockJxBrowserEngineService)
        project.registerServiceInstance(WebViewService::class.java, mockWebViewService)

        // Mimic the actual implementation
        val slot = slot<() -> Unit>()
        every { mockAgentService.onDidStart(capture(slot)) } answers { slot.captured() }
        project.sessionService?.login(
            UserLoggedIn(
                CSUser("userid", "username", "email", "fullname", null, null),
                CSTeam("teamid", "companyid", "myteam", null),
                CSCompany("companyid", "companyname"),
                LoginState(
                    "userid",
                    "teamid",
                    "email",
                    JsonObject(),
                    EnvironmentInfo(
                        "environmentinfo",
                        true,
                        false,
                        "landingUrl",
                        "apiUrl",
                        listOf(EnvironmentHost("envhostname", "publicapi", "shortname"))
                    ),
                    "serverUrl",
                    null
                ),
                1,
                1
            ),
            emptyList()
        )
    }

    fun `test resolveStackTracePaths node monorepo`() {
        initMocks()

        myFixture.copyDirectoryToProject("node-project", "node-project")
        val file = myFixture.configureFromTempProjectFile("node-project/code-level-metrics/express/package.json")
        println("Opened project based on ${file.virtualFile.path}")

        myFixture.doHighlighting()

        val subject = CodeStreamLanguageClient(project)
        val rawRequest = """[{
  "paths": [
    "/app/dataSource.js",
    "<anonymous>",
    "/app/dataSource.js",
    "/app/index.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/context-manager/legacy-context-manager.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js"
  ],
  "language": "javascript"
}]"""
        val requestJson = gson.fromJson(rawRequest, JsonArray::class.java)
        val result = subject.resolveStackTracePaths(requestJson).get()
        result.resolvedPaths shouldBe listOf(
            "/src/node-project/code-level-metrics/express/dataSource.js",
            null,
            "/src/node-project/code-level-metrics/express/dataSource.js",
            "/src/node-project/code-level-metrics/express/index.js",
            null,
            null,
            null,
            null,
            null,
            null,
        )
        println(gson.toJson(result))
    }

    fun `test resolveStackTracePaths node generic names`() {
        initMocks()

        myFixture.copyDirectoryToProject("node-simple", "node-simple")
        val file = myFixture.configureFromTempProjectFile("node-simple/package.json")
        println("Opened project based on ${file.virtualFile.path}")

        myFixture.doHighlighting()

        val subject = CodeStreamLanguageClient(project)
        val rawRequest = """[{
  "paths": [
    "/app/users/index.js",
    "<anonymous>",
    "/app/users/index.js",
    "/app/index.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/context-manager/legacy-context-manager.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js"
  ],
  "language": "javascript"
}]"""
        val requestJson = gson.fromJson(rawRequest, JsonArray::class.java)
        val result = subject.resolveStackTracePaths(requestJson).get()
        result.resolvedPaths shouldBe listOf(
            "/src/node-simple/users/index.js",
            null,
            "/src/node-simple/users/index.js",
            "/src/node-simple/index.js",
            null,
            null,
            null,
            null,
            null,
            null,
        )
        println(gson.toJson(result))
    }

    fun `test resolveStackTracePaths node generic names var2`() {
        initMocks()

        myFixture.copyDirectoryToProject("node-simple2", "node-simple2")
        val file = myFixture.configureFromTempProjectFile("node-simple2/package.json")
        println("Opened project based on ${file.virtualFile.path}")

        myFixture.doHighlighting()

        val subject = CodeStreamLanguageClient(project)
        val rawRequest = """[{
  "paths": [
    "/app/users/index.js",
    "<anonymous>",
    "/app/vets/index.js",
    "/app/users/index.js",
    "/app/index.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/context-manager/legacy-context-manager.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js",
    "/app/node_modules/newrelic/lib/shim/shim.js"
  ],
  "language": "javascript"
}]"""
        val requestJson = gson.fromJson(rawRequest, JsonArray::class.java)
        val result = subject.resolveStackTracePaths(requestJson).get()
        result.resolvedPaths shouldBe listOf(
            "/src/node-simple2/users/index.js",
            null,
            "/src/node-simple2/vets/index.js",
            "/src/node-simple2/users/index.js",
            "/src/node-simple2/index.js",
            null,
            null,
            null,
            null,
            null,
            null,
        )
        println(gson.toJson(result))
    }
}

