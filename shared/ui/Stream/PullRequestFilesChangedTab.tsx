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
import { PullRequestFilesChangedList } from "./PullRequestFilesChangedList";
import { HostApi } from "../webview-api";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";

const PRCommitContent = styled.div`
	margin: 0 20px 20px 40px;
	position: relative;
`;

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

export const PullRequestFilesChangedTab = (props: {
	fetch: Function;
	pr: FetchThirdPartyPullRequestPullRequest;
}) => {
	const { pr } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			providerPullRequests: state.providerPullRequests.pullRequests,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined
		};
	});

	const [isLoading, setIsLoading] = useState(true);
	const [filesChanged, setFilesChanged] = useState<any[]>([]);

	const _mapData = data => {
		const filesChanged = data.map(_ => {
			return {
				..._,
				linesAdded: _.additions,
				linesRemoved: _.deletions,
				file: _.filename,
				sha: _.sha,
				status: STATUS_MAP[_.status]
			};
		});
		setFilesChanged(filesChanged);
		setIsLoading(false);
	};

	useEffect(() => {
		// re-render if providerPullRequests changes
		(async () => {
			const data = await dispatch(
				getPullRequestFiles(pr.providerId, derivedState.currentPullRequestId!)
			);
			_mapData(data);
		})();
	}, [derivedState.providerPullRequests]);

	useDidMount(() => {
		setIsLoading(true);
		(async () => {
			const data = await dispatch(
				getPullRequestFiles(pr.providerId, derivedState.currentPullRequestId!)
			);
			_mapData(data);
		})();

		HostApi.instance.track("PR Files Changed Tab", {
			Host: pr.providerId
		});
	});

	useEffect(() => {
		if (derivedState.pullRequestFilesChangedMode === "hunks") {
			HostApi.instance.track("PR Diff Hunks Viewed", {
				Host: pr.providerId
			});
		}
	}, [derivedState.pullRequestFilesChangedMode]);

	if (isLoading)
		return (
			<div style={{ marginTop: "100px" }}>
				<LoadingMessage>Loading Changed Files...</LoadingMessage>
			</div>
		);

	if (!filesChanged || !filesChanged.length) return null;
	return (
		<PullRequestFilesChangedList
			pr={pr}
			filesChanged={filesChanged}
			repositoryName={pr.repository.name}
			baseRef={pr.baseRefOid}
			baseRefName={pr.baseRefName}
			headRef={pr.headRefOid}
			headRefName={pr.headRefName}
			isLoading={isLoading}
		/>
	);
};
