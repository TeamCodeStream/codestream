import React from "react";
import cx from "classnames";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
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
import { setUserStatus } from "./actions";
import { HostApi } from "..";
import { OpenUrlRequestType } from "../ipc/host.protocol";
import { CSMe } from "../protocols/agent/api.protocol.models";
import { TipTitle } from "./Tooltip";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import { useDidMount } from "../utilities/hooks";
import { clearModifiedFiles, updateModifiedReposDebounced } from "../store/users/actions";
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

let hasRenderedOnce = false;
const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
export const WorkInProgress = React.memo((props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];
		const currentUserId = state.session.userId!;
		const currentUser = state.users[state.session.userId!] as CSMe;
		const { modifiedRepos = EMPTY_HASH } = currentUser;

		const xraySetting = team.settings ? team.settings.xray : "";
		let status =
			currentUser.status && currentUser.status[teamId] && "label" in currentUser.status[teamId]
				? currentUser.status[teamId]
				: EMPTY_STATUS;
		let invisible =
			(currentUser.status && currentUser.status[teamId] && currentUser.status[teamId].invisible) ||
			false;

		let linesAdded = 0;
		let linesRemoved = 0;
		let repoCount = 0;
		(modifiedRepos[teamId] || EMPTY_ARRAY).forEach(repo => {
			const files = repo.modifiedFiles || EMPTY_ARRAY;
			if (files.length) {
				repoCount++;
			}
			files
				// .filter(f => f.status !== FileStatus.untracked)
				.forEach(f => {
					linesAdded += f.linesAdded;
					linesRemoved += f.linesRemoved;
				});
		});

		return {
			repoCount,
			linesAdded,
			linesRemoved,
			teamId,
			status,
			repos: state.repos,
			currentUserId,
			invisible,
			xraySetting
		};
	}, shallowEqual);
	const { status, invisible, xraySetting, teamId } = derivedState;
	const { linesAdded, linesRemoved } = derivedState;

	const [mounted, setMounted] = React.useState(false);
	const [pollingTimer, setPollingTimer] = React.useState<any>();
	const [loadingStatus, setLoadingStatus] = React.useState(false);

	const clearAndSave = () => {
		dispatch(setUserStatus("", "", "", "", derivedState.invisible, derivedState.teamId));
		// FIXME clear out slack status
	};

	const toggleInvisible = async () => {
		setLoadingStatus(true);
		const { label = "", ticketId = "", ticketUrl = "", ticketProvider = "" } = status || {};
		await dispatch(
			setUserStatus(label, ticketId, ticketUrl, ticketProvider, !invisible, derivedState.teamId)
		);
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
		updateModifiedReposDebounced(dispatch);
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

		if (!hasRenderedOnce) {
			//if (derivedState.linesAdded > 0 || derivedState.linesRemoved > 0) {
			//	HostApi.instance.track("WIP Rendered", {
			//		"Repo Count": derivedState.repoCount
			//	});
			//}
		}
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
						placement="bottomRight"
						trigger={["hover"]}
						delay={1}
						loading={loadingStatus}
						title={
							<TipTitle>
								<h1>Live View: {invisible ? "OFF" : "ON"}</h1>
								{invisible ? "Not sharing" : "Sharing"} local changes with
								<br />
								teammates. Click to toggle.
							</TipTitle>
						}
						tabIndex={1}
					/>
				)}
			</PaneHeader>
			{props.paneState !== PaneState.Collapsed && (
				<PaneBody>
					<div style={{ padding: "0 10px 0 20px" }}>
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
});
