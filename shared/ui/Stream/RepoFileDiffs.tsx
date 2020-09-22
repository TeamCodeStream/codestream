import React from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { includes as _includes, sortBy as _sortBy, last as _last } from "lodash-es";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import { getCodeCollisions } from "../store/users/reducer";
import { ChangesetFile } from "./Review/ChangesetFile";
import { HostApi } from "..";
import { ReviewShowLocalDiffRequestType } from "../ipc/host.protocol.review";
import * as userSelectors from "../store/users/reducer";
import { FileStatus } from "@codestream/protocols/api";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { EditorRevealRangeRequestType, WebviewPanels } from "@codestream/protocols/webview";
import { Range } from "vscode-languageserver-types";
import { GetReposScmRequestType } from "@codestream/protocols/agent";
import Timestamp from "./Timestamp";
import * as path from "path-browserify";
import { PaneNode, PaneNodeName, PaneBody, NoContent, PaneState } from "../src/components/Pane";
import { setNewPostEntry } from "../store/context/actions";
import { openPanel } from "./actions";
import { TextInput } from "../Authentication/TextInput";
import { CommitAndPush } from "./CommitAndPush";

const IconLabel = styled.span`
	white-space: nowrap;
	padding-right: 10px;
	.icon {
		margin-right: 5px;
	}
`;

const Repo = styled.div`
	.row-with-icon-actions {
		padding-top: 3px;
		padding-bottom: 3px;
		&.ellipsis-left-container {
			height: 1.65em;
		}
	}
`;

const EMPTY_HASH = {};

export const RepoFileDiffs = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { session, users, teams, context, preferences } = state;
		const currentUser = users[session.userId!];
		const team = teams[context.currentTeamId];
		const userNamesById = userSelectors.getUsernamesById(state);

		return {
			currentUser,
			userNamesById,
			repos: state.repos,
			teamId: state.context.currentTeamId,
			currentUserEmail: currentUser.email,
			collisions: getCodeCollisions(state),
			hiddenPaneNodes: preferences.hiddenPaneNodes || EMPTY_HASH
		};
	});

	const [selectedFile, setSelectedFile] = React.useState("");
	const [commitMessageField, setCommitMessageField] = React.useState("");
	const [committing, setCommitting] = React.useState("");

	const { repos, teamId, currentUser, collisions } = derivedState;
	const { modifiedRepos = [] } = currentUser;

	const showFileDiff = (repoId, path, baseSha) => {
		setSelectedFile(repoId + ":" + path);
		HostApi.instance.send(ReviewShowLocalDiffRequestType, {
			path,
			repoId,
			includeSaved: true,
			includeStaged: true,
			baseSha
		});
	};

	const showFile = async (repoId, filepath) => {
		let repoRoot = "";

		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: false
		});
		if (!response.repositories) return;
		const currentRepoInfo = response.repositories.find(r => r.id === repoId);
		if (currentRepoInfo) {
			repoRoot = currentRepoInfo.path;
		}

		if (repoRoot) {
			const response = HostApi.instance.send(EditorRevealRangeRequestType, {
				uri: path.join("file://", repoRoot, filepath),
				range: Range.create(0, 0, 0, 0)
			});
			HostApi.instance.track("Modified Repos File Viewed", {});
		}
	};

	const nameList = ids => ids.map(id => derivedState.userNamesById[id]).join(", ");

	const modified = modifiedRepos[teamId]
		.map(repo => {
			const { repoId = "", authors } = repo;
			const trackedFiles = repo.modifiedFiles.filter(f => f.status !== FileStatus.untracked);
			const untrackedFiles = repo.modifiedFiles.filter(f => f.status === FileStatus.untracked);
			const repoName = repos[repoId] ? repos[repoId].name : "";
			return (
				<PaneNode>
					<PaneNodeName
						id={`repo-${repoId}`}
						title={repoName}
						subtitle={
							<>
								<IconLabel>
									<Icon name="git-branch" className="smaller" />
									{repo.branch}
								</IconLabel>
								<span className="subtle">
									(diffs vs.{" "}
									<InlineMenu items={[]}>
										<span className="monospace no-transform">
											{repo.startCommit ? repo.startCommit.substr(0, 8) : "HEAD"}
										</span>
									</InlineMenu>
									)
								</span>
							</>
						}
					>
						<Icon
							name="git-commit-vertical"
							title="Commit &amp; Push"
							delay={1}
							placement="bottom"
							onClick={() => setCommitting(repoId)}
						/>
						<Icon
							name="review"
							title="Request Feedback"
							delay={1}
							placement="bottom"
							onClick={() => {
								dispatch(setNewPostEntry("Status"));
								dispatch(openPanel(WebviewPanels.NewReview));
							}}
						/>
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
					</PaneNodeName>
					{!derivedState.hiddenPaneNodes[`repo-${repoId}`] && (
						<Repo key={"repo-" + repoId}>
							{trackedFiles.map(f => {
								const hasConflict = collisions.repoFiles[`${repo.repoId}:${f.file}`];
								const className = hasConflict ? "file-has-conflict wide" : "wide";
								const onClick = () => showFileDiff(repoId, f.file, repo.startCommit);
								const selected = selectedFile === repoId + ":" + f.file;
								const vs = repo.startCommit ? repo.startCommit.substr(0, 8) : "HEAD";
								let tooltip = `Click to diff vs. last push: ${vs}`;
								if (hasConflict) tooltip += " (" + nameList(hasConflict) + " is editing)";

								return (
									<ChangesetFile
										icon={<Icon className="file-icon" name={selected ? "arrow-right" : "blank"} />}
										className={className}
										onClick={onClick}
										noHover={!onClick}
										key={f.file}
										tooltip={tooltip}
										{...f}
										actionIcons={
											<div className="actions">
												<Icon
													name="goto-file"
													className="clickable action"
													title="Open File"
													placement="left"
													delay={1}
													onClick={async e => {
														e.stopPropagation();
														e.preventDefault();
														showFile(repoId, f.file);
													}}
												/>
											</div>
										}
									/>
								);
							})}
							{repo.commits && repo.commits.length > 0 && (
								<div style={{ margin: "0 -20px 0 -20px" }}>
									{(repo.commits || []).map(c => {
										const commit = c as any;
										return (
											<Row key={commit.sha}>
												<div style={{ paddingLeft: "20px" }}>
													<Icon name="git-commit-vertical" />
												</div>
												<div>{commit.info.shortMessage}</div>
												<div className="icons">
													<span className="monospace">{commit.sha.substr(0, 8)}</span>
												</div>
											</Row>
										);
									})}
								</div>
							)}
						</Repo>
					)}
				</PaneNode>
			);
		})
		.filter(Boolean);

	if (modified.length > 0)
		return (
			<>
				{committing && <CommitAndPush repoId={committing} onClose={() => setCommitting("")} />}
				{modified}
			</>
		);
	else
		return (
			<NoContent style={{ marginLeft: 0, marginRight: 0 }}>
				As you write code, files that have changed will appear here.
			</NoContent>
		);
};
