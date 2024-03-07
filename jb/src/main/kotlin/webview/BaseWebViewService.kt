package com.codestream.webview

import com.codestream.ENV_DISABLE_JCEF
import com.codestream.settings.ApplicationSettingsService
import com.codestream.telemetryService
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import org.apache.commons.io.FileUtils
import java.io.File
import java.util.concurrent.CompletableFuture


abstract class BaseWebViewService(val project: Project) {

    protected val WEBVIEW_TEMPLATE_HTML = "webview-template.html"
    protected val WEBVIEW_HTML = "webview.html"

    private val logger = Logger.getInstance(BaseWebViewService::class.java)
    protected lateinit var extractedTemplateHtmlFile: File

    protected val templateHtmlFile: File get() = if (debugWebViewPath != null) {
        File(debugWebViewPath, WEBVIEW_TEMPLATE_HTML)
    } else {
        extractedTemplateHtmlFile
    }

    protected val htmlFile: File get() = File(templateHtmlFile.parent, WEBVIEW_HTML)

    abstract val webviewName: String
    abstract val debugWebViewPath: String?

    open fun processHtmlContent(html: String): String {
        return html
    }

    protected fun createWebView(router: WebViewRouter): WebView {
        val application = ApplicationManager.getApplication()
        val appSettings = application.getService(ApplicationSettingsService::class.java)
        return try {
            if (!ENV_DISABLE_JCEF && appSettings.jcef && JBCefApp.isSupported()) {
                logger.info("JCEF enabled")
                val jbCefBrowserFuture = CompletableFuture<JBCefBrowser>()
                if (application.isDispatchThread) {
                    val jbCefBrowser = JBCefBrowser()
                    jbCefBrowserFuture.complete(jbCefBrowser)
                } else {
                    application.invokeLater {
                        val jbCefBrowser = JBCefBrowser()
                        jbCefBrowserFuture.complete(jbCefBrowser)
                    }
                }
                JBCefWebView(jbCefBrowserFuture.get(), router, project)
            } else {
                logger.info("JCEF disabled - falling back to JxBrowser")
                val engine = application.getService(JxBrowserEngineService::class.java)
                val browser = engine.newBrowser()
                JxBrowserWebView(browser, router)
            }
        } catch (ex: Exception) {
            logger.warn("Error initializing JCEF - falling back to JxBrowser", ex)
            val engine = application.getService(JxBrowserEngineService::class.java)
            JxBrowserWebView(engine.newBrowser(), router)
        }
    }

    protected fun extractAssets() {
        val tempDir = createTempDir("codestream")
        logger.info("Extracting webview to ${tempDir.absolutePath}")
        tempDir.deleteOnExit()
        extractedTemplateHtmlFile = File(tempDir, WEBVIEW_TEMPLATE_HTML)

        FileUtils.copyToFile(BaseWebViewService::class.java.getResourceAsStream("/webviews/$webviewName/$webviewName.js"), File(tempDir, "$webviewName.js"))
        FileUtils.copyToFile(BaseWebViewService::class.java.getResourceAsStream("/webviews/$webviewName/$webviewName.js.map"), File(tempDir, "$webviewName.js.map"))
        FileUtils.copyToFile(
            BaseWebViewService::class.java.getResourceAsStream("/webviews/$webviewName/styles/$webviewName.css"),
            File(tempDir.resolve("styles"), "$webviewName.css")
        )
        FileUtils.copyToFile(BaseWebViewService::class.java.getResourceAsStream("/webviews/$webviewName/${WEBVIEW_TEMPLATE_HTML}"), File(tempDir,
            WEBVIEW_TEMPLATE_HTML
        ))
    }

    protected fun generateHtmlFile(processHtml: (String) -> String = { it }) {
        val htmlContent = FileUtils.readFileToString(templateHtmlFile, Charsets.UTF_8)
            .let { injectStylesheet(it) }
            .let { injectTelemetryScript(it) }
            .let(processHtml)

        FileUtils.write(htmlFile, htmlContent, Charsets.UTF_8)
    }

    private fun injectStylesheet(html: String): String {
        val theme = WebViewTheme.build()
        return html
            .replace("{bodyClass}", theme.name)
            .replace("{csStyle}", theme.stylesheet)
    }

    private fun injectTelemetryScript(html: String): String {
        val template = BaseWebViewService::class.java.getResource("/webviews/$webviewName/newrelic-browser.js")?.readText()?.trim() ?: ""
        val script = project.telemetryService?.telemetryOptions?.webviewOptions()?.let {
            template
                .replace("{{accountID}}", it.accountId)
                .replace("{{applicationID}}", it.webviewAppId)
                .replace("{{agentID}}", it.webviewAgentId)
                .replace("{{licenseKey}}", it.browserIngestKey)
        } ?: ""
        return html
            .replace("{telemetryScript}", script)
    }

    protected val File.url: String
        get() = toURI().toURL().toString()

}
