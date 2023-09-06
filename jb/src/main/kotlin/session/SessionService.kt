package com.codestream.session

import com.codestream.agent.DidChangeUnreadsNotification
import com.codestream.agentService
import com.codestream.authentication.CSLogoutReason
import com.codestream.telemetry.ErrorHandler
import com.codestream.protocols.agent.CSPreferences
import com.codestream.protocols.agent.CSUser
import com.codestream.protocols.agent.EnvironmentInfo
import com.codestream.protocols.agent.Post
import com.codestream.protocols.agent.PullRequestNotification
import com.codestream.protocols.agent.Stream
import com.codestream.protocols.agent.UserLoggedIn
import com.google.gson.JsonObject
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlin.properties.Delegates

typealias UserLoggedInObserver = (UserLoggedIn?) -> Unit
typealias EnvironmentInfoObserver = (EnvironmentInfo) -> Unit
typealias IntObserver = (Int) -> Unit
typealias PostsObserver = (List<Post>) -> Unit
typealias PullRequestsObserver = (List<PullRequestNotification>) -> Unit
typealias UnitObserver = () -> Unit

class SessionService(val project: Project) {
    private val logger = Logger.getInstance(SessionService::class.java)
    val userLoggedIn: UserLoggedIn? get() = _userLoggedIn
    val eligibleJoinCompanies: List<JsonObject> get() = _eligibleJoinCompanies ?: emptyList()
    var environmentInfo: EnvironmentInfo
        get() = _environmentInfo
        set(value) { _environmentInfo = value }
    val isSlackTeam: Boolean get() = userLoggedIn?.team?.providerInfo?.slack != null
    val mentions: Int get() = _mentions

    private val _streams = mutableMapOf<String, Stream>()
    private val _users = mutableMapOf<String, CSUser>()

    suspend fun getStream(id: String): Stream? = _streams.getOrPut(id) {
        return project.agentService?.getStream(id)
    }

    suspend fun getUser(id: String): CSUser? = _users.getOrPut(id) {
        return project.agentService?.getUser(id)
    }

    private val userLoggedInObservers = mutableListOf<UserLoggedInObserver>()
    private val environmentInfoObservers = mutableListOf<EnvironmentInfoObserver>()
    private val unreadsObservers = mutableListOf<IntObserver>()
    private val mentionsObservers = mutableListOf<IntObserver>()
    private val postsObservers = mutableListOf<PostsObserver>()
    private val pullRequestsObservers = mutableListOf<PullRequestsObserver>()
    private val codelensObservers = mutableListOf<UnitObserver>()

    private var _userLoggedIn: UserLoggedIn? by Delegates.observable<UserLoggedIn?>(null) { _, _, new ->
        userLoggedInObservers.forEach { it(new) }
    }

    private var _eligibleJoinCompanies: List<JsonObject>? = null

    private var _environmentInfo: EnvironmentInfo by Delegates.observable<EnvironmentInfo>(EnvironmentInfo(
        "unknown",
        isOnPrem = false,
        isProductionCloud = false,
        "",
        "",
        listOf()
    )) { _, _, new ->
        environmentInfoObservers.forEach { it(new) }
    }

    private var _unreads: Int by Delegates.observable(0) { _, _, new ->
        unreadsObservers.forEach { it(new) }
    }

    private var _mentions: Int by Delegates.observable(0) { _, _, new ->
        mentionsObservers.forEach { it(new) }
    }

    fun onUserLoggedInChanged(observer: UserLoggedInObserver) {
        userLoggedInObservers += observer
    }

    fun onEnvironmentInfoChanged(observer: EnvironmentInfoObserver) {
        environmentInfoObservers += observer
    }

    fun onUnreadsChanged(observer: IntObserver) {
        unreadsObservers += observer
    }

    fun onMentionsChanged(observer: IntObserver) {
        mentionsObservers += observer
    }

    fun onPostsChanged(observer: PostsObserver) {
        postsObservers += observer
    }

    fun onPullRequestsChanged(observer: PullRequestsObserver) {
        pullRequestsObservers += observer
    }

    fun onCodelensChanged(observer: UnitObserver) {
        codelensObservers += observer
    }

    fun login(userLoggedIn: UserLoggedIn, eligibleJoinCompanies: List<JsonObject>?) {
        _userLoggedIn = userLoggedIn
        _eligibleJoinCompanies = eligibleJoinCompanies
        ErrorHandler.userLoggedIn = userLoggedIn
        ErrorHandler.agentService = project.agentService
    }

    fun logout(logoutReason: CSLogoutReason) {
        logger.info("SessionService.logout: $logoutReason")
        _userLoggedIn = null
        _unreads = 0
    }

    fun didChangeUnreads(notification: DidChangeUnreadsNotification) {
        _unreads = notification.totalUnreads
        _mentions = notification.totalMentions
    }

    fun didChangePosts(posts: List<Post>) {
        postsObservers.forEach { it(posts) }
    }

    fun didChangePreferences(preferences: CSPreferences) {
        _userLoggedIn?.user?.preferences = preferences
    }

    fun didChangePullRequests(pullRequestNotifications: List<PullRequestNotification>) {
        pullRequestsObservers.forEach { it(pullRequestNotifications) }
    }

    fun didChangeCodelenses() {
        codelensObservers.forEach { it() }
    }
}

