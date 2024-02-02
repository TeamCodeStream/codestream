package com.codestream.webview

import com.intellij.ide.IconProvider
import com.intellij.openapi.util.IconLoader
import com.intellij.psi.PsiElement
import javax.swing.Icon

class WebViewEditorIconProvider : IconProvider() {
    override fun getIcon(psiElement: PsiElement, flags: Int): Icon? {
        val file = psiElement.containingFile
        if (file.virtualFile is WebViewEditorFile) {
            return IconLoader.getIcon("/images/codestream.svg")
        }
        return null
    }
}
