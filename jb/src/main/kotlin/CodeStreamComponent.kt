package com.codestream

// foo bar

import com.codestream.agent.ModuleListenerImpl
import com.codestream.editor.EditorFactoryListenerImpl
import com.codestream.editor.FileEditorManagerListenerImpl
import com.codestream.editor.VirtualFileListenerImpl
import com.codestream.protocols.webview.EditorNotifications
import com.codestream.protocols.webview.FocusNotifications
import com.codestream.protocols.webview.Sidebar
import com.codestream.protocols.webview.SidebarLocation
import com.codestream.settings.ApplicationSettingsService
import com.codestream.system.CodeStreamDiffURLStreamHandler
import com.codestream.workaround.ToolWindowManagerWorkaround
import com.intellij.ProjectTopics
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowAnchor
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.openapi.wm.ToolWindowType
import com.intellij.openapi.wm.WindowManager
import com.intellij.openapi.wm.ex.ToolWindowManagerListener
import com.intellij.util.ui.UIUtil
import org.apache.commons.io.FileUtils
import org.reflections.Reflections
import org.reflections.scanners.ResourcesScanner
import java.awt.KeyboardFocusManager
import java.awt.event.WindowEvent
import java.awt.event.WindowFocusListener
import java.io.File
import java.nio.file.Files
import kotlin.properties.Delegates

const val CODESTREAM_TOOL_WINDOW_ID = "CodeStream"

class CodeStreamComponent(val project: Project) : Disposable {

    private val logger = Logger.getInstance(CodeStreamComponent::class.java)
    private val toolWindow: ToolWindow?
        get() = ToolWindowManagerWorkaround.getInstance(project)?.getToolWindow(CODESTREAM_TOOL_WINDOW_ID)

    var isFocused by Delegates.observable(true) { _, _, _ ->
        updateWebViewFocus()
    }
    var isVisible by Delegates.observable(false) { _, _, new ->
        _isVisibleObservers.forEach { it(new) }
    }

    init {
        logger.info("Initializing CodeStream")
        CodeStreamDiffURLStreamHandler
        extractAssets()
        initDebugMonitors()
        initEditorFactoryListener()
        initVirtualFileListener()
        initMessageBusSubscriptions()
        showToolWindowOnFirstRun()
        ApplicationManager.getApplication().invokeLater {
            initWindowFocusListener()
            initUnreadsListener()
        }
        project.agentService?.onDidStart {
            val webViewService = project.webViewService ?: return@onDidStart
            webViewService.load()
        }
    }

    private fun extractAssets() {
        try {
            val userHomeDir = File(System.getProperty("user.home"))
            val protobufDir = userHomeDir.resolve(".codestream").resolve("protobuf")
            if (!protobufDir.exists()) {
                Files.createDirectories(protobufDir.toPath())
            }
            val reflections = Reflections("protobuf", ResourcesScanner())
            val resourceList = reflections.getResources { true }
            val csDir = userHomeDir.resolve(".codestream")
            resourceList.forEach {
                val dest = csDir.resolve(it)
                if (!dest.parentFile.exists()) {
                    Files.createDirectories(dest.parentFile.toPath())
                }
                FileUtils.copyToFile(javaClass.getResourceAsStream("/$it"), dest)
            }
        } catch (e: Exception) {
            logger.error(e)
        }
    }

    private fun initWindowFocusListener() {
        if (project.isDisposed) return
        val frame = WindowManager.getInstance().getFrame(project)
        val window = UIUtil.getWindow(frame)
        window?.addWindowFocusListener(object : WindowFocusListener {
            override fun windowLostFocus(e: WindowEvent?) {
                isFocused = false
            }

            override fun windowGainedFocus(e: WindowEvent?) {
                isFocused = true
            }
        })
    }

    private fun initEditorFactoryListener() {
        if (project.isDisposed) return
        EditorFactory.getInstance().addEditorFactoryListener(
            EditorFactoryListenerImpl(project), this
        )
    }

    private fun initVirtualFileListener() {
        if (project.isDisposed) return
        VirtualFileManager.getInstance().addVirtualFileListener(
            VirtualFileListenerImpl(project), this
        )
    }

    private fun initMessageBusSubscriptions() {
        if (project.isDisposed) return
        project.messageBus.connect().let {
            it.subscribe(
                FileEditorManagerListener.FILE_EDITOR_MANAGER,
                FileEditorManagerListenerImpl(project)
            )
            it.subscribe(
                ProjectTopics.MODULES,
                ModuleListenerImpl(project)
            )
            it.subscribe(
                ToolWindowManagerListener.TOPIC,
                object : ToolWindowManagerListener {
                    override fun stateChanged() {
                        isVisible = toolWindow?.isVisible ?: false
                        updateWebViewFocus()
                        updateSidebar()
                        toolWindow?.component?.repaint()
                    }

                    override fun toolWindowRegistered(id: String) {
                        if (id == CODESTREAM_TOOL_WINDOW_ID) {
                            val toolWindow = ToolWindowManager.getInstance(project).getToolWindow(CODESTREAM_TOOL_WINDOW_ID)
                            toolWindow?.contentManager // trigger content (webview) initialization
                        }
                    }
                }
            )
        }
    }

    private fun initUnreadsListener() {
        if (project.isDisposed) return
        project.sessionService?.onUnreadsChanged {
            ApplicationManager.getApplication().invokeLater {
                toolWindow?.setIcon(if (it > 0) {
                    IconLoader.getIcon("/images/codestream-unread.svg")
                } else {
                    IconLoader.getIcon("/images/codestream.svg")
                })
            }
        }
    }

    private fun showToolWindowOnFirstRun() {
        val settings = ServiceManager.getService(ApplicationSettingsService::class.java)
        if (settings.firstRun) {
            project.webViewService?.onDidInitialize {
                ApplicationManager.getApplication().invokeLater {
                    show()
                    settings.firstRun = false
                }
            }
        }
    }

    fun toggleVisible() {
        when (isVisible) {
            true -> hide()
            false -> show()
        }
    }

    fun show(afterShow: (() -> Unit)? = null) {
        ApplicationManager.getApplication().invokeLater {
            toolWindow?.show {
                project.webViewService?.webView?.focus()
                afterShow?.invoke()
            }
        }
    }

    private fun show() {
        show(null)
    }

    private fun hide() {
        toolWindow?.hide(null)
    }

    private fun updateWebViewFocus() {
        project.webViewService?.postNotification(
            FocusNotifications.DidChange(isFocused && isVisible)
        )
    }

    private var oldSidebarLocation: SidebarLocation? = null
    private fun updateSidebar() {
        val tw = toolWindow ?: return
        val sidebarLocation = when (tw.type) {
            ToolWindowType.FLOATING -> SidebarLocation.FLOATING
            ToolWindowType.WINDOWED -> SidebarLocation.FLOATING
            else -> when(tw.anchor?.toString()) {
                ToolWindowAnchor.LEFT.toString() -> SidebarLocation.LEFT
                ToolWindowAnchor.RIGHT.toString() -> SidebarLocation.RIGHT
                ToolWindowAnchor.TOP.toString() -> SidebarLocation.TOP
                ToolWindowAnchor.BOTTOM.toString() -> SidebarLocation.BOTTOM
                else -> SidebarLocation.FLOATING
            }
        }
        if (sidebarLocation != oldSidebarLocation) {
            project.webViewService?.postNotification(
                EditorNotifications.DidChangeLayout(Sidebar(sidebarLocation))
            )
            oldSidebarLocation = sidebarLocation
        }
    }

    override fun dispose() {
    }

    private val _isVisibleObservers = mutableListOf<(Boolean) -> Unit>()
    fun onIsVisibleChanged(observer: (Boolean) -> Unit) {
        _isVisibleObservers += observer
    }

    private fun initDebugMonitors() {
        if (!DEBUG) return

        KeyboardFocusManager.getCurrentKeyboardFocusManager().addPropertyChangeListener { evt ->
            if (evt.propertyName === "focusOwner") {
                logger.debug("Current focus owner: ${evt.newValue}")
            }
        }
    }
}
