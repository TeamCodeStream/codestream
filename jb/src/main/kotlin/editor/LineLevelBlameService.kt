package com.codestream.editor

import com.codestream.agentService
import com.codestream.extensions.getOffset
import com.codestream.extensions.uri
import com.codestream.protocols.agent.GetBlameParams
import com.codestream.protocols.agent.GetBlameResultLineInfo
import com.codestream.settings.ApplicationSettingsService
import com.intellij.codeInsight.hints.presentation.InlayTextMetricsStorage
import com.intellij.codeInsight.hints.presentation.PresentationFactory
import com.intellij.codeInsight.hints.presentation.PresentationRenderer
import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.event.CaretEvent
import com.intellij.openapi.editor.event.CaretListener
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.editor.event.SelectionListener
import com.intellij.openapi.editor.impl.EditorImpl
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiDocumentManager
import com.intellij.util.io.HttpRequests
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.Position
import java.awt.Image
import java.util.concurrent.CompletableFuture
import javax.swing.Icon
import javax.swing.ImageIcon

private val logger = Logger.getInstance(LineLevelBlameService::class.java)

class LineLevelBlameService(val project: Project) {
    private val gitToolboxInstalled = PluginManager.isPluginInstalled(PluginId.getId("zielu.gittoolbox"))
    private val iconsCache = IconsCache()
    private val blameManagers = mutableMapOf<Editor, BlameManager>()

    fun add(editor: Editor) {
        if (gitToolboxInstalled) return
        if (editor !is EditorImpl) return
        blameManagers[editor] = BlameManager(editor, iconsCache)
    }

    fun remove(editor: Editor) {
        blameManagers[editor]?.dispose()
        blameManagers.remove(editor)
    }

    fun resetCache() {
        blameManagers.values.forEach { it.clearCache() }
    }
}

private class BlameManager(private val editor: EditorImpl, private val iconsCache: IconsCache) : CaretListener, DocumentListener {
    private val uri = editor.document.uri
    private val agent = editor.project?.agentService
    private val settingsService = ServiceManager.getService(ApplicationSettingsService::class.java)
    private val presentationFactory = PresentationFactory(editor)
    private val csPresentationFactory = CodeStreamPresentationFactory(editor)
    private val textMetricsStorage = InlayTextMetricsStorage(editor)
    private val lineBlames = mutableMapOf<Int, GetBlameResultLineInfo>()
    private var isLoadingBlame: CompletableFuture<Unit>? = null
    private var inlay: Disposable? = null
    private var currentLine: Int = -1
    private val project = editor.project
    private val psiFile = if (project != null) PsiDocumentManager.getInstance(project).getPsiFile(editor.document) else null
    init {
        editor.caretModel.addCaretListener(this)
        editor.document.addDocumentListener(this)
    }

    fun dispose() {
        try {
            editor.caretModel.removeCaretListener(this)
            editor.document.removeDocumentListener(this)
        } catch (ex: Exception) {
            logger.warn(ex)
        }
    }

    private fun setInlay(line: Int, renderer: PresentationRenderer) {
        ApplicationManager.getApplication().invokeLater {
            synchronized(this) {
                try {
                    inlay?.dispose()
                    inlay = editor.inlayModel.addAfterLineEndElement(editor.getOffset(Position(currentLine, 0)), false, renderer)
                } catch (ex: Exception) {
                    logger.warn(ex)
                }
            }
        }
    }

    private suspend fun getBlame(line: Int): GetBlameResultLineInfo? {
        if (uri == null || agent == null) return null
        isLoadingBlame?.await()
        if (!lineBlames.containsKey(line)) {
            isLoadingBlame = CompletableFuture<Unit>()
            project?.agentService?.onDidStart {
                GlobalScope.launch {
                    try {
                        var lineStart = line
                        var lineEnd = line
                        if (lineBlames.containsKey(line - 1)) {
                            lineEnd = line + 10
                        } else if (lineBlames.contains(line + 1)) {
                            lineStart = line - 10
                        } else {
                            lineStart = line - 5
                            lineEnd = line + 5
                        }
                        lineStart = lineStart.coerceAtLeast(0)
                        lineEnd = lineEnd.coerceAtMost(editor.document.lineCount - 1)

                        val blameResult = agent.getBlame(GetBlameParams(
                            uri,
                            lineStart,
                            lineEnd
                        ))
                        blameResult.blame.forEachIndexed { index, lineBlame ->
                            lineBlames[index + lineStart] = lineBlame
                            iconsCache.load(lineBlame.gravatarUrl)
                        }
                    } catch (ex: Exception) {
                        logger.warn(ex)
                    } finally {
                        isLoadingBlame?.complete(Unit)
                    }
                }
            }
            isLoadingBlame?.await()
        }

        return lineBlames[line]
    }

    override fun caretPositionChanged(e: CaretEvent) {
        if (e.newPosition.line != currentLine) {
            currentLine = e.newPosition.line
            renderBlame()
        }
    }

    fun renderBlame() = ApplicationManager.getApplication().invokeLater {
        inlay?.dispose()
        inlay = null
        if (!settingsService.showGitBlame) return@invokeLater
        val project = editor.project ?: return@invokeLater
        GlobalScope.launch {
            try {
                val blame = getBlame(currentLine) ?: return@launch
                val textPresentation = presentationFactory.smallText(blame.formattedBlame)
                val insetPresentation = presentationFactory.inset(textPresentation, 0, 0, textMetricsStorage.getFontMetrics(true).offsetFromTop(), 0)
                val presentation = if (!blame.isUncommitted) {
                    val blameHover = BlameHover().also {
                        it.configure(project, editor, psiFile, blame, iconsCache)
                    }
                    csPresentationFactory.withTooltip(blameHover, insetPresentation)
                } else {
                    insetPresentation
                }
                val renderer = PresentationRenderer(presentation)
                setInlay(currentLine, renderer)
            } catch (ex: Exception) {
                logger.warn(ex)
            }
        }
    }

    private var debouncedRenderBlame: Job? = null
    override fun documentChanged(event: DocumentEvent) {
        lineBlames.clear()
        debouncedRenderBlame?.cancel()
        debouncedRenderBlame = GlobalScope.launch {
            delay(2000L)
            renderBlame()
        }
    }

    fun clearCache() {
        lineBlames.clear()
        renderBlame()
    }
}

class IconsCache {
    private val cache = mutableMapOf<String, CompletableFuture<Icon?>>()
    fun load(url: String) {
        cache.getOrPut(url) {
            val iconFuture = CompletableFuture<Icon?>()
            GlobalScope.launch {
                try {
                    val bytes: ByteArray = HttpRequests.request(url).readBytes(null)
                    val tempIcon = ImageIcon(bytes)
                    val image: Image = tempIcon.image
                    val resizedImage: Image = image.getScaledInstance(20, 20, Image.SCALE_SMOOTH)
                    iconFuture.complete(ImageIcon(resizedImage))
                } catch (e: Exception) {
                    logger.warn(e)
                    iconFuture.complete(null)
                }
            }
            iconFuture
        }
    }

    fun get(url: String): CompletableFuture<Icon?>? {
        return cache[url]
    }
}
