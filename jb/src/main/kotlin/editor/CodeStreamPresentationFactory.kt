package com.codestream.editor

import com.codestream.agentService
import com.codestream.protocols.agent.TelemetryParams
import com.intellij.codeInsight.hint.HintManager
import com.intellij.codeInsight.hint.HintManagerImpl
import com.intellij.codeInsight.hints.InlayPresentationFactory
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.codeInsight.hints.presentation.OnHoverPresentation
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.impl.EditorImpl
import com.intellij.ui.LightweightHint
import com.intellij.util.ui.JBUI
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.jetbrains.annotations.Contract
import java.awt.Component
import java.awt.Point
import java.awt.event.MouseEvent
import javax.swing.JPanel

class CodeStreamPresentationFactory(val editor: EditorImpl) {

    private val logger = Logger.getInstance(CodeStreamPresentationFactory::class.java)

    @Contract(pure = true)
    fun withTooltip(blameHover: BlameHover, base: InlayPresentation): InlayPresentation {
        var hint: LightweightHint? = null
        var hoverJob: Job? = null

        return onHover(base, object : InlayPresentationFactory.HoverListener {
            override fun onHover(event: MouseEvent, translated: Point) {
                if (hoverJob != null) return
                hoverJob = GlobalScope.launch {
                    delay(500L)
                    ApplicationManager.getApplication().invokeLater {
                        if (hint?.isVisible != true) {
                            blameHover.onActionInvoked {
                                hint?.hide()
                                hint = null
                            }
                            hint = showTooltip(editor, event, blameHover.rootPanel)
                            try {
                                editor.project?.agentService?.agent?.telemetry(TelemetryParams("Blame Hover Viewed", mapOf(
                                    "File Extension" to editor.virtualFile.extension
                                )))
                            } catch(ex: Exception) {
                                logger.warn(ex)
                            }
                        }
                    }
                }
            }

            override fun onHoverFinished() {
                hoverJob?.cancel()
                hoverJob = null
                // hint?.hide()
                // hint = null
            }
        })
    }

    private fun showTooltip(editor: Editor, e: MouseEvent, tooltip: JPanel): LightweightHint? {
        val hint = run {
            tooltip.border = JBUI.Borders.empty(6, 6, 5, 6)
            LightweightHint(tooltip)
        }

        val constraint = HintManager.ABOVE

        val point = run {
            try {
                val pointOnEditor = locationAt(e, editor.contentComponent)
                val p =
                    HintManagerImpl.getHintPosition(hint, editor, editor.xyToVisualPosition(pointOnEditor), constraint)
                p.x = e.xOnScreen - editor.contentComponent.topLevelAncestor.locationOnScreen.x
                p
            } catch (e: Throwable) {
                logger.warn("Error getting tooltip position", e)
                null
            }
        } ?: return null

        HintManagerImpl.getInstanceImpl().showEditorHint(hint, editor, point,
            HintManager.HIDE_BY_ANY_KEY
                or HintManager.HIDE_BY_TEXT_CHANGE
                or HintManager.HIDE_BY_SCROLLING,
            0,
            false,
            HintManagerImpl.createHintHint(editor, point, hint, constraint).setContentActive(false)
        )

        return hint
    }

    @Contract(pure = true)
    fun onHover(base: InlayPresentation, onHoverListener: InlayPresentationFactory.HoverListener): InlayPresentation =
        OnHoverPresentation(base, onHoverListener)

    private fun locationAt(e: MouseEvent, component: Component): Point {
        val pointOnScreen = component.locationOnScreen
        return Point(e.xOnScreen - pointOnScreen.x, e.yOnScreen - pointOnScreen.y)
    }

}
