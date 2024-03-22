package com.codestream.actions

import com.codestream.editorService
import com.codestream.extensions.file
import com.codestream.extensions.selectionOrCurrentLine
import com.codestream.protocols.webview.LogsNotifications
import com.codestream.sessionService
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.util.DocumentUtil
import java.util.regex.Pattern

class LogSearch: DumbAwareAction() {
    override fun update(e: AnActionEvent) {
        val isLoggedIn = e.project?.sessionService?.userLoggedIn != null

        e.presentation.isVisible = isLoggedIn
    }

    override fun actionPerformed(e: AnActionEvent) {
        var query = e.project?.editorService?.activeEditor?.selectionModel?.selectedText ?: ""
        val editor = e.project?.editorService?.activeEditor
        val doc = editor?.document
        val range = editor?.selectionOrCurrentLine
        if (query.isBlank() && doc != null && range != null) {
            val lineText = doc.getText(DocumentUtil.getLineTextRange(doc, range.start.line))
            val pattern = Pattern.compile("\"(?:[^\"]|\"\")*(?:\"|$)|\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^'\\\\]|\\\\.)*`", Pattern.MULTILINE or Pattern.CASE_INSENSITIVE)
            val matches = pattern.matcher(lineText)

            var matchString: String? = null
            if (matches.find()) {
                matchString = matches.group(0)
            }

            if (matchString != null) {
                query = matchString
                    .trim()
                    .replace("(\\$)?\\{.*?}".toRegex(), "") // replace interpolated values - {0}, {variable2}, ${something}, ${variable23}
                    .replace("^['\"`]".toRegex(), "") // replace leading quote
                    .replace("['\"`]$".toRegex(), "") // replace trailing quote
                    .trim()

            }
        }
        e.project?.webViewService?.postNotification(LogsNotifications.Search(query))
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}
