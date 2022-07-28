package clm

import com.codestream.agent.AgentService
import com.codestream.protocols.agent.CSRepo
import com.codestream.protocols.agent.FileLevelTelemetryResult
import com.codestream.protocols.agent.MethodLevelTelemetryAverageDuration
import com.codestream.protocols.agent.MethodLevelTelemetryThroughput
import com.codestream.webview.JxBrowserEngineService
import com.codestream.webview.WebViewService
import com.intellij.codeInsight.hints.presentation.DynamicDelegatePresentation
import com.intellij.codeInsight.hints.presentation.OnHoverPresentation
import com.intellij.codeInsight.hints.presentation.PresentationRenderer
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
@TestDataPath("csTestData")
class CLMLanguageComponentTest : BasePlatformTestCase() {
    val mockAgentService = mockk<AgentService>(relaxed = true)
    val mockJxBrowserEngineService = mockk<JxBrowserEngineService>(relaxed = true)
    val mockWebViewService = mockk<WebViewService>(relaxed = true)

    @BeforeClass
    fun init() {
        System.setProperty("TEST_MODE", "true")
    }

    override fun getTestDataPath(): String {
        return "csTestData"
    }

    fun initMocks() {
        project.registerServiceInstance(AgentService::class.java, mockAgentService)
        project.registerServiceInstance(JxBrowserEngineService::class.java, mockJxBrowserEngineService)
        project.registerServiceInstance(WebViewService::class.java, mockWebViewService)

        // Mimic the actual implementation
        val slot = slot<() -> Unit>()
        every { mockAgentService.onDidStart(capture(slot)) } answers { slot.captured() }
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
                    averageDuration = 3.333f
                ),
            ),
            throughput = null,
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

        myFixture.doHighlighting() // Force inlays to resolve (requires 'java' plugin in build.gradle)

        val inlayBlock = myFixture.editor.inlayModel.getBlockElementsInRange(
            0, 1000
        )[0]

        val lineNo = myFixture.editor.document.getLineNumber(inlayBlock.offset)

        lineNo shouldBe 13

        val textPresentation = extractTextFromInlay(inlayBlock)
        textPresentation shouldBe "avg duration: 3.333ms | throughput: n/a | error rate: n/a - since 30 minutes ago"
    }

    fun `test java method`() {
        initMocks()

        val result = FileLevelTelemetryResult(
            repo = CSRepo("123", "repo", "remote"),
            throughput = listOf(
                MethodLevelTelemetryThroughput(
                    className = "Controller",
                    functionName = "getStuff",
                    metricTimesliceName = "t",
                    requestsPerMinute = 100f,
                    namespace = null
                ), MethodLevelTelemetryThroughput(
                    className = "Controller",
                    functionName = "postSomething",
                    metricTimesliceName = "t",
                    requestsPerMinute = 150f,
                    namespace = null,
                )
            ),
            averageDuration = listOf(
                MethodLevelTelemetryAverageDuration(
                    className = "Controller",
                    functionName = "getStuff",
                    metricTimesliceName = "d",
                    averageDuration = 200.0f,
                    namespace = null,
                ), MethodLevelTelemetryAverageDuration(
                    namespace = null,
                    className = "Controller",
                    functionName = "postSomething",
                    metricTimesliceName = "d",
                    averageDuration = 220.0f
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
        item1Text shouldBe "avg duration: 200.000ms | throughput: 100.000rpm | error rate: n/a - since 30 minutes ago"

        val inlayBlock2 = inlayBlocks[1]
        val item2LineNo = myFixture.editor.document.getLineNumber(inlayBlock2.offset)

        item2LineNo shouldBe 9
        val item2Text = extractTextFromInlay(inlayBlock2)
        item2Text shouldBe "avg duration: 220.000ms | throughput: 150.000rpm | error rate: n/a - since 30 minutes ago"
    }

    private fun extractTextFromInlay(inlayBlock: Inlay<*>): String {
        val presentation = (inlayBlock.renderer as PresentationRenderer).presentation as OnHoverPresentation
        val dynamicDelegatePresentation = presentation.presentation as DynamicDelegatePresentation
        val withAttributesPresentation = dynamicDelegatePresentation.delegate as WithAttributesPresentation
        val textPresentation = withAttributesPresentation.presentation as TextInlayPresentation
        return textPresentation.text.trim()
    }
}
