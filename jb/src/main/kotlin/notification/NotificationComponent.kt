package com.codestream.notification

import com.codestream.CODESTREAM_TOOL_WINDOW_ID
import com.codestream.agentService
import com.codestream.appDispatcher
import com.codestream.clmService
import com.codestream.codeStream
import com.codestream.gson
import com.codestream.protocols.agent.Codemark
import com.codestream.protocols.agent.ObservabilityAnomaly
import com.codestream.protocols.agent.Post
import com.codestream.protocols.agent.Review
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.webview.CodemarkNotifications
import com.codestream.protocols.webview.EditorOpenNotification
import com.codestream.protocols.webview.ObservabilityAnomalyNotifications
import com.codestream.protocols.webview.ReviewNotifications
import com.codestream.sessionService
import com.codestream.settingsService
import com.codestream.webViewEditorService
import com.codestream.webViewService
import com.codestream.webview.WebViewEditor
import com.codestream.webview.WebViewEditorFile
import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationDisplayType
import com.intellij.notification.NotificationGroup
import com.intellij.notification.NotificationType
import com.intellij.notification.Notifications
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import kotlinx.coroutines.launch

const val CODESTREAM_NOTIFICATION_GROUP_ID = "CodeStream"
const val CODESTREAM_PRIORITY_NOTIFICATION_GROUP_ID = "CodeStream priority"

private val icon = IconLoader.getIcon("/images/codestream.svg", NotificationComponent::class.java)
private val notificationGroup =
    NotificationGroup(
        CODESTREAM_NOTIFICATION_GROUP_ID,
        NotificationDisplayType.BALLOON,
        false,
        CODESTREAM_TOOL_WINDOW_ID,
        icon
    )

private val priorityNotificationGroup =
    NotificationGroup(
        CODESTREAM_PRIORITY_NOTIFICATION_GROUP_ID,
        NotificationDisplayType.STICKY_BALLOON,
        false,
        CODESTREAM_TOOL_WINDOW_ID,
        icon
    )


class NotificationComponent(val project: Project) {
    private val logger = Logger.getInstance(NotificationComponent::class.java)

    init {
        project.sessionService?.onPostsChanged(this::didChangePosts)
    }

    private fun didChangePosts(posts: List<Post>) {
        appDispatcher.launch {
            posts.forEach { didChangePost(it) }
        }
    }

    private suspend fun didChangePost(post: Post) {
        try {
            val codeStream = project.codeStream ?: return
            val session = project.sessionService ?: return
            val settings = project.settingsService ?: return
            val userLoggedIn = session.userLoggedIn ?: return

            if (!userLoggedIn.user.wantsToastNotifications()) {
                return
            }

            if (!post.isNew || post.creatorId == userLoggedIn.userId) {
                return
            }

            val parentPost = post.parentPostId?.let { project.agentService?.getPost(post.streamId, it) }
            val grandparentPost = parentPost?.parentPostId?.let { project.agentService?.getPost(post.streamId, it) }
            val codemark = post.codemark ?: parentPost?.codemark
            val review = post.review ?: parentPost?.review ?: grandparentPost?.review

            val isMentioned = post.mentionedUserIds?.contains(userLoggedIn.userId) ?: false
            val isMutedStream = userLoggedIn.user.preferences?.mutedStreams?.get(post.streamId) == true
            if (isMutedStream && !isMentioned) {
                return
            }

            val isCodemarkVisible = codeStream.isVisible && codemark != null && settings.currentCodemarkId == codemark.id
            val isUserFollowing = codemark?.followerIds.orEmpty().contains(userLoggedIn.userId)
                || review?.followerIds.orEmpty().contains(userLoggedIn.userId)

            if (isUserFollowing && (!isCodemarkVisible || isMentioned)) {
                showNotification(post, codemark, review)
            }
        } catch (err: Error) {
            logger.error(err)
        }
    }

    fun showError(title: String, content: String) {
        val notification = notificationGroup.createNotification(title, null, content, NotificationType.ERROR)
        notification.notify(project)
    }

    fun whatsNew(content: String){
        val notification = Notification("codestream.notifications", "New Relic Codestream", content, NotificationType.INFORMATION)
        notification.addAction(NotificationAction.createSimple("See What's New") {
            ApplicationManager.getApplication().invokeLater {
                val editorManager = FileEditorManager.getInstance(project)
                val editorNotification = EditorOpenNotification("What's New", "whatsnew", null, null)
                val file = WebViewEditorFile.create(gson.toJsonTree(editorNotification))

                val editor = editorManager.openFile(file, true, true).firstOrNull()
                editor?.component?.repaint()

                notification.expire()
            }})
        notification.addAction(NotificationAction.createSimple("Dismiss"){
            notification.expire()
        })
        Notifications.Bus.notify(notification)
    }

    fun didDetectObservabilityAnomalies(entityGuid: String, duration: List<ObservabilityAnomaly>, errorRate: List<ObservabilityAnomaly>) {
        val count = duration.size + errorRate.size
        val allAnomalies = (duration + errorRate).sortedByDescending { it.ratio }
        val title = if (count == 1) {
            "Performance issue found"
        } else {
            "$count performance issues found"
        }
        val firstAnomaly = allAnomalies.first()

        val content = if (count == 1) {
            "${firstAnomaly.notificationText} (${firstAnomaly.entityName})"
        } else {
            "#1: ${firstAnomaly.notificationText} (${firstAnomaly.entityName})"
        }

        val notification = notificationGroup.createNotification(title, "CodeStream", content, NotificationType.INFORMATION)
        notification.addAction(NotificationAction.createSimple("Details") {
            appDispatcher.launch {
                project.codeStream?.show {
                    project.webViewService?.postNotification(ObservabilityAnomalyNotifications.View(
                        firstAnomaly,
                        entityGuid
                    ))
                    notification.expire()
                }
                project.clmService?.revealSymbol(firstAnomaly.codeFilepath, firstAnomaly.codeNamespace, firstAnomaly.codeFunction)
            }
            telemetry(TelemetryEvent.TOAST_CLICKED, "CLM Anomaly")
        })

        telemetry(TelemetryEvent.TOAST_NOTIFICATION, "CLM Anomaly")
        notification.notify(project)
    }

    private suspend fun showNotification(post: Post, codemark: Codemark?, review: Review?) {
        val session = project.sessionService ?: return
        val sender =
            if (post.creatorId != null)
                session.getUser(post.creatorId)?.username ?: "Someone"
            else "Someone"

        var text = if (post.text.startsWith("/me ")) {
            post.text.replaceFirst("/me", sender)
        } else {
            post.text
        }

        if (review != null) {
            text = text.replaceFirst("approved this", "approved " + review.title)
            text = text.replaceFirst("reopened this", "reopened " + review.title)
        }

        val telemetryContent = when {
            codemark != null -> "Codemark"
            review != null -> "Review"
            else -> "Unknown"
        }

        val notification = notificationGroup.createNotification(
            null, sender, text, NotificationType.INFORMATION
        )
        notification.addAction(NotificationAction.createSimple("Open") {
            project.codeStream?.show {
                project.webViewService?.run {
                    if (review != null) {
                        postNotification(ReviewNotifications.Show(review.id, codemark?.id))
                    } else if (codemark != null) {
                        postNotification(CodemarkNotifications.Show(codemark.id))
                    }
                    notification.expire()
                    telemetry(TelemetryEvent.TOAST_CLICKED, telemetryContent)
                }
            }
        })
        notification.notify(project)
        telemetry(TelemetryEvent.TOAST_NOTIFICATION, telemetryContent)
    }

    private enum class TelemetryEvent(val value: String) {
        TOAST_NOTIFICATION("Toast Notification"),
        TOAST_CLICKED("Toast Clicked")
    }

    private fun telemetry(event: TelemetryEvent, content: String) {
        val params = TelemetryParams(event.value, mapOf("Content" to content))
        project.agentService?.agent?.telemetry(params)
    }

}

