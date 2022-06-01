import {
	getProviderPullRequestRepo,
	getCurrentProviderPullRequest
} from "@codestream/webview/store/providerPullRequests/reducer";
import { DropdownButton } from "@codestream/webview/Stream/DropdownButton";
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
import Icon from "./Icon";
import styled from "styled-components";
import Tooltip from "./Tooltip";

const STATUS_MAP = {
	modified: FileStatus.modified
};

export const DirectoryTopLevel = styled.div`
	cursor: pointer;
	margin: 0 !important;
	display: flex;
	&:hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
`;
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
	sidebarView?: boolean;
	fetch?: Function;
}) => {
	const { prCommitsRange, setPrCommitsRange, pr } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			providerPullRequests: state.providerPullRequests.pullRequests,
			pullRequestFilesChangedMode: state.preferences.pullRequestFilesChangedMode || "files",
			currentRepo: getProviderPullRequestRepo(state),
			currentPullRequest: getCurrentProviderPullRequest(state),
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined
		};
	});

	const [isLoading, setIsLoading] = useState(true);
	const [filesChanged, setFilesChanged] = useState<any[]>([]);
	const [prCommits, setPrCommits] = useState<FetchThirdPartyPullRequestCommitsResponse[]>([]);
	const [accessRawDiffs, setAccessRawDiffs] = useState(false);
	const [showDirectory, setShowDirectory] = useState(true);
	const [viewedRatio, setViewedRatio] = useState("");
	const [showViewedRatio, setShowViewedRatio] = useState(false);

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

	//set ratio of viewed/total when currentPr changed in redux
	useEffect(() => {
		const prFileNodes =
			derivedState.currentPullRequest?.conversations?.repository?.pullRequest?.files?.nodes;

		if (prFileNodes) {
			const viewedCount = prFileNodes.filter(f => f?.viewerViewedState === "VIEWED").length;
			setViewedRatio(`${viewedCount}/${prFileNodes.length}`);
		}
	}, [derivedState.currentPullRequest]);

	useEffect(() => {
		(async () => {
			await getPRFiles();
		})();
	}, [
		pr.providerId,
		pr?.updatedAt,
		derivedState.currentPullRequestId,
		prCommitsRange,
		accessRawDiffs
	]);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			const data = await dispatch(
				getPullRequestFilesFromProvider(pr.providerId, derivedState.currentPullRequestId!)
			);
			_mapData(data);
		})();
	}, [pr?.files?.totalCount]);

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

	const toggleDirectory = e => {
		e.preventDefault();
		setShowDirectory(!showDirectory);
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

	if (isLoading && !props.sidebarView)
		return (
			<div style={{ marginTop: "100px" }}>
				<LoadingMessage>Loading Changed Files...</LoadingMessage>
			</div>
		);

	if (isLoading && props.sidebarView)
		return (
			<div style={{ marginLeft: "45px" }}>
				Loading... <Icon name="sync" className="spin row-icon" />
			</div>
		);

	if (!filesChanged || !filesChanged.length) return null;

	const dropdownLabel =
		prCommitsRange.length === 0
			? "all commits"
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
		<div
			className="files-changed-list"
			style={{ position: "relative", margin: props.sidebarView ? "0" : "0 0 20px 20px" }}
		>
			{derivedState.currentRepo && (
				<>
					{props.sidebarView && (
						<DirectoryTopLevel
							onClick={e => toggleDirectory(e)}
							className="files-changed-list-dropdown"
						>
							<div>
								<Icon name={showDirectory ? "chevron-down-thin" : "chevron-right-thin"} /> Files
								<DropdownButton
									variant="text"
									items={dropdownItems}
									isMultiSelect={true}
									itemsRange={prCommitsRange}
								>
									<span style={{ fontSize: "smaller", color: "var(--text-color-subtle)" }}>
										{dropdownLabel}
									</span>
								</DropdownButton>
							</div>

							<Tooltip title="Files Viewed" delay={0.5}>
								<div
									style={{
										margin: "0 14px 0 auto",
										padding: "3px 0 0 0"
									}}
								>
									{viewedRatio}
								</div>
							</Tooltip>
						</DirectoryTopLevel>
					)}

					{!props.sidebarView && (
						<div className="files-changed-list-dropdown" style={{ margin: "0 0 10px 0" }}>
							Files
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
				</>
			)}
			{showDirectory && (
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
					prCommitsRange={prCommitsRange}
					sidebarView={props.sidebarView}
					accessRawDiffs={accessRawDiffs}
					setAccessRawDiffs={setAccessRawDiffs}
					initialScrollPosition={props.initialScrollPosition}
				/>
			)}
		</div>
	);
};
