import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Pane, PaneHeader, PaneBody, NoContent } from "../src/components/Pane";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import { ModifiedRepos } from "./ModifiedRepos";
import { ReposScm } from "@codestream/protocols/agent";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import { setNewPostEntry } from "../store/context/actions";
import { openPanel, setUserStatus } from "./actions";
import { HostApi } from "..";
import { OpenUrlRequestType } from "../ipc/host.protocol";
import { CSMe } from "../protocols/agent/api.protocol.models";
import Tooltip from "./Tooltip";
import { Row } from "./CrossPostIssueControls/IssueDropdown";

export const EMPTY_STATUS = {
	label: "",
	ticketId: "",
	ticketUrl: "",
	ticketProvider: "",
	invisible: false
};

interface Props {
	openRepos: ReposScm[];
	expanded: boolean;
}

export const WorkInProgress = (props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUserId = state.session.userId!;
		const currentUser = state.users[state.session.userId!] as CSMe;
		let status =
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;
		return { status, currentUserId, invisible: status.invisible || false };
	});

	const clearAndSave = () => {
		dispatch(setUserStatus("", "", "", "", derivedState.invisible));
		// FIXME clear out slack status
	};

	const { status } = derivedState;
	return (
		<>
			<PaneHeader title="Work In Progress" id={WebviewPanels.WorkInProgress}>
				<Icon
					name="pull-request"
					title="New Pull Request"
					placement="bottom"
					delay={1}
					onClick={() => {
						dispatch(setNewPostEntry("Status"));
						dispatch(openPanel(WebviewPanels.NewPullRequest));
					}}
				/>
				<Icon
					name="review"
					title={
						<>
							Request Review
							<br />
							Watch the{" "}
							<a
								onClick={() => {
									HostApi.instance.send(OpenUrlRequestType, {
										url: "https://youtu.be/2AyqT4z5Omc"
									});
									HostApi.instance.track("Viewed Review Video");
								}}
							>
								video guide
							</a>
						</>
					}
					delay={1}
					placement="bottom"
					onClick={() => {
						dispatch(setNewPostEntry("Status"));
						dispatch(openPanel(WebviewPanels.NewReview));
					}}
				/>
			</PaneHeader>

			{props.expanded && (
				<PaneBody>
					<div style={{ padding: "0 20px" }}>
						{status && status.label && (
							<Row style={{ marginBottom: "5px" }} className="no-hover wide">
								<div>
									<Icon name={status.ticketProvider || "ticket"} />
								</div>
								<div>{status.label}</div>
								<div className="icons">
									<Tooltip title="Clear work item" placement="bottomLeft" delay={1}>
										<Icon onClick={() => clearAndSave()} className="clickable" name="x-circle" />
									</Tooltip>
									{status.ticketUrl && (
										<Icon
											title={`Open on web`}
											delay={1}
											placement="bottomRight"
											name="globe"
											className="clickable link-external"
											onClick={e => {
												e.stopPropagation();
												e.preventDefault();
												HostApi.instance.send(OpenUrlRequestType, {
													url: status.ticketUrl
												});
											}}
										/>
									)}
								</div>
							</Row>
						)}
						<ModifiedRepos
							id={derivedState.currentUserId}
							onlyRepos={
								props.openRepos ? props.openRepos.filter(_ => _.id).map(_ => _.id!) : undefined
							}
							defaultText={
								<NoContent style={{ marginLeft: 0, marginRight: 0 }}>
									As you write code, files that have changed will appear here.
								</NoContent>
							}
						/>
					</div>
				</PaneBody>
			)}
		</>
	);
};
