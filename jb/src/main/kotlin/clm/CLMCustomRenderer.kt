package com.codestream.clm

import com.codestream.extensions.file
import com.codestream.review.ReviewDiffSide
import com.codestream.review.ReviewDiffVirtualFile
import com.intellij.codeInsight.hints.LinearOrderInlayRenderer
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.codeInsight.hints.presentation.InputHandler
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorCustomElementRenderer
import com.intellij.openapi.editor.Inlay
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.editor.markup.TextAttributes
import com.intellij.ui.JBColor
import com.intellij.util.DocumentUtil
import com.intellij.util.text.CharArrayUtil
import com.intellij.util.ui.UIUtil
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
class CLMCustomRenderer(val presentation: InlayPresentation, val isAnomaly: Boolean = false) : EditorCustomElementRenderer,
    InputHandler by presentation {
    override fun paint(inlay: Inlay<*>, g: Graphics, targetRegion: Rectangle, textAttributes: TextAttributes) {

        val point = getPoint(inlay, targetRegion.location)
        g as Graphics2D
        val leftShift = if (inlay.editor.shiftIndentation) 0 else -5
        g.withTranslated(targetRegion.x + point.x + leftShift, targetRegion.y + 2) {
            val attributes = LinearOrderInlayRenderer.effectsIn(textAttributes)
            if (isAnomaly) {
                attributes.foregroundColor = JBColor.RED
            } else {
                val isHighContrast = if (UIUtil.isUnderDarcula()) {
                    val scheme = EditorColorsManager.getInstance().globalScheme
                    scheme.name.contains("high contrast", ignoreCase = true)
                } else false
                if (isHighContrast) {
                    attributes.foregroundColor = JBColor.foreground()
                }
            }
            presentation.paint(g, attributes)
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
        val offset = if (editor.shiftIndentation) CharArrayUtil.shiftForward(editor.document.immutableCharSequence, lineStartOffset, " \t") else lineStartOffset
        return editor.offsetToXY(offset).x
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

private val Editor.shiftIndentation: Boolean
    get() {
        return (document.file as? ReviewDiffVirtualFile)?.side != ReviewDiffSide.LEFT
    }
