package com.codestream.editor

import com.codestream.agentService
import com.codestream.extensions.uri
import com.codestream.protocols.agent.GetBlameParams
import com.codestream.protocols.agent.GetBlameResultLineInfo
import com.intellij.codeInsight.hints.presentation.InlayTextMetricsStorage
import com.intellij.codeInsight.hints.presentation.PresentationFactory
import com.intellij.codeInsight.hints.presentation.PresentationRenderer
import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
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
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import java.awt.Image
import java.util.concurrent.CompletableFuture
import javax.swing.Icon
import javax.swing.ImageIcon
import javax.swing.event.HyperlinkEvent.EventType
import javax.swing.event.HyperlinkListener

class LineLevelBlameService(val project: Project) : SelectionListener {

    private val logger = Logger.getInstance(LineLevelBlameService::class.java)
    private val gitToolboxInstalled = PluginManager.isPluginInstalled(PluginId.getId("zielu.gittoolbox"))
    private val iconsCache = mutableMapOf<String, CompletableFuture<Icon?>>()

    fun add(editor: Editor) {
        if (gitToolboxInstalled) return
        if (editor !is EditorImpl) return
        val uri = editor.document.uri ?: return
        val agent = project.agentService ?: return
        val presentationFactory = PresentationFactory(editor)
        val csPresentationFactory = CodeStreamPresentationFactory(editor)
        val textMetricsStorage = InlayTextMetricsStorage(editor)
        val lineBlames = mutableMapOf<Int, GetBlameResultLineInfo>()
        var isLoadingBlame: CompletableFuture<Unit>? = null
        var inlay: Disposable? = null
        var lastLine: Int = -1

        fun setInlay(line: Int, renderer: PresentationRenderer) {
            ApplicationManager.getApplication().invokeLater {
                synchronized(this) {
                        inlay?.dispose()
                        inlay = editor.inlayModel.addAfterLineEndElement(editor.visualLineStartOffset(line), false, renderer)
                }
            }
        }

        suspend fun getBlame(line: Int): GetBlameResultLineInfo? {
            isLoadingBlame?.await()
            if (!lineBlames.containsKey(line)) {
                isLoadingBlame = CompletableFuture<Unit>()
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
                        iconsCache.getOrPut(lineBlame.gravatarUrl) {
                            val iconFuture = CompletableFuture<Icon?>()
                            GlobalScope.launch {
                                try {
                                    val bytes: ByteArray = HttpRequests.request(lineBlame.gravatarUrl).readBytes(null)
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
                } catch (ex: Exception) {
                    logger.warn(ex)
                } finally {
                    isLoadingBlame?.complete(Unit)
                }
            }

            return lineBlames[line]
        }

        val hyperlinkListener = HyperlinkListener {
            if (it.eventType == EventType.ACTIVATED) {
                println(it.description)
            }
        }



        editor.caretModel.addCaretListener(object : CaretListener {
            override fun caretPositionChanged(e: CaretEvent) {
                if (e.newPosition.line != lastLine) {
                    lastLine = e.newPosition.line
                    GlobalScope.launch {
                        try {
                            val blame = getBlame(lastLine) ?: return@launch
                            val textPresentation = presentationFactory.smallText(blame.formattedBlame)
                            val insetPresentation = presentationFactory.inset(textPresentation, 0, 0, textMetricsStorage.getFontMetrics(true).offsetFromTop(), 0)
                            val presentation = if (!blame.isUncommitted) {
                                val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(editor.document)
                                val blameHover = BlameHover().also {
                                    it.configure(project, editor, psiFile, blame, iconsCache)
                                }
                                csPresentationFactory.withTooltip(blameHover.rootPanel, insetPresentation)
                            } else {
                                insetPresentation
                            }
                            val renderer = PresentationRenderer(presentation)
                            setInlay(e.newPosition.line, renderer)
                        } catch (ex: Exception) {
                            logger.error(ex)
                        }
                    }
                }
            }
        })


        editor.document.addDocumentListener(object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) {
                lineBlames.clear()
            }
        })
    }

    fun remove(editor: Editor) {

    }

}
