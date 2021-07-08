import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { Link } from "../../Link";
import styled from "styled-components";
import copy from "copy-to-clipboard";
import { HostApi } from "../../../webview-api";
import { LocalFilesCloseDiffRequestType, OpenUrlRequestType } from "@codestream/protocols/webview";
import { closeAllModals } from "@codestream/webview/store/context/actions";
import { Switch } from "@codestream/webview/src/components/controls/Switch";
import { api, getMyPullRequests } from "../../../store/providerPullRequests/actions";
import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { PRError } from "../../PullRequestComponents";
import { CSMe, PullRequestQuery } from "@codestream/protocols/api";
import { CodeStreamState } from "@codestream/webview/store";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";
import { getCurrentProviderPullRequest } from "@codestream/webview/store/providerPullRequests/reducer";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import Tag from "../../Tag";
import { confirmPopup } from "../../Confirm";
import Timestamp, { workingHoursTimeEstimate } from "../../Timestamp";
import { PRHeadshot } from "@codestream/webview/src/components/Headshot";
import { PRProgress, PRProgressFill, PRProgressLine } from "../../PullRequestFilesChangedList";
import { Circle } from "../../PullRequestConversationTab";
import Tooltip from "../../Tooltip";
import { GitLabMergeRequest } from "@codestream/protocols/agent";
import cx from "classnames";
import { pluralize } from "@codestream/webview/utilities/strings";
import * as providerSelectors from "../../../store/providers/reducer";
import { FetchProviderDefaultPullRequestsType } from "@codestream/protocols/agent";
import { useDidMount } from "@codestream/webview/utilities/hooks";

const Right = styled.div`
	width: 48px;
	height: 100%;
	position: fixed;
	top: 0;
	right: 0;
	background-color: rgba(127, 127, 127, 0.1);
	background-color: var(--app-tab-backgound);
	z-index: 30;
	transition: width 0.2s;
	&.expanded {
		width: 250px;
		max-width: 100vw;
		border-left: 1px solid (--base-border-color);
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
		padding: 0;
	}
	a {
		color: var(--text-color) !important;
		&:hover {
			text-decoration: underline !important;
		}
	}
	label {
		color: var(--text-color-highlight);
	}
	.spin {
		vertical-align: 3px;
	}
	overflow: auto;
	&::-webkit-scrollbar {
		display: none;
	}
	&.jetbrains {
		border-left: 1px solid var(--base-border-color);
	}
`;

const AsideBlock = styled.div`
	height: 48px;
	width: 100%;
	position: relative;
	flex-direction: column;
	place-items: center;
	justify-content: center;
	overflow: hidden;
	.expanded & {
		justify-content: inherit;
		place-items: normal;
		height: auto;
		padding: 15px;
	}
	.expanded &.clickable {
		cursor: pointer;
		label {
			cursor: pointer;
		}
	}
	display: flex;
	.icon {
		opacity: 0.7;
		&.fixed {
			position: absolute;
			top: 15px;
			right: 15px;
		}
	}
	.collapsed & {
		cursor: pointer;
	}
	.expanded &.clickable:hover,
	.collapsed &:hover {
		.icon {
			opacity: 1;
			color: var(--text-color-highlight);
		}
		backdrop-filter: brightness(97%);
	}
	.vscode-dark .expanded &.clickable:hover,
	.vscode-dark .collapsed &:hover {
		backdrop-filter: brightness(120%);
	}
	.expanded & + & {
		border-top: 1px solid var(--base-border-color);
	}
`;

const HR = styled.div`
	width: 100%;
	height: 1px;
	background: var(--base-border-color);
`;

const JustifiedRow = styled.div`
	display: flex;
	align-items: center;
	width: 100%;
	> :nth-child(1) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding-right: 5px;
	}
	> :nth-child(2) {
		margin-left: auto;
		flex-grow: 0;
		flex-shrink: 0;
	}
`;

const Subtle = styled.span`
	padding-top: 5px;
	color: var(--text-color-subtle);
	a {
		color: var(--text-color-subtle) !important;
	}
`;

const IconWithLabel = styled.div`
	text-align: center;
	max-width: 100%;
	> div {
		text-align: center;
		font-size: 10px;
		opacity: 0.7;
		padding: 0 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

export const ButtonRow = styled.div`
	display: flex;
	justify-content: stretch;
	margin: 0 -5px;
	button {
		width: calc(50% - 10px);
		margin: 0 5px;
		white-space: nowrap;
		text-align: left;
	}
`;

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
const EMPTY_ARRAY_2 = [];
const EMPTY_ARRAY_3 = [];

export const RightActionBar = (props: {
	pr: GitLabMergeRequest;
	rightOpen: any;
	setRightOpen: any;
	setIsLoadingMessage: any;
	onRefreshClick: Function;
}) => {
	const { pr, rightOpen, setRightOpen, setIsLoadingMessage } = props;
	const dispatch = useDispatch();

	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const teamSettings = team.settings ? team.settings : (EMPTY_HASH as any);
		const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;
		const skipGitEmailCheck = state.preferences.skipGitEmailCheck;
		const addBlameMapEnabled = isFeatureEnabled(state, "addBlameMap");
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const { preferences, ide } = state;
		const prConnectedProviders = providerSelectors.getConnectedSupportedPullRequestHosts(state);

		return {
			defaultMergeMethod: preferences.lastPRMergeMethod || "SQUASH",
			currentUser,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			blameMap,
			currentPullRequest: currentPullRequest,
			team,
			skipGitEmailCheck,
			addBlameMapEnabled,
			isInVscode: ide.name === "VSC",
			isInJetBrains: ide.name === "JETBRAINS",
			supportsReviewers:
				currentPullRequest?.conversations?.project?.mergeRequest?.supports?.reviewers,
			supportsMultipleAssignees: teamSettings.gitLabMultipleAssignees,
			supportsMultipleReviewers: teamSettings.gitLabMultipleAssignees,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			pullRequestQueries: state.preferences.pullRequestQueries,
			PRConnectedProviders: prConnectedProviders,
			allRepos:
				preferences.pullRequestQueryShowAllRepos == null
					? true
					: preferences.pullRequestQueryShowAllRepos
		};
	});

	const [availableLabels, setAvailableLabels] = useState<any[] | undefined>(undefined);
	const [availableReviewers, setAvailableReviewers] = useState(EMPTY_ARRAY_2);

	const [availableAssignees, setAvailableAssignees] = useState(EMPTY_ARRAY_3);
	const [availableMilestones, setAvailableMilestones] = useState<[] | undefined>();
	const [defaultQueries, setDefaultQueries] = React.useState({});

	useDidMount(() => {
		(async () => {
			const defaultQueriesResponse: any = (await HostApi.instance.send(
				FetchProviderDefaultPullRequestsType,
				{}
			)) as any;
			if (defaultQueriesResponse) {
				setDefaultQueries(defaultQueriesResponse);
			}
		})();
	});

	const close = () => {
		HostApi.instance.send(LocalFilesCloseDiffRequestType, {});
		dispatch(closeAllModals());
	};

	const fetchPRs = async () => {
		for (const connectedProvider of derivedState.PRConnectedProviders) {
			if (connectedProvider.id === derivedState.currentPullRequestProviderId) {
				try {
					if (derivedState.pullRequestQueries || defaultQueries[connectedProvider.id]) {
						const options = { force: true, alreadyLoading: false };

						const providerQuery: PullRequestQuery[] =
							derivedState.pullRequestQueries &&
							derivedState.pullRequestQueries[connectedProvider.id]
								? derivedState.pullRequestQueries[connectedProvider.id]
								: defaultQueries[connectedProvider.id];
						const queryStrings = Object.values(providerQuery).map(_ => _.query);

						await dispatch(
							getMyPullRequests(
								connectedProvider.id,
								queryStrings,
								!derivedState.allRepos,
								options,
								true
							)
						);
					}
				} catch (error) {
					console.error(error);
				}
			}
		}
	};

	const fetchAvailableAssignees = async (e?) => {
		if (availableAssignees === undefined) {
			setAvailableAssignees(EMPTY_ARRAY);
		}
		const assignees = (await dispatch(api("getReviewers", {}))) as any;
		setAvailableAssignees(assignees.users);
	};

	const assigneeMenuItems = React.useMemo(() => {
		if (
			availableAssignees === undefined &&
			derivedState.currentPullRequest &&
			derivedState.currentPullRequest.error &&
			derivedState.currentPullRequest.error.message
		) {
			return [
				{
					label: (
						<PRError>
							<Icon name="alert" />
							<div>{derivedState.currentPullRequest.error.message}</div>
						</PRError>
					),
					noHover: true
				}
			];
		}
		const assigneeIds = pr.assignees.nodes.map(_ =>
			// just in case this is a number and not a string
			parseInt((_.id + "").replace("gid://gitlab/User/", ""), 10)
		);
		if (availableAssignees && availableAssignees.length) {
			const menuItems = availableAssignees.map((_: any) => {
				const checked = assigneeIds.includes(_.id);
				return {
					checked,
					label: <PRHeadshotName person={{ ..._, user: _.login }} className="no-padding" />,
					subtle: _.name,
					searchLabel: `${_.login}:${_.name}`,
					key: _.id,
					action: () => {
						if (derivedState.supportsMultipleAssignees) {
							const newAssignees = assigneeIds.filter(id => id !== _.id);
							if (!checked) newAssignees.unshift(_.id);
							setAssignees(newAssignees);
						} else {
							// since only single assignees are supported, if we're selecting
							// yourself and you're already assigned, remove it
							setAssignees(assigneeIds.includes(_.id) ? [] : [_.id]);
						}
					}
				} as any;
			});
			menuItems.unshift({
				checked: assigneeIds.length === 0,
				label: "Unassigned",
				key: "unassigned",
				action: () => setAssignees([])
			});
			menuItems.unshift({ type: "search", placeholder: "Type or choose a name" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Assignees...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableAssignees, pr]);

	const setAssignees = async (ids: number[]) => {
		setIsLoadingMessage("Setting Assignee...");
		await dispatch(api("setAssigneeOnPullRequest", { ids }));
		setIsLoadingMessage("");
		await new Promise(resolve => {
			setTimeout(resolve, 2000);
		});
		fetchPRs();
	};

	const fetchAvailableReviewers = async (e?) => {
		if (availableReviewers === undefined) {
			setAvailableReviewers(EMPTY_ARRAY);
		}
		const reviewers = (await dispatch(api("getReviewers", {}))) as any;
		setAvailableReviewers(reviewers.users);
	};

	const reviewerMenuItems = React.useMemo(() => {
		if (
			availableReviewers === undefined &&
			derivedState.currentPullRequest &&
			derivedState.currentPullRequest.error &&
			derivedState.currentPullRequest.error.message
		) {
			return [
				{
					label: (
						<PRError>
							<Icon name="alert" />
							<div>{derivedState.currentPullRequest.error.message}</div>
						</PRError>
					),
					noHover: true
				}
			];
		}
		const reviewerIds =
			pr?.reviewers?.nodes?.map((
				_ // just in case this is a number and not a string
			) => parseInt((_.id + "").replace("gid://gitlab/User/", ""), 10)) || [];
		if (availableReviewers && availableReviewers.length) {
			const menuItems = availableReviewers.map((_: any) => {
				const checked = reviewerIds.includes(_.id);
				return {
					checked,
					label: <PRHeadshotName person={{ ..._, user: _.login }} className="no-padding" />,
					subtle: _.name,
					searchLabel: `${_.login}:${_.name}`,
					key: _.id,
					action: () => {
						if (derivedState.supportsMultipleReviewers) {
							const newReviewers = reviewerIds.filter(id => id !== _.id);
							if (!checked) newReviewers.unshift(_.id);
							setReviewers(newReviewers);
						} else {
							setReviewers(reviewerIds.includes(_.id) ? [] : [_.id]);
						}
					}
				} as any;
			});
			menuItems.unshift({
				checked: reviewerIds.length === 0,
				label: "Unassigned",
				key: "unassigned",
				action: () => setReviewers([])
			});
			menuItems.unshift({ type: "search", placeholder: "Type or choose a name" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Reviewers...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableReviewers, pr]);

	const setReviewers = async (ids: number[]) => {
		setIsLoadingMessage("Updating Reviewer...");
		await dispatch(api("setReviewersOnPullRequest", { ids }));
		setIsLoadingMessage("");
		await new Promise(resolve => {
			setTimeout(resolve, 2000);
		});
		fetchPRs();
	};

	const fetchAvailableMilestones = async (e?) => {
		const milestones = (await dispatch(api("getMilestones", {}))) as any;
		setAvailableMilestones(milestones);
	};

	const milestoneMenuItems = React.useMemo(() => {
		if (availableMilestones && availableMilestones.length) {
			const existingMilestoneId = pr.milestone ? pr.milestone.id : "";
			const menuItems = availableMilestones.map((_: any) => {
				const checked =
					existingMilestoneId === `gid://gitlab/Milestone/${_.id}` || existingMilestoneId === _.id;
				return {
					checked,
					label: _.title,
					searchLabel: _.title,
					key: _.id,
					subtext: _.dueOn && (
						<>
							Due by
							<Timestamp time={_.dueOn} dateOnly />
						</>
					),
					action: () => setMilestone(_.id)
				};
			}) as any;
			menuItems.unshift({ type: "search", placeholder: "Filter Milestones" });
			menuItems.push({ label: "-", searchLabel: "" });
			menuItems.push({
				label: "No milestone",
				searchLabel: "",
				checked: false,
				action: () => setMilestone("")
			});
			return menuItems;
		} else if (availableMilestones) {
			return [
				{ label: <LoadingMessage noIcon>No milestones found</LoadingMessage>, noHover: true }
			];
		} else {
			return [{ label: <LoadingMessage>Loading Milestones...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableMilestones, pr]);

	const setMilestone = async (id: string) => {
		setIsLoadingMessage(id ? "Setting Milestone..." : "Clearing Milestone...");
		await dispatch(
			api("toggleMilestoneOnPullRequest", {
				milestoneId: id
			})
		);
		setIsLoadingMessage("");
		await new Promise(resolve => {
			setTimeout(resolve, 2000);
		});
		fetchPRs();
	};

	const fetchAvailableLabels = async (e?) => {
		const labels = (await dispatch(api("getLabels", {}))) as any;
		setAvailableLabels(labels);
	};

	const labelMenuItems = React.useMemo(() => {
		if (availableLabels && availableLabels.length) {
			const existingLabelIds = pr.labels ? pr.labels.nodes.map(_ => _.id) : [];
			const menuItems = availableLabels.map((_: any) => {
				const checked =
					existingLabelIds.includes(_.id) ||
					existingLabelIds.includes(`gid://gitlab/ProjectLabel/${_.id}`);
				return {
					checked,
					label: (
						<>
							<Circle style={{ backgroundColor: `${_.color}` }} />
							{_.title}
						</>
					),
					searchLabel: _.title,
					key: _.id,
					subtext: <div style={{ maxWidth: "250px", whiteSpace: "normal" }}>{_.description}</div>,
					action: () => setLabel(`gid://gitlab/ProjectLabel/${_.id}`, !checked)
				};
			}) as any;
			menuItems.unshift({ type: "search", placeholder: "Filter labels" });
			return menuItems;
		} else if (availableLabels) {
			return [
				{
					label: "Manage Labels",
					action: () => {
						HostApi.instance.send(OpenUrlRequestType, {
							url: `${pr.repository.url}/-/labels`
						});
						setAvailableLabels(undefined);
					}
				}
			];
		} else {
			return [{ label: <LoadingMessage>Loading Labels...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableLabels, pr]);

	const setLabel = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Label..." : "Removing Label...");

		await dispatch(
			api("setLabelOnPullRequest", {
				labelIds: onOff
					? [id].concat(pr.labels.nodes.map(_ => _.id))
					: pr.labels.nodes.map(_ => _.id).filter(_ => _ !== id)
			})
		);
		setIsLoadingMessage("");
		await new Promise(resolve => {
			setTimeout(resolve, 2000);
		});
		fetchPRs();
	};

	const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
	const setNotificationsOn = async (onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Subscribing..." : "Unsubscribing...");
		setIsLoadingNotifications(true);
		await dispatch(api("updatePullRequestSubscription", { onOff }));
		setIsLoadingNotifications(false);
		setIsLoadingMessage("");
	};

	const openAssignees = () => setRightOpen(true);
	const openReviewers = () => setRightOpen(true);
	const openMilestone = () => setRightOpen(true);
	const openTimeTracking = () => setRightOpen(true);
	const openLabels = () => setRightOpen(true);
	const openLock = () => {
		setRightOpen(true);
		if (pr.discussionLocked) {
			confirmPopup({
				message: (
					<>
						Unlock this merge request? <b>Everyone</b> will be able to comment.
					</>
				),
				buttons: [
					{ label: "Cancel", className: "control-button" },
					{
						label: "Unlock",
						className: "delete",
						action: async () => {
							setIsLoadingMessage("Unlocking...");
							await dispatch(api("unlockPullRequest", {}));
							setIsLoadingMessage("");
							await new Promise(resolve => {
								setTimeout(resolve, 2000);
							});
							fetchPRs();
						}
					}
				]
			});
		} else {
			confirmPopup({
				message: (
					<>
						Lock this merge request? Only <b>project members</b> will be able to comment.
					</>
				),
				buttons: [
					{ label: "Cancel", className: "control-button" },
					{
						label: "Lock",
						className: "delete",
						action: async () => {
							setIsLoadingMessage("Locking...");
							await dispatch(api("lockPullRequest", {}));
							setIsLoadingMessage("");
							await new Promise(resolve => {
								setTimeout(resolve, 2000);
							});
							fetchPRs();
						}
					}
				]
			});
		}
	};

	const hasToDo =
		pr.supports.currentUserTodos && pr.currentUserTodos
			? pr.currentUserTodos.nodes.find(_ => _.state === "pending")
			: false;
	const [isLoadingToDo, setIsLoadingToDo] = useState(false);
	const toggleToDo = async () => {
		setIsLoadingMessage(hasToDo ? "Marking as done..." : "Adding to do...");
		setIsLoadingToDo(true);
		if (hasToDo) await dispatch(api("markToDoDone", { id: hasToDo.id }));
		else await dispatch(api("createToDo", {}));
		setIsLoadingToDo(false);
		setIsLoadingMessage("");
		await new Promise(resolve => {
			setTimeout(resolve, 2000);
		});
		fetchPRs();
	};

	const reference = pr.url;
	const sourceBranch = pr.sourceBranch;
	const numLabels = pr.labels ? pr.labels.nodes.length : 0;
	const numParticipants = pr.participants ? pr.participants.nodes.length : 0;
	const timeSpent = workingHoursTimeEstimate(pr.totalTimeSpent, true);
	const timeEstimate = workingHoursTimeEstimate(pr.timeEstimate, true);
	const pct = pr.timeEstimate > 0 ? (100 * pr.totalTimeSpent) / pr.timeEstimate : 0;
	const milestoneTooltip = React.useMemo(() => {
		const { milestone } = pr;
		if (!milestone) return "Milestone";
		if (milestone.dueDate)
			return (
				<div style={{ textAlign: "center" }}>
					<div style={{ textAlign: "center" }}>{milestone.title}</div>
					{milestone.dueDate}
				</div>
			);
		else return milestone.title;
	}, [pr.milestone]);

	const [isLoading, setIsLoading] = useState(false);
	const refresh = async () => {
		setIsLoading(true);
		await props.onRefreshClick("Refreshing...");
		setIsLoading(false);
	};

	return (
		<Right
			className={cx(rightOpen ? "expanded" : "collapsed", {
				jetbrains: derivedState.isInJetBrains
			})}
		>
			{rightOpen ? (
				<>
					<AsideBlock onClick={close} className="clickable">
						<JustifiedRow>
							<label>Close MR view</label>
							<Icon className="clickable" name="x" />
						</JustifiedRow>
					</AsideBlock>
					<AsideBlock onClick={refresh} className="clickable">
						<JustifiedRow>
							<label>Refresh MR</label>
							<Icon className={isLoading ? "clickable spin" : "clickable"} name="sync" />
						</JustifiedRow>
					</AsideBlock>
					<AsideBlock onClick={() => setRightOpen(false)} className="clickable">
						<JustifiedRow>
							<label>Collapse Sidebar</label>
							<Icon className="clickable" name="chevron-right-thin" />
						</JustifiedRow>
					</AsideBlock>
					{pr.supports.currentUserTodos && (
						<AsideBlock onClick={toggleToDo} className="clickable">
							<JustifiedRow>
								<label>{hasToDo ? "Mark as done" : "Add a to do"}</label>
								<Icon
									className="clickable"
									name={hasToDo ? "checked-checkbox" : "checkbox-add"}
									title={hasToDo ? "Mark as done" : "Add a to do"}
									placement="left"
								/>
							</JustifiedRow>
						</AsideBlock>
					)}
				</>
			) : (
				<>
					<AsideBlock onClick={close}>
						<Icon className="clickable fixed" name="x" title="Close MR view" placement="left" />
					</AsideBlock>
					<HR />
					<AsideBlock onClick={refresh}>
						<Icon
							className={isLoading ? "clickable fixed spin" : "clickable fixed"}
							title="Refresh"
							placement="left"
							name="sync"
						/>
					</AsideBlock>
					<HR />
					<AsideBlock onClick={() => setRightOpen(true)}>
						<Icon
							className="clickable fixed"
							title="Expand sidebar"
							placement="left"
							name="chevron-left-thin"
						/>
					</AsideBlock>
					{pr.supports.currentUserTodos && (
						<>
							<HR />
							<AsideBlock onClick={() => toggleToDo()}>
								{isLoadingToDo ? (
									<Icon className="clickable spin" name="sync" />
								) : (
									<Icon
										className="clickable fixed"
										name={hasToDo ? "checked-checkbox" : "checkbox-add"}
										title={hasToDo ? "Mark as done" : "Add a to do"}
										placement="left"
									/>
								)}
							</AsideBlock>
						</>
					)}
				</>
			)}
			<AsideBlock onClick={() => !rightOpen && openAssignees()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>{pluralize("Assignee", pr.assignees)}</label>
							{pr?.userPermissions?.canAssign && (
								<Link onClick={openAssignees}>
									<InlineMenu
										items={assigneeMenuItems}
										onOpen={fetchAvailableAssignees}
										title="Assign to"
										noChevronDown
										noFocusOnSelect
									>
										Edit
									</InlineMenu>
								</Link>
							)}
						</JustifiedRow>
						<Subtle>
							{pr.assignees && pr.assignees.nodes.length > 0 ? (
								pr.assignees.nodes.map((_: any, index: number) => (
									<span key={index}>
										<PRHeadshotName key={_.avatarUrl} person={_} size={20} />
										<br />
									</span>
								))
							) : (
								<>
									None -{" "}
									<a
										onClick={() =>
											setAssignees([parseInt(pr.viewer.id.replace("gid://gitlab/User/", ""), 10)])
										}
									>
										assign yourself
									</a>
								</>
							)}
						</Subtle>
					</>
				) : pr.assignees && pr.assignees.nodes.length && pr.assignees.nodes[0] ? (
					<Tooltip title={pr.assignees.nodes[0].name} placement="left">
						<span>
							<PRHeadshot person={pr.assignees.nodes[0]} size={20} />
						</span>
					</Tooltip>
				) : (
					<Icon className="clickable" name="person" title="Assignee(s)" placement="left" />
				)}
			</AsideBlock>
			{derivedState.supportsReviewers && (
				<AsideBlock onClick={() => !rightOpen && openReviewers()}>
					{rightOpen ? (
						<>
							<JustifiedRow>
								<label>{pluralize("Reviewer", pr.reviewers)}</label>
								<Link onClick={openReviewers}>
									<InlineMenu
										items={reviewerMenuItems}
										onOpen={fetchAvailableReviewers}
										title="Request review"
										noChevronDown
										noFocusOnSelect
									>
										Edit
									</InlineMenu>
								</Link>
							</JustifiedRow>
							<Subtle>
								{pr.reviewers && pr.reviewers.nodes && pr.reviewers.nodes.length > 0 ? (
									pr.reviewers.nodes!.map((_: any, index: number) => (
										<span key={index}>
											<PRHeadshotName key={_.avatarUrl} person={_} size={20} />
											<br />
										</span>
									))
								) : (
									<>None</>
								)}
							</Subtle>
						</>
					) : pr.reviewers &&
					  pr.reviewers.nodes &&
					  pr.reviewers.nodes.length &&
					  pr.reviewers.nodes[0] ? (
						<Tooltip title={pr.reviewers!.nodes[0].name} placement="left">
							<span>
								<PRHeadshot person={pr.reviewers!.nodes[0]} size={20} />
							</span>
						</Tooltip>
					) : (
						<Icon className="clickable" name="person" title="Reviewer(s)" placement="left" />
					)}
				</AsideBlock>
			)}
			<AsideBlock onClick={() => !rightOpen && openMilestone()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Milestone</label>
							<InlineMenu
								items={milestoneMenuItems}
								onOpen={fetchAvailableMilestones}
								title="Set milestone"
								noChevronDown
								noFocusOnSelect
							>
								Edit
							</InlineMenu>
						</JustifiedRow>
						<Subtle>
							{pr.milestone && pr.milestone.title ? (
								<Link href={pr.milestone.webPath}>{pr.milestone.title}</Link>
							) : (
								"None"
							)}
						</Subtle>
					</>
				) : (
					<IconWithLabel>
						<Icon className="clickable" name="clock" title={milestoneTooltip} placement="left" />
						<div>{pr.milestone && pr.milestone.title ? pr.milestone.title : "None"}</div>
					</IconWithLabel>
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && openTimeTracking()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Time tracking</label>
							<span>
								<Icon
									name="info"
									onClick={() => {
										confirmPopup({
											title: "Track time with quick actions",
											message: (
												<>
													<p>
														Quick actions can be used in the issues description and comment boxes.
													</p>
													<p>
														<span className="monospace">/estimate</span> will update the estimated
														time with the latest command.
													</p>
													<p>
														<span className="monospace">/spend</span> will update the sum of the
														time spent.
													</p>
												</>
											),
											buttons: [
												{ label: "Done", className: "control-button" },
												{
													label: "Learn more",
													action: () => {
														HostApi.instance.send(OpenUrlRequestType, {
															url: `${props.pr.baseWebUrl}/help/user/project/time_tracking.md`
														});
													}
												}
											]
										});
									}}
								/>
							</span>
						</JustifiedRow>
						<Subtle>
							{!pr.timeEstimate && !pr.totalTimeSpent && "No estimate or time spent"}
							{!!pr.timeEstimate && !pr.totalTimeSpent && (
								<Subtle>Estimated: {timeEstimate}</Subtle>
							)}
							{!pr.timeEstimate && !!pr.totalTimeSpent && <Subtle>Spent: {timeSpent}</Subtle>}
							{!!pr.timeEstimate && !!pr.totalTimeSpent && (
								<>
									<PRProgress style={{ width: "100%", maxWidth: "none", margin: 0 }}>
										<PRProgressLine>
											{pct > 0 && <PRProgressFill style={{ width: pct + "%" }} />}
										</PRProgressLine>
									</PRProgress>
									<div style={{ display: "flex", marginTop: "5px" }}>
										<div>Spent {timeSpent}</div>
										<div style={{ marginLeft: "auto" }}>Est {timeEstimate}</div>
									</div>
								</>
							)}
						</Subtle>
					</>
				) : (
					<IconWithLabel>
						<Icon className="clickable" name="clock" title="Time tracking" placement="left" />
						<div>
							{pr.totalTimeSpent || pr.timeEstimate ? (
								<>
									{pr.totalTimeSpent ? timeSpent : "--"}/{pr.timeEstimate ? timeEstimate : "--"}
								</>
							) : (
								"None"
							)}
						</div>
					</IconWithLabel>
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && openLabels()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Labels</label>
							<InlineMenu
								items={labelMenuItems}
								onOpen={fetchAvailableLabels}
								title="Assign labels"
								noChevronDown
								noFocusOnSelect
							>
								Edit
							</InlineMenu>
						</JustifiedRow>
						<Subtle>
							{pr.labels && pr.labels.nodes.length > 0
								? pr.labels.nodes.map((_: any, index: number) => (
										<Tag key={index} tag={{ label: _.title, color: `${_.color}` }} />
								  ))
								: "None"}
						</Subtle>
					</>
				) : (
					<IconWithLabel>
						<Icon
							className="clickable"
							name="tag"
							title={numLabels > 0 ? pr.labels.nodes.map(_ => _.title).join(", ") : "Labels"}
							placement="left"
						/>
						{numLabels > 0 && <div>{numLabels}</div>}
					</IconWithLabel>
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && openLock()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Lock merge request</label>
							<Link onClick={openLock}>Edit</Link>
						</JustifiedRow>
						<Subtle>
							<Icon
								className="margin-right"
								name={pr.discussionLocked ? "lock" : "unlock"}
								title={pr.discussionLocked ? "Locked" : "Unlocked"}
								placement="left"
							/>
							{pr.discussionLocked ? "Locked" : "Unlocked"}
						</Subtle>
					</>
				) : (
					<Icon
						className="clickable"
						name={pr.discussionLocked ? "lock" : "unlock"}
						title={pr.discussionLocked ? "Locked" : "Unlocked"}
						placement="left"
					/>
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && setRightOpen(true)}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>
								{numParticipants === 1 ? "1 Participant" : `${numParticipants} Participants`}
							</label>
						</JustifiedRow>
						<Subtle>
							{pr.participants && pr.participants.nodes.length > 0
								? pr.participants.nodes.map((_: any, index: number) => (
										<span key={index}>
											<PRHeadshotName key={_.avatarUrl} person={_} size={20} />
											<br />
										</span>
								  ))
								: "None"}
						</Subtle>
					</>
				) : (
					<IconWithLabel>
						<Icon className="clickable" name="team" title="Participants" placement="left" />
						{numParticipants > 0 && <div>{numParticipants}</div>}
					</IconWithLabel>
				)}
			</AsideBlock>
			{!rightOpen && <HR />}
			<AsideBlock>
				{rightOpen ? (
					<JustifiedRow>
						<label>Notifications</label>
						<Switch on={pr.subscribed} onChange={() => setNotificationsOn(!pr.subscribed)} />
					</JustifiedRow>
				) : isLoadingNotifications ? (
					<Icon className="clickable spin" name="sync" />
				) : (
					<Icon
						onClick={() => setNotificationsOn(!pr.subscribed)}
						className="clickable"
						name={pr.subscribed ? "bell" : "bell-slash"}
						title={pr.subscribed ? "Notifications on" : "Notifications off"}
						placement="left"
					/>
				)}
			</AsideBlock>
			{rightOpen ? (
				<AsideBlock>
					<JustifiedRow>
						<div>
							<label>Reference: </label>
							{reference}
						</div>
						<Icon
							onClick={() => copy(reference)}
							className="clickable"
							name="copy"
							title="Copy reference"
							placement="left"
						/>
					</JustifiedRow>
					<div style={{ height: "10px" }} />
					<JustifiedRow>
						<div>
							<label>Source branch: </label>
							<span className="monospace">{sourceBranch}</span>
						</div>
						<Icon
							onClick={() => copy(sourceBranch)}
							className="clickable"
							name="copy"
							title="Copy branch name"
							placement="left"
						/>
					</JustifiedRow>
				</AsideBlock>
			) : (
				<>
					<AsideBlock onClick={() => copy(reference)}>
						<Icon className="clickable" name="copy" title="Copy reference" placement="left" />
					</AsideBlock>
					<AsideBlock onClick={() => copy(sourceBranch)}>
						<Icon className="clickable" name="copy" title="Copy branch name" placement="left" />
					</AsideBlock>
				</>
			)}
		</Right>
	);
};
