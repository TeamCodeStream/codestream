import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import cx from "classnames";
import { ActivityPanel } from "./ActivityPanel";
import { ExportPanel } from "./ExportPanel";
import { Onboard } from "./Onboard";
import { OnboardNewRelic } from "./OnboardNewRelic";
import { Sidebar } from "./Sidebar";
import { Notifications } from "./Notifications";
import { ChangeEmail } from "./ChangeEmail";
import { ChangeUsername } from "./ChangeUsername";
import { ChangePassword } from "./ChangePassword";
import { ChangeFullName } from "./ChangeFullName";
import { ChangeWorksOn } from "./ChangeWorksOn";
import { ChangePhoneNumber } from "./ChangePhoneNumber";
import { ChangeAvatar } from "./ChangeAvatar";
import { ChangeTeamName } from "./ChangeTeamName";

import { ChangeCompanyName } from "./ChangeCompanyName";
import { BlameMap } from "./BlameMap";
import { Team } from "./Team";
import { TeamSetup } from "./TeamSetup";
import { Invite } from "./Invite";
import { CreatePullRequestPanel } from "./CreatePullRequestPanel";
import { IntegrationsPanel } from "./IntegrationsPanel";
import { ProfilePanel } from "./ProfilePanel";
import { ReviewSettings } from "./ReviewSettings";
import { GettingStarted } from "./GettingStarted";
import { CodemarkForm } from "./CodemarkForm";
import { ReviewForm } from "./ReviewForm";
import FilterSearchPanel from "./FilterSearchPanel";
import InlineCodemarks from "./InlineCodemarks";
import { CreateTeamPage } from "./CreateTeamPage";
import { CreateCompanyPage } from "./CreateCompanyPage";
import { Tester } from "./Tester";
import Icon from "./Icon";
import CancelButton from "./CancelButton";
import Tooltip, { TipTitle, placeArrowTopRight } from "./Tooltip";
import OfflineBanner from "./OfflineBanner";
import { PRProviderErrorBanner } from "./PRProviderErrorBanner";
import ConfigureAzureDevOpsPanel from "./ConfigureAzureDevOpsPanel";
import ConfigureYouTrackPanel from "./ConfigureYouTrackPanel";
import ConfigureJiraPanel from "./ConfigureJiraPanel";
import ConfigureJiraServerPanel from "./ConfigureJiraServerPanel";
import ConfigureJiraServerOAuthPanel from "./ConfigureJiraServerOAuthPanel";
import ConfigureEnterprisePanel from "./ConfigureEnterprisePanel";
import ConfigureNewRelicPanel from "./ConfigureNewRelicPanel";
import ConfigureTokenProviderPanel from "./ConfigureTokenProviderPanel";
import { PrePRProviderInfoModal } from "./PrePRProviderInfoModal";
import * as actions from "./actions";
import { canCreateCodemark, editCodemark } from "../store/codemarks/actions";
import { ComponentUpdateEmitter, safe, toMapBy, isNotOnDisk, uriToFilePath } from "../utils";
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
	PixieDynamicLoggingType,
	StartWorkNotificationType,
	WebviewPanels,
	WebviewModals
} from "../ipc/webview.protocol";
import {
	SetCodemarkPinnedRequestType,
	TelemetryRequestType,
	GetRangeScmInfoRequestType,
	DeleteUserRequestType,
	GetUserInfoRequestType,
	AddBlameMapRequestType
} from "@codestream/protocols/agent";
import { getFileScmError } from "../store/editorContext/reducer";
import { CodemarkView } from "./CodemarkView";
import { CodeErrorView } from "./CodeErrorView";
import { Review } from "./Review";
import { Link } from "./Link";
import {
	setCurrentStream,
	setNewPostEntry,
	setIsFirstPageview,
	setCurrentReview,
	setCurrentReviewOptions,
	setCurrentPullRequest,
	setNewPullRequestOptions,
	setCurrentCodemark,
	setCurrentCodeError,
	setCurrentInstrumentationOptions,
	setCurrentPixieDynamicLoggingOptions
} from "../store/context/actions";
import { last as _last, findLastIndex } from "lodash-es";
import { Keybindings } from "./Keybindings";
import { FlowPanel, VideoLink } from "./Flow";
import { PixieDynamicLoggingPanel } from "./PixieDynamicLogging/PixieDynamicLoggingPanel";
import { PRInfoModal } from "./SpatialView/PRInfoModal";
import { GlobalNav } from "./GlobalNav";
import { EnjoyingCodeStream } from "./EnjoyingCodeStream";
import { getTestGroup } from "../store/context/reducer";
import { PresentTOS } from "../Authentication/PresentTOS";
import { PresentPrereleaseTOS } from "../Authentication/PresentPrereleaseTOS";
import { Loading } from "../Container/Loading";
import { DelayedRender } from "../Container/DelayedRender";
import { clearDynamicLogging } from "../store/dynamicLogging/actions";

const EMAIL_MATCH_REGEX = new RegExp(
	"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*",
	"g"
);

export class SimpleStream extends PureComponent {
	// Hacky but componentDidUpdate() is ineffective in its current
	// condition for using a local state variable to do this check.
	emailHasBeenCheckedForMismatch = false;
	disposables = [];
	state = {
		composeBoxProps: {},
		skipGitEmailCheckState: false
	};
	updateEmitter = new ComponentUpdateEmitter();

	static contextTypes = {
		store: PropTypes.object
	};

	componentDidMount() {
		const { isFirstPageview } = this.props;

		if (isFirstPageview) {
			this.props.openPanel(WebviewPanels.Onboard);
		}

		this.props.setIsFirstPageview(false);

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
		this.disposables.push(
			HostApi.instance.on(PixieDynamicLoggingType, this.handlePixieDynamicLoggingType, this)
		);

		this.emailHasBeenCheckedForMismatch = false;
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
			if (this.props.activePanel === WebviewPanels.Sidebar) return;
			if (!canCreateCodemark(e.uri)) return;

			// re-emit the notification after switching to spatial view
			this.updateEmitter.enqueue(() => {
				HostApi.instance.emit(NewCodemarkNotificationType.method, e);
			});
			this.props.openPanel(WebviewPanels.Sidebar);
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
		this.props.setNewPullRequestOptions(undefined);
		if (e) {
			this.props.setCurrentReviewOptions({
				includeLatestCommit: e.includeLatestCommit
			});
		}
		this.props.openPanel(WebviewPanels.NewReview);
	}

	handleNewPullRequestRequest(e) {
		if (e.source) {
			// this can come externally (from an IDE)
			this.props.setNewPostEntry(e.source);
		}
		this.props.setCurrentReview("");
		this.props.setCurrentPullRequest("");
		this.props.setNewPullRequestOptions({ branch: e.branch });
		this.props.openPanel(WebviewPanels.NewPullRequest);
	}

	handlePixieDynamicLoggingType(e) {
		this.props.clearDynamicLogging();
		this.props.setCurrentPixieDynamicLoggingOptions(e);
		this.props.openPanel(WebviewPanels.PixieDynamicLogging);
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

	addBlameMapForGitEmailMismatch = async () => {
		const {
			setUserPreference,
			blameMap,
			addBlameMapEnabled,
			skipGitEmailCheck,
			currentUser
		} = this.props;

		if (!this.emailHasBeenCheckedForMismatch) {
			const response = await HostApi.instance.send(GetUserInfoRequestType, {});
			if (response.email === currentUser.email) {
				setUserPreference(["skipGitEmailCheck"], true);
				this.emailHasBeenCheckedForMismatch = true;
			} else {
				const scmEmail = response.email;
				const mappedMe = blameMap[scmEmail.replace(/\./g, "*")];
				if (addBlameMapEnabled && scmEmail && !mappedMe && !skipGitEmailCheck) {
					this.addBlameMap(scmEmail, currentUser.id);
					HostApi.instance.track("Git Email Mismatch", { Mapped: true });

					setUserPreference(["skipGitEmailCheck"], true);
				}
				this.emailHasBeenCheckedForMismatch = true;
			}
		}
	};

	addBlameMap = async (email, userId) => {
		const { teamId } = this.props;

		await HostApi.instance.send(AddBlameMapRequestType, {
			teamId,
			userId,
			email
		});
	};

	render() {
		const { showHeadshots, isFirstPageview } = this.props;
		let { activePanel, activeModal, acceptedPrereleaseTOS } = this.props;
		const { q } = this.state;

		// this will show for any old, lingering users that have not accepted as part of a new registration
		// if (!acceptedTOS) return <PresentTOS />;

		// FIXME -- remove this before October 19th
		// if (!acceptedPrereleaseTOS) return <PresentPrereleaseTOS />;

		if (activePanel === WebviewPanels.LandingRedirect) activePanel = WebviewPanels.Sidebar;

		if (activePanel === WebviewPanels.Sidebar) {
			this.addBlameMapForGitEmailMismatch();
		}

		if (isFirstPageview && !this.props.pendingProtocolHandlerUrl) return null;

		const isConfigurationPanel =
			activePanel && activePanel.match(/^configure\-(provider|enterprise)-/);
		// if we're conducting a review, we need the compose functionality of spatial view
		if (this.props.currentReviewId || this.props.currentCodeErrorId) {
			activePanel = WebviewPanels.CodemarksForFile;
		}
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
		const enterpriseProvider = activePanel.startsWith("configure-enterprise-");
		const [, , providerName, providerId, origin] = configureProviderInfo || [];
		const customConfigureProvider = providerName
			? ["azuredevops", "youtrack", "jiraserver", "jiraserverold", "jira", "newrelic"].find(
					name => name === providerName
			  )
			: null;

		// console.warn("ACTIVE: ", activePanel);
		// status and teams panels have been deprecated
		return (
			<div id="stream-root" className={streamClass}>
				<OfflineBanner />
				<PRProviderErrorBanner />
				<ModalRoot />
				{/*<EnjoyingCodeStream />*/}
				{this.state.propsForPrePRProviderInfoModal && (
					<PrePRProviderInfoModal {...this.state.propsForPrePRProviderInfoModal} />
				)}
				<div id="confirm-root" />
				{activePanel !== WebviewPanels.Onboard && <GlobalNav />}
				{activePanel === WebviewPanels.Onboard ? (
					<Onboard type={this.props.onboardingTestGroup} />
				) : activePanel === WebviewPanels.OnboardNewRelic ? (
					<OnboardNewRelic />
				) : (
					<Sidebar />
				)}
				{activeModal && (
					<Modal translucent>
						{activeModal === WebviewModals.CreateTeam && <CreateTeamPage />}
						{activeModal === WebviewModals.CreateCompany && <CreateCompanyPage />}
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
						{activeModal === WebviewModals.ChangeCompanyName && <ChangeCompanyName />}
						{activeModal === WebviewModals.Profile && <ProfilePanel />}
						{activeModal === WebviewModals.BlameMap && <BlameMap />}
						{activeModal === WebviewModals.Invite && <Invite />}
						{activeModal === WebviewModals.Team && <Team />}
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
					activePanel !== WebviewPanels.Onboard &&
					activePanel !== WebviewPanels.OnboardNewRelic &&
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
							{activePanel === WebviewPanels.CodeError && (
								<>
									<DelayedRender>
										<Loading />
									</DelayedRender>
								</>
							)}
							{activePanel === WebviewPanels.Flow && <FlowPanel />}
							{activePanel === WebviewPanels.NewReview && <ReviewForm />}
							{activePanel === WebviewPanels.PixieDynamicLogging && <PixieDynamicLoggingPanel />}
							{activePanel === WebviewPanels.Integrations && <IntegrationsPanel />}
							{activePanel === WebviewPanels.Profile && <ProfilePanel />}
							{activePanel === WebviewPanels.NewPullRequest && (
								<CreatePullRequestPanel closePanel={this.props.closePanel} />
							)}
							{activePanel === WebviewPanels.GettingStarted && <GettingStarted />}
							{configureProviderInfo && !enterpriseProvider && !customConfigureProvider && (
								<ConfigureTokenProviderPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "jira" && (
								<ConfigureJiraPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "youtrack" && (
								<ConfigureYouTrackPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "newrelic" && (
								<ConfigureNewRelicPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "azuredevops" && (
								<ConfigureAzureDevOpsPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "jiraserver" && (
								<ConfigureJiraServerPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "jiraserverold" && (
								<ConfigureJiraServerOAuthPanel providerId={providerId} originLocation={origin} />
							)}
							{enterpriseProvider && (
								<ConfigureEnterprisePanel providerId={providerId} originLocation={origin} />
							)}
						</Modal>
					)}
				{this.props.currentCodemarkId && (
					<Modal translucent onClose={() => this.props.setCurrentCodemark()}>
						<CodemarkView />
					</Modal>
				)}
				{false && this.props.currentCodeErrorId && (
					<Modal onClose={() => this.props.setCurrentCodeError()}>
						<CodeErrorView />
					</Modal>
				)}
			</div>
		);
	}

	resetPanel = () => {
		this.setActivePanel(WebviewPanels.Sidebar);
		this.setActiveModal();
		this.setCurrentPullRequest();
		this.props.setNewPullRequestOptions(undefined);
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
	const { configs, context, streams, preferences, users, teams, session } = state;

	// FIXME -- eventually we'll allow the user to switch to other streams, like DMs and channels
	const teamStream = getStreamForTeam(streams, context.currentTeamId) || {};
	const postStream =
		getStreamForId(streams, context.currentTeamId, context.currentStreamId) || teamStream;

	// this would be nice, but unfortunately scm is only loaded on spatial view so we can't
	// rely on it here
	// const { scmInfo } = state.editorContext;
	const team = state.teams[state.context.currentTeamId];
	const acceptedPrereleaseTOS =
		preferences.acceptedPrereleaseTOS ||
		(team.settings ? team.settings.acceptedPrereleaseTOS : false);

	// console.warn("COMP: ", companies);
	return {
		addBlameMapEnabled: isFeatureEnabled(state, "addBlameMap"),
		blameMap: team.settings ? team.settings.blameMap : {},
		currentUser: users[session.userId],
		skipGitEmailCheck: preferences.skipGitEmailCheck,
		teamId: team.id,
		currentCodemarkId: context.currentCodemarkId,
		currentMarkerId: context.currentMarkerId,
		currentReviewId: context.currentReviewId,
		currentCodeErrorId: context.currentCodeErrorId,
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
		composeCodemarkActive: context.composeCodemarkActive,
		isFirstPageview: context.isFirstPageview,
		onboardingTestGroup: getTestGroup(state, "onboard-edu"),
		acceptedPrereleaseTOS,
		pendingProtocolHandlerUrl: context.pendingProtocolHandlerUrl
	};
};

export default connect(mapStateToProps, {
	...actions,
	clearDynamicLogging,
	setCurrentReview,
	setCurrentReviewOptions,
	setCurrentPullRequest,
	setNewPullRequestOptions,
	setCurrentStream,
	setCurrentCodemark,
	setCurrentCodeError,
	editCodemark,
	setNewPostEntry,
	setIsFirstPageview,
	setCurrentInstrumentationOptions,
	setCurrentPixieDynamicLoggingOptions
})(injectIntl(SimpleStream));
