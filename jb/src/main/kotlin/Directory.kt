package com.codestream

import com.codestream.agent.AgentService
import com.codestream.authentication.AuthenticationService
import com.codestream.clm.CLMService
import com.codestream.editor.EditorService
import com.codestream.editor.LineLevelBlameService
import com.codestream.notification.NotificationComponent
import com.codestream.review.ReviewService
import com.codestream.session.SessionService
import com.codestream.settings.SettingsService
import com.codestream.telemetry.TelemetryService
import com.codestream.webview.WebViewEditorService
import com.codestream.webview.WebViewService
import com.intellij.openapi.project.Project

val Project.codeStream: CodeStreamProjectService?
    get() = getServiceIfNotDisposed(CodeStreamProjectService::class.java)

val Project.notificationComponent: NotificationComponent?
    get() =
        if (!isDisposed) getComponent(NotificationComponent::class.java)
        else null

val Project.agentService: AgentService?
    get() = getServiceIfNotDisposed(AgentService::class.java)

val Project.authenticationService: AuthenticationService?
    get() = getServiceIfNotDisposed(AuthenticationService::class.java)

val Project.editorService: EditorService?
    get() = getServiceIfNotDisposed(EditorService::class.java)

val Project.sessionService: SessionService?
    get() = getServiceIfNotDisposed(SessionService::class.java)

val Project.settingsService: SettingsService?
    get() = getServiceIfNotDisposed(SettingsService::class.java)

val Project.webViewService: WebViewService?
    get() = getServiceIfNotDisposed(WebViewService::class.java)

val Project.webViewEditorService: WebViewEditorService?
    get() = getServiceIfNotDisposed(WebViewEditorService::class.java)

val Project.reviewService: ReviewService?
    get() = getServiceIfNotDisposed(ReviewService::class.java)

val Project.telemetryService: TelemetryService?
    get() = getServiceIfNotDisposed(TelemetryService::class.java)

val Project.lineLevelBlameService: LineLevelBlameService?
    get() = getServiceIfNotDisposed(LineLevelBlameService::class.java)

val Project.clmService: CLMService?
    get() = getServiceIfNotDisposed(CLMService::class.java)


fun <T : Any> Project.getServiceIfNotDisposed(serviceClass: Class<T>): T? =
    if (!isDisposed) getService(serviceClass)
    else null
