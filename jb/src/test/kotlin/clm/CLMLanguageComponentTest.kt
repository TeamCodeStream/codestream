package clm

import com.codestream.agent.AgentService
import com.codestream.clm.CLMCustomRenderer
import com.codestream.protocols.agent.CSCompany
import com.codestream.protocols.agent.CSRepo
import com.codestream.protocols.agent.CSTeam
import com.codestream.protocols.agent.CSUser
import com.codestream.protocols.agent.EnvironmentHost
import com.codestream.protocols.agent.EnvironmentInfo
import com.codestream.protocols.agent.FileLevelTelemetryResult
import com.codestream.protocols.agent.LoginState
import com.codestream.protocols.agent.MethodLevelTelemetryAverageDuration
import com.codestream.protocols.agent.MethodLevelTelemetrySampleSize
import com.codestream.protocols.agent.UserLoggedIn
import com.codestream.sessionService
import com.codestream.webview.JxBrowserEngineService
import com.codestream.webview.WebViewService
import com.google.gson.JsonObject
import com.intellij.codeInsight.hints.presentation.DynamicDelegatePresentation
import com.intellij.codeInsight.hints.presentation.OnHoverPresentation
import com.intellij.codeInsight.hints.presentation.TextInlayPresentation
import com.intellij.codeInsight.hints.presentation.WithAttributesPresentation
import com.intellij.openapi.editor.Inlay
import com.intellij.testFramework.TestDataPath
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.testFramework.registerServiceInstance
import io.kotest.matchers.shouldBe
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import org.junit.BeforeClass

    @Suppress("UnstableApiUsage")
    @TestDataPath("csTestData/simple")
class CLMLanguageComponentTest : BasePlatformTestCase() {
    val mockAgentService = mockk<AgentService>(relaxed = true)
    val mockJxBrowserEngineService = mockk<JxBrowserEngineService>(relaxed = true)
    val mockWebViewService = mockk<WebViewService>(relaxed = true)

    override fun getTestDataPath(): String {
        return "csTestData/simple"
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

    fun `test python method`() {
        initMocks()

        val result = FileLevelTelemetryResult(
            repo = CSRepo("123", "repo", "remote"),
            averageDuration = listOf(
                MethodLevelTelemetryAverageDuration(
                    namespace = null,
                    className = null,
                    functionName = "hello_world",
                    metricTimesliceName = "d",
                    averageDuration = 3.333f,
                    anomaly = null,
                ),
            ),
            sampleSize = listOf(MethodLevelTelemetrySampleSize(
                namespace = null,
                className = null,
                functionName = "hello_world",
                metricTimesliceName = "t",
                sampleSize = 5,
                source = "span",
                anomaly = null,
            )),
            errorRate = null,
            newRelicEntityGuid = "abcd-1234",
            codeNamespace = "fooNamespace",
            relativeFilePath = "/src/app.py",
            newRelicAccountId = 1,
            error = null,
            lastUpdateDate = null,
            hasAnyData = null,
            sinceDateFormatted = null,
            newRelicEntityName = null,
            newRelicUrl = null,
        )

        coEvery { mockAgentService.fileLevelTelemetry(any()) } coAnswers {
            result
        }

        myFixture.configureByFile("app.py")

        myFixture.doHighlighting() // Force inlays to resolve (requires 'java' plugin in build.gradle

        val inlayBlock = myFixture.editor.inlayModel.getBlockElementsInRange(
            0, 1000
        )[0]

        val lineNo = myFixture.editor.document.getLineNumber(inlayBlock.offset)

        lineNo shouldBe 13

        val textPresentation = extractTextFromInlay(inlayBlock)
        textPresentation shouldBe "avg duration: 3.333ms | error rate: 0.0% - 5 samples in the last 30 minutes"
    }

    fun `test java method`() {
        initMocks()

        val result = FileLevelTelemetryResult(
            repo = CSRepo("123", "repo", "remote"),
            sampleSize = listOf(
                MethodLevelTelemetrySampleSize(
                    className = "Controller",
                    functionName = "getStuff",
                    metricTimesliceName = "t",
                    sampleSize = 100,
                    namespace = null,
                    source = "span",
                    anomaly = null,
                ), MethodLevelTelemetrySampleSize(
                    className = "Controller",
                    functionName = "postSomething",
                    metricTimesliceName = "t",
                    sampleSize = 150,
                    namespace = null,
                    source = "span",
                anomaly = null,
                )
            ),
            averageDuration = listOf(
                MethodLevelTelemetryAverageDuration(
                    className = "Controller",
                    functionName = "getStuff",
                    metricTimesliceName = "d",
                    averageDuration = 200.0f,
                    namespace = null,
                    anomaly = null,
                ), MethodLevelTelemetryAverageDuration(
                    namespace = null,
                    className = "Controller",
                    functionName = "postSomething",
                    metricTimesliceName = "d",
                    averageDuration = 220.0f,
                    anomaly = null,
                )
            ),
            errorRate = null,
            newRelicEntityGuid = "abcd-1234",
            codeNamespace = "Controller",
            newRelicAccountId = 1,
            error = null,
            lastUpdateDate = null,
            hasAnyData = null,
            sinceDateFormatted = null,
            newRelicEntityName = null,
            newRelicUrl = null,
            relativeFilePath = null
        )

        coEvery { mockAgentService.fileLevelTelemetry(any()) } coAnswers {
            result
        }

        myFixture.configureByFile("Controller.java")

        myFixture.doHighlighting() // Force inlays to resolve (requires 'java' plugin in build.gradle)

        val inlayBlocks = myFixture.editor.inlayModel.getBlockElementsInRange(0, 1000)

        inlayBlocks.size shouldBe 2

        val item1LineNo = myFixture.editor.document.getLineNumber(inlayBlocks[0].offset)

        item1LineNo shouldBe 1
        val item1Text = extractTextFromInlay(inlayBlocks[0])
        item1Text shouldBe "avg duration: 200.000ms | error rate: 0.0% - 100 samples in the last 30 minutes"

        val inlayBlock2 = inlayBlocks[1]
        val item2LineNo = myFixture.editor.document.getLineNumber(inlayBlock2.offset)

        item2LineNo shouldBe 9
        val item2Text = extractTextFromInlay(inlayBlock2)
        item2Text shouldBe "avg duration: 220.000ms | error rate: 0.0% - 150 samples in the last 30 minutes"
    }

    private fun extractTextFromInlay(inlayBlock: Inlay<*>): String {
        val presentation = (inlayBlock.renderer as CLMCustomRenderer).presentation as OnHoverPresentation
        val dynamicDelegatePresentation = presentation.presentation as DynamicDelegatePresentation
        val withAttributesPresentation = dynamicDelegatePresentation.delegate as WithAttributesPresentation
        val textPresentation = withAttributesPresentation.presentation as TextInlayPresentation
        return textPresentation.text.trim()
    }
}
