package com.codestream.webview

import com.intellij.ide.CopyProvider
import com.intellij.ide.CutProvider
import com.intellij.ide.PasteProvider
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.actionSystem.DataProvider
import com.intellij.openapi.actionSystem.IdeActions
import com.intellij.openapi.actionSystem.KeyboardShortcut
import com.intellij.openapi.actionSystem.PlatformDataKeys
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.ui.jcef.JBCefBrowser
import java.awt.BorderLayout
import java.awt.datatransfer.DataFlavor
import java.awt.event.KeyEvent
import java.awt.event.KeyListener
import java.awt.event.MouseEvent
import java.awt.event.MouseListener
import javax.swing.JPanel

class JBCefWebViewPanel(val jbCefBrowser: JBCefBrowser) : JPanel(BorderLayout()), DataProvider {
    init {
        add(jbCefBrowser.component, BorderLayout.CENTER)
        val action =
            ActionManager.getInstance().getAction(IdeActions.ACTION_SELECT_ALL)
        val keyboardShortcut = action.shortcutSet.shortcuts.first() as KeyboardShortcut

        val keyStroke = keyboardShortcut.firstKeyStroke

        jbCefBrowser.cefBrowser.uiComponent.addKeyListener(object : KeyListener {
            override fun keyTyped(e: KeyEvent?) {
                val eventModifiers = e?.modifiersEx ?: return
                if (eventModifiers.and(keyStroke.modifiers) != 0 && e?.keyCode == keyStroke.keyCode) {
                    jbCefBrowser.cefBrowser.executeJavaScript("document.execCommand('selectAll');", jbCefBrowser.cefBrowser.url, 0)
                }
            }

            override fun keyPressed(e: KeyEvent?) {
                val eventModifiers = e?.modifiersEx ?: return
                if (eventModifiers.and(keyStroke.modifiers) != 0 && e?.keyCode == keyStroke.keyCode) {
                    jbCefBrowser.cefBrowser.executeJavaScript("document.execCommand('selectAll');", jbCefBrowser.cefBrowser.url, 0)
                }
            }

            override fun keyReleased(e: KeyEvent?) {}
        })

        isFocusable = true

        addMouseListener(object : MouseListener {
            override fun mousePressed(e: MouseEvent?) {
                focus()
            }

            override fun mouseClicked(e: MouseEvent?) {}
            override fun mouseReleased(e: MouseEvent?) {}
            override fun mouseEntered(e: MouseEvent?) {}
            override fun mouseExited(e: MouseEvent?) {}
        })
    }

    private val myCutProvider = object : CutProvider {
        override fun isCutEnabled(dataContext: DataContext): Boolean = true
        override fun isCutVisible(dataContext: DataContext): Boolean = true
        override fun performCut(dataContext: DataContext) =
            jbCefBrowser.cefBrowser.executeJavaScript("document.execCommand('cut');", jbCefBrowser.cefBrowser.url, 0)
    }

    val myCopyProvider = object : CopyProvider {
        override fun isCopyEnabled(dataContext: DataContext): Boolean = true
        override fun isCopyVisible(dataContext: DataContext): Boolean = true
        override fun performCopy(dataContext: DataContext) =
            jbCefBrowser.cefBrowser.executeJavaScript("document.execCommand('copy');", jbCefBrowser.cefBrowser.url, 0)
    }

    val pasteSubstitutions = mapOf(
        "\\" to "\\\\",
        "\n" to "\\n",
        "\r" to "\\r",
        "'" to "\\'"
    )
    val myPasteProvider = object : PasteProvider {
        override fun isPasteEnabled(dataContext: DataContext): Boolean = true
        override fun isPastePossible(dataContext: DataContext): Boolean = true
        override fun performPaste(dataContext: DataContext) {
            var text = CopyPasteManager.getInstance().getContents<String>(DataFlavor.stringFlavor) ?: return
            pasteSubstitutions.forEach { (from, to) ->
                text = text.replace(from, to)
            }
            jbCefBrowser.cefBrowser.executeJavaScript("document.execCommand('insertHTML', false, '$text');", jbCefBrowser.cefBrowser.url, 0)
        }
    }

    override fun getData(dataId: String): Any? {
        return when(dataId) {
            PlatformDataKeys.COPY_PROVIDER.name -> myCopyProvider
            PlatformDataKeys.CUT_PROVIDER.name -> myCutProvider
            PlatformDataKeys.PASTE_PROVIDER.name -> myPasteProvider
            else -> null
        }
    }

    fun focus() {
        jbCefBrowser.cefBrowser.uiComponent.requestFocus()
    }
}
