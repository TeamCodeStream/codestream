package com.codestream.editor

import com.intellij.codeInsight.hint.HintManager
import com.intellij.codeInsight.hint.HintManagerImpl
import com.intellij.codeInsight.hints.InlayPresentationFactory
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.codeInsight.hints.presentation.OnHoverPresentation
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.impl.EditorImpl
import com.intellij.openapi.util.registry.Registry
import com.intellij.ui.LightweightHint
import com.intellij.ui.awt.RelativePoint
import com.intellij.util.ui.JBUI
import org.jetbrains.annotations.Contract
import java.awt.Component
import java.awt.Point
import java.awt.event.MouseEvent
import javax.swing.JPanel
import javax.swing.event.HyperlinkListener

class CodeStreamPresentationFactory(val editor: EditorImpl) {

    @Contract(pure = true)
    fun withTooltip(tooltip: JPanel, base: InlayPresentation): InlayPresentation {
        var hint: LightweightHint? = null
        return onHover(base, object : InlayPresentationFactory.HoverListener {
            override fun onHover(event: MouseEvent, translated: Point) {
                if (hint?.isVisible != true) {
                    hint = showTooltip(editor, event, tooltip)
                }
            }

            override fun onHoverFinished() {
                // hint?.hide()
                // hint = null
            }
        })
    }

    private fun showTooltip(editor: Editor, e: MouseEvent, tooltip: JPanel): LightweightHint {
        val hint = run {
            tooltip.border = JBUI.Borders.empty(6, 6, 5, 6)
            LightweightHint(tooltip)
        }

        val constraint = HintManager.ABOVE

        val point = run {
            val pointOnEditor = locationAt(e, editor.contentComponent)
            val p = HintManagerImpl.getHintPosition(hint, editor, editor.xyToVisualPosition(pointOnEditor), constraint)
            p.x = e.xOnScreen - editor.contentComponent.topLevelAncestor.locationOnScreen.x
            p
        }

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
