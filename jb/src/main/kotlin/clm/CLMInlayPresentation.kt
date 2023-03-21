package com.codestream.clm

import com.intellij.codeInsight.hints.InlayPresentationFactory
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.codeInsight.hints.presentation.StaticDelegatePresentation
import com.intellij.openapi.editor.impl.EditorImpl
import java.awt.Cursor
import java.awt.Point
import java.awt.event.MouseEvent

class CLMInlayPresentation(
    private val editor: EditorImpl,
    presentation: InlayPresentation,
    private val clickListener: InlayPresentationFactory.ClickListener,
    private val onHoverListener: InlayPresentationFactory.HoverListener,
) : StaticDelegatePresentation(presentation) {
    private var hovering: Boolean = false

    override fun mouseClicked(event: MouseEvent, translated: Point) {
        super.mouseClicked(event, translated)
        clickListener.onClick(event, translated)
    }

    override fun mouseMoved(event: MouseEvent, translated: Point) {
        super.mouseMoved(event, translated)
        if (hovering) return
        val handCursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        editor.setCustomCursor(this, handCursor)
        onHoverListener.onHover(event, translated)
        hovering = true
    }

    override fun mouseExited() {
        super.mouseExited()
        hovering = false
        editor.setCustomCursor(this, null)
        onHoverListener.onHoverFinished()
    }
}
