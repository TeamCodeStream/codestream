import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { CodeStreamState } from "@codestream/webview/store";
import { getPullRequestCommits } from "@codestream/webview/store/providerPullRequests/actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import Icon from "./Icon";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import { PRHeadshotName } from "../src/components/HeadshotName";
import { PRContent } from "./PullRequestComponents";
import styled from "styled-components";
import copy from "copy-to-clipboard";
import { groupBy } from "lodash-es";
import { Link } from "./Link";

const PRCommitContent = styled.div`
	margin: 0 20px 20px 20px;
	position: relative;
	&:before {
		content: "";
		position: absolute;
		left: 11px;
		z-index: 0;
		top: 0;
		height: 100%;
		width: 2px;
		background: var(--base-border-color);
	}
`;

export const PRCommitCard = styled.div`
	position: relative;
	border: 1px solid;
	border-bottom: none;
	border-color: var(--base-border-color);
	background: var(--app-background-color);
	.vscode-dark &,
	&.dark-header {
		background: var(--base-background-color);
	}
	padding: 10px 15px 10px 15px;
	margin-left: 30px;
	z-index: 2;
	width: auto;
	h1 {
		font-size: 15px;
		font-weight: normal;
		margin: 0 0 8px 0;
		padding-right: 120px;
	}
	p {
		margin: 0;
		color: var(--text-color-subtle);
	}
	&:first-child {
		border-radius: 5px 5px 0 0;
	}
	&:last-child {
		border-radius: 0 0 5px 5px;
		border: 1px solid var(--base-border-color);
	}
	&:first-child:last-child {
		border-radius: 5px;
	}
`;

export const PRCommitDay = styled.div`
	position: relative;
	margin: 20px 0 15px 30px;
	.icon {
		position: absolute !important;
		left: -25px;
		background: var(--app-background-color);
		height: 19px;
		svg {
			opacity: 0.7;
		}
	}
`;

const PRCommitButtons = styled.div`
	position: absolute;
	right: 15px;
	top: 10px;
	.icon {
		display: inline-block;
		margin-left: 10px;
	}
	.icon,
	a {
		opacity: 0.7;
		color: var(--text-color);
		text-decoration: none;
		&:hover {
			opacity: 1;
			color: var(--text-color-info);
		}
	}
`;

export const PullRequestCommitsTab = props => {
	const { pr, ghRepo } = props;
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
	const [commits, setCommits] = useState<any>({});

	const _mapData = data => {
		const commitsByDay = groupBy(data, _ => {
			return new Intl.DateTimeFormat("en", {
				day: "numeric",
				month: "short",
				year: "numeric"
			}).format(new Date(_.authoredDate).getTime());
		});

		setCommits(commitsByDay);
		setIsLoading(false);
	};

	useEffect(() => {
		(async () => {
			const data = await dispatch(
				getPullRequestCommits(pr.providerId, derivedState.currentPullRequestId!)
			);
			_mapData(data);
		})();
	}, [derivedState.providerPullRequests]);

	useDidMount(() => {
		setIsLoading(true);
		(async () => {
			const data = await dispatch(
				getPullRequestCommits(pr.providerId, derivedState.currentPullRequestId!)
			);
			_mapData(data);
		})();
	});

	if (isLoading)
		return (
			<div style={{ marginTop: "100px" }}>
				<LoadingMessage>Loading Changed Files...</LoadingMessage>
			</div>
		);

	// if (!commits || !commits.length) return null;

	// const byDay = groupBy(pr.commits.nodes, _ => {
	// 	return new Intl.DateTimeFormat("en", {
	// 		day: "numeric",
	// 		month: "short",
	// 		year: "numeric"
	// 	}).format(new Date(_.commit.authoredDate).getTime());
	// });

	console.warn("DOMMITRS: ", commits);
	return (
		<PRCommitContent>
			{Object.keys(commits).map((day, index) => {
				return (
					<div key={index}>
						<PRCommitDay>
							<Icon name="git-commit" />
							Commits on {day}
						</PRCommitDay>
						<div>
							{commits[day].map((commit, index) => {
								const { author, committer } = commit;
								return (
									<PRCommitCard key={index}>
										<h1>{commit.message}</h1>
										{author.name !== committer.name && (
											<>
												<PRHeadshotName className="no-padding" person={author} />

												<span className="subtle"> authored and </span>
											</>
										)}
										<PRHeadshotName className="no-padding" person={committer} />
										<span className="subtle"> committed</span>
										<Timestamp time={commit.authoredDate} relative />
										<PRCommitButtons>
											<Tooltip title="View commit on GitHub" placement="bottom">
												<span>
													<Link
														href={`${pr.url}/commits/${commit.abbreviatedOid}`}
														className="monospace"
													>
														{commit.abbreviatedOid}
													</Link>
												</span>
											</Tooltip>
											<Icon
												title="Copy Sha"
												placement="bottom"
												name="copy"
												className="clickable"
												onClick={() => copy(commit.abbreviatedOid)}
											/>
											<Link href={pr.url.replace(/\/pull\/\d+$/, `/tree/${commit.abbreviatedOid}`)}>
												<Icon
													title="Browse the repository at this point in the history on GitHub"
													className="clickable"
													placement="bottomRight"
													name="code"
												/>
											</Link>
										</PRCommitButtons>
									</PRCommitCard>
								);
							})}
						</div>
					</div>
				);
			})}
		</PRCommitContent>
	);
};
