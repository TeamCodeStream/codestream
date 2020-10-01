import React, { useState, useEffect } from "react";
import { PRSelectorButtons } from "./PullRequestComponents";
import styled from "styled-components";
import { useDidMount } from "../utilities/hooks";
import { useSelector, useDispatch } from "react-redux";
import { CodeStreamState } from "../store";
import { PullRequestFilesChanged } from "./PullRequestFilesChanged";
import { FileStatus } from "@codestream/protocols/api";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { setUserPreference } from "./actions";
import { PullRequestPatch } from "./PullRequestPatch";
import { getPullRequestFiles } from "../store/providerPullRequests/actions";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import Icon from "./Icon";

export const PRDiffHunks = styled.div`
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: pre;
}
`;

export const PRDiffHunk = styled.div`
	border: 1px solid var(--base-border-color);
	border-radius: 5px;
	margin: 0 0 20px 0;
	h1 {
		border-radius: 5px 5px 0 0;
		font-size: 12px;
		font-weight: normal;
		margin: 0;
		padding: 10px;
		background: var(--base-background-color);
		border-bottom: 1px solid var(--base-border-color);
	}
`;

const STATUS_MAP = {
	modified: FileStatus.modified
};

export interface CompareFilesProps {
	repositoryName?: string;
	baseRef: string;
	baseRefName: string;
	headRef: string;
	headRefName: string;
}

interface Props extends CompareFilesProps {
	filesChanged: any[];
	isLoading: boolean;
	pr?: FetchThirdPartyPullRequestPullRequest;
}

export const PullRequestFilesChangedList = (props: Props) => {
	const { filesChanged, isLoading, pr } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			pullRequestFilesChangedMode: state.preferences.pullRequestFilesChangedMode || "files"
		};
	});

	const setMode = mode => {
		dispatch(setUserPreference(["pullRequestFilesChangedMode"], mode));
	};

	if (isLoading)
		return (
			<div style={{ marginTop: "100px" }}>
				<LoadingMessage>Loading Changed Files...</LoadingMessage>
			</div>
		);

	if (!filesChanged || !filesChanged.length) return null;

	const mode = derivedState.pullRequestFilesChangedMode;

	return (
		<>
			<PRSelectorButtons>
				<span className={mode == "files" ? "selected" : ""} onClick={() => setMode("files")}>
					<Icon name="list-flat" title="List View" placement="bottom" />
				</span>
				<span className={mode == "tree" ? "selected" : ""} onClick={() => setMode("tree")}>
					<Icon name="list-tree" title="Tree View" placement="bottom" />
				</span>
				<span className={mode == "hunks" ? "selected" : ""} onClick={() => setMode("hunks")}>
					<Icon name="file-diff" title="Diff Hunks" placement="bottom" />
				</span>
			</PRSelectorButtons>
			<div style={{ height: "10px" }} />
			{mode === "files" || mode === "tree" ? (
				<PullRequestFilesChanged
					pr={pr}
					filesChanged={filesChanged}
					repositoryName={props.repositoryName}
					baseRef={props.baseRef}
					baseRefName={props.baseRefName}
					headRef={props.headRef}
					headRefName={props.headRefName}
					isLoading={props.isLoading}
					viewMode={mode === "files" ? "files" : "tree"}
				/>
			) : (
				<PRDiffHunks>
					{filesChanged.map(_ => {
						return (
							<PRDiffHunk>
								<h1>{_.filename}</h1>
								<PullRequestPatch patch={_.patch} hunks={_.hunks} filename={_.filename} />
							</PRDiffHunk>
						);
					})}
				</PRDiffHunks>
			)}
		</>
	);
};
