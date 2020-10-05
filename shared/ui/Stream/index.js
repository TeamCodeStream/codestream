import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import cx from "classnames";
import { ActivityPanel } from "./ActivityPanel";
import { ExportPanel } from "./ExportPanel";
import { Sidebar } from "./Sidebar";
import { StartWork } from "./StartWork";
import { Notifications } from "./Notifications";
import { ChangeEmail } from "./ChangeEmail";
import { ChangeUsername } from "./ChangeUsername";
import { ChangePassword } from "./ChangePassword";
import { ChangeFullName } from "./ChangeFullName";
import { ChangeWorksOn } from "./ChangeWorksOn";
import { ChangePhoneNumber } from "./ChangePhoneNumber";
import { ChangeAvatar } from "./ChangeAvatar";
import { ChangeTeamName } from "./ChangeTeamName";
import { TeamSetup } from "./TeamSetup";
import { CreatePullRequestPanel } from "./CreatePullRequestPanel";
import { IntegrationsPanel } from "./IntegrationsPanel";
import { ProfilePanel } from "./ProfilePanel";
import { ReviewSettings } from "./ReviewSettings";
import { GettingStarted } from "./GettingStarted";
import { TeamPanel } from "./TeamPanel";
import { CodemarkForm } from "./CodemarkForm";
import { ReviewForm } from "./ReviewForm";
import FilterSearchPanel from "./FilterSearchPanel";
import InlineCodemarks from "./InlineCodemarks";
import { CreateTeamPage } from "./CreateTeamPage";
import { Tester } from "./Tester";
import Icon from "./Icon";
import CancelButton from "./CancelButton";
import Tooltip, { TipTitle, placeArrowTopRight } from "./Tooltip";
import OfflineBanner from "./OfflineBanner";
import ConfigureAzureDevOpsPanel from "./ConfigureAzureDevOpsPanel";
import ConfigureYouTrackPanel from "./ConfigureYouTrackPanel";
import ConfigureJiraServerPanel from "./ConfigureJiraServerPanel";
import ConfigureEnterprisePanel from "./ConfigureEnterprisePanel";
import { PrePRProviderInfoModal } from "./PrePRProviderInfoModal";
import * as actions from "./actions";
import { canCreateCodemark, editCodemark } from "../store/codemarks/actions";
import { ComponentUpdateEmitter, safe, toMapBy, isNotOnDisk, uriToFilePath } from "../utils";
import { confirmPopup } from "./Confirm";
import { ModalRoot, Modal } from "./Modal";
import { getPostsForStream, getPost } from "../store/posts/reducer";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { getStreamForId, getStreamForTeam } from "../store/streams/reducer";
import { getCodemark } from "../store/codemarks/reducer";
import { getTeamMembers } from "../store/users/reducer";
import { HostApi } from "../webview-api";
import {
	NewCodemarkNotificationType,
	NewReviewNotificationType,
	NewPullRequestNotificationType,
	EditorSelectRangeRequestType,
	StartWorkNotificationType,
	WebviewPanels,
	WebviewModals
} from "../ipc/webview.protocol";
import {
	SetCodemarkPinnedRequestType,
	TelemetryRequestType,
	GetRangeScmInfoRequestType,
	DeleteUserRequestType
} from "@codestream/protocols/agent";
import { getFileScmError } from "../store/editorContext/reducer";
import { CodemarkView } from "./CodemarkView";
import { Review } from "./Review";
import { Link } from "./Link";

import {
	setCurrentStream,
	setNewPostEntry,
	setCurrentReview,
	setCurrentPullRequest,
	setCurrentCodemark
} from "../store/context/actions";
import { last as _last, findLastIndex } from "lodash-es";
import { Keybindings } from "./Keybindings";
import { FlowPanel, VideoLink } from "./Flow";
import { PRInfoModal } from "./SpatialView/PRInfoModal";
import { GlobalNav } from "./GlobalNav";
import { CheckEmailVsGit } from "./CheckEmailVsGit";

const EMAIL_MATCH_REGEX = new RegExp(
	"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*",
	"g"
);

export class SimpleStream extends PureComponent {
	disposables = [];
	state = {
		composeBoxProps: {}
	};
	updateEmitter = new ComponentUpdateEmitter();

	static contextTypes = {
		store: PropTypes.object
	};

	componentDidMount() {
		if (this.props.activePanel === "main" && this.props.postStreamId != undefined) {
			HostApi.instance.track("Page Viewed", { "Page Name": "Stream" });
		}
		this.disposables.push(
			HostApi.instance.on(NewCodemarkNotificationType, this.handleNewCodemarkRequest, this)
		);
		this.disposables.push(
			HostApi.instance.on(NewReviewNotificationType, this.handleNewReviewRequest, this)
		);
		this.disposables.push(
			HostApi.instance.on(NewPullRequestNotificationType, this.handleNewPullRequestRequest, this)
		);
	}

	componentWillUnmount = () => {
		this.disposables.forEach(d => d.dispose());
	};

	handleNewCodemarkRequest(e) {
		if (e.source) {
			// this can come externally (from an IDE)
			this.props.setNewPostEntry(e.source);
		}
		if (e.uri) {
			if (this.props.activePanel === WebviewPanels.CodemarksForFile) return;
			if (!canCreateCodemark(e.uri)) return;

			// re-emit the notification after switching to spatial view
			this.updateEmitter.enqueue(() => {
				HostApi.instance.emit(NewCodemarkNotificationType.method, e);
			});
			this.props.openPanel(WebviewPanels.CodemarksForFile);
		} else {
			this.props.openPanel(e.type === "issue" ? WebviewPanels.NewIssue : WebviewPanels.NewComment);
		}
	}

	handleNewReviewRequest(e) {
		if (e.source) {
			// this can come externally (from an IDE)
			this.props.setNewPostEntry(e.source);
		}
		this.props.setCurrentReview("");
		this.props.setCurrentPullRequest("");
		this.props.openPanel(WebviewPanels.NewReview);
	}

	handleNewPullRequestRequest(e) {
		if (e.source) {
			// this can come externally (from an IDE)
			this.props.setNewPostEntry(e.source);
		}
		this.props.setCurrentReview("");
		this.props.setCurrentPullRequest("");
		this.props.openPanel(WebviewPanels.NewPullRequest);
	}

	// for performance debugging purposes
	// componentWillReceiveProps(nextProps) {
	// 	for (const index in nextProps) {
	// 		if (nextProps[index] !== this.props[index]) {
	// 			console.warn(index, this.props[index], "-->", nextProps[index]);
	// 		}
	// 	}
	// }

	// for performance debugging purposes
	// shouldComponentUpdate(nextProps, nextState) {
	// 	console.warn("WTF", nextProps, nextState);
	// 	Object.entries(this.props).forEach(
	// 		([key, val]) =>
	// 			JSON.stringify(nextProps[key]) !== JSON.stringify(val) &&
	// 			console.warn(`Prop '${key}' changed to ${nextProps[key]}`)
	// 	);
	// 	if (this.state) {
	// 		Object.entries(this.state).forEach(
	// 			([key, val]) =>
	// 				JSON.stringify(nextState[key]) !== JSON.stringify(val) &&
	// 				console.warn(`State '${key}' changed to ${nextState[key]}`)
	// 		);
	// 	}
	// 	return true;
	// }
	componentDidUpdate(prevProps, prevState) {
		this.updateEmitter.emit();
		const { postStreamId } = this.props;

		if (this.props.activePanel !== prevProps.activePanel && this.state.editingPostId)
			this.handleDismissEdit();

		// for performance debugging purposes
		// Object.entries(this.props).forEach(
		// 	([key, val]) =>
		// 		JSON.stringify(prevProps[key]) !== JSON.stringify(val) &&
		// 		console.warn(`Prop '${key}' changed to ${prevProps[key]}`)
		// );
		// if (this.state) {
		// 	Object.entries(this.state).forEach(
		// 		([key, val]) =>
		// 			JSON.stringify(prevState[key]) !== JSON.stringify(val) &&
		// 			console.warn(`State '${key}' changed to ${prevState[key]}`)
		// 	);
		// }
	}

	// return the post, if any, with the given ID
	findPostById(id) {
		const { posts } = this.context.store.getState();
		return getPost(posts, this.props.postStreamId, id);
	}

	render() {
		const { showHeadshots } = this.props;
		let { activePanel, activeModal } = this.props;
		const { q } = this.state;

		// console.warn("RENDERING STREAM");
		if (activePanel === WebviewPanels.LandingRedirect) activePanel = WebviewPanels.Sidebar;

		const isConfigurationPanel =
			activePanel && activePanel.match(/^configure\-(provider|enterprise)-/);
		// if we're conducting a review, we need the compose functionality of spatial view
		if (this.props.currentReviewId) activePanel = WebviewPanels.CodemarksForFile;
		if (this.props.currentPullRequestId) activePanel = WebviewPanels.CodemarksForFile;
		if (!isConfigurationPanel && this.props.composeCodemarkActive) {
			// don't override the activePanel if user is trying to configure a provider
			// from the codemark (issue) form
			activePanel = WebviewPanels.CodemarksForFile;
		}
		if (
			!activePanel ||
			(!Object.values(WebviewPanels).includes(activePanel) && !isConfigurationPanel)
		) {
			activePanel = WebviewPanels.Activity;
		}

		let threadId = this.props.threadId;

		const streamClass = cx({
			stream: true,
			"has-overlay":
				(threadId || this.state.multiCompose || this.state.floatCompose) &&
				activePanel !== WebviewPanels.CodemarksForFile,
			"has-floating-compose":
				this.state.floatCompose && activePanel !== WebviewPanels.CodemarksForFile,
			"no-headshots": !showHeadshots
		});

		// these panels do not have global nav
		let renderNav =
			![
				"create-channel",
				"create-dm",
				"public-channels",
				// WebviewPanels.Status,
				WebviewPanels.Profile,
				WebviewPanels.Flow,
				WebviewPanels.NewPullRequest
			].includes(activePanel) &&
			// !this.props.currentReviewId &&
			// !this.props.currentPullRequestId &&
			!activePanel.startsWith("configure-provider-") &&
			!activePanel.startsWith("configure-enterprise-");

		// if (this.state.floatCompose) renderNav = false;
		// if (threadId) renderNav = false;

		const onInlineCodemarks = activePanel === WebviewPanels.CodemarksForFile;
		const contentClass =
			onInlineCodemarks || this.props.currentCodemarkId
				? "content inline"
				: "content vscroll inline";
		const configureProviderInfo =
			activePanel.startsWith("configure-provider-") ||
			activePanel.startsWith("configure-enterprise-")
				? activePanel.split("-")
				: null;

		// console.warn("ACTIVE: ", activePanel);
		// status and teams panels have been deprecated
		return (
			<div id="stream-root" className={streamClass}>
				<OfflineBanner />
				<ModalRoot />
				<CheckEmailVsGit />
				{this.state.propsForPrePRProviderInfoModal && (
					<PrePRProviderInfoModal {...this.state.propsForPrePRProviderInfoModal} />
				)}
				<div id="confirm-root" />
				<GlobalNav />
				<Sidebar />
				{activeModal && (
					<Modal translucent onClose={this.props.closeModal}>
						{activeModal === WebviewModals.CreateTeam && <CreateTeamPage />}
						{activeModal === WebviewModals.ReviewSettings && <ReviewSettings />}
						{activeModal === WebviewModals.Notifications && <Notifications />}
						{activeModal === WebviewModals.ChangeEmail && <ChangeEmail />}
						{activeModal === WebviewModals.ChangeAvatar && <ChangeAvatar />}
						{activeModal === WebviewModals.ChangeUsername && <ChangeUsername />}
						{activeModal === WebviewModals.ChangeFullName && <ChangeFullName />}
						{activeModal === WebviewModals.ChangeWorksOn && <ChangeWorksOn />}
						{activeModal === WebviewModals.ChangePhoneNumber && <ChangePhoneNumber />}
						{activeModal === WebviewModals.ChangePassword && <ChangePassword />}
						{activeModal === WebviewModals.ChangeTeamName && <ChangeTeamName />}
						{activeModal === WebviewModals.TeamSetup && <TeamSetup />}
						{activeModal === WebviewModals.Keybindings && (
							<Keybindings onClick={this.props.closeModal}>
								<div style={{ textAlign: "right" }}>
									<CancelButton onClick={this.props.closeModal} />
								</div>
							</Keybindings>
						)}
					</Modal>
				)}
				{activePanel === WebviewPanels.CodemarksForFile && (
					<InlineCodemarks
						activePanel={activePanel}
						setActivePanel={this.setActivePanel}
						currentUserId={this.props.currentUserId}
						postAction={this.postAction}
						multiCompose={this.state.multiCompose}
						typeFilter="all"
						focusInput={this.focusInput}
						scrollDiv={this._contentScrollDiv}
					/>
				)}
				{!activeModal &&
					// these are all panels that have been retired, or are
					// now a part of the sidebar
					activePanel !== WebviewPanels.Team &&
					activePanel !== WebviewPanels.Status &&
					activePanel !== WebviewPanels.Codemarks &&
					activePanel !== WebviewPanels.Invite &&
					activePanel !== WebviewPanels.PullRequest &&
					activePanel !== WebviewPanels.Review &&
					activePanel !== WebviewPanels.Tasks &&
					activePanel !== WebviewPanels.LandingRedirect &&
					activePanel !== WebviewPanels.OpenReviews &&
					activePanel !== WebviewPanels.OpenPullRequests &&
					activePanel !== WebviewPanels.WorkInProgress &&
					activePanel !== WebviewPanels.Sidebar &&
					activePanel !== WebviewPanels.CodemarksForFile && (
						<Modal translucent>
							{activePanel === WebviewPanels.Tester && <Tester />}
							{activePanel === WebviewPanels.FilterSearch && <FilterSearchPanel />}
							{activePanel === WebviewPanels.Activity && <ActivityPanel />}
							{activePanel === WebviewPanels.Export && <ExportPanel />}
							{activePanel === WebviewPanels.PRInfo && (
								<PRInfoModal onClose={this.props.closePanel} />
							)}
							{activePanel === WebviewPanels.NewComment && (
								<CodemarkForm
									commentType="comment"
									streamId={this.props.postStreamId}
									onSubmit={this.submitNoCodeCodemark}
									onClickClose={this.props.closePanel}
									collapsed={false}
									positionAtLocation={false}
									multiLocation={true}
									dontAutoSelectLine={true}
									setMultiLocation={this.setMultiLocation}
								/>
							)}
							{activePanel === WebviewPanels.NewIssue && (
								<CodemarkForm
									commentType="issue"
									streamId={this.props.postStreamId}
									onSubmit={this.submitNoCodeCodemark}
									onClickClose={this.props.closePanel}
									collapsed={false}
									positionAtLocation={false}
									multiLocation={true}
									dontAutoSelectLine={true}
									setMultiLocation={this.setMultiLocation}
								/>
							)}
							{activePanel === WebviewPanels.Flow && <FlowPanel />}
							{activePanel === WebviewPanels.NewReview && <ReviewForm />}
							{activePanel === WebviewPanels.Integrations && <IntegrationsPanel />}
							{activePanel === WebviewPanels.Profile && <ProfilePanel />}
							{activePanel === WebviewPanels.NewPullRequest && (
								<CreatePullRequestPanel closePanel={this.props.closePanel} />
							)}
							{activePanel === WebviewPanels.GettingStarted && <GettingStarted />}
							{activePanel.startsWith("configure-provider-youtrack-") && (
								<ConfigureYouTrackPanel
									providerId={configureProviderInfo[3]}
									originLocation={configureProviderInfo[4]}
								/>
							)}
							{activePanel.startsWith("configure-provider-azuredevops-") && (
								<ConfigureAzureDevOpsPanel
									providerId={configureProviderInfo[3]}
									originLocation={configureProviderInfo[4]}
								/>
							)}
							{activePanel.startsWith("configure-provider-jiraserver-") && (
								<ConfigureJiraServerPanel
									providerId={configureProviderInfo[3]}
									originLocation={configureProviderInfo[4]}
								/>
							)}
							{activePanel.startsWith("configure-enterprise-") && (
								<ConfigureEnterprisePanel
									providerId={configureProviderInfo[3]}
									originLocation={configureProviderInfo[4]}
								/>
							)}
						</Modal>
					)}
				{this.props.currentCodemarkId && (
					<Modal translucent onClose={() => this.props.setCurrentCodemark()}>
						<CodemarkView />
					</Modal>
				)}
			</div>
		);
	}

	resetPanel = () => {
		this.setActivePanel(WebviewPanels.Sidebar);
		this.setActiveModal();
		this.setCurrentPullRequest();
		this.setCurrentReview();
	};

	setMultiCompose = async (value, state = {}, commentingContext) => {
		// ugly hack -Pez
		if (value == "collapse") {
			this.setState({ multiCompose: false, ...state });
		} else {
			this.props.setCurrentDocumentMarker(undefined);

			let scmInfo;
			if (commentingContext) {
				const { uri, range, setSelection } = commentingContext;
				if (setSelection) {
					HostApi.instance.send(EditorSelectRangeRequestType, {
						uri: uri,
						selection: { ...range, cursor: range.end },
						preserveFocus: true
					});
				}
				scmInfo = await HostApi.instance.send(GetRangeScmInfoRequestType, {
					uri: uri,
					range: range,
					dirty: true // should this be determined here? using true to be safe
				});
			}
			this.setState({
				multiCompose: value,
				floatCompose: true,
				composeBoxProps: { ...state, codeBlock: scmInfo }
			});
			if (!value) {
				this.props.setNewPostEntry(undefined);
				this.setState({
					floatCompose: false,
					composeBoxProps: {}
				});
			}
		}
		// if (value) this.focus();
	};

	// this is no longer specific to the last post
	editLastPost = id => {
		const { activePanel } = this.props;
		let list;
		if (activePanel === "thread" || activePanel === WebviewPanels.Codemarks) {
			list = this._threadpostslist;
		} else if (activePanel === "main") {
			list = this._postslist;
		}

		id = id || (list && list.getUsersMostRecentPost().id);
		if (id) {
			const { codemarks } = this.context.store.getState();

			const post = this.findPostById(id);

			if (post.codemarkId) {
				const codemark = getCodemark(codemarks, post.codemarkId);

				this.setMultiCompose(true, {
					...this.state.composeBoxProps,
					key: Math.random().toString(),
					isEditing: true,
					editingCodemark: codemark
				});
			} else
				this.setState({ editingPostId: post.id }, () => {
					if (list) {
						list.scrollTo(post.id);
					}
				});
		}
	};

	// dead code
	setActivePanel = panel => {
		this.props.openPanel(panel);
	};

	scrollPostsListToBottom = () => {
		this._postslist && this._postslist.scrollToBottom();
	};

	// dead code
	// // dismiss the thread stream and return to the main stream
	handleDismissThread = () => {
		this.props.setCurrentStream(this.props.postStreamId);
		// this.setActivePanel("main");
		this.focusInput();
	};

	markUnread = postId => {
		this.props.markPostUnread(this.props.postStreamId, postId);
	};

	togglePinned = post => {
		if (!post) return;
		const codemark = post.codemark;
		if (!codemark) return;

		HostApi.instance.send(SetCodemarkPinnedRequestType, {
			codemarkId: codemark.id,
			value: !codemark.pinned
		});

		this.handleDismissThread();
	};

	// this tells the composebox to insert quoted text
	quotePost = post => {
		this.setState({ quotePost: post });
	};

	notImplementedYet = () => {
		return this.submitSystemPost("Not implemented yet");
	};

	postAction = (action, post, args) => {
		switch (action) {
			case "goto-thread":
				return this.props.setCurrentStream(post.streamId, post.parentPostId || post.id);
			case "edit-post":
				return this.editLastPost(post.id);
			case "mark-unread":
				return this.markUnread(post.id);
			case "quote":
				return this.quotePost(post);
			case "add-reaction":
				return this.notImplementedYet();
			case "toggle-pinned":
				return this.togglePinned(post);
			case "direct-message":
				return this.sendDirectMessage(post.author.username);
			case "live-share":
				return this.inviteToLiveShare(post.creatorId);
		}
	};

	findMentionedUserIds = (text, users) => {
		const mentionedUserIds = [];
		users.forEach(user => {
			const matcher = user.username.replace(/\+/g, "\\+").replace(/\./g, "\\.");
			if (text.match("@" + matcher + "\\b")) {
				mentionedUserIds.push(user.id);
			}
		});
		return mentionedUserIds;
	};

	focusInput = () => {
		// console.log("IN FOCUS INPUT");
		setTimeout(() => {
			const input = document.getElementById("input-div");
			if (input) input.focus();
		}, 20);
	};

	handleEscape(event) {
		if (this.state.editingPostId) this.handleDismissEdit();
		else if (this.props.activePanel === "thread") this.handleDismissThread();
		else event.abortKeyBinding();
	}

	handleDismissEdit() {
		this.setState({ editingPostId: null });
		this.focusInput();
	}

	submitSystemPost = async text => {
		const { postStreamId, createSystemPost, posts } = this.props;
		const threadId = this.props.threadId;
		const lastPost = _last(posts);
		const seqNum = lastPost ? lastPost.seqNum + 0.001 : 0.001;
		await createSystemPost(postStreamId, threadId, text, seqNum);
		safe(() => this._postslist.scrollToBottom());
		return true;
	};

	submitNoCodeCodemark = async attributes => {
		let retVal;
		try {
			const state = this.context.store.getState();
			const newPostEntryPoint =
				state && state.context ? state.context.newPostEntryPoint : undefined;
			retVal = await this.props.createPostAndCodemark(
				attributes,
				newPostEntryPoint || "Global Nav"
			);
			this.props.closePanel();
		} finally {
			this.props.setNewPostEntry(undefined);
		}
		return retVal;
	};
}

/**
 * @param {Object} state
 * @param {Object} state.configs
 * @param {ContextState} state.context
 * @param {Object} state.editorContext
 * @param {Object} state.posts
 * @param {Object} state.session
 * @param {Object} state.streams
 * @param {Object} state.teams
 **/
const mapStateToProps = state => {
	const { configs, context, session, streams, teams } = state;

	// FIXME -- eventually we'll allow the user to switch to other streams, like DMs and channels
	const teamStream = getStreamForTeam(streams, context.currentTeamId) || {};
	const postStream =
		getStreamForId(streams, context.currentTeamId, context.currentStreamId) || teamStream;

	// this would be nice, but unfortunately scm is only loaded on spatial view so we can't
	// rely on it here
	// const { scmInfo } = state.editorContext;

	return {
		currentCodemarkId: context.currentCodemarkId,
		currentMarkerId: context.currentMarkerId,
		currentReviewId: context.currentReviewId,
		// even though we don't use hasFocus, leave this in here because of a re-render
		// call from Modal.tsx -Pez
		hasFocus: context.hasFocus,
		currentPullRequestId: context.currentPullRequest ? context.currentPullRequest.id : undefined,
		activePanel: context.panelStack[0],
		activeModal: context.activeModal,
		threadId: context.threadId,
		showHeadshots: configs.showHeadshots,
		postStream,
		postStreamId: postStream.id,
		composeCodemarkActive: context.composeCodemarkActive
	};
};

export default connect(mapStateToProps, {
	...actions,
	setCurrentReview,
	setCurrentPullRequest,
	setCurrentStream,
	editCodemark,
	setNewPostEntry
})(injectIntl(SimpleStream));
