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
import { api } from "../../../store/providerPullRequests/actions";
import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { PRError } from "../../PullRequestComponents";
import { CSMe } from "@codestream/protocols/api";
import { CodeStreamState } from "@codestream/webview/store";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";
import { getCurrentProviderPullRequest } from "@codestream/webview/store/providerPullRequests/reducer";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import Tag from "../../Tag";
import { confirmPopup } from "../../Confirm";
import { distanceOfTimeInWords } from "../../Timestamp";
import { PRHeadshot } from "@codestream/webview/src/components/Headshot";
import { PRProgress, PRProgressFill, PRProgressLine } from "../../PullRequestFilesChangedList";

const Right = styled.div`
	width: 48px;
	height: 100%;
	position: fixed;
	top: 0;
	right: 0;
	background-color: rgba(127, 127, 127, 0.1);
	background-color: var(--sidebar-background);
	z-index: 30;
	transition: width 0.2s;
	&.expanded {
		width: 250px;
		max-width: 100vw;
		border-left: 1px solid (--base-border-color);
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
		padding: 0 15px;
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
`;

const AsideBlock = styled.div`
	height: 48px;
	width: 100%;
	display: flex;
	flex-direction: column;
	place-items: center;
	justify-content: center;
	overflow: hidden;
	.expanded & {
		justify-content: inherit;
		place-items: normal;
		padding: 15px 0;
		height: auto;
	}
	cursor: pointer;
	display: flex;
	.icon {
		opacity: 0.7;
	}
	.collapsed &:hover {
		.icon {
			opacity: 1;
			color: var(--text-color-highlight);
		}
		backdrop-filter: brightness(97%);
	}
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
		font-size: 11px;
		opacity: 0.7;
		padding: 0 5px;
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
		width: 50%;
		margin: 0 5px;
		white-space: nowrap;
	}
`;

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
const EMPTY_ARRAY_2 = [];
const EMPTY_ARRAY_3 = [];

export const RightActionBar = props => {
	const { pr, rightOpen, setRightOpen, setIsLoadingMessage } = props;
	const dispatch = useDispatch();

	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;
		const skipGitEmailCheck = state.preferences.skipGitEmailCheck;
		const addBlameMapEnabled = isFeatureEnabled(state, "addBlameMap");
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const { preferences, ide } = state;

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
			isInVscode: ide.name === "VSC"
		};
	});

	const [availableLabels, setAvailableLabels] = useState(EMPTY_ARRAY);
	const [availableReviewers, setAvailableReviewers] = useState(EMPTY_ARRAY_2);
	const [availableAssignees, setAvailableAssignees] = useState(EMPTY_ARRAY_3);
	const [availableProjects, setAvailableProjects] = useState<[] | undefined>();
	const [availableMilestones, setAvailableMilestones] = useState<[] | undefined>();
	const [lockOn, setLockOn] = useState<boolean>(pr.discussionLocked);

	const close = () => {
		HostApi.instance.send(LocalFilesCloseDiffRequestType, {});
		dispatch(closeAllModals());
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
		const assigneeIds = pr.assignees.nodes.map(_ => _.login);
		if (availableAssignees && availableAssignees.length) {
			const menuItems = (availableAssignees || []).map((_: any) => ({
				checked: assigneeIds.includes(_.login),
				label: <PRHeadshotName person={{ ..._, user: _.login }} className="no-padding" />,
				subtle: _.name,
				searchLabel: `${_.login}:${_.name}`,
				key: _.id,
				action: () => toggleAssignee(_.id, !assigneeIds.includes(_.login))
			})) as any;
			menuItems.unshift({ type: "search", placeholder: "Type or choose a name" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Assignees...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableAssignees, pr]);

	const toggleAssignee = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Assignee..." : "Removing Assignee...");
		await dispatch(
			api("setAssigneeOnPullRequest", {
				assigneeId: id,
				onOff
			})
		);
	};

	const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
	const setNotificationsOn = async (onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Subscribing..." : "Unsubscribing...");
		setIsLoadingNotifications(true);
		await dispatch(
			api("updatePullRequestSubscription", {
				onOff
			})
		);
		setIsLoadingNotifications(false);
	};

	const openAssignees = () => setRightOpen(true);
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
						action: () => {
							setIsLoadingMessage("Unlocking...");
							dispatch(api("unlockPullRequest", {}));
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
						action: () => {
							setIsLoadingMessage("Locking...");
							dispatch(api("lockPullRequest", {}));
						}
					}
				]
			});
		}
	};
	const openParticipants = () => setRightOpen(true);
	const openToDo = () => setRightOpen(true);

	const reference = pr.url;
	const sourceBranch = pr.sourceBranch;
	const numLabels = pr.labels ? pr.labels.nodes.length : 0;
	const numParticipants = pr.participants ? pr.participants.nodes.length : 0;
	const timeSpent = distanceOfTimeInWords(pr.totalTimeSpent, false, true);
	const timeEstimate = distanceOfTimeInWords(pr.timeEstimate, false, true);
	const pct = pr.timeEstimate > 0 ? (100 * pr.totalTimeSpent) / pr.timeEstimate : 0;
	return (
		<Right className={rightOpen ? "expanded" : "collapsed"}>
			<AsideBlock onClick={() => !rightOpen && close()}>
				{rightOpen ? (
					<ButtonRow>
						<Button variant="secondary" onClick={close}>
							<Icon className="clickable margin-right" name="x" />
							Close view
						</Button>
						<Button variant="secondary" onClick={() => setRightOpen(false)}>
							<Icon className="clickable" name="chevron-right-thin" />
							Collapse
						</Button>
					</ButtonRow>
				) : (
					<Icon className="clickable" name="x" title="Close view" placement="left" />
				)}
			</AsideBlock>
			{!rightOpen && <HR />}
			{!rightOpen && (
				<AsideBlock onClick={() => !rightOpen && setRightOpen(true)}>
					<Icon
						className="clickable"
						title="Expand sidebar"
						placement="left"
						name="chevron-left-thin"
					/>
				</AsideBlock>
			)}
			{!rightOpen && <HR />}
			<AsideBlock onClick={() => !rightOpen && openToDo()}>
				{rightOpen ? (
					<JustifiedRow>
						<label>To Do</label>
						<Button variant="secondary">Add a to do</Button>
					</JustifiedRow>
				) : (
					<Icon
						className="clickable"
						name="checked-checkbox"
						title="Add a to do"
						placement="left"
					/>
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && openAssignees()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Assignees</label>
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
									None - <a onClick={() => toggleAssignee(pr.viewer.id, true)}>assign yourself</a>
								</>
							)}
						</Subtle>
					</>
				) : pr.assignees && pr.assignees.nodes.length > 0 ? (
					<PRHeadshot person={pr.assignees.nodes[0]} size={20} />
				) : (
					<Icon className="clickable" name="person" title="Assignee(s)" placement="left" />
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && openMilestone()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Milestone</label>
							<Link onClick={openMilestone}>Edit</Link>
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
						<Icon className="clickable" name="clock" title="Milestone" placement="left" />
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
															url: "http://gitlab.codestream.us/help/user/project/time_tracking.md"
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
									{pr.totalTimeSpent ? timeSpent : "--"} / {pr.timeEstimate ? timeEstimate : "--"}
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
							<Link onClick={openLabels}>Edit</Link>
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
								name={lockOn ? "lock" : "unlock"}
								title={lockOn ? "Locked" : "Unlocked"}
								placement="left"
							/>
							{lockOn ? "Locked" : "Unlocked"}
						</Subtle>
					</>
				) : (
					<Icon
						className="clickable"
						name={lockOn ? "lock" : "unlock"}
						title={lockOn ? "Locked" : "Unlocked"}
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
						<Icon className="clickable" name="copy" title="Copy reference" placement="left" />
					</JustifiedRow>
					<div style={{ height: "10px" }} />
					<JustifiedRow>
						<div>
							<label>Source branch: </label>
							<span className="monospace">{sourceBranch}</span>
						</div>
						<Icon className="clickable" name="copy" title="Copy branch name" placement="left" />
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
