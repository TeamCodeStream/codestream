import {
	AddBlameMapRequestType,
	GetRangeScmInfoRequestType,
	GetUserInfoRequestType,
	PostPlus,
	SetCodemarkPinnedRequestType,
} from "@codestream/protocols/agent";
import { CodemarkType, CSMe, CSUser } from "@codestream/protocols/api";
import cx from "classnames";
import PropTypes from "prop-types";
import React, { PureComponent } from "react";
import { connect } from "react-redux";

import { PresentPrereleaseTOS } from "@codestream/webview/Authentication/PresentPrereleaseTOS";
import { CodeStreamState } from "@codestream/webview/store";
import { editCodemark } from "@codestream/webview/store/codemarks/thunks";
import { PostsState } from "@codestream/webview/store/posts/types";
import {
	closeModal,
	closePanel,
	createPostAndCodemark,
	markPostUnread,
	openPanel,
	setUserPreference,
} from "@codestream/webview/Stream/actions";
import { DelayedRender } from "../Container/DelayedRender";
import { Loading } from "../Container/Loading";
import {
	EditorSelectRangeRequestType,
	NewCodemarkNotificationType,
	NewPullRequestNotificationType,
	NewReviewNotificationType,
	PixieDynamicLoggingType,
} from "../ipc/webview.protocol";
import { WebviewModals } from "@codestream/webview/ipc/webview.protocol.common";
import { WebviewPanels } from "@codestream/protocols/api";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { canCreateCodemark } from "../store/codemarks/actions";
import { getCodemark } from "../store/codemarks/reducer";
import {
	setCurrentCodeError,
	setCurrentCodemark,
	setCurrentInstrumentationOptions,
	setCurrentOrganizationInvite,
	setCurrentPixieDynamicLoggingOptions,
	setCurrentPullRequest,
	setCurrentReview,
	setCurrentReviewOptions,
	setCurrentStream,
	setIsFirstPageview,
	setNewPostEntry,
	setNewPullRequestOptions,
} from "../store/context/actions";
import { clearDynamicLogging } from "../store/dynamicLogging/actions";
import { getPost } from "../store/posts/reducer";
import { getStreamForId, getStreamForTeam } from "../store/streams/reducer";
import { ComponentUpdateEmitter, Disposable } from "../utils";
import { HostApi } from "../webview-api";
import { AcceptCompanyInvite } from "./AcceptCompanyInvite";
import { SetUserPreferenceRequest } from "./actions.types";
import { ActivityPanel } from "./ActivityPanel";
import { BlameMap } from "./BlameMap";
import CancelButton from "./CancelButton";
import { ChangeAvatar } from "./ChangeAvatar";
import { ChangeCompanyName } from "./ChangeCompanyName";
import { ChangeEmail } from "./ChangeEmail";
import { ChangeFullName } from "./ChangeFullName";
import { ChangePassword } from "./ChangePassword";
import { ChangePhoneNumber } from "./ChangePhoneNumber";
import { ChangeTeamName } from "./ChangeTeamName";
import { ChangeUsername } from "./ChangeUsername";
import { ChangeWorksOn } from "./ChangeWorksOn";
import { CodemarkForm } from "./CodemarkForm";
import { CodemarkView } from "./CodemarkView";
import ConfigureAzureDevOpsPanel from "./ConfigureAzureDevOpsPanel";
import ConfigureEnterprisePanel from "./ConfigureEnterprisePanel";
import ConfigureNewRelicPanel from "./ConfigureNewRelicPanel";
import { ConfigureOAuthOrPATPanel } from "./ConfigureOAuthOrPATPanel";
import ConfigureTokenProviderPanel from "./ConfigureTokenProviderPanel";
import ConfigureYouTrackPanel from "./ConfigureYouTrackPanel";
import ConfigureMSTeamsPanel from "./ConfigureMSTeamsPanel";
import { CreateCompanyPage } from "./CreateCompanyPage";
import { CreatePullRequestPanel } from "./CreatePullRequestPanel";
import { CreateTeamPage } from "./CreateTeamPage";
import { ExportPanel } from "./ExportPanel";
import FilterSearchPanel from "./FilterSearchPanel";
import { FinishReview } from "./FinishReview";
import { FlowPanel } from "./Flow";
import { GettingStarted } from "./GettingStarted";
import { GlobalNav } from "./GlobalNav";
import InlineCodemarks from "./InlineCodemarks";
import { IntegrationsPanel } from "./IntegrationsPanel";
import { Invite } from "./Invite";
import { Keybindings } from "./Keybindings";
import { MethodLevelTelemetryPanel } from "./MethodLevelTelemetry/MethodLevelTelemetryPanel";
import { Modal, ModalRoot } from "./Modal";
import { Notifications } from "./Notifications";
import OfflineBanner from "./OfflineBanner";
import { Onboard } from "./Onboard";
import { OnboardNewRelic } from "./OnboardNewRelic";
import { PixieDynamicLoggingPanel } from "./PixieDynamicLogging/PixieDynamicLoggingPanel";
import { ProfilePanel } from "./ProfilePanel";
import { PRProviderErrorBanner } from "./PRProviderErrorBanner";
import { ReviewForm } from "./ReviewForm";
import { ReviewSettings } from "./ReviewSettings";
import { CLMSettings } from "./CLMSettings";
import { Sidebar } from "./Sidebar";
import { PRInfoModal } from "./SpatialView/PRInfoModal";
import { Team } from "./Team";
import { TeamSetup } from "./TeamSetup";
import { Tester } from "./Tester";
import { ObservabilityAnomalyPanel } from "@codestream/webview/Stream/MethodLevelTelemetry/ObservabilityAnomalyPanel";

interface DispatchProps {
	clearDynamicLogging: Function;
	closeModal: Function;
	closePanel: Function;
	createPostAndCodemark: Function;
	markPostUnread: Function;
	openPanel: typeof openPanel;
	setCurrentCodemark: typeof setCurrentCodemark;
	setCurrentPixieDynamicLoggingOptions: typeof setCurrentPixieDynamicLoggingOptions;
	setCurrentPullRequest: typeof setCurrentPullRequest;
	setCurrentOrganizationInvite: typeof setCurrentOrganizationInvite;
	setCurrentReview: typeof setCurrentReview;
	setCurrentReviewOptions: typeof setCurrentReviewOptions;
	setCurrentStream: typeof setCurrentStream;
	setIsFirstPageview: typeof setIsFirstPageview;
	setNewPostEntry: typeof setNewPostEntry;
	setNewPullRequestOptions: typeof setNewPullRequestOptions;
	setUserPreference: (request: SetUserPreferenceRequest) => void;
}

interface ConnectedProps {
	acceptedPrereleaseTOS: boolean;
	activePanel: WebviewPanels | string;
	activeModal?: WebviewModals;
	addBlameMapEnabled: boolean;
	blameMap: { [setting: string]: any };
	composeCodemarkActive?: CodemarkType;
	currentCodeErrorId?: string;
	currentCodemarkId?: string;
	currentPullRequestId?: string;
	currentPullRequestView?: string;
	currentReviewId?: string;
	currentUser: CSUser;
	currentUserId: string;
	// even though we don't use hasFocus, leave this in here because of a re-render
	// call from Modal.tsx -Pez
	hasFocus: boolean;
	isFirstPageview?: boolean;
	postStreamId: string;
	skipGitEmailCheck: boolean;
	posts: PostsState;
	pendingProtocolHandlerUrl?: string;
	showHeadshots: boolean;
	showPreReleaseTos: boolean;
	teamId: string;
	threadId?: string;
}

type Props = DispatchProps & ConnectedProps;

export class SimpleStream extends PureComponent<Props> {
	// Hacky but componentDidUpdate() is ineffective in its current
	// condition for using a local state variable to do this check.
	emailHasBeenCheckedForMismatch = false;
	disposables: Disposable[] = [];
	state = {
		composeBoxProps: {},
		skipGitEmailCheckState: false,
		editingPostId: false,
		multiCompose: false,
		floatCompose: false,
	};
	updateEmitter = new ComponentUpdateEmitter();

	static contextTypes = {
		store: PropTypes.object,
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
		this.props.setCurrentPullRequest("", "");
		this.props.setNewPullRequestOptions(undefined);
		if (e) {
			this.props.setCurrentReviewOptions({
				includeLatestCommit: e.includeLatestCommit,
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
		this.props.setCurrentPullRequest("", "");
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
		// const { postStreamId } = this.props;

		if (this.props.activePanel !== prevProps.activePanel && this.state.editingPostId) {
			this.handleDismissEdit();
		}

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
	findPostById(id: string) {
		const { posts } = this.context.store.getState();
		return getPost(posts, this.props.postStreamId, id);
	}

	addBlameMapForGitEmailMismatch = async () => {
		const {
			setUserPreference,
			blameMap = {},
			addBlameMapEnabled,
			skipGitEmailCheck,
			currentUser,
		} = this.props;

		if (!this.emailHasBeenCheckedForMismatch) {
			const response = await HostApi.instance.send(GetUserInfoRequestType, {});
			if (response?.email === currentUser?.email) {
				setUserPreference({ prefPath: ["skipGitEmailCheck"], value: true });
				this.emailHasBeenCheckedForMismatch = true;
			} else {
				const scmEmail = response.email;
				const mappedMe = blameMap[scmEmail.replace(/\./g, "*")];
				if (addBlameMapEnabled && scmEmail && !mappedMe && !skipGitEmailCheck) {
					this.addBlameMap(scmEmail, currentUser.id);
					HostApi.instance.track("Git Email Mismatch", { Mapped: true });

					setUserPreference({ prefPath: ["skipGitEmailCheck"], value: true });
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
			email,
		});
	};

	render() {
		const { showHeadshots, isFirstPageview } = this.props;
		let { activePanel, activeModal, acceptedPrereleaseTOS, showPreReleaseTos } = this.props;

		// this will show for any old, lingering users that have not accepted as part of a new registration
		// if (!acceptedTOS) return <PresentTOS />;

		// use with beta users
		if (showPreReleaseTos && !acceptedPrereleaseTOS) return <PresentPrereleaseTOS />;

		if (activePanel === WebviewPanels.LandingRedirect) activePanel = WebviewPanels.Sidebar;

		if (activePanel === WebviewPanels.Sidebar) {
			this.addBlameMapForGitEmailMismatch();
		}

		if (isFirstPageview && !this.props.pendingProtocolHandlerUrl) return null;

		const isConfigurationPanel =
			activePanel && activePanel.match(/^(oauthpat|configure)\-(provider|enterprise)-/);

		// if we're conducting a review, we need the compose functionality of spatial view
		if (this.props.currentReviewId || this.props.currentCodeErrorId) {
			activePanel = WebviewPanels.CodemarksForFile;
		}
		if (this.props.currentPullRequestId && this.props.currentPullRequestView !== "sidebar-diffs")
			activePanel = WebviewPanels.CodemarksForFile;

		if (!isConfigurationPanel && this.props.composeCodemarkActive) {
			// don't override the activePanel if user is trying to configure a provider
			// from the codemark (issue) form
			activePanel = WebviewPanels.CodemarksForFile;
		}
		// const activePanelStr: string = typeof activePanel === "string" ? activePanel : activePanel;
		const webViewPanels: string[] = Object.values(WebviewPanels);
		if (!activePanel || (!webViewPanels.includes(activePanel) && !isConfigurationPanel)) {
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
			"no-headshots": !showHeadshots,
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
				WebviewPanels.NewPullRequest,
			].includes(activePanel) &&
			// !this.props.currentReviewId &&
			// !this.props.currentPullRequestId &&
			!activePanel.startsWith("configure-provider-") &&
			!activePanel.startsWith("configure-enterprise-") &&
			!activePanel.startsWith("oauthpat-provider-");

		// if (this.state.floatCompose) renderNav = false;
		// if (threadId) renderNav = false;

		const onInlineCodemarks = activePanel === WebviewPanels.CodemarksForFile;
		const contentClass =
			onInlineCodemarks || this.props.currentCodemarkId
				? "content inline"
				: "content vscroll inline";
		const configureProviderInfo =
			activePanel.startsWith("configure-provider-") ||
			activePanel.startsWith("configure-enterprise-") ||
			activePanel.startsWith("oauthpat-provider-")
				? activePanel.split("-")
				: null;
		const enterpriseProvider = activePanel.startsWith("configure-enterprise-");
		const oauthOrPATProvider = activePanel.startsWith("oauthpat-provider-");
		let [, , providerName, providerId, origin] = configureProviderInfo || [];
		const customConfigureProvider = providerName
			? ["azuredevops", "youtrack", "newrelic", "msteams"].find(name => name === providerName)
			: null;

		// status and teams panels have been deprecated
		return (
			<div id="stream-root" className={streamClass}>
				<OfflineBanner />
				<PRProviderErrorBanner />
				<ModalRoot />
				{/*<EnjoyingCodeStream />*/}
				{/*{this.state.propsForPrePRProviderInfoModal && (*/}
				{/*	<PrePRProviderInfoModal {...this.state.propsForPrePRProviderInfoModal} />*/}
				{/*)}*/}
				<div id="confirm-root" />
				{activePanel !== WebviewPanels.Onboard && <GlobalNav />}
				{activePanel === WebviewPanels.Onboard ? (
					<Onboard />
				) : activePanel === WebviewPanels.OnboardNewRelic ? (
					<OnboardNewRelic />
				) : (
					<Sidebar />
				)}
				{activeModal && (
					<Modal translucent>
						{activeModal === WebviewModals.AcceptCompanyInvite && <AcceptCompanyInvite />}
						{activeModal === WebviewModals.CreateTeam && <CreateTeamPage />}
						{activeModal === WebviewModals.CreateCompany && <CreateCompanyPage />}
						{activeModal === WebviewModals.ReviewSettings && <ReviewSettings />}
						{activeModal === WebviewModals.CLMSettings && <CLMSettings />}
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
						{activeModal === WebviewModals.FinishReview && <FinishReview />}
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
					<InlineCodemarks activePanel={activePanel} postAction={this.postAction} />
				)}
				{!activeModal &&
					// these are all panels that have been retired, or are
					// now a part of the sidebar
					activePanel !== WebviewPanels.Status &&
					activePanel !== WebviewPanels.Codemarks &&
					activePanel !== WebviewPanels.Invite &&
					activePanel !== WebviewPanels.PullRequest &&
					activePanel !== WebviewPanels.Review &&
					activePanel !== WebviewPanels.Tasks &&
					activePanel !== WebviewPanels.OpenReviews &&
					activePanel !== WebviewPanels.OpenPullRequests &&
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
								<PRInfoModal onClose={() => this.props.closePanel()} />
							)}
							{activePanel === WebviewPanels.NewComment && (
								<CodemarkForm
									commentType="comment"
									streamId={this.props.postStreamId}
									onSubmit={this.submitNoCodeCodemark}
									onClickClose={() => this.props.closePanel()}
									collapsed={false}
									positionAtLocation={false}
									multiLocation={true}
									dontAutoSelectLine={true}
								/>
							)}
							{activePanel === WebviewPanels.NewIssue && (
								<CodemarkForm
									commentType="issue"
									streamId={this.props.postStreamId}
									onSubmit={this.submitNoCodeCodemark}
									onClickClose={() => this.props.closePanel()}
									collapsed={false}
									positionAtLocation={false}
									multiLocation={true}
									dontAutoSelectLine={true}
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
							{activePanel === WebviewPanels.MethodLevelTelemetry && <MethodLevelTelemetryPanel />}
							{activePanel === WebviewPanels.ObservabilityAnomaly && <ObservabilityAnomalyPanel />}
							{activePanel === WebviewPanels.Integrations && <IntegrationsPanel />}
							{activePanel === WebviewPanels.Profile && <ProfilePanel />}
							{activePanel === WebviewPanels.NewPullRequest && (
								<CreatePullRequestPanel closePanel={() => this.props.closePanel()} />
							)}
							{activePanel === WebviewPanels.GettingStarted && <GettingStarted />}
							{configureProviderInfo &&
								!enterpriseProvider &&
								!customConfigureProvider &&
								!oauthOrPATProvider && (
									<ConfigureTokenProviderPanel providerId={providerId} originLocation={origin} />
								)}
							{/*{customConfigureProvider === "jira" && (*/}
							{/*	<ConfigureJiraPanel providerId={providerId} originLocation={origin} />*/}
							{/*)}*/}
							{customConfigureProvider === "youtrack" && (
								<ConfigureYouTrackPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "newrelic" && (
								<ConfigureNewRelicPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "azuredevops" && (
								<ConfigureAzureDevOpsPanel providerId={providerId} originLocation={origin} />
							)}
							{customConfigureProvider === "msteams" && (
								<ConfigureMSTeamsPanel providerId={providerId} originLocation={origin} />
							)}
							{/*customConfigureProvider === "jiraserver" && (
								<ConfigureJiraServerPanel providerId={providerId} originLocation={origin} />
							)*/}
							{enterpriseProvider && (
								<ConfigureEnterprisePanel providerId={providerId} originLocation={origin} />
							)}
							{oauthOrPATProvider && (
								<ConfigureOAuthOrPATPanel providerId={providerId} originLocation={origin} />
							)}
						</Modal>
					)}
				{this.props.currentCodemarkId && (
					<Modal translucent onClose={() => this.props.setCurrentCodemark()}>
						<CodemarkView />
					</Modal>
				)}
				{/* {false && this.props.currentCodeErrorId && (
					<Modal onClose={() => this.props.setCurrentCodeError()}>
						<CodeErrorView />
					</Modal>
				)} */}
			</div>
		);
	}

	setMultiCompose = async (value, state = {}, commentingContext) => {
		// ugly hack -Pez
		if (value == "collapse") {
			this.setState({ multiCompose: false, ...state });
		} else {
			// this.props.setCurrentDocumentMarker(undefined);

			let scmInfo;
			if (commentingContext) {
				const { uri, range, setSelection } = commentingContext;
				if (setSelection) {
					HostApi.instance.send(EditorSelectRangeRequestType, {
						uri: uri,
						selection: { ...range, cursor: range.end },
						preserveFocus: true,
					});
				}
				scmInfo = await HostApi.instance.send(GetRangeScmInfoRequestType, {
					uri: uri,
					range: range,
					dirty: true, // should this be determined here? using true to be safe
				});
			}
			this.setState({
				multiCompose: value,
				floatCompose: true,
				composeBoxProps: { ...state, codeBlock: scmInfo },
			});
			if (!value) {
				this.props.setNewPostEntry(undefined);
				this.setState({
					floatCompose: false,
					composeBoxProps: {},
				});
			}
		}
		// if (value) this.focus();
	};

	// this is no longer specific to the last post
	editLastPost = (id: string) => {
		const { activePanel } = this.props;

		if (id) {
			const { codemarks } = this.context.store.getState();

			const post = this.findPostById(id);

			if (post.codemarkId) {
				const codemark = getCodemark(codemarks, post.codemarkId);

				this.setMultiCompose(
					true,
					{
						...this.state.composeBoxProps,
						key: Math.random().toString(),
						isEditing: true,
						editingCodemark: codemark,
					},
					null
				);
			} else {
				this.setState({ editingPostId: post.id }, () => {});
			}
		}
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

	togglePinned = (post: PostPlus) => {
		if (!post) return;
		const codemark = post.codemark;
		if (!codemark) return;

		HostApi.instance.send(SetCodemarkPinnedRequestType, {
			codemarkId: codemark.id,
			value: !codemark.pinned,
		});

		this.handleDismissThread();
	};

	// this tells the composebox to insert quoted text
	quotePost = (post: PostPlus) => {
		this.setState({ quotePost: post });
	};

	notImplementedYet = () => {
		return "Not implemented yet";
	};

	postAction = (action: string, post: PostPlus, args) => {
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
			// case "direct-message":
			// 	return this.sendDirectMessage(post.author.username);
			// case "live-share":
			// 	return this.inviteToLiveShare(post.creatorId);
		}
	};

	focusInput = () => {
		// console.log("IN FOCUS INPUT");
		setTimeout(() => {
			const input = document.getElementById("input-div");
			if (input) input.focus();
		}, 20);
	};

	handleEscape(event) {
		if (this.state.editingPostId) {
			this.handleDismissEdit();
		} else if (this.props.activePanel === "thread") {
			this.handleDismissThread();
		} else {
			event.abortKeyBinding();
		}
	}

	handleDismissEdit() {
		this.setState({ editingPostId: null });
		this.focusInput();
	}

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
const mapStateToProps = (state: CodeStreamState): ConnectedProps => {
	const { configs, context, streams, preferences, users, session } = state;

	// FIXME -- eventually we'll allow the user to switch to other streams, like DMs and channels
	const teamStream = getStreamForTeam(streams, context.currentTeamId) || {};
	const postStream = context.currentStreamId
		? getStreamForId(state.streams, context.currentTeamId, context.currentStreamId)
		: teamStream;

	// this would be nice, but unfortunately scm is only loaded on spatial view so we can't
	// rely on it here
	// const { scmInfo } = state.editorContext;
	const team = state.teams[state.context.currentTeamId];
	const acceptedPrereleaseTOS =
		preferences.acceptedPrereleaseTOS ||
		(team.settings ? team.settings.acceptedPrereleaseTOS : false);

	return {
		acceptedPrereleaseTOS,
		activeModal: context.activeModal,
		activePanel: context.panelStack[0],
		addBlameMapEnabled: isFeatureEnabled(state, "addBlameMap"),
		blameMap: team.settings ? team.settings.blameMap : {},
		composeCodemarkActive: context.composeCodemarkActive,
		currentCodeErrorId: context.currentCodeErrorId,
		currentCodemarkId: context.currentCodemarkId,
		currentPullRequestId: context.currentPullRequest ? context.currentPullRequest.id : undefined,
		currentPullRequestView: context.currentPullRequest
			? context.currentPullRequest.view
			: undefined,
		currentReviewId: context.currentReviewId,
		currentUser: users[session.userId!] as CSMe,
		currentUserId: session.userId!,
		isFirstPageview: context.isFirstPageview,
		// even though we don't use hasFocus, leave this in here because of a re-render
		// call from Modal.tsx -Pez
		hasFocus: context.hasFocus,
		pendingProtocolHandlerUrl: context.pendingProtocolHandlerUrl,
		posts: state.posts,
		postStreamId: postStream!.id,
		showHeadshots: configs.showHeadshots,
		showPreReleaseTos: isFeatureEnabled(state, "showPreReleaseTos"),
		skipGitEmailCheck: preferences.skipGitEmailCheck === true,
		teamId: team.id,
		threadId: context.threadId,
	};
};

export default connect(mapStateToProps, {
	clearDynamicLogging,
	closeModal,
	closePanel,
	createPostAndCodemark,
	markPostUnread,
	openPanel,
	setCurrentCodemark,
	editCodemark,
	setCurrentCodeError,
	setCurrentInstrumentationOptions,
	setCurrentPixieDynamicLoggingOptions,
	setCurrentPullRequest,
	setCurrentOrganizationInvite,
	setCurrentReview,
	setCurrentReviewOptions,
	setCurrentStream,
	setIsFirstPageview,
	setNewPostEntry,
	setNewPullRequestOptions,
	setUserPreference,
})(SimpleStream);
