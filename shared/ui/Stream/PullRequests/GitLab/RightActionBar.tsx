import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { CodeStreamState } from "@codestream/webview/store";
import { Link } from "../../Link";
import styled from "styled-components";
import { DropdownButton } from "../../Review/DropdownButton";
import { PRBranch } from "../../PullRequestComponents";
import copy from "copy-to-clipboard";
import Tooltip from "../../Tooltip";
import { HostApi } from "../../../webview-api";
import { SwitchBranchRequestType } from "@codestream/protocols/agent";
import { confirmPopup } from "../../Confirm";
import { getProviderPullRequestRepo2 } from "@codestream/webview/store/providerPullRequests/reducer";
import { LocalFilesCloseDiffRequestType, OpenUrlRequestType } from "@codestream/protocols/webview";
import { closeAllModals } from "@codestream/webview/store/context/actions";
import { Switch } from "@codestream/webview/src/components/controls/Switch";
import { IconButton } from "./MergeBox";

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
		width: 265px;
		max-width: 100vw;
		border-left: 1px solid (--base-border-color);
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
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
		backdrop-filter: brightness(70%);
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

const Subtle = styled.div`
	padding-top: 5px;
	color: var(--text-color-subtle);
`;

export const RightActionBar = props => {
	const { pr, rightOpen, setRightOpen } = props;
	const dispatch = useDispatch();

	const [notificationsOn, setNotificationsOn] = useState(true);
	const [lockOn, setLockOn] = useState(false);

	const close = () => {
		HostApi.instance.send(LocalFilesCloseDiffRequestType, {});
		dispatch(closeAllModals());
	};

	const openAssignees = () => setRightOpen(true);
	const openMilestone = () => setRightOpen(true);
	const openTimeTracking = () => setRightOpen(true);
	const openLabels = () => setRightOpen(true);
	const openLock = () => setRightOpen(true);
	const openParticipants = () => setRightOpen(true);
	const openToDo = () => setRightOpen(true);

	const reference = pr.url;
	const sourceBranch = pr.sourceBranch;
	return (
		<Right className={rightOpen ? "expanded" : "collapsed"}>
			<AsideBlock onClick={() => !rightOpen && close}>
				{rightOpen ? (
					<JustifiedRow>
						<label>Close view / Collapse</label>
						<div>
							<Icon className="clickable margin-right" name="x" onClick={close} />
							<Icon
								className="clickable"
								name="chevron-right-thin"
								onClick={() => setRightOpen(false)}
							/>
						</div>
					</JustifiedRow>
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
							<Link onClick={openAssignees}>Edit</Link>
						</JustifiedRow>
						<Subtle>None - assign yourself</Subtle>
					</>
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
						<Subtle>None</Subtle>
					</>
				) : (
					<Icon className="clickable" name="clock" title="Milestone" placement="left" />
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && openTimeTracking()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Time tracking</label>
							<span>
								<Icon name="info" />
							</span>
						</JustifiedRow>
						<Subtle>No estimate or time spent</Subtle>
					</>
				) : (
					<Icon className="clickable" name="clock" title="Time tracking" placement="left" />
				)}
			</AsideBlock>
			<AsideBlock onClick={() => !rightOpen && openLabels()}>
				{rightOpen ? (
					<>
						<JustifiedRow>
							<label>Labels</label>
							<Link onClick={openLabels}>Edit</Link>
						</JustifiedRow>
						<Subtle>None</Subtle>
					</>
				) : (
					<Icon className="clickable" name="tag" title="Labels" placement="left" />
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
							<label>Participant</label>
						</JustifiedRow>
						<Subtle>headshots here....</Subtle>
					</>
				) : (
					<Icon className="clickable" name="team" title="Participants" placement="left" />
				)}
			</AsideBlock>
			{!rightOpen && <HR />}
			<AsideBlock>
				{rightOpen ? (
					<JustifiedRow>
						<label>Notifications</label>
						<Switch on={notificationsOn} onChange={() => setNotificationsOn(!notificationsOn)} />
					</JustifiedRow>
				) : (
					<Icon
						onClick={() => setNotificationsOn(!notificationsOn)}
						className="clickable"
						name={notificationsOn ? "bell" : "bell-slash"}
						title={notificationsOn ? "Notifications on" : "Notifications off"}
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
