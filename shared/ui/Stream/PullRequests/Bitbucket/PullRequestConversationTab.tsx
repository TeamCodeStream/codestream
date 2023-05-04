import { CSMe } from "@codestream/protocols/api";
import React, { useState } from "react";
import styled from "styled-components";
import { Button } from "../../../src/components/Button";
import { PRHeadshot } from "../../../src/components/Headshot";
import { CodeStreamState } from "../../../store";
import { isFeatureEnabled } from "../../../store/apiVersioning/reducer";
import { getCurrentProviderPullRequest } from "../../../store/providerPullRequests/slice";
import * as providerSelectors from "../../../store/providers/reducer";
import { useAppDispatch, useAppSelector, useDidMount } from "../../../utilities/hooks";
import Icon from "../../Icon";
import { autoCheckedMergeabilityStatus } from "./PullRequest";
import { PullRequestBottomComment } from "../../PullRequestBottomComment";
import {
	PRContent,
	PRConversation,
	PRFoot,
	PRHeadshots,
	PRIconButton,
	PRSection,
	PRSidebar,
} from "../../PullRequestComponents";
import { GHOST, PullRequestTimelineItems } from "./PullRequestTimelineItems";
import { BitbucketParticipantEditScreen } from "../Bitbucket/BitbucketParticipantEditScreen";

// const emojiMap: { [key: string]: string } = require("../../agent/emoji/emojis.json");
// const emojiRegex = /:([-+_a-z0-9]+):/g;

export const Circle = styled.div`
	width: 12px;
	height: 12px;
	border-radius: 6px;
	display: inline-block;
	margin-right: 5px;
	vertical-align: -1px;
`;

const UL = styled.ul`
	padding-left: 20px;
	li {
		margin: 5px 0;
	}
	margin: 20px 0;
`;

const StatusMetaRow = styled.div`
	flex: 1;
	.titleRow {
		display: flex;
	}
	.middle {
		flex: 1;
	}
	.checkRuns {
		margin: 10px -15px 0 -15px;
		max-height: 0;
		overflow-y: auto;
		transition: max-height 0.2s;
		&.expanded {
			max-height: 231px;
		}
		.checkRun {
			display: flex;
			align-items: center;
			border-top: 1px solid;
			border-color: var(--base-border-color);
			padding: 3px 15px;
			${PRIconButton} {
				margin-right: 10px;
			}
			.details {
				margin-left: 10px;
			}
			.description {
				flex: 1;
				display: block;
			}
			.appIcon {
				display: block;
				margin-right: 8px;
				width: 20px;
				height: 20px;
				border-radius: 6px;
				overflow: hidden;
				background-color: #fff;
				&.appIconFallback {
					color: #678;
					display: flex;
					align-items: center;
					justify-content: center;
				}
			}
		}
	}
`;

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
let insertText;
let insertNewline;
let focusOnMessageInput;

export const PullRequestConversationTab = (props: {
	setIsLoadingMessage: Function;
	bbRepo: any;
	checkMergeabilityStatus: Function;
	autoCheckedMergeability: autoCheckedMergeabilityStatus;
	initialScrollPosition: number;
}) => {
	const { bbRepo, setIsLoadingMessage } = props;
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;
		const skipGitEmailCheck = state.preferences.skipGitEmailCheck;
		const addBlameMapEnabled = isFeatureEnabled(state, "addBlameMap");
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const { preferences, ide } = state;

		const prConnectedProviders = providerSelectors.getConnectedSupportedPullRequestHosts(state);

		return {
			defaultMergeMethod: preferences.lastPRMergeMethod || "SQUASH",
			currentUser,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			blameMap,
			currentPullRequest: currentPullRequest,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			pr: currentPullRequest?.conversations?.repository?.pullRequest!,
			team,
			skipGitEmailCheck,
			addBlameMapEnabled,
			isInVscode: ide.name === "VSC",
			pullRequestQueries: state.preferences.pullRequestQueries,
			PRConnectedProviders: prConnectedProviders,
			GitLabConnectedProviders: providerSelectors.getConnectedGitLabHosts(state),
			allRepos:
				preferences.pullRequestQueryShowAllRepos == null
					? true
					: preferences.pullRequestQueryShowAllRepos,
		};
	});
	const { pr } = derivedState;
	const [bottomCommentText, setBottomCommentText] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [isAddReviewer, setIsAddReviewer] = useState(false);

	const __onDidRender = functions => {
		insertText = functions.insertTextAtCursor;
		insertNewline = functions.insertNewlineAtCursor;
		focusOnMessageInput = functions.focus;
	};

	useDidMount(() => {
		if (props.initialScrollPosition) {
			const container = document.getElementById("pr-scroll-container");
			if (container) container.scrollTo({ top: props.initialScrollPosition });
		}
	});

	const quote = text => {
		if (!insertText) return;
		focusOnMessageInput &&
			focusOnMessageInput(() => {
				insertText && insertText(text.replace(/^/gm, "> ") + "\n");
				insertNewline && insertNewline();
			});
	};

	const numParticpants = ((pr.participants && pr.participants.nodes) || []).length;
	const participantsLabel = `${numParticpants} Participant${numParticpants == 1 ? "" : "s"}`;
	const prAuthorLogin = pr?.author?.login || GHOST;

	const numReviewers = ((pr.reviewers && pr.reviewers.nodes) || []).length;
	const reviewersLabel = `${numReviewers} Reviewer${numReviewers == 1 ? "" : "s"}`;

	return (
		<PRContent>
			<div className="main-content">
				<PRConversation>
					<PullRequestTimelineItems
						pr={pr}
						setIsLoadingMessage={setIsLoadingMessage}
						quote={quote}
					/>
					<PRFoot />
				</PRConversation>
				<PullRequestBottomComment
					pr={pr}
					bottomCommentText={bottomCommentText}
					bottomCommentTextCallback={setBottomCommentText}
					setIsLoadingMessage={setIsLoadingMessage}
					__onDidRender={__onDidRender}
					key={Math.random().toString()}
				/>
			</div>
			<PRSidebar>
				<PRSection>
					<h1>{reviewersLabel}</h1>
					<PRHeadshots>
						{pr.reviewers &&
							pr.reviewers.nodes.map((_: any) => {
								let iconName = "circle";
								let color = "gray";
								if (_.state === "changes_requested") {
									iconName = "no-entry";
									color = "orange";
								} else if (_.state === "approved") {
									iconName = "checked-checkbox";
									color = "green";
								}
								const person = { avatarUrl: _.user.links.avatar.href, login: _.user.nickname };
								return (
									<>
										<PRHeadshot
											display="inline-block"
											key={_.user.links.avatar.href}
											person={person}
											size={20}
										/>
										<Icon
											style={{ verticalAlign: "25%", marginRight: "10px", color: color }}
											name={iconName}
										/>
									</>
								);
							})}
						{isOpen ? (
							<BitbucketParticipantEditScreen
								pr={pr}
								isAddReviewer={isAddReviewer}
								onClose={() => {
									setIsOpen(false);
								}}
							></BitbucketParticipantEditScreen>
						) : (
							<>
								<Button
									variant="secondary"
									size="subcompact"
									onClick={() => {
										setIsOpen(true);
										setIsAddReviewer(true);
									}}
								>
									Add
								</Button>

								<Button
									variant="secondary"
									size="subcompact"
									onClick={() => {
										setIsOpen(true);
										setIsAddReviewer(false);
									}}
								>
									Remove
								</Button>
							</>
						)}
					</PRHeadshots>
				</PRSection>
				<PRSection>
					<h1>{participantsLabel}</h1>
					<PRHeadshots>
						{pr.participants &&
							pr.participants.nodes.map((_: any) => {
								let iconName = "circle";
								let color = "gray";
								if (_.state === "changes_requested") {
									iconName = "no-entry";
									color = "orange";
								} else if (_.state === "approved") {
									iconName = "checked-checkbox";
									color = "green";
								}
								const person = { avatarUrl: _.user.links.avatar.href, login: _.user.nickname };
								return (
									<>
										<PRHeadshot
											display="inline-block"
											key={_.user.links.avatar.href}
											person={person}
											size={20}
										/>
										<Icon
											style={{ verticalAlign: "25%", marginRight: "10px", color: color }}
											name={iconName}
										/>
									</>
								);
							})}
					</PRHeadshots>
				</PRSection>
			</PRSidebar>
		</PRContent>
	);
};
