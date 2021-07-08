import { getProviderPullRequestRepo } from "@codestream/webview/store/providerPullRequests/reducer";
import { DropdownButton } from "@codestream/webview/Stream/Review/DropdownButton";
import { distanceOfTimeInWords } from "@codestream/webview/Stream/Timestamp";
import React, { useState, useEffect, useMemo } from "react";
import { useDidMount } from "../utilities/hooks";
import { useSelector, useDispatch } from "react-redux";
import { CodeStreamState } from "../store";
import { FileStatus } from "@codestream/protocols/api";
import { LoadingMessage } from "../src/components/LoadingMessage";
import {
	getPullRequestCommits,
	getPullRequestFiles,
	getPullRequestFilesFromProvider
} from "../store/providerPullRequests/actions";
import { PullRequestFilesChangedList } from "./PullRequestFilesChangedList";
import {
	ChangeDataType,
	DidChangeDataNotificationType,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestPullRequest
} from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";

const STATUS_MAP = {
	modified: FileStatus.modified
};

interface DropdownItem {
	label: any;
	key?: string;
	action?: (range?: any) => void;
	type?: string;
	inRange?: boolean;
	floatRight?: {
		label: string;
	};
	subtextNoPadding?: string;
}

export const PullRequestFilesChangedTab = (props: {
	pr: FetchThirdPartyPullRequestPullRequest;
	setIsLoadingMessage: Function;
	setPrCommitsRange: Function;
	prCommitsRange: string[];
	initialScrollPosition?: number;
}) => {
	const { prCommitsRange, setPrCommitsRange, pr } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			providerPullRequests: state.providerPullRequests.pullRequests,
			pullRequestFilesChangedMode: state.preferences.pullRequestFilesChangedMode || "files",
			currentRepo: getProviderPullRequestRepo(state),
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined
		};
	});

	const [isLoading, setIsLoading] = useState(true);
	const [filesChanged, setFilesChanged] = useState<any[]>([]);
	const [prCommits, setPrCommits] = useState<FetchThirdPartyPullRequestCommitsResponse[]>([]);
	const [accessRawDiffs, setAccessRawDiffs] = useState(false);
	// const [lastReviewCommitOid, setLastReviewCommitOid] = useState<string | undefined>();

	const _mapData = data => {
		const filesChanged = data.map(_ => {
			return {
				..._,
				linesAdded: _.additions,
				linesRemoved: _.deletions,
				file: _.filename,
				status: STATUS_MAP[_.status]
			};
		});
		filesChanged.sort((a, b) => a.file.localeCompare(b.file));
		setFilesChanged(filesChanged);
		setIsLoading(false);
	};

	const _mapCommitsData = data => {
		setPrCommits(
			data.sort((a, b) => new Date(a.authoredDate).getTime() - new Date(b.authoredDate).getTime())
		);
	};

	useEffect(() => {
		// re-render if providerPullRequests changes
		(async () => {
			await getPRFiles();
		})();
	}, [pr.providerId, derivedState.currentPullRequestId, prCommitsRange, accessRawDiffs]);

	useDidMount(() => {
		setIsLoading(true);
		let disposable;
		(async () => {
			const prCommitsData = await dispatch(
				getPullRequestCommits(pr.providerId, derivedState.currentPullRequestId!)
			);
			_mapCommitsData(prCommitsData);
			await getPRFiles();

			disposable = HostApi.instance.on(DidChangeDataNotificationType, async (e: any) => {
				if (e.type === ChangeDataType.Commits) {
					setIsLoading(true);
					const data = await dispatch(
						getPullRequestFilesFromProvider(pr.providerId, derivedState.currentPullRequestId!)
					);
					_mapData(data);
				}
			});
		})();
		return () => {
			disposable?.dispose();
		};
	});

	const getPRFiles = async () => {
		if (prCommitsRange.length > 0 && derivedState.currentRepo) {
			const data = await dispatch(
				getPullRequestFiles(
					pr.providerId,
					derivedState.currentPullRequestId!,
					prCommitsRange,
					derivedState.currentRepo.id,
					accessRawDiffs
				)
			);
			_mapData(data);
		} else {
			const data = await dispatch(
				getPullRequestFiles(
					pr.providerId,
					derivedState.currentPullRequestId!,
					undefined,
					undefined,
					accessRawDiffs
				)
			);
			_mapData(data);
		}
	};

	const commitBased = useMemo(() => prCommitsRange.length > 0, [prCommitsRange]);
	const baseRef = useMemo(() => {
		if (prCommitsRange.length === 1) {
			let commitIndex;
			prCommits.map((commit, index) => {
				if (commit.oid === prCommitsRange[0]) {
					commitIndex = index - 1;
				}
			});
			if (commitIndex >= 0) {
				return prCommits[commitIndex].oid;
			}
			return pr.baseRefOid;
		}
		if (prCommitsRange.length > 1) {
			if (filesChanged.length > 0) {
				return filesChanged[0].sha;
			}
			return prCommitsRange[0];
		}
		return pr.baseRefOid;
	}, [prCommitsRange, filesChanged]);
	const lastReviewCommitOid = useMemo(() => {
		if (
			pr.reviews &&
			pr.reviews.nodes &&
			pr.reviews.nodes.length &&
			prCommits &&
			prCommits.length &&
			prCommits.slice(-1)[0].oid !== pr.reviews.nodes.slice(-1)[0].commit.oid
		) {
			return pr.reviews.nodes.slice(-1)[0].commit.oid;
		}
		return;
	}, [pr, prCommits]);

	if (isLoading)
		return (
			<div style={{ marginTop: "100px" }}>
				<LoadingMessage>Loading Changed Files...</LoadingMessage>
			</div>
		);

	if (!filesChanged || !filesChanged.length) return null;

	const dropdownLabel =
		prCommitsRange.length === 0
			? "Changes from all commits"
			: (() => {
					let commitsInRange;
					if (prCommitsRange.length === 1) {
						commitsInRange = 1;
					} else {
						const firstCommitIndex = prCommits.findIndex(
							commit => commit.oid === prCommitsRange[0]
						);
						const lastCommitIndex = prCommits.findIndex(commit => commit.oid === prCommitsRange[1]);
						commitsInRange = Math.abs(firstCommitIndex - lastCommitIndex) + 1;
					}
					return `Changes from ${commitsInRange} commit${commitsInRange > 1 ? "s" : ""}`;
			  })();

	const dropdownItems: DropdownItem[] = [
		{
			label: "Show all changes",
			action: range => {
				setPrCommitsRange([]);
			},
			subtextNoPadding: prCommits.length
				? `${prCommits.length} commit${prCommits.length > 1 ? "s" : ""}`
				: ""
		}
	];
	if (lastReviewCommitOid) {
		const lastReviewCommitIndex = prCommits.findIndex(commit => commit.oid === lastReviewCommitOid);
		let commitsSinceLastReview = 0;
		let startRangeOid = lastReviewCommitOid;
		if (lastReviewCommitIndex > -1 && lastReviewCommitIndex + 1 < prCommits.length) {
			startRangeOid = prCommits[lastReviewCommitIndex + 1].oid;
			commitsSinceLastReview = prCommits.length - 1 - lastReviewCommitIndex;
		}
		dropdownItems.push({
			label: "Show changes since your last review",
			action: range => {
				setPrCommitsRange([startRangeOid, prCommits.slice(-1)[0].oid]);
			},
			subtextNoPadding: commitsSinceLastReview
				? `${commitsSinceLastReview} commit${commitsSinceLastReview > 1 ? "s" : ""}`
				: ""
		});
	}
	dropdownItems.push({ label: "Hold shift + click to select a range", type: "static" });

	prCommits &&
		prCommits.map(_ => {
			dropdownItems.push({
				label: _.message,
				floatRight: {
					label: _.abbreviatedOid
				},
				subtextNoPadding: `${
					_.author && _.author.user && _.author.user.login
						? _.author.user.login
						: _.author && _.author.name
						? _.author.name
						: ""
				} ${_.authoredDate ? distanceOfTimeInWords(new Date(_.authoredDate).getTime()) : ""}`,
				action: range => {
					if (range) {
						if (range[0] === range[1]) {
							setPrCommitsRange([range[0]]);
							return;
						}
						const sortedRange = range.sort((a, b) => {
							return (
								prCommits.findIndex(commit => commit.oid === a) -
								prCommits.findIndex(commit => commit.oid === b)
							);
						});
						if (
							sortedRange[0] === prCommits[0].oid &&
							sortedRange[sortedRange.length - 1] === prCommits[prCommits.length - 1].oid
						) {
							setPrCommitsRange([]);
							return;
						}
						setPrCommitsRange(sortedRange);
					} else {
						setPrCommitsRange([_.oid]);
					}
				},
				inRange: true,
				key: _.oid
			});
		});

	return (
		<div style={{ position: "relative", margin: "0 0 20px 20px" }}>
			{derivedState.currentRepo && (
				<div style={{ margin: "0 0 10px 0" }}>
					<DropdownButton
						variant="text"
						items={dropdownItems}
						isMultiSelect={true}
						itemsRange={prCommitsRange}
					>
						{dropdownLabel}
					</DropdownButton>
				</div>
			)}
			<PullRequestFilesChangedList
				pr={pr}
				filesChanged={filesChanged}
				repositoryName={pr.repository && pr.repository.name}
				baseRef={baseRef}
				baseRefName={commitBased ? pr.headRefName : pr.baseRefName}
				headRef={commitBased ? prCommitsRange[prCommitsRange.length - 1] : pr.headRefOid}
				headRefName={pr.headRefName}
				isLoading={isLoading}
				setIsLoadingMessage={props.setIsLoadingMessage!}
				commitBased={commitBased}
				accessRawDiffs={accessRawDiffs}
				setAccessRawDiffs={setAccessRawDiffs}
				initialScrollPosition={props.initialScrollPosition}
			/>
		</div>
	);
};
