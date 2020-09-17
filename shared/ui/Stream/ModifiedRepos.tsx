import React from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { includes as _includes, sortBy as _sortBy, last as _last } from "lodash-es";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import Timestamp from "./Timestamp";
import { getCodeCollisions } from "../store/users/reducer";
import { ChangesetFile } from "./Review/ChangesetFile";
import { HostApi } from "..";
import { ReviewShowLocalDiffRequestType } from "../ipc/host.protocol.review";
import * as userSelectors from "../store/users/reducer";
import { FileStatus } from "@codestream/protocols/api";
import { ReposScm } from "@codestream/protocols/agent";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import { InlineMenu } from "../src/components/controls/InlineMenu";

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

export const ModifiedRepos = (props: {
	id: string;
	showUntracked?: boolean;
	showModifiedAt?: boolean;
	defaultText?: string | React.ReactNode;
	onlyRepos?: string[];
}) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { session, users, teams, context } = state;
		const person = users[props.id];
		const me = users[session.userId!];
		const team = teams[context.currentTeamId];
		const xraySetting = team.settings ? team.settings.xray : "";
		const xrayEnabled = xraySetting !== "off";
		const userNamesById = userSelectors.getUsernamesById(state);

		return {
			person,
			isMe: person ? person.id === session.userId : false,
			userNamesById,
			repos: state.repos,
			teamId: state.context.currentTeamId,
			currentUserEmail: me.email,
			collisions: getCodeCollisions(state),
			xrayEnabled
		};
	});

	const { person, isMe } = derivedState;

	if (!derivedState.person) return null;

	const [selectedFile, setSelectedFile] = React.useState("");

	const { repos, teamId, currentUserEmail, collisions, xrayEnabled } = derivedState;
	const { modifiedRepos, modifiedReposModifiedAt } = person;

	if (!xrayEnabled) return null;
	if (!modifiedRepos || !modifiedRepos[teamId] || !modifiedRepos[teamId].length)
		return props.defaultText ? <span>{props.defaultText}</span> : null;

	// FIXME we want to be able to show the diff here
	const clickFile = (repoId, path, baseSha) => {
		setSelectedFile(repoId + ":" + path);
		HostApi.instance.send(ReviewShowLocalDiffRequestType, {
			path,
			repoId,
			includeSaved: true,
			includeStaged: true,
			baseSha
		});
	};

	const nameList = ids => ids.map(id => derivedState.userNamesById[id]).join(", ");

	const modified = modifiedRepos[teamId]
		.map(repo => {
			if (props.onlyRepos && repo.repoId && !props.onlyRepos.includes(repo.repoId)) return null;
			const { repoId = "", authors } = repo;
			const modifiedFiles = repo.modifiedFiles.filter(
				f => props.showUntracked || f.status !== FileStatus.untracked
			);
			if (modifiedFiles.length === 0) return null;
			const repoName = repos[repoId] ? repos[repoId].name : "";
			const added = modifiedFiles.reduce((total, f) => total + f.linesAdded, 0);
			const removed = modifiedFiles.reduce((total, f) => total + f.linesRemoved, 0);
			const stomp =
				person.email === currentUserEmail
					? null
					: (authors || []).find(a => a.email === currentUserEmail && a.stomped > 0);
			return (
				<Repo key={"repo-" + repoId}>
					<div>
						<IconLabel>
							<Icon name="repo" />
							{repoName}
						</IconLabel>{" "}
						<IconLabel>
							<Icon name="git-branch" />
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
					</div>
					<div style={{ margin: "0 -20px 0 -20px" }}>
						{modifiedFiles.map(f => {
							const hasConflict = isMe
								? collisions.repoFiles[`${repo.repoId}:${f.file}`]
								: collisions.userRepoFiles[`${person.id}:${repo.repoId}:${f.file}`];
							const className = hasConflict ? "file-has-conflict wide" : "wide";
							const onClick = isMe ? () => clickFile(repoId, f.file, repo.startCommit) : undefined;
							const selected = selectedFile === repoId + ":" + f.file;
							const vs = repo.startCommit ? repo.startCommit.substr(0, 8) : "HEAD";
							let tooltip = isMe ? `Click to diff vs. last push: ${vs}` : undefined;
							if (isMe && hasConflict) tooltip += " (" + nameList(hasConflict) + " is editing)";

							return (
								<ChangesetFile
									icon={<Icon className="file-icon" name={selected ? "arrow-right" : "blank"} />}
									className={className}
									onClick={onClick}
									noHover={!onClick}
									key={f.file}
									tooltip={tooltip}
									{...f}
								/>
							);
						})}
					</div>
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
					<div style={{ height: "5px" }} />
					{stomp && (
						<div style={{ paddingTop: "5px" }}>
							<span className="stomped" style={{ paddingLeft: 0 }}>
								@{stomp.stomped}
							</span>{" "}
							= includes {stomp.stomped} change
							{stomp.stomped > 1 ? "s" : ""} to code you wrote
						</div>
					)}
					{collisions.userRepos[person.id + ":" + repo.repoId] && (
						<div style={{ paddingTop: "5px" }}>
							<Icon name="alert" className="conflict" /> = possible merge conflict
						</div>
					)}
				</Repo>
			);
		})
		.filter(Boolean);

	if (modified.length > 0 || props.defaultText) {
		return (
			<>
				{modified.length > 0 ? modified : props.defaultText}
				{props.showModifiedAt && modifiedReposModifiedAt && modifiedReposModifiedAt[teamId] && (
					<div style={{ color: "var(--text-color-subtle)" }}>
						Updated
						<Timestamp relative time={modifiedReposModifiedAt[teamId]} />
					</div>
				)}
			</>
		);
	} else return null;
};
