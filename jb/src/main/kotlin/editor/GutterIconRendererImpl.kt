package com.codestream.editor

import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.editorService
import com.codestream.extensions.file
import com.codestream.extensions.ifNullOrBlank
import com.codestream.extensions.uri
import com.codestream.protocols.CodemarkType
import com.codestream.protocols.agent.DocumentMarker
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.webview.CodemarkNotifications
import com.codestream.protocols.webview.PullRequestNotifications
import com.codestream.review.ReviewDiffVirtualFile
import com.codestream.system.SPACE_ENCODED
import com.codestream.webViewService
import com.intellij.codeInsight.highlighting.TooltipLinkHandler
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.ui.ColorUtil
import com.intellij.ui.JBColor
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range
import java.util.Arrays
import java.util.Date
import java.util.concurrent.TimeUnit
import javax.swing.Icon

private val logger = Logger.getInstance(GutterIconRendererImpl::class.java)

class GutterIconRendererImpl(val editor: Editor, val marker: DocumentMarker) : GutterIconRenderer() {
    val id: String
        get() = marker.id

    override fun isNavigateAction(): Boolean {
        return true
    }

    override fun getClickAction(): AnAction = GutterIconAction(editor, marker)

    override fun getTooltipText(): String? {
        var tooltip = "<b>${marker.creatorName}</b>, ${fromNow(Date(marker.createdAt))} " +
            "\n\n"
        val rangeString = serializeRange(marker.range);

        if (marker.codemark !== null) {
            if (marker.type == "issue") {
                tooltip += "<img src='${getIconLink("issue")}'> &nbsp; "
                tooltip += marker.summary
            } else if(marker.codemark.reviewId !== null) {
                tooltip += "${marker.summary} \n\n"
                tooltip += "<b>FEEDBACK REQUEST</b> \n\n"
                tooltip += "<img src='${getIconLink("fr")}'> &nbsp; "
                if (marker.title !== null) {
                    tooltip += "${marker.title} "
                }
            } else {
                tooltip += "<img src='${getIconLink("comment")}'> &nbsp; "
                tooltip += marker.summary
            }
            tooltip += "\n\n<a href='#codemark/show/${marker.codemark.id}'>View Comment</a>"
        } else if (marker.externalContent != null) {
            tooltip += "${marker.summary} \n\n"
            tooltip += when(marker.externalContent.provider?.id) {
                "github*com" -> "<b>PULL REQUEST</b> \n\n <img src='${getIconLink("pr")}'> &nbsp; "
                "github/enterprise" -> "<b>PULL REQUEST</b> \n\n <img src='${getIconLink("pr")}'> &nbsp; "
                "gitlab*com" -> "<b>MERGE REQUEST</b> \n\n <img src='${getIconLink("mr-gitlab")}'> &nbsp; "
                "gitlab/enterprise" -> "<b>MERGE REQUEST</b> \n\n <img src='${getIconLink("mr-gitlab")}'> &nbsp; "
                else -> "<b>MERGE REQUEST</b> \n\n"
            }
            if (marker.title !== null) {
                tooltip += "${marker.title} "
            }
            if (marker.externalContent.actions !== null) {
                marker.externalContent.actions.map{
                    if (it.label == "Open Comment" || it.label == "Open Note") {
                        tooltip += "\n\n<a href='#pr/showExternal/${marker.externalContent.provider?.id}" +
                            "/${it.uri}'>View Comment</a>"
                    }
                }
            }
            if (marker.externalContent.provider?.id == "github*com" ||
                marker.externalContent.provider?.id == "github/enterprise" ||
                marker.externalContent.provider?.id == "gitlab*com" ||
                marker.externalContent.provider?.id == "gitlab/enterprise"
            ) {
                val providerId = java.net.URLEncoder.encode(marker.externalContent.provider?.id, "utf-8")
                val externalId = java.net.URLEncoder.encode(marker.externalContent.externalId, "utf-8")
                val externalChildId = java.net.URLEncoder.encode(marker.externalContent.externalChildId, "utf-8")
                tooltip += "\n\n<a href='#pr/show/${providerId}" +
                    "/${externalId}/${externalChildId}'>View Comment</a>"
            }
        }

        return tooltip
    }

    override fun getIcon(): Icon {
        val type = marker.type.ifNullOrBlank { "comment" }

        val color = marker.codemark?.color() ?: green
        return IconLoader.getIcon("/images/marker-$type-${color.name}.svg", javaClass)
    }

    override fun getAlignment() = Alignment.RIGHT

    override fun equals(other: Any?): Boolean {
        val otherRenderer = other as? GutterIconRendererImpl ?: return false
        return id == otherRenderer.id
    }

    override fun hashCode(): Int {
        return id.hashCode()
    }

    fun fromNow(past: Date): String {
        val now = Date()
        val duration = now.getTime() - past.getTime();
        val res = StringBuffer()
        for (i in 0 until this.times.size) {
            val current: Long = this.times.get(i)
            val temp: Long = duration / current
            if (temp > 0) {
                res.append(temp).append(" ").append(this.timesString.get(i)).append(if (temp != 1L) "s" else "")
                    .append(" ago")
                break
            }
        }
        return if ("" == res.toString()) "0 seconds ago" else res.toString()
    }

    val times: List<Long> = Arrays.asList(
        TimeUnit.DAYS.toMillis(365),
        TimeUnit.DAYS.toMillis(30),
        TimeUnit.DAYS.toMillis(1),
        TimeUnit.HOURS.toMillis(1),
        TimeUnit.MINUTES.toMillis(1),
        TimeUnit.SECONDS.toMillis(1)
    )
    val timesString: List<String> = Arrays.asList("year", "month", "day", "hour", "minute", "second")

    fun getIconLink(type: String): String {
        val bg = JBColor.background()
        var color = "dark";
        if (ColorUtil.isDark(bg)) {
            color = "light"
        }

        return GutterIconRendererImpl::class.java.getResource("/images/icon14/marker-$type-$color.png").toString()
    }

    fun serializeRange(range: Range): String{
        var rangeString = "";
        rangeString += "${range.start.line},";
        rangeString += "${range.start.character},";
        rangeString += "${range.end.line},";
        rangeString += "${range.end.character}";
        return rangeString;
    }
}

class GutterIconAction(val editor: Editor, val marker: DocumentMarker) : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = editor.project ?: return
        marker.codemark?.let {
            project.codeStream?.show {
                project.webViewService?.postNotification(
                    CodemarkNotifications.Show(
                        it.id,
                        editor.document.uri
                    )
                )
            }
            telemetry(project, TelemetryEvent.CODEMARK_CLICKED)
        }
        marker.externalContent?.let {
            it.provider?.let { provider ->
                project.webViewService?.postNotification(
                    PullRequestNotifications.Show(
                        provider.id,
                        it.externalId,
                        it.externalChildId
                    )
                )

                telemetryPr(project, editor.document.file is ReviewDiffVirtualFile, provider.id)
            }
        }
    }
}

class GutterCodemarkTooltipLinkHandler : TooltipLinkHandler() {
    override fun handleLink(codemarkId: String, editor: Editor): Boolean {
        val project = editor.project ?: return false

        project.codeStream?.show {
            project.webViewService?.postNotification(
                CodemarkNotifications.Show(
                    codemarkId,
                    editor.document.uri
                )
            )
        }
        telemetry(project, TelemetryEvent.CODEMARK_CLICKED)

        return super.handleLink(codemarkId, editor)
    }
}

class GutterPullRequestTooltipLinkHandler : TooltipLinkHandler() {
    override fun handleLink(prLink: String, editor: Editor): Boolean {
        val project = editor.project ?: return false

        val prData = prLink.split("/")

        if (prData.size > 2) {
            val prId = prData.slice(1..prData.size-2).joinToString( separator = "/")
            project.webViewService?.postNotification(
                PullRequestNotifications.Show(
                    java.net.URLDecoder.decode(prData[0]),
                    java.net.URLDecoder.decode(prId),
                    java.net.URLDecoder.decode(prData[prData.size - 1])
                )
            )

            telemetryPr(project, editor.document.file is ReviewDiffVirtualFile, prData[0])

            return true
        } else {
            logger.error("Unsupported tooltip link format: $prLink")
            return false
        }
    }
}

class GutterPullRequestTooltipExternalLinkHandler : TooltipLinkHandler() {
    override fun handleLink(prLink: String, editor: Editor): Boolean {
        val project = editor.project ?: return false

        val prData = prLink.split("/http")

        BrowserUtil.browse(("http${prData[1]}").replace(" ", SPACE_ENCODED))

        telemetryPr(project, editor.document.file is ReviewDiffVirtualFile, prData[0])

        return super.handleLink(prLink, editor)
    }
}

class GutterCodemarkLinkTooltipLinkHandler : TooltipLinkHandler() {
    override fun handleLink(options: String, editor: Editor): Boolean {
        val project = editor.project ?: return false

        val optionsData = options.split(',')
        val codemarkRange = Range(
            Position(optionsData[1].toInt(), optionsData[2].toInt()),
            Position(optionsData[3].toInt(), optionsData[4].toInt())
        );

        project.editorService?.activeEditor?.run {
            project.codeStream?.show {
                project.webViewService?.postNotification(
                    CodemarkNotifications.New(
                        document.uri,
                        codemarkRange,
                        when (optionsData[0]) {
                            "COMMENT" -> CodemarkType.COMMENT
                            "ISSUE" -> CodemarkType.ISSUE
                            "LINK" -> CodemarkType.LINK
                            else -> CodemarkType.COMMENT
                        },
                        "Codemark"
                    )
                )
            }
        }

        return super.handleLink(options, editor)
    }
}

private enum class TelemetryEvent(val value: String, val properties: Map<String, String>) {
    CODEMARK_CLICKED("Codemark Clicked", mapOf("Codemark Location" to "Source File"))
}

private fun telemetryPr(project: Project, isDiff: Boolean, host: String) {
    var codemarkLocation = "Source Gutter"
    if (isDiff) {
        codemarkLocation = "Diff Gutter"
    }

    val params = TelemetryParams(
        "PR Comment Clicked",
        mapOf("Host" to host, "Comment Location" to codemarkLocation)
    )
    project.agentService?.agent?.telemetry(params)
}

private fun telemetry(project: Project, event: TelemetryEvent) {
    val params = TelemetryParams(event.value, event.properties)
    project.agentService?.agent?.telemetry(params)
}
