import React from "react";
import cx from "classnames";
import { useSelector, useDispatch } from "react-redux";
import { Pane, PaneHeader, PaneBody, NoContent } from "../src/components/Pane";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import { ModifiedRepos } from "./ModifiedRepos";
import {
	ReposScm,
	DidChangeDataNotificationType,
	ChangeDataType,
	DocumentData
} from "@codestream/protocols/agent";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import { setNewPostEntry } from "../store/context/actions";
import { openPanel, setUserStatus } from "./actions";
import { HostApi } from "..";
import { OpenUrlRequestType } from "../ipc/host.protocol";
import { CSMe } from "../protocols/agent/api.protocol.models";
import Tooltip, { TipTitle } from "./Tooltip";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import { useDidMount } from "../utilities/hooks";
import { updateModifiedRepos, clearModifiedFiles } from "../store/users/actions";

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
		const team = state.teams[state.context.currentTeamId];
		const currentUserId = state.session.userId!;
		const currentUser = state.users[state.session.userId!] as CSMe;
		const xraySetting = team.settings ? team.settings.xray : "";
		let status =
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;
		return {
			teamId: state.context.currentTeamId,
			status,
			currentUser,
			currentUserId,
			invisible: status.invisible || false,
			xraySetting
		};
	});
	const { status, currentUser, invisible, xraySetting, teamId } = derivedState;

	const [mounted, setMounted] = React.useState(false);
	const [pollingTimer, setPollingTimer] = React.useState<any>();
	const [loadingStatus, setLoadingStatus] = React.useState(false);

	const clearAndSave = () => {
		dispatch(setUserStatus("", "", "", "", derivedState.invisible));
		// FIXME clear out slack status
	};

	const toggleInvisible = async () => {
		setLoadingStatus(true);
		const { label = "", ticketId = "", ticketUrl = "", ticketProvider = "" } =
			currentUser.status || {};
		await dispatch(setUserStatus(label, ticketId, ticketUrl, ticketProvider, !invisible));
		await getScmInfoSummary();
		setLoadingStatus(false);
	};

	const startPolling = () => {
		// poll to get any changes that might happen outside the scope of
		// the documentManager operations
		if (!mounted || pollingTimer !== undefined) return;

		const timer = setInterval(() => {
			getScmInfoSummary();
		}, 30000); // five minutes
		setPollingTimer(timer);
	};

	const stopPolling = () => {
		if (pollingTimer === undefined) return;

		clearInterval(pollingTimer);
		setPollingTimer(undefined);
	};

	const getScmInfoSummary = async () => {
		await dispatch(updateModifiedRepos());
	};

	const clearScmInfoSummary = async () => {
		dispatch(clearModifiedFiles(teamId));
	};

	useDidMount(() => {
		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			// if we have a change to scm OR a file has been saved, update
			if (
				e.type === ChangeDataType.Commits ||
				(e.type === ChangeDataType.Documents &&
					e.data &&
					(e.data as DocumentData).reason === "saved")
			) {
				getScmInfoSummary();
			}
		});

		if (invisible) clearScmInfoSummary();
		else getScmInfoSummary();

		startPolling();
		return () => {
			disposable.dispose();
		};
	});

	return (
		<>
			<PaneHeader title="Work In Progress" id={WebviewPanels.WorkInProgress}>
				&nbsp;
				{(!xraySetting || xraySetting === "user") && (
					<Icon
						name="broadcast"
						className={cx("clickable spinnable nogrow", {
							no: invisible && !loadingStatus,
							info: !invisible
						})}
						onClick={toggleInvisible}
						placement="bottom"
						delay={1}
						loading={loadingStatus}
						title={
							<TipTitle>
								<h1>Live View: {invisible ? "OFF" : "ON"}</h1>
								{invisible ? "Not sharing" : "Sharing"} local changes with
								<br />
								teammates. Click to toggle.
								<a
									className="learn-more"
									href="http://docs.codestream.com/userguide/features/team-live-view/"
								>
									learn more
								</a>
							</TipTitle>
						}
					/>
				)}
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
