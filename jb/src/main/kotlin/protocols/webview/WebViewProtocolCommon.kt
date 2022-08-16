package com.codestream.protocols.webview

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range

class EditorMargins(
    val top: Int,
    val right: Int,
    val bottom: Int,
    val left: Int
)

class EditorMetrics(
    val fontSize: Int,
    val lineHeight: Int,
    val margins: EditorMargins?
)

class EditorSelection(
    start: Position,
    end: Position,
    val cursor: Position
) : Range(start, end)

class WebViewContext(
    val currentTeamId: String? = null,
    val currentStreamId: String? = null,
    val currentCodemarkId: String? = null,
    val threadId: String? = null,
    val hasFocus: Boolean? = null,
    val panelStack: Array<String>? = null
) {
    val spatialViewVisible get() = panelStack?.firstOrNull() == "codemarks-for-file"
}

class EditorContext(
    val scm: JsonElement? = null,
    val activeFile: String? = null,
    val lastActiveFile: String? = null,
    val textEditorVisibleRanges: List<Range>? = null,
    val textEditorUri: String? = null,
    val textEditorSelections: List<EditorSelection>? = null,
    val metrics: EditorMetrics? = null
)

class EditorInformation(
    val fileName: String?,
    val uri: String?,
    val sha: String?,
    val metrics: EditorMetrics?,
    val selections: List<EditorSelection>?,
    val visibleRanges: List<Range>?,
    val lineCount: Number?,
    val languageId: String? = null
)

class Sidebar(
    val location: SidebarLocation
)

enum class SidebarLocation {
    @SerializedName("left")
    LEFT,
    @SerializedName("right")
    RIGHT,
    @SerializedName("top")
    TOP,
    @SerializedName("bottom")
    BOTTOM,
    @SerializedName("floating")
    FLOATING
}
