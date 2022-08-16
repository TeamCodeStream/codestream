package com.codestream.clm

import com.intellij.codeInsight.hints.LinearOrderInlayRenderer
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.codeInsight.hints.presentation.InputHandler
import com.intellij.openapi.editor.EditorCustomElementRenderer
import com.intellij.openapi.editor.Inlay
import com.intellij.openapi.editor.markup.TextAttributes
import com.intellij.util.DocumentUtil
import com.intellij.util.text.CharArrayUtil
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.Point
import java.awt.Rectangle

/*
From com.intellij.codeInsight.hints.presentation.PresentationUtil
 */
fun Graphics2D.withTranslated(x: Int, y: Int, block: () -> Unit) {
    try {
        translate(x, y)
        block()
    } finally {
        translate(-x, -y)
    }
}

/*
Based on com.intellij.codeInsight.codeVision.ui.renderers.BlockCodeVisionListRenderer and
com.intellij.codeInsight.hints.presentation.PresentationRenderer
 */
class CLMCustomRenderer(val presentation: InlayPresentation) : EditorCustomElementRenderer,
    InputHandler by presentation {
    override fun paint(inlay: Inlay<*>, g: Graphics, targetRegion: Rectangle, textAttributes: TextAttributes) {
        val point = getPoint(inlay, targetRegion.location)
        g as Graphics2D
        g.withTranslated(targetRegion.x + point.x, targetRegion.y + 2) {
            presentation.paint(g, LinearOrderInlayRenderer.effectsIn(textAttributes))
        }
    }

    override fun calcWidthInPixels(inlay: Inlay<*>): Int {
        val painterPosition = painterPosition(inlay)
        return presentation.width + painterPosition
    }

    override fun calcHeightInPixels(inlay: Inlay<*>): Int {
        // Editor line height from super class is too tall - use presentation height plus minimal padding
        return presentation.height + 3
    }

    // this should not be shown anywhere
    override fun getContextMenuGroupId(inlay: Inlay<*>): String {
        return "DummyActionGroup"
    }

    private fun painterPosition(inlay: Inlay<*>): Int {
        if (!inlay.isValid) return 0

        val editor = inlay.editor
        val lineStartOffset = DocumentUtil.getLineStartOffset(inlay.offset, editor.document)

        val shiftForward = CharArrayUtil.shiftForward(editor.document.immutableCharSequence, lineStartOffset, " \t")

        return editor.offsetToXY(shiftForward).x
    }

    private fun getPoint(inlay: Inlay<*>, targetPoint: Point): Point {
        // Match the indentation of the method we are showing the inlay on
        val painterPosition = painterPosition(inlay)
        return Point(targetPoint.x + painterPosition, targetPoint.y)
    }

    override fun toString(): String {
        return presentation.toString()
    }
}
