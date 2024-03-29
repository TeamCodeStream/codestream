package com.codestream.editor


import com.intellij.openapi.editor.colors.EditorColors
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.util.ui.GraphicsUtil
import com.intellij.util.ui.JBInsets
import java.awt.*
import java.awt.event.ComponentAdapter
import java.awt.event.ComponentEvent
import java.awt.geom.RoundRectangle2D
import javax.swing.JComponent
import javax.swing.JPanel

fun wrapComponentUsingRoundedPanel(component: JComponent): JComponent {
    val wrapper = RoundedPanel(BorderLayout())
    wrapper.add(component)
    component.addComponentListener(object : ComponentAdapter() {
        override fun componentResized(e: ComponentEvent?) =
            wrapper.dispatchEvent(ComponentEvent(component, ComponentEvent.COMPONENT_RESIZED))
    })
    return wrapper
}

private class RoundedPanel(layout: LayoutManager?) : JPanel(layout) {
    private var borderLineColor: Color? = null

    init {
        isOpaque = false
        cursor = Cursor.getDefaultCursor()
        updateColors()
    }

    override fun updateUI() {
        super.updateUI()
        updateColors()
    }

    private fun updateColors() {
        val scheme = EditorColorsManager.getInstance().globalScheme
        background = scheme.defaultBackground
        borderLineColor = scheme.getColor(EditorColors.TEARLINE_COLOR)
    }

    override fun paintComponent(g: Graphics) {
        GraphicsUtil.setupRoundedBorderAntialiasing(g)

        val g2 = g as Graphics2D
        val rect = Rectangle(size)
        JBInsets.removeFrom(rect, insets)
        // 2.25 scale is a @#$!% so we adjust sizes manually
        val rectangle2d = RoundRectangle2D.Float(rect.x.toFloat() + 0.5f, rect.y.toFloat() + 0.5f,
            rect.width.toFloat() - 1f, rect.height.toFloat() - 1f,
            10f, 10f)
        g2.color = background
        g2.fill(rectangle2d)
        borderLineColor?.let {
            g2.color = borderLineColor
            g2.draw(rectangle2d)
        }
    }
}
