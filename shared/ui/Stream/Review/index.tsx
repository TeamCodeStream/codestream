import React, { PropsWithChildren } from "react";
import cx from "classnames";
import {
	CardBody,
	CardProps,
	getCardProps,
	CardFooter,
	CardBanner
} from "@codestream/webview/src/components/Card";
import {
	ChangeDataType,
	CheckReviewPreconditionsRequestType,
	CodemarkPlus,
	FollowReviewRequestType,
	DidChangeDataNotification,
	DidChangeDataNotificationType,
	ExecuteThirdPartyRequestUntypedType
} from "@codestream/protocols/agent";
import {
	MinimumWidthCard,
	Header,
	MetaSection,
	Meta,
	MetaLabel,
	MetaDescription,
	MetaSectionCollapsed,
	HeaderActions,
	MetaDescriptionForAssignees,
	MetaAssignee,
	MetaRow,
	MetaDescriptionForTags,
	KebabIcon,
	BigTitle,
	MetaSectionCollapsedHeadshotArea
} from "../Codemark/BaseCodemark";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import {
	CSUser,
	CSReview,
	CSReviewStatus,
	CodemarkType,
	CodemarkStatus
} from "@codestream/protocols/api";
import { CodeStreamState } from "@codestream/webview/store";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import Icon from "../Icon";
import Tooltip from "../Tooltip";
import { capitalize, replaceHtml, emptyArray, mapFilter } from "@codestream/webview/utils";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "../..";
import { deleteReview, fetchReview } from "@codestream/webview/store/reviews/actions";
import {
	setCurrentReview,
	setCurrentCodemark,
	setCurrentPullRequest,
	openPanel,
	setCreatePullRequest
} from "@codestream/webview/store/context/actions";
import { DelayedRender } from "@codestream/webview/Container/DelayedRender";
import { getReview } from "@codestream/webview/store/reviews/reducer";
import MessageInput from "../MessageInput";
import styled from "styled-components";
import Button from "../Button";
import {
	getTeamMates,
	findMentionedUserIds,
	getTeamTagsHash
} from "@codestream/webview/store/users/reducer";
import { createPost, setReviewStatus, setCodemarkStatus } from "../actions";
import { getThreadPosts } from "@codestream/webview/store/posts/reducer";
import { DropdownButton } from "./DropdownButton";
import Tag from "../Tag";
import { RepliesToPost } from "../Posts/RepliesToPost";
import { ChangesetFileList } from "./ChangesetFileList";
import Menu from "../Menu";
import { confirmPopup } from "../Confirm";
import { Checkbox } from "@codestream/webview/src/components/Checkbox";
import { createCodemark } from "@codestream/webview/store/codemarks/actions";
import { getReviewChangeRequests } from "@codestream/webview/store/codemarks/reducer";
import { Link } from "../Link";
import { MarkdownText } from "../MarkdownText";
import { ReviewForm } from "../ReviewForm";
import Timestamp from "../Timestamp";
import { Dispatch } from "@codestream/webview/store/common";
import { Loading } from "@codestream/webview/Container/Loading";
import { TourTip } from "@codestream/webview/src/components/TourTip";
import { CommitList } from "./CommitList";
import { SharingModal } from "../SharingModal";
import {
	ShowPreviousChangedFileRequestType,
	ShowNextChangedFileRequestType,
	WebviewPanels,
	OpenUrlRequestType
} from "@codestream/protocols/webview";
import { HeadshotName } from "@codestream/webview/src/components/HeadshotName";
import { LocateRepoButton } from "../LocateRepoButton";
import { PROVIDER_MAPPINGS } from "../CrossPostIssueControls/types";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";

interface RepoMetadata {
	repoName: string;
	branch: string;
}

interface SimpleError {
	/**
	 * Error message from the server
	 */
	message: string;
	/**
	 * Typed error message (to switch off of, etc.)
	 */
	type?: string;
}

export interface BaseReviewProps extends CardProps {
	review: CSReview;
	repoInfo: RepoMetadata[];
	repoInfoById: Map<string, RepoMetadata>;
	headerError?: SimpleError;
	canStartReview?: boolean;
	repoRoots?: { [repoId: string]: string };
	currentUserId?: string;
	collapsed?: boolean;
	isFollowing?: boolean;
	reviewers?: CSUser[];
	tags?: { id: string }[];
	changeRequests?: CodemarkPlus[];
	renderFooter?: (
		footer: typeof CardFooter,
		inputContainer?: typeof ComposeWrapper
	) => React.ReactNode;
	filesTip?: any;
	isAmending?: boolean;
	setIsEditing: Function;
	setIsAmending?: Function;
	onRequiresCheckPreconditions?: Function;
}

export interface BaseReviewHeaderProps {
	review: CSReview;
	collapsed?: boolean;
	isFollowing?: boolean;
	reviewers?: CSUser[];
	tags?: { id: string }[];
	changeRequests?: CodemarkPlus[];
	setIsEditing: Function;
	setIsAmending?: Function;
}

export interface BaseReviewMenuProps {
	review: CSReview;
	setIsEditing: Function;
	setIsAmending?: Function;
	changeRequests?: CodemarkPlus[];
	collapsed?: boolean;
}

const Clickable = styled(Link)`
	display: inline-block;
	padding-top: 2px;
`;

const ComposeWrapper = styled.div.attrs(() => ({
	className: "compose codemark-compose"
}))`
	&&& {
		padding: 0 !important;
	}
	.message-input#input-div {
		max-width: none !important;
	}
`;

const MetaRepoInfo = styled.div`
	display: flex;
	flex-direction: column;
	&:not(:last) {
		margin-bottom: 2px;
	}
`;

const RepoInfo = styled.div`
	display: flex;
	.icon {
		margin-right: 5px;
	}
	span:not(:first-child) {
		padding-left: 20px;
	}
	span {
		display: inline-block;
	}
`;

export const ExpandedAuthor = styled.div`
	width: 100%;
	color: var(--text-color-subtle);
	white-space: normal;
`;

const ReviewTitle = styled.div`
	font-size: larger;
	flex-grow: 10;
`;

export const Description = styled.div`
	margin-bottom: 15px;
`;

export const MetaCheckboxWithHoverIcon = styled.div`
	display: flex;
	.icon {
		margin: 3px 0 0 8px;
		display: none !important;
	}
	&:hover .icon {
		display: inline-block !important;
	}
`;

export const MetaIcons = styled.span`
	margin-left: 5px;
	display: inline-block;
	height: 14px;
	.icon {
		margin-left: 5px;
	}
`;

const MetaPullRequest = styled.div`
	// padding: 6px 6px 6px 0;
	a {
		// padding-left: 6px;
		text-decoration: none;
		color: var(--text-color-subtle) !important;
		&:hover {
			color: var(--text-color-info) !important;
		}
	}
	.icon {
		vertical-align: 0px;
		margin-right: 5px;
	}
`;

const translateStatus = (status: string) => {
	if (status === "closed") return "Approved";

	return capitalize(status);
};

// if child props are passed in, we assume they are the action buttons/menu for the header
export const BaseReviewHeader = (props: PropsWithChildren<BaseReviewHeaderProps>) => {
	const { review, collapsed, changeRequests } = props;

	return (
		<Header>
			<Icon name="review" className="type" />
			<BigTitle>
				<HeaderActions>
					{props.children || (
						<BaseReviewMenu
							review={review}
							collapsed={collapsed}
							changeRequests={changeRequests}
							setIsEditing={props.setIsEditing}
							setIsAmending={props.setIsAmending}
						/>
					)}
				</HeaderActions>
				<MarkdownText text={review.title} />
			</BigTitle>
		</Header>
	);
};

export const BaseReviewMenu = (props: BaseReviewMenuProps) => {
	const { review, collapsed, setIsAmending } = props;

	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		let statusLabel = "";
		switch (review.status) {
			case "open":
				{
					statusLabel = "Open";
					if (review.allReviewersMustApprove && review.reviewers && review.reviewers.length > 1) {
						const approvals = Object.keys(review.approvedBy || {}).length;
						statusLabel += ` (${approvals}/${review.reviewers.length})`;
					}
				}
				break;
			case "approved":
				statusLabel = "Approved";
				break;
			case "rejected":
				statusLabel = "Rejected";
				break;
		}

		return {
			currentUserId: state.session.userId!,
			currentUser: state.users[state.session.userId!],
			author: state.users[props.review.creatorId],
			userIsFollowing: (props.review.followerIds || []).includes(state.session.userId!),
			statusLabel,
			cr2prEnabled: isFeatureEnabled(state, "cr2pr")
		};
	}, shallowEqual);
	const [shareModalOpen, setShareModalOpen] = React.useState(false);
	const [menuState, setMenuState] = React.useState<{ open: boolean; target?: any }>({
		open: false,
		target: undefined
	});

	const permalinkRef = React.useRef<HTMLTextAreaElement>(null);

	const approve = () => {
		if (props.changeRequests && props.changeRequests!.find(r => r.status !== "closed"))
			confirmPopup({
				title: "Are you sure?",
				message: "This review has open change requests.",
				centered: true,
				buttons: [
					{ label: "Cancel", className: "control-button" },
					{
						label: "Approve Anyway",
						className: "success",
						wait: true,
						action: () => {
							dispatch(setReviewStatus(props.review.id, "approved"));
						}
					}
				]
			});
		else dispatch(setReviewStatus(props.review.id, "approved"));
	};

	const reject = () => dispatch(setReviewStatus(props.review.id, "rejected"));

	const reopen = () => dispatch(setReviewStatus(props.review.id, "open"));

	const startReview = () => dispatch(setCurrentReview(props.review.id));

	const approveItem = { icon: <Icon name="thumbsup" />, label: "Approve", action: approve };
	const unapproveItem = {
		icon: <Icon name="diff-removed" />,
		label: "Withdraw Approval",
		action: reopen
	};
	const reviewItem = {
		icon: <Icon name="review" />,
		label: "View Changes",
		action: startReview
	};
	const rejectItem = { icon: <Icon name="thumbsdown" />, label: "Reject", action: reject };
	const reopenItem = { icon: <Icon name="reopen" />, label: "Reopen", action: reopen };
	const amendItem = {
		label: "Amend Review (add code)",
		key: "amend",
		icon: <Icon name="plus" />,
		action: () => {
			if (props.review.status !== "open") reopen();
			setIsAmending && setIsAmending(true);
		}
	};

	const menuItems = React.useMemo(() => {
		const items: any[] = [
			{
				label: "Share",
				key: "share",
				action: () => setShareModalOpen(true)
			},
			{
				label: "Copy link",
				key: "copy-permalink",
				action: () => {
					if (permalinkRef && permalinkRef.current) {
						permalinkRef.current.select();
						document.execCommand("copy");
					}
				}
			},
			{
				label: derivedState.userIsFollowing ? "Unfollow" : "Follow",
				key: "toggle-follow",
				action: () => {
					const value = !derivedState.userIsFollowing;
					const changeType = value ? "Followed" : "Unfollowed";
					HostApi.instance.send(FollowReviewRequestType, {
						id: review.id,
						value
					});
					HostApi.instance.track("Notification Change", {
						Change: `Review ${changeType}`,
						"Source of Change": "Review menu"
					});
				}
			}
		];

		if (review.creatorId === derivedState.currentUser.id) {
			items.push(
				{
					label: "Edit",
					key: "edit",
					action: () => props.setIsEditing(true)
				},
				{
					label: "Delete",
					action: () => {
						confirmPopup({
							title: "Are you sure?",
							message: "Deleting a review cannot be undone.",
							centered: true,
							buttons: [
								{ label: "Go Back", className: "control-button" },
								{
									label: "Delete Review",
									className: "delete",
									wait: true,
									action: () => {
										dispatch(deleteReview(review.id));
										dispatch(setCurrentReview());
									}
								}
							]
						});
					}
				}
			);
		}

		const { approvedBy = {}, creatorId, pullRequestUrl } = review;
		const hasPullRequest = pullRequestUrl != null;
		if (props.collapsed) {
			items.unshift({ label: "-" });
			switch (review.status) {
				case "open": {
					const approval = approvedBy[derivedState.currentUserId] ? unapproveItem : approveItem;
					items.unshift(reviewItem, approval, rejectItem);
					break;
				}
				case "approved":
					{
						if (!hasPullRequest) {
							items.unshift(reopenItem);
						}
					}
					break;
				case "rejected":
					{
						if (!hasPullRequest) {
							items.unshift(reopenItem);
						}
					}
					break;
			}
			if (!hasPullRequest && derivedState.currentUserId === creatorId) {
				items.unshift(amendItem);
			}
		}

		if (
			derivedState.cr2prEnabled &&
			review.pullRequestUrl == null &&
			review.status === "approved" &&
			derivedState.currentUserId === creatorId
		) {
			items.unshift({
				label: "Create a PR",
				icon: <Icon className="narrow-icon" name="pull-request" />,
				key: "pr",
				action: () => {
					const _action = async () => {
						await dispatch(setCreatePullRequest(review.id));
						await dispatch(setCurrentReview(""));
						await dispatch(openPanel(WebviewPanels.NewPullRequest));
					};
					_action();
				}
			});
		}

		return items;
	}, [review, collapsed]);

	if (shareModalOpen)
		return <SharingModal review={props.review!} onClose={() => setShareModalOpen(false)} />;

	if (collapsed) {
		return (
			<DropdownButton
				size="compact"
				variant={review.status === "open" ? "primary" : "secondary"}
				items={menuItems}
			>
				{derivedState.statusLabel}
				<textarea
					readOnly
					key="permalink-offscreen"
					ref={permalinkRef}
					value={review.permalink}
					style={{ position: "absolute", left: "-9999px" }}
				/>
			</DropdownButton>
		);
	}

	return (
		<>
			<KebabIcon
				className="kebab"
				onClickCapture={e => {
					e.preventDefault();
					e.stopPropagation();
					if (menuState.open) {
						setMenuState({ open: false });
					} else {
						setMenuState({
							open: true,
							target: e.currentTarget.closest("button")
						});
					}
				}}
			>
				<Icon name="kebab-horizontal" />
			</KebabIcon>
			<textarea
				readOnly
				key="permalink-offscreen"
				ref={permalinkRef}
				value={review.permalink}
				style={{ position: "absolute", left: "-9999px" }}
			/>
			{menuState.open && (
				<Menu
					target={menuState.target}
					action={() => setMenuState({ open: false })}
					items={menuItems}
					align="dropdownRight"
				/>
			)}
		</>
	);
};

const BaseReview = (props: BaseReviewProps) => {
	const { review } = props;

	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			providers: state.providers,
			isInVscode: state.ide.name === "VSC",
			author: state.users[props.review.creatorId]
		};
	}, shallowEqual);
	const [checkpoint, setCheckpoint] = React.useState<number | undefined>(undefined);
	const hasTags = props.tags && props.tags.length > 0;
	const hasReviewers = props.reviewers != null && props.reviewers.length > 0;
	const approvalLabel =
		props.reviewers != null && props.reviewers.length > 1
			? review.allReviewersMustApprove
				? " - Everyone Must Approve"
				: " - Anyone Can Approve"
			: "";
	const { approvedBy = {} } = review;
	const hasChangeRequests = props.changeRequests != null && props.changeRequests.length > 0;
	const numFiles = review.reviewChangesets
		.map(r => r.modifiedFiles.length)
		.reduce((a, b) => a + b, 0);
	const renderedFooter = props.renderFooter && props.renderFooter(CardFooter, ComposeWrapper);

	const prevFile = () => HostApi.instance.send(ShowPreviousChangedFileRequestType, {});

	const nextFile = () => HostApi.instance.send(ShowNextChangedFileRequestType, {});

	const isMacintosh = navigator.appVersion.includes("Macintosh");
	const nextFileKeyboardShortcut = () => (isMacintosh ? `⌥ F6` : "Alt-F6");
	const previousFileKeyboardShortcut = () => (isMacintosh ? `⇧ ⌥ F6` : "Shift-Alt-F6");

	let singleRepo: (RepoMetadata & { id: string }) | undefined = undefined;
	let canLocateRepo = false;
	if (
		props.headerError &&
		props.headerError.type === "REPO_NOT_FOUND" &&
		props.repoInfoById &&
		props.repoInfoById.size == 1
	) {
		// currently we can only locate repo if there's 1 repo in the review.
		canLocateRepo = true;
		singleRepo = {
			id: props.repoInfoById.keys().next().value,
			...props.repoInfoById.values().next().value
		};
	}

	// TODO de-dupe this
	const numCheckpoints =
		Math.max.apply(
			Math,
			review.reviewChangesets.map(_ => (_.checkpoint === undefined ? 0 : _.checkpoint))
		) + 1;

	const dropdownItems: any = [
		{ label: "All Changed Files", action: () => setCheckpoint(undefined) },
		{ label: "-" }
	];
	for (var i = 0; i < numCheckpoints; i++) {
		const label = i === 0 ? "Initial Review" : `Update #${i}`;
		const set = i;
		dropdownItems.push({ label, key: "checkpoint-" + set, action: () => setCheckpoint(set) });
	}
	const dropdownLabel =
		checkpoint === undefined
			? "All Changed Files"
			: checkpoint === 0
			? "Initial Review"
			: `Update #${checkpoint}`;

	const renderCommitList = () => {
		const groups = [] as any;
		for (var i = 0; i < numCheckpoints; i++) {
			groups.push(
				<Meta id={"commits-update-" + i} key={"commits-update-" + i}>
					<MetaLabel>Commits in {i === 0 ? "Initial Review" : `Update #${i}`}</MetaLabel>
					<MetaDescriptionForAssignees>
						<CommitList review={review} checkpoint={i} />
					</MetaDescriptionForAssignees>
				</Meta>
			);
		}
		return groups;
	};

	const renderPullRequest = () => {
		let icon = <></>;
		if (review.pullRequestProviderId) {
			const provider = derivedState.providers[review.pullRequestProviderId];
			if (provider) {
				const providerInfo = PROVIDER_MAPPINGS[provider.name];
				if (providerInfo && providerInfo.icon) {
					icon = <Icon name={providerInfo.icon!}></Icon>;
				}
			}
		}
		let text = review.pullRequestTitle;
		if (text == null) {
			text = review.pullRequestUrl;
		}
		return (
			<Meta>
				<MetaLabel>Pull Request</MetaLabel>
				<MetaDescription>
					<MetaDescriptionForAssignees>
						<MetaPullRequest>
							<Tooltip title="View this Pull Request" placement="bottom" delay={1}>
								<a
									href="#"
									onClick={e => {
										e.preventDefault();
										e.stopPropagation();

										// FIXME github*com
										if (
											review.pullRequestProviderId === "github*com" ||
											review.pullRequestProviderId === "github/enterprise"
										) {
											HostApi.instance
												.send(ExecuteThirdPartyRequestUntypedType, {
													method: "getPullRequestIdFromUrl",
													providerId: review.pullRequestProviderId,
													params: {
														url: review.pullRequestUrl
													}
												})
												.then((id: any) => {
													if (id) {
														dispatch(setCurrentReview(""));
														dispatch(setCurrentPullRequest(review.pullRequestProviderId!, id));
													} else {
														HostApi.instance.send(OpenUrlRequestType, {
															url: review.pullRequestUrl!
														});
													}
												})
												.catch(e => {
													HostApi.instance.send(OpenUrlRequestType, {
														url: review.pullRequestUrl!
													});
												});
										} else {
										}
									}}
								>
									{icon}
									{text}
								</a>
							</Tooltip>
						</MetaPullRequest>
					</MetaDescriptionForAssignees>
				</MetaDescription>
			</Meta>
		);
	};

	return (
		<MinimumWidthCard {...getCardProps(props)} noCard={!props.collapsed}>
			<CardBody>
				{props.collapsed && (
					<BaseReviewHeader
						review={review}
						collapsed={props.collapsed}
						setIsEditing={props.setIsEditing}
						setIsAmending={props.setIsAmending}
					/>
				)}
				{!props.collapsed && (
					<ExpandedAuthor>
						Opened
						<Timestamp relative time={props.review.createdAt} /> by{" "}
						<HeadshotName person={derivedState.author} highlightMe />
					</ExpandedAuthor>
				)}

				{props.headerError && props.headerError.message && (
					<div
						className="color-warning"
						style={{
							display: "flex",
							padding: "10px 0",
							whiteSpace: "normal",
							alignItems: "flex-start"
						}}
					>
						<Icon name="alert" />
						<div style={{ paddingLeft: "10px" }}>{props.headerError.message}</div>
						{canLocateRepo && singleRepo && (
							<LocateRepoButton
								repoId={singleRepo.id}
								repoName={singleRepo.repoName}
								callback={success => {
									if (
										success &&
										props.onRequiresCheckPreconditions &&
										typeof props.onRequiresCheckPreconditions === "function"
									) {
										props.onRequiresCheckPreconditions(success);
									}
								}}
							></LocateRepoButton>
						)}
					</div>
				)}

				<MetaSection>
					{review.pullRequestUrl && renderPullRequest()}
					{props.review.text && (
						<Meta>
							<MetaLabel>Description</MetaLabel>
							<MarkdownText text={props.review.text} />
						</Meta>
					)}
					{!props.collapsed && (hasTags || hasReviewers) && (
						<MetaRow>
							{hasTags && (
								<Meta>
									<MetaLabel>Tags</MetaLabel>
									<MetaDescriptionForTags>
										{props.tags!.map(tag => (
											<Tag tag={tag} key={tag.id} />
										))}
									</MetaDescriptionForTags>
								</Meta>
							)}
							{hasReviewers && (
								<Meta>
									<MetaLabel>Reviewers{approvalLabel}</MetaLabel>
									<MetaDescriptionForTags>
										{props.reviewers!.map(reviewer => {
											const addThumbsUp = approvedBy[reviewer.id] ? true : false;
											return (
												<HeadshotName
													key={reviewer.id}
													person={reviewer}
													highlightMe
													addThumbsUp={addThumbsUp}
												/>
											);
										})}
									</MetaDescriptionForTags>
								</Meta>
							)}
						</MetaRow>
					)}
					{!props.collapsed && hasChangeRequests && (
						<Meta id="change-requests">
							<MetaLabel>Change Requests</MetaLabel>
							<MetaDescriptionForAssignees>
								{props.changeRequests!.map(codemark => {
									const text = codemark.title || codemark.text;
									const formattedText = text.length > 80 ? `${text.substring(0, 77)}...` : text;

									return (
										<MetaCheckboxWithHoverIcon key={codemark.id}>
											<Checkbox
												noMargin
												name={codemark.id}
												checked={codemark.status === CodemarkStatus.Closed}
												onChange={value => {
													dispatch(setCodemarkStatus(codemark.id, value ? "closed" : "open"));
												}}
												onClickLabel={() => dispatch(setCurrentCodemark(codemark.id))}
											>
												<MarkdownText text={formattedText} />
											</Checkbox>
											<Icon
												title="Show request details"
												placement="bottom"
												delay={1}
												name="link-external"
												className="clickable"
												onClick={() => dispatch(setCurrentCodemark(codemark.id))}
											/>
										</MetaCheckboxWithHoverIcon>
									);
								})}
							</MetaDescriptionForAssignees>
						</Meta>
					)}
					{!props.collapsed && (
						<Meta>
							<MetaLabel>Repository</MetaLabel>
							<MetaDescription>
								<MetaDescriptionForAssignees>
									{props.repoInfo.map(r => (
										<MetaRepoInfo key={r.repoName}>
											<RepoInfo>
												<span>
													<Icon name="repo" />
													{r.repoName}
												</span>
												<span>
													<Icon name="git-branch" />
													{r.branch}
												</span>
											</RepoInfo>
										</MetaRepoInfo>
									))}
								</MetaDescriptionForAssignees>
							</MetaDescription>
						</Meta>
					)}
					{!props.collapsed && (
						<TourTip title={props.filesTip} placement="top">
							<Meta id="changed-files">
								<MetaLabel>
									{numCheckpoints > 1 && (
										<DropdownButton variant="text" items={dropdownItems}>
											{dropdownLabel}
										</DropdownButton>
									)}
									{numCheckpoints <= 1 && <span>Changed Files</span>}
									{props.canStartReview && numFiles > 1 && (
										<MetaIcons>
											<Icon
												onClick={nextFile}
												name="arrow-down"
												className="clickable"
												placement="top"
												delay={1}
												title={
													derivedState.isInVscode && (
														<span>
															Next File{" "}
															<span className="keybinding">{nextFileKeyboardShortcut()}</span>
														</span>
													)
												}
											/>
											<Icon
												onClick={prevFile}
												name="arrow-up"
												className="clickable"
												placement="top"
												delay={1}
												title={
													derivedState.isInVscode && (
														<span>
															Previous File{" "}
															<span className="keybinding">{previousFileKeyboardShortcut()}</span>
														</span>
													)
												}
											/>
										</MetaIcons>
									)}
								</MetaLabel>
								<MetaDescriptionForAssignees>
									<ChangesetFileList
										review={review}
										checkpoint={checkpoint}
										repoRoots={props.repoRoots}
										loading={
											props.headerError && props.headerError.message ? false : !props.canStartReview
										}
										noOnClick={!props.canStartReview}
										withTelemetry={true}
									/>
								</MetaDescriptionForAssignees>
							</Meta>
						</TourTip>
					)}
					{!props.collapsed && checkpoint !== undefined && (
						<Meta id={"commits-update-" + checkpoint}>
							<MetaLabel>
								Commits in {checkpoint === 0 ? "Initial Review" : `Update #${checkpoint}`}
							</MetaLabel>
							<MetaDescriptionForAssignees>
								<CommitList review={review} checkpoint={checkpoint} />
							</MetaDescriptionForAssignees>
						</Meta>
					)}
					{!props.collapsed && checkpoint === undefined && renderCommitList()}
				</MetaSection>
				{props.collapsed && renderMetaSectionCollapsed(props)}
			</CardBody>
			{renderedFooter}
		</MinimumWidthCard>
	);
};

const renderMetaSectionCollapsed = (props: BaseReviewProps) => {
	const { approvedBy = {} } = props.review;
	if (!props.isFollowing && !props.tags && !props.reviewers && props.review.numReplies == 0)
		return null;
	return (
		<>
			<MetaSectionCollapsed>
				{props.tags && (
					<>
						{props.tags!.map(tag => (
							<Tag tag={tag} key={tag.id} />
						))}
						<div style={{ width: "5px" }} />
					</>
				)}
				{props.isFollowing && (
					<span>
						<Icon
							className="detail-icon"
							title="You are following this review"
							placement="bottomLeft"
							align={{ offset: [-18, 4] }}
							name="eye"
						/>
					</span>
				)}
				{props.review.numReplies > 0 && (
					<Tooltip title="Show replies" placement="bottom">
						<span className="detail-icon">
							<Icon name="comment" /> {props.review.numReplies}
						</span>
					</Tooltip>
				)}
				{props.reviewers != null && (
					<MetaSectionCollapsedHeadshotArea>
						{props.reviewers.map(reviewer => {
							// this should never happen, but yet sometimes it does
							if (!reviewer) return null;
							const addThumbsUp = approvedBy[reviewer.id] ? true : false;
							const isMe = reviewer.id === props.currentUserId;
							return (
								<Tooltip
									key={reviewer.id}
									title={`${reviewer.username} ${
										addThumbsUp ? "approved this review" : "is a reviewer"
									}`}
									placement="bottomRight"
									align={{ offset: [10, 4] }}
								>
									<span>
										<HeadshotName
											className="no-padding"
											person={reviewer}
											size={20}
											highlightMe
											addThumbsUp={addThumbsUp}
											noName={!isMe}
										/>
									</span>
								</Tooltip>
							);
						})}
					</MetaSectionCollapsedHeadshotArea>
				)}
			</MetaSectionCollapsed>
		</>
	);
};

const ReplyInput = (props: { reviewId: string; parentPostId: string; streamId: string }) => {
	const dispatch = useDispatch<Dispatch>();
	const [text, setText] = React.useState("");
	const [isChangeRequest, setIsChangeRequest] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const teamMates = useSelector((state: CodeStreamState) => getTeamMates(state));

	const submit = async () => {
		// don't create empty replies
		if (text.length === 0) return;

		setIsLoading(true);
		if (isChangeRequest) {
			await dispatch(
				createCodemark({
					text: replaceHtml(text)!,
					parentPostId: props.parentPostId,
					type: CodemarkType.Comment,
					codeBlocks: [],
					assignees: [],
					relatedCodemarkIds: [],
					accessMemberIds: [],
					isChangeRequest: true,
					tags: [],
					isPseudoCodemark: true
				})
			);
		} else {
			await dispatch(
				createPost(
					props.streamId,
					props.parentPostId,
					replaceHtml(text)!,
					null,
					findMentionedUserIds(teamMates, text),
					{
						entryPoint: "Review"
					}
				)
			);
			setIsChangeRequest(false);
		}
		setIsLoading(false);
		setText("");
	};

	return (
		<>
			<MessageInput
				multiCompose
				text={text}
				placeholder="Add Comment..."
				onChange={setText}
				onSubmit={submit}
			/>
			<div style={{ display: "flex" }}>
				<div style={{ opacity: 0.7, paddingTop: "10px" }}>
					<Checkbox name="change-request" checked={isChangeRequest} onChange={setIsChangeRequest}>
						Change Request (require for approval)
					</Checkbox>
				</div>
				<div style={{ textAlign: "right", flexGrow: 1 }}>
					<Tooltip
						title={
							<span>
								Submit Comment
								<span className="keybinding extra-pad">
									{navigator.appVersion.includes("Macintosh") ? "⌘" : "Alt"} ENTER
								</span>
							</span>
						}
						placement="bottomRight"
						delay={1}
					>
						<Button
							style={{
								// fixed width to handle the isLoading case
								width: "100px",
								margin: "10px 0",
								float: "right"
							}}
							className={cx("control-button", { cancel: text.length === 0 })}
							type="submit"
							disabled={text.length === 0}
							onClick={submit}
							loading={isLoading}
						>
							{isChangeRequest ? "Request Change" : "Add Comment"}
						</Button>
					</Tooltip>
				</div>
			</div>
		</>
	);
};

type FromBaseReviewProps = Pick<
	BaseReviewProps,
	| "collapsed"
	| "hoverEffect"
	| "onClick"
	| "className"
	| "renderFooter"
	| "filesTip"
	| "isAmending"
	| "setIsAmending"
>;

interface PropsWithId extends FromBaseReviewProps {
	id: string;
}

interface PropsWithReview extends FromBaseReviewProps {
	review: CSReview;
}

function isPropsWithId(props: PropsWithId | PropsWithReview): props is PropsWithId {
	return (props as any).id != undefined;
}

export type ReviewProps = PropsWithId | PropsWithReview;

const ReviewForReview = (props: PropsWithReview) => {
	const { review, ...baseProps } = props;
	let disposableDidChangeDataNotification: { dispose(): void };
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentTeamId: state.context.currentTeamId,
			currentUser: state.users[state.session.userId!],
			author: state.users[props.review.creatorId],
			repos: state.repos,
			userIsFollowing: (props.review.followerIds || []).includes(state.session.userId!),
			reviewers:
				props.review.reviewers != null
					? props.review.reviewers.map(id => state.users[id])
					: emptyArray,
			teamMates: getTeamMates(state),
			replies: props.collapsed ? emptyArray : getThreadPosts(state, review.streamId, review.postId),
			allUsers: state.users,
			teamTagsById: getTeamTagsHash(state)
		};
	}, shallowEqual);

	const [canStartReview, setCanStartReview] = React.useState(false);
	const [preconditionError, setPreconditionError] = React.useState<SimpleError>({
		message: "",
		type: ""
	});
	const [isEditing, setIsEditing] = React.useState(false);
	// const [isAmending, setIsAmending] = React.useState(false);
	const [shareModalOpen, setShareModalOpen] = React.useState(false);
	const [repoRoots, setRepoRoots] = React.useState<{ [repoId: string]: string } | undefined>();

	const tags = React.useMemo(
		() => (review.tags ? mapFilter(review.tags, id => derivedState.teamTagsById[id]) : emptyArray),
		[props.review, derivedState.teamTagsById]
	);

	const repoInfoById = React.useMemo(() => {
		const reviewRepos = new Map<string, any>();

		for (let changeset of review.reviewChangesets) {
			const repo = derivedState.repos[changeset.repoId];
			if (repo && !reviewRepos.has(changeset.repoId))
				reviewRepos.set(changeset.repoId, { repoName: repo.name, branch: changeset.branch });
		}

		return reviewRepos;
	}, [review, derivedState.repos]);

	const repoInfo = React.useMemo(() => {
		return [...repoInfoById.values()];
	}, [repoInfoById]);

	const changeRequests = useSelector((state: CodeStreamState) =>
		getReviewChangeRequests(state, review)
	);

	const webviewFocused = useSelector((state: CodeStreamState) => state.context.hasFocus);
	useDidMount(() => {
		if (!props.collapsed && webviewFocused) {
			HostApi.instance.track("Page Viewed", { "Page Name": "Review Details" });
		}
		return () => {
			// cleanup this disposable on unmount. it may or may not have been set.
			disposableDidChangeDataNotification && disposableDidChangeDataNotification.dispose();
		};
	});

	const checkPreconditions = async () => {
		let response = await HostApi.instance.send(CheckReviewPreconditionsRequestType, {
			reviewId: review.id
		});

		if (disposableDidChangeDataNotification) {
			// dispose of this if it already exists, we will create another if response is !success
			disposableDidChangeDataNotification.dispose();
		}
		if (!response.success && response.error) {
			setPreconditionError(response.error);
			setCanStartReview(false);

			disposableDidChangeDataNotification = HostApi.instance.on(
				DidChangeDataNotificationType,
				async (e: DidChangeDataNotification) => {
					if (e.type === ChangeDataType.Commits && !canStartReview) {
						// repo is a GitRepository-like	object
						const data = e.data as { repo: { id: string } };
						if (data && data.repo.id && repoInfoById && repoInfoById.has(data.repo.id)) {
							await checkPreconditions();
						}
					}
				}
			);
		} else {
			// need to clear the precondition error
			setPreconditionError({ message: "", type: "" });
			setRepoRoots(response.repoRoots);
			setCanStartReview(true);
		}
	};

	React.useEffect(() => {
		// don't check preconditions if we're looking at the collapsed version of the
		// review (in the feed), but rather only when expanded (details view)
		if (props.collapsed) return;

		checkPreconditions();
	}, [review]);

	const renderFooter =
		props.renderFooter ||
		((Footer, InputContainer) => {
			if (props.collapsed) return null;

			return (
				<Footer style={{ borderTop: "none", marginTop: 0 }}>
					{derivedState.replies.length > 0 && <MetaLabel>Activity</MetaLabel>}
					<RepliesToPost streamId={props.review.streamId} parentPostId={props.review.postId} />
					{InputContainer && !props.isAmending && (
						<InputContainer>
							<ReplyInput
								reviewId={review.id}
								parentPostId={review.postId}
								streamId={review.streamId}
							/>
						</InputContainer>
					)}
					{InputContainer && props.isAmending && (
						<InputContainer>
							<ReviewForm
								isEditing
								isAmending
								editingReview={review}
								onClose={() => props.setIsAmending && props.setIsAmending(false)}
							/>
							{/* spacer div that allows this to scroll all the way to the top.
							 * note that it's not 100vh so that at least *some* content is always visible */}
							<div style={{ height: "80vh" }} />
						</InputContainer>
					)}
				</Footer>
			);
		});

	if (shareModalOpen)
		return <SharingModal review={props.review!} onClose={() => setShareModalOpen(false)} />;
	if (isEditing && !props.isAmending) {
		return (
			<ReviewForm
				isEditing={isEditing}
				onClose={() => setIsEditing(false)}
				editingReview={props.review}
			/>
		);
	} else {
		return (
			<BaseReview
				{...baseProps}
				review={props.review}
				repoInfo={repoInfo}
				repoInfoById={repoInfoById}
				tags={tags}
				changeRequests={changeRequests}
				isFollowing={derivedState.userIsFollowing}
				reviewers={derivedState.reviewers}
				currentUserId={derivedState.currentUser.id}
				renderFooter={renderFooter}
				setIsEditing={setIsEditing}
				setIsAmending={props.setIsAmending}
				headerError={preconditionError}
				canStartReview={canStartReview}
				repoRoots={repoRoots}
				onRequiresCheckPreconditions={() => checkPreconditions()}
			/>
		);
	}
};

const ReviewForId = (props: PropsWithId) => {
	const { id, ...otherProps } = props;

	const dispatch = useDispatch<Dispatch>();
	const review = useSelector((state: CodeStreamState) => {
		return getReview(state.reviews, id);
	});
	const [notFound, setNotFound] = React.useState(false);

	useDidMount(() => {
		let isValid = true;

		if (review == null) {
			dispatch(fetchReview(id))
				.then(result => {
					if (!isValid) return;
					if (result == null) setNotFound(true);
				})
				.catch(() => setNotFound(true));
		}

		return () => {
			isValid = false;
		};
	});

	if (notFound)
		return (
			<MinimumWidthCard>
				This review was not found. Perhaps it was deleted by the author, or you don't have
				permission to view it.
			</MinimumWidthCard>
		);

	if (review == null)
		return (
			<DelayedRender>
				<Loading />
			</DelayedRender>
		);

	return <ReviewForReview review={review} {...otherProps} />;
};

export const Review = (props: ReviewProps) => {
	if (isPropsWithId(props)) return <ReviewForId {...props} />;
	return <ReviewForReview {...props} />;
};
