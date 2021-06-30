package com.codestream.protocols.webview

import com.codestream.agent.ApiVersionCompatibility
import com.codestream.protocols.agent.Marker
import com.codestream.review.CodeStreamDiffUriContext
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range

class BootstrapResponse(
    val session: UserSession,
    val capabilities: JsonElement,
    val configs: Configs,
    val context: JsonElement,
    val version: String,
    val ide: Ide,
    val apiVersionCompatibility: ApiVersionCompatibility?,
    val missingCapabilities: JsonObject?
)

class Capabilities {
    val channelMute = true
    val codemarkApply = true
    val codemarkCompare = true
    val editorTrackVisibleRange = true
    val services = Services()
    var providerCanSupportRealtimeChat: Boolean? = null
    val providerSupportsRealtimeChat: Boolean? = null
    val providerSupportsRealtimeEvents: Boolean? = null
}

class Configs(
    val serverUrl: String,
    val email: String?,
    val showHeadshots: Boolean,
    val debug: Boolean,
    val showFeedbackSmiley: Boolean,
    val team: String?
)

class Ide(
    val name: String,
    val detail: String
)

class Services {
    val vsls = false
}

class UserSession(
    val userId: String? = null
)

enum class CodeStreamEnvironment {
    @SerializedName("local")
    LOCAL,
    @SerializedName("prod")
    PROD,
    @SerializedName("unknown")
    UNKNOWN
}

class ContextDidChangeNotification(
    val context: WebViewContext
)

class UpdateConfigurationRequest(
    val name: String,
    val value: String?
)

class ActiveEditorContextResponse(val editorContext: EditorContext? = EditorContext())

class EditorRangeHighlightRequest(
    val uri: String?,
    val range: Range?,
    val highlight: Boolean
)

class EditorRangeRevealRequest(
    val uri: String,
    val range: Range,
    val preserveFocus: Boolean?,
    val atTop: Boolean?
)

class EditorRangeRevealResponse(
    val success: Boolean
)

class EditorRangeSelectRequest(
    val uri: String,
    val selection: EditorSelection,
    val preserveFocus: Boolean?
)

class EditorRangeSelectResponse(
    val success: Boolean
)

class EditorScrollToRequest(
    val uri: String,
    val position: Position,
    val atTop: Boolean
)

class ReviewShowDiffRequest(
    val reviewId: String,
    val repoId: String,
    val checkpoint: Int?,
    val path: String
)

class ReviewShowLocalDiffRequest(
    val repoId: String,
    val path: String,
    val oldPath: String?,
    val includeSaved: Boolean,
    val includeStaged: Boolean,
    val editingReviewId: String?,
    val baseSha: String
)

class ShellPromptFolderResponse(
    val path: String?,
    val success: Boolean
)

class MarkerCompareRequest(
    val marker: Marker
)

class MarkerApplyRequest(
    val marker: Marker
)

class MarkerInsertTextRequest(
    val marker: Marker,
    val text: String
)

class UpdateServerUrlRequest(
    val serverUrl: String,
    val disableStrictSSL: Boolean = false
)

class OpenUrlRequest(
    val url: String
)

class CompareLocalFilesRequest(
    val repoId: String,
    val filePath: String,
    val previousFilePath: String?,
    val headSha: String,
    val headBranch: String,
    val baseSha: String,
    val baseBranch: String,
    val context: CodeStreamDiffUriContext?
)
