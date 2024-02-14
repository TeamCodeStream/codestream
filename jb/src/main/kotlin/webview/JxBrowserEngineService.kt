package com.codestream.webview

import com.codestream.DEBUG
import com.codestream.appDispatcher
import com.codestream.system.Platform
import com.codestream.system.platform
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import com.intellij.util.download.DownloadableFileDescription
import com.intellij.util.download.DownloadableFileService
import com.teamdev.jxbrowser.browser.Browser
import com.teamdev.jxbrowser.engine.Engine
import com.teamdev.jxbrowser.engine.EngineOptions
import com.teamdev.jxbrowser.engine.RenderingMode
import com.teamdev.jxbrowser.net.ResourceType
import com.teamdev.jxbrowser.net.callback.BeforeUrlRequestCallback
import com.teamdev.jxbrowser.plugin.callback.AllowPluginCallback
import kotlinx.coroutines.delay
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import org.apache.commons.io.FileUtils
import java.io.File
import java.net.URLClassLoader
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.concurrent.CompletableFuture

const val DOWNLOAD_URL_PREFIX = "https://images.codestream.com/jxbrowser/"

class JxBrowserEngineService : Disposable {

    private val logger = Logger.getInstance(JxBrowserEngineService::class.java)
    private var engineFuture: CompletableFuture<Engine>? = null
    private fun getEngine(): CompletableFuture<Engine> {
        synchronized(this) {
            if (engineFuture != null) return engineFuture!!
            engineFuture = CompletableFuture<Engine>()
            appDispatcher.launch {
                try {
                    val chromiumDir = downloadAndExtractJxBrowserChromium()
                    val dir = createTempDir()
                    logger.info("JxBrowser work dir: $dir")
                    val licenseKey = try {
                        JxBrowserEngineService::class.java.getResource("/jxbrowser.license").readText().trim()
                    } catch (e: Exception) {
                        logger.error(e)
                        ""
                    }

                    // System.setProperty("jxbrowser.ipc.external", "true")
                    val optionsBuilder = EngineOptions
                        .newBuilder(RenderingMode.OFF_SCREEN)
                        .licenseKey(licenseKey)
                        .userDataDir(Paths.get(dir.toURI()))
                        .disableGpu()
                        .disableChromiumTraffic()
                        .addSwitch("--disable-gpu-compositing")
                        .addSwitch("--enable-begin-frame-scheduling")
                        .addSwitch("--software-rendering-fps=60")
                        //     if (JreHiDpiUtil.isJreHiDPIEnabled() && !SystemInfo.isMac) "--force-device-scale-factor=1" else ""
                        .allowFileAccessFromFiles()
                        .chromiumDir(chromiumDir.toPath())

                    if (DEBUG) {
                        optionsBuilder.remoteDebuggingPort(9222)
                    }

                    val options = optionsBuilder.build()
                    val engine = Engine.newInstance(options)
                    engineFuture!!.complete(engine)
                    // engine.network()
                    engine.spellChecker().disable()
                    engine.plugins()
                        .set(AllowPluginCallback::class.java, AllowPluginCallback { AllowPluginCallback.Response.deny() })
                    engine.network().set(BeforeUrlRequestCallback::class.java, BeforeUrlRequestCallback {
                        if (it.urlRequest().resourceType() == ResourceType.IMAGE
                            || it.urlRequest().url().startsWith("file://")
                            || it.urlRequest().url().contains("/dns-query")
                            || it.urlRequest().url().equals("https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/loader.js")
                            || it.urlRequest().url().equals("https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/editor/editor.main.js")
                            || it.urlRequest().url().equals("https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/editor/editor.main.css")
                            || it.urlRequest().url().equals("https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/editor/editor.main.nls.js")
                            || it.urlRequest().url().equals("https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/base/worker/workerMain.js")
                            || it.urlRequest().url().equals("https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/base/common/worker/simpleWorker.nls.js")
                            || it.urlRequest().url().equals("https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/base/browser/ui/codicons/codicon/codicon.ttf")
                        ) {
                            BeforeUrlRequestCallback.Response.proceed()
                        } else {
                            if (it.urlRequest().resourceType() == ResourceType.MAIN_FRAME) {
                                try {
                                    BrowserUtil.browse(it.urlRequest().url())
                                } catch (e: Exception) {
                                    logger.warn(e)
                                }
                            }
                            BeforeUrlRequestCallback.Response.cancel()
                        }
                    })
                } catch (e: Exception) {
                    logger.error(e)
                }
            }
            return engineFuture!!
        }
    }

    fun newBrowser(): Browser {
        // browser.audio().mute()
        // browser.set(ConfirmCallback::class.java, ConfirmCallback { _, tell -> tell.cancel() })
        // browser.set(CertificateErrorCallback::class.java, CertificateErrorCallback { _, action -> action.deny() })
        // browser.set(BeforeUnloadCallback::class.java, BeforeUnloadCallback { _, action -> action.stay() })
        // browser.set(AlertCallback::class.java, AlertCallback { _, action -> action.ok() })
        // browser.set(ConfirmCallback::class.java, ConfirmCallback { _, action -> action.cancel() })
        // browser.set(OpenFileCallback::class.java, OpenFileCallback { _, action -> action.cancel() })
        // browser.set(OpenFilesCallback::class.java, OpenFilesCallback { _, action -> action.cancel() })
        // browser.set(OpenFolderCallback::class.java, OpenFolderCallback { _, action -> action.cancel() })
        // browser.set(PromptCallback::class.java, PromptCallback { _, action -> action.cancel() })
        // browser.set(SelectColorCallback::class.java, SelectColorCallback { _, action -> action.cancel() })
        // browser.set(SelectClientCertificateCallback::class.java, SelectClientCertificateCallback { _, action -> action.cancel() })
        return getEngine().get().newBrowser()
    }

    override fun dispose() {
        logger.info("Disposing JxBrowser engine")
        appDispatcher.launch {
            getEngine().await().close()
        }
    }

    private fun downloadAndExtractJxBrowserChromium(): File {
        logger.info("Ensuring JxBrowser Chromium is available")
        try {
            val jarNames = JxBrowserJarName.list()
            val userHomeDir = File(System.getProperty("user.home"))
            val jxBrowserJarsDir = userHomeDir.resolve(".codestream").resolve("jxbrowser")
            val chromiumDir = jxBrowserJarsDir.resolve("chromium")

            if (!chromiumDir.exists()) {
                Files.createDirectories(chromiumDir.toPath())
            }

            val missingJarsDescriptions = mutableListOf<DownloadableFileDescription>()
            jarNames.forEach {
                val jarFile = jxBrowserJarsDir.resolve(it.value())
                if (!Files.exists(jarFile.toPath())) {
                    val description = DownloadableFileService.getInstance()
                        .createFileDescription(DOWNLOAD_URL_PREFIX + it.value(), it.value())
                    missingJarsDescriptions.add(description)
                }
            }

            if (missingJarsDescriptions.isNotEmpty()) {
                val downloader = DownloadableFileService.getInstance().createDownloader(missingJarsDescriptions, "JxBrowser Chromium binaries")
                val downloadedFiles = CompletableFuture<List<String>>()

                val downloaderFuture = downloader.downloadWithBackgroundProgress(jxBrowserJarsDir.absolutePath, null)
                    .thenApply {
                        downloadedFiles.complete(it?.map { file -> file.first.name })
                    }
                    .exceptionally {
                        downloadedFiles.completeExceptionally(it)
                    }

                if (platform == Platform.LINUX_X64) {
                    // Downloader class is broken on Linux. It downloads, but the Future never completes.
                    appDispatcher.launch {
                        while(!downloadedFiles.isDone) {
                            val downloaded = jarNames.all {
                                val jarFile = jxBrowserJarsDir.resolve(it.value())
                                Files.exists(jarFile.toPath())
                            }
                            if (downloaded) {
                                downloadedFiles.complete(jarNames.map { it.value() })
                                downloaderFuture.cancel(true)
                            }
                            delay(1000)
                        }
                    }
                }

                downloadedFiles.join().forEach {
                    logger.info("Downloaded $it")
                }
            }
            val jarUrls = jarNames.map { jxBrowserJarsDir.resolve(it.value()).toURI().toURL() }
            val childClassLoader = URLClassLoader(
                jarUrls.toTypedArray()
            )

            // EngineImpl loads native libtoolkit.so. Each individual native library
            // can only be loaded in one classloader. On Linux, the URL classloader
            // is not garbage collected until much later, so the call to newInstance()
            // will fail because libtoolkit.so will still belong to the other classloader.
            // The workaround consists in making each classloader load the native library
            // from a different path, therefore the temp dir.
            val chromiumDirTemp = File("${chromiumDir.path}.tmp")
            FileUtils.deleteQuietly(chromiumDirTemp)
            try {
                FileUtils.moveDirectory(chromiumDir, chromiumDirTemp)
            } catch (ex: Exception) {
                logger.debug(ex)
            }

            val jniLibrary =
                Class.forName("com.teamdev.jxbrowser.internal.JniLibrary", true, childClassLoader)//.path(chromiumDir);
            val pathMethod = jniLibrary.getDeclaredMethod("path", Path::class.java)
            pathMethod.invoke(null, chromiumDirTemp.toPath())

            val engineImpl = Class.forName("com.teamdev.jxbrowser.engine.internal.EngineImpl", true, childClassLoader)
            val extractorMethod = engineImpl.getDeclaredMethod("extractChromiumBinariesIfNecessary", Path::class.java)
            extractorMethod.isAccessible = true
            extractorMethod.invoke(null, chromiumDirTemp.toPath())

            try {
                FileUtils.moveDirectory(chromiumDirTemp, chromiumDir)
            } catch (ex: Exception) {
                logger.debug(ex)
            }
            logger.info("JxBrowser Chromium available at ${chromiumDir.canonicalPath}")
            return chromiumDir
        } catch (ex: Exception) {
            logger.error(ex)
            throw ex
        }
    }
}
