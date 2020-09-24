import React from "react";
import cx from "classnames";
import { useSelector, useDispatch } from "react-redux";
import { PaneHeader, PaneBody, NoContent, PaneState } from "../src/components/Pane";
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
import { CSMe, FileStatus } from "../protocols/agent/api.protocol.models";
import Tooltip, { TipTitle } from "./Tooltip";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import { useDidMount } from "../utilities/hooks";
import { updateModifiedRepos, clearModifiedFiles } from "../store/users/actions";
import { RepoFileDiffs } from "./RepoFileDiffs";

export const EMPTY_STATUS = {
	label: "",
	ticketId: "",
	ticketUrl: "",
	ticketProvider: "",
	invisible: false
};

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
export const WorkInProgress = (props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const team = state.teams[state.context.currentTeamId];
		const currentUserId = state.session.userId!;
		const currentUser = state.users[state.session.userId!] as CSMe;
		const { modifiedRepos = EMPTY_HASH } = currentUser;

		const xraySetting = team.settings ? team.settings.xray : "";
		let status =
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;

		let linesAdded = 0;
		let linesRemoved = 0;
		(modifiedRepos[state.context.currentTeamId] || EMPTY_ARRAY).forEach(repo => {
			(repo.modifiedFiles || EMPTY_ARRAY)
				// .filter(f => f.status !== FileStatus.untracked)
				.forEach(f => {
					linesAdded += f.linesAdded;
					linesRemoved += f.linesRemoved;
				});
		});

		return {
			linesAdded,
			linesRemoved,
			teamId: state.context.currentTeamId,
			status,
			repos: state.repos,
			currentUser,
			currentUserId,
			invisible: status.invisible || false,
			xraySetting
		};
	});
	const { status, currentUser, invisible, xraySetting, teamId } = derivedState;
	const { linesAdded, linesRemoved } = derivedState;

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
			<PaneHeader
				title={
					<>
						Work In Progress {linesAdded > 0 && <span className="added">+{linesAdded} </span>}
						{linesRemoved > 0 && <span className="deleted">-{linesRemoved}</span>}
					</>
				}
				id={WebviewPanels.WorkInProgress}
			>
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
						tabIndex={1}
					/>
				)}
			</PaneHeader>

			{props.paneState !== PaneState.Collapsed && (
				<PaneBody>
					<div style={{ padding: "0 5px 0 20px" }}>
						{status && status.label && (
							<Row className="no-hover wide">
								<div>
									<Icon name={status.ticketProvider || "ticket"} />
								</div>
								<div>{status.label}</div>
								<div className="icons">
									<Icon
										title="Clear work item"
										placement="bottomLeft"
										delay={1}
										onClick={() => clearAndSave()}
										className="clickable"
										name="x-circle"
									/>
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
					</div>
					<RepoFileDiffs onlyRepos={props.openRepos.map(r => r.id)} />
				</PaneBody>
			)}
		</>
	);
};
