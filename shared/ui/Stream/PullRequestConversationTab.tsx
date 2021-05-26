import React, { useState, useReducer, useCallback, useMemo, FunctionComponent } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { CodeStreamState } from "../store";
import { Button } from "../src/components/Button";
import { CSMe } from "@codestream/protocols/api";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { getCurrentProviderPullRequest } from "../store/providerPullRequests/reducer";
import Icon from "./Icon";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import { PRHeadshot } from "../src/components/Headshot";
import { PRHeadshotName } from "../src/components/HeadshotName";
import Tag from "./Tag";
import { HostApi } from "../webview-api";
import {
	MergeMethod,
	FetchThirdPartyPullRequestPullRequest,
	DidChangeDataNotificationType,
	ChangeDataType,
	CheckRun,
	StatusContext
} from "@codestream/protocols/agent";
import {
	PRContent,
	PRConversation,
	PRComment,
	PRCommentCard,
	PRCommentHeader,
	PRError,
	PRStatusHeadshot,
	PRIconButton,
	PRFoot,
	PRSidebar,
	PRButtonRow,
	PRSection,
	PRBranch,
	PRTimelineItem,
	PRAction,
	PRReviewer,
	PRCloneURLButtons,
	PRCloneURL,
	PRCopyableTerminal,
	PRCloneURLWrapper,
	PRHeadshots,
	PRCommentCardRowsWrapper,
	PRCommentCardRow
} from "./PullRequestComponents";
import { PullRequestTimelineItems, GHOST } from "./PullRequestTimelineItems";
import { DropdownButton } from "./Review/DropdownButton";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { LoadingMessage } from "../src/components/LoadingMessage";
import styled from "styled-components";
import { Modal } from "./Modal";
import { Dialog } from "../src/components/Dialog";
import { Link } from "./Link";
import { setUserPreference } from "./actions";
import copy from "copy-to-clipboard";
import { PullRequestBottomComment } from "./PullRequestBottomComment";
import { reduce as _reduce, groupBy as _groupBy, map as _map } from "lodash-es";
import { api, updatePullRequestLabels } from "../store/providerPullRequests/actions";
import { ColorDonut, PullRequestReviewStatus } from "./PullRequestReviewStatus";
import { autoCheckedMergeabilityStatus } from "./PullRequest";
import cx from "classnames";
import { getPRLabel } from "../store/providers/reducer";
import { useDidMount } from "../utilities/hooks";
import { ProviderPullRequestActionsTypes } from "../store/providerPullRequests/types";

const emojiMap: { [key: string]: string } = require("../../agent/emoji/emojis.json");
const emojiRegex = /:([-+_a-z0-9]+):/g;

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
			}
		}
	}
`;

// https://docs.github.com/en/graphql/reference/enums#commentauthorassociation
const AUTHOR_ASSOCIATION_MAP = {
	COLLABORATOR: ["Collaborator", "Author has been invited to collaborate on the repository."],
	CONTRIBUTOR: ["Contributor", "Author has previously committed to the repository."],
	FIRST_TIMER: ["First Timer", "Author has not previously committed to GitHub."],
	FIRST_TIME_CONTRIBUTOR: [
		"First Time Contributor",
		"Author has not previously committed to the repository."
	],
	MEMBER: ["Member", "Author is a member of the organization that owns the repository."],
	// as per https://trello.com/c/P14tmDQQ/4528-dont-show-none-badge don't show "None"
	// NONE: ["None", "Author has no association with the repository."],
	OWNER: ["Owner", "Author is the owner of the repository."]
};

export const PRAuthorBadges = (props: {
	pr: FetchThirdPartyPullRequestPullRequest;
	node: any;
	isPending?: boolean;
}) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		return { prLabel: getPRLabel(state) };
	}, shallowEqual);

	const { pr, node, isPending } = props;

	const badges: any[] = [];

	if (isPending) {
		badges.push(<div className="pending">Pending</div>);
	}

	const nodeAuthor = node.author || GHOST;
	const prAuthor = pr.author || GHOST;
	if (prAuthor.login === nodeAuthor.login) {
		const isMe = pr.viewer && nodeAuthor.login === pr.viewer.login;
		badges.push(
			<Tooltip
				key="author"
				title={`${isMe ? "You are" : "This user is"} the author of this ${
					derivedState.prLabel.pullrequest
				}`}
				placement="bottom"
			>
				<div className="author">Author</div>
			</Tooltip>
		);
	}

	if (AUTHOR_ASSOCIATION_MAP[node.authorAssociation]) {
		badges.push(
			<Tooltip
				key="association"
				title={AUTHOR_ASSOCIATION_MAP[node.authorAssociation][1]}
				placement="bottom"
			>
				<div className="member">{AUTHOR_ASSOCIATION_MAP[node.authorAssociation][0]}</div>
			</Tooltip>
		);
	} else {
		// console.warn("NO MEMBER ASSOCIATION FOR: ", node.authorAssociation);
	}
	return <>{badges}</>;
};

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
let insertText;
let insertNewline;
let focusOnMessageInput;

export const PullRequestConversationTab = (props: {
	setIsLoadingMessage: Function;
	ghRepo: any;
	checkMergeabilityStatus: Function;
	autoCheckedMergeability: autoCheckedMergeabilityStatus;
	initialScrollPosition: number;
}) => {
	const { ghRepo, setIsLoadingMessage } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;
		const skipGitEmailCheck = state.preferences.skipGitEmailCheck;
		const addBlameMapEnabled = isFeatureEnabled(state, "addBlameMap");
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const { preferences, ide } = state;

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
			pr:
				currentPullRequest &&
				currentPullRequest.conversations &&
				currentPullRequest.conversations.repository &&
				currentPullRequest.conversations.repository.pullRequest,
			team,
			skipGitEmailCheck,
			addBlameMapEnabled,
			isInVscode: ide.name === "VSC"
		};
	});
	const { pr } = derivedState;

	const [availableLabels, setAvailableLabels] = useState(EMPTY_ARRAY);
	const [availableReviewers, setAvailableReviewers] = useState(EMPTY_ARRAY);
	const [availableAssignees, setAvailableAssignees] = useState(EMPTY_ARRAY);
	const [availableProjects, setAvailableProjects] = useState<[] | undefined>();
	const [availableMilestones, setAvailableMilestones] = useState<[] | undefined>();
	// const [availableIssues, setAvailableIssues] = useState(EMPTY_ARRAY);
	const [isLocking, setIsLocking] = useState(false);
	const [isLockingReason, setIsLockingReason] = useState("");
	const [isLoadingLocking, setIsLoadingLocking] = useState(false);
	const [mergeMethod, setMergeMethod] = useState(derivedState.defaultMergeMethod);
	const [clInstructionsIsOpen, toggleClInstructions] = useReducer((open: boolean) => !open, false);
	const [cloneURLType, setCloneURLType] = useState("https");
	const [cloneURL, setCloneURL] = useState(pr && pr.repository ? `${pr.repository.url}.git` : "");

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

	const markPullRequestReadyForReview = async (onOff: boolean) => {
		setIsLoadingMessage("Updating...");
		await dispatch(
			api("markPullRequestReadyForReview", {
				isReady: onOff
			})
		);
		setIsLoadingMessage("");
	};

	const mergePullRequest = useCallback(
		async (options: { mergeMethod: MergeMethod }) => {
			setIsLoadingMessage("Merging...");
			dispatch(setUserPreference(["lastPRMergeMethod"], options.mergeMethod));

			const response = (await dispatch(
				api("mergePullRequest", {
					mergeMethod: options.mergeMethod
				})
			)) as any;
			if (response) {
				HostApi.instance.emit(DidChangeDataNotificationType.method, {
					type: ChangeDataType.PullRequests
				});
			}
			setIsLoadingMessage("");
		},
		[
			pr.providerId,
			derivedState.currentPullRequestId!,
			derivedState.defaultMergeMethod,
			mergeMethod
		]
	);

	const lockPullRequest = async () => {
		setIsLoadingLocking(true);
		let reason = "";
		switch (isLockingReason) {
			case "Off-topic":
				reason = "OFF_TOPIC";
				break;
			case "Too heated":
				reason = "TOO_HEATED";
				break;
			case "Spam":
				reason = "SPAM";
				break;
			case "RESOLVED":
				reason = "RESOLVED";
				break;
		}

		await dispatch(api("lockPullRequest", { lockReason: reason }));

		setIsLocking(false);
		setIsLoadingLocking(false);
	};

	const unlockPullRequest = async () => {
		setIsLoadingLocking(true);
		await dispatch(api("unlockPullRequest", {}));

		setIsLocking(false);
		setIsLoadingLocking(false);
	};

	const numParticpants = ((pr.participants && pr.participants.nodes) || []).length;
	const participantsLabel = `${numParticpants} Participant${numParticpants == 1 ? "" : "s"}`;

	var reviewsHash: any = {};
	var opinionatedReviewsHash: any = {};
	// the list of reviewers isn't in a single spot...

	// these are completed reviews
	if (pr.reviews && pr.reviews.nodes) {
		// group by author
		const gb = _groupBy(pr.reviews.nodes, _ => (_.author || GHOST).id);
		// then convert to hash... key is the author,
		// value is the last review
		const map = _map(gb, (values, key) => {
			const last = values.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			)[0] as any;
			return {
				key: key,
				value: { ...last, ...last.author }
			};
		});
		// reduce to create the correct object structure
		reviewsHash = _reduce(
			map,
			function(obj, param) {
				obj[param.key] = param.value;
				return obj;
			},
			{}
		);
		const opinionatedMap = _map(gb, (values, key) => {
			const opinionatedReviews = values.filter(
				review => review.state === "CHANGES_REQUESTED" || review.state === "APPROVED"
			);
			const last = opinionatedReviews.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			)[0] as any;
			if (last)
				return {
					key: key,
					value: { ...last, ...last.author }
				};
			else return {};
		});
		opinionatedReviewsHash = _reduce(
			opinionatedMap,
			function(obj, param) {
				if (param && param.key) obj[param.key] = param.value;
				return obj;
			},
			{}
		);
	}

	// these are reviews that have been requested (though not started)
	pr.reviewRequests &&
		pr.reviewRequests.nodes.reduce((map, obj) => {
			if (obj && obj.requestedReviewer) {
				map[obj.requestedReviewer.id] = {
					...obj.requestedReviewer,
					isPending: true
				};
			}
			return map;
		}, reviewsHash);

	const reviewers = Object.keys(reviewsHash).map(key => {
		const val = reviewsHash[key];
		return { ...val, id: key };
	}) as { id: string; login: string; avatarUrl: string; isPending: boolean; state: string }[];

	const fetchAvailableReviewers = async (e?) => {
		if (availableReviewers === undefined) {
			setAvailableReviewers(EMPTY_ARRAY);
		}
		const reviewers = (await dispatch(
			api("getReviewers", {
				owner: ghRepo.repoOwner,
				repo: ghRepo.repoName
			})
		)) as any;
		setAvailableReviewers(reviewers);
	};

	const reviewerMenuItems = React.useMemo(() => {
		if (
			availableReviewers === undefined &&
			derivedState.currentPullRequest &&
			derivedState.currentPullRequest.error &&
			derivedState.currentPullRequest.error.message
		) {
			return [
				{
					label: (
						<PRError>
							<Icon name="alert" />
							<div>{derivedState.currentPullRequest.error.message}</div>
						</PRError>
					),
					noHover: true
				}
			];
		}
		const reviewerIds = reviewers.map(_ => _.id);
		if (availableReviewers && availableReviewers.length) {
			const menuItems = availableReviewers.map((_: any) => ({
				checked: reviewerIds.includes(_.id),
				label: <PRHeadshotName person={_} className="no-padding" />,
				subtle: _.name,
				searchLabel: `${_.login}:${_.name}`,
				key: _.id,
				action: () => {
					const reviewer = (reviewers || []).find(r => r.id === _.id);
					if (reviewer && reviewer.isPending) {
						removeReviewer(_.id);
					} else {
						addReviewer(_.id);
					}
				}
			})) as any;
			menuItems.unshift({ type: "search", placeholder: "Type or choose a name" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Reviewers...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableReviewers, pr]);

	const removeReviewer = async id => {
		setIsLoadingMessage("Removing Reviewer...");
		await dispatch(
			api("removeReviewerFromPullRequest", {
				userId: id
			})
		);

		setIsLoadingMessage("");
	};
	const addReviewer = async id => {
		setIsLoadingMessage("Requesting Review...");
		await dispatch(
			api("addReviewerToPullRequest", {
				pullRequestId: pr.id,
				userId: id
			})
		);
		setIsLoadingMessage("");
	};

	const fetchAvailableAssignees = async (e?) => {
		if (availableAssignees === undefined) {
			setAvailableAssignees(EMPTY_ARRAY);
		}
		const assignees = (await dispatch(
			api("getReviewers", {
				owner: ghRepo.repoOwner,
				repo: ghRepo.repoName
			})
		)) as any;
		setAvailableAssignees(assignees);
	};

	const assigneeMenuItems = React.useMemo(() => {
		if (
			availableAssignees === undefined &&
			derivedState.currentPullRequest &&
			derivedState.currentPullRequest.error &&
			derivedState.currentPullRequest.error.message
		) {
			return [
				{
					label: (
						<PRError>
							<Icon name="alert" />
							<div>{derivedState.currentPullRequest.error.message}</div>
						</PRError>
					),
					noHover: true
				}
			];
		}
		const assigneeIds = pr.assignees.nodes.map(_ => _.login);
		if (availableAssignees && availableAssignees.length) {
			const menuItems = (availableAssignees || []).map((_: any) => ({
				checked: assigneeIds.includes(_.login),
				label: <PRHeadshotName person={_} className="no-padding" />,
				subtle: _.name,
				searchLabel: `${_.login}:${_.name}`,
				key: _.id,
				action: () => toggleAssignee(_.id, !assigneeIds.includes(_.login))
			})) as any;
			menuItems.unshift({ type: "search", placeholder: "Type or choose a name" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Assignees...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableAssignees, pr]);

	const toggleAssignee = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Assignee..." : "Removing Assignee...");
		await dispatch(
			api("setAssigneeOnPullRequest", {
				assigneeId: id,
				onOff
			})
		);
		setIsLoadingMessage("");
	};

	const fetchAvailableLabels = async (e?) => {
		const labels = (await dispatch(
			api("getLabels", {
				owner: ghRepo.repoOwner,
				repo: ghRepo.repoName
			})
		)) as any;
		setAvailableLabels(labels);
	};

	const labelMenuItems = React.useMemo(() => {
		if (availableLabels && availableLabels.length) {
			const existingLabelIds = pr.labels ? pr.labels.nodes.map(_ => _.id) : [];
			const menuItems = availableLabels.map((_: any) => {
				const checked = existingLabelIds.includes(_.id);
				return {
					checked,
					label: (
						<>
							<Circle style={{ backgroundColor: `#${_.color}` }} />
							{_.name.replace(emojiRegex, (s: string, code: string) => emojiMap[code] || s)}
						</>
					),
					searchLabel: _.name,
					key: _.id,
					subtext: <div style={{ maxWidth: "250px", whiteSpace: "normal" }}>{_.description}</div>,
					action: () => setLabel(_.id, !checked)
				};
			}) as any;
			menuItems.unshift({ type: "search", placeholder: "Filter labels" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Labels...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableLabels, pr]);

	const setLabel = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Label..." : "Removing Label...");
		await dispatch(
			api("setLabelOnPullRequest", {
				labelId: id,
				onOff
			})
		);
		console.log('FIND MEEEEEE')
		if (availableLabels && availableLabels.length) {
			console.log(availableLabels);
			const label: any = availableLabels.find(elem => elem['id'] === id);
			console.log(label);
			dispatch(
				updatePullRequestLabels(
					derivedState.currentPullRequestProviderId!,
					derivedState.currentPullRequestId!,
					label,
					onOff
				)
			);
		}
		
		setIsLoadingMessage("");
	};

	const fetchAvailableProjects = async (e?) => {
		const projects = (await dispatch(
			api("getProjects", {
				owner: ghRepo.repoOwner,
				repo: ghRepo.repoName
			})
		)) as any;
		setAvailableProjects(projects);
	};

	const projectMenuItems = React.useMemo(() => {
		if (availableProjects && availableProjects.length) {
			const existingProjectIds = pr.projectCards
				? pr.projectCards.nodes.map(_ => _.project.id)
				: [];
			const menuItems = availableProjects.map((_: any) => {
				const checked = existingProjectIds.includes(_.id);
				return {
					checked,
					label: _.name,
					searchLabel: _.name,
					key: _.id,
					subtext: <div style={{ maxWidth: "250px", whiteSpace: "normal" }}>{_.description}</div>,
					action: () => setProject(_.id, !checked)
				};
			}) as any;
			menuItems.unshift({ type: "search", placeholder: "Filter Projects" });
			return menuItems;
		} else if (availableProjects) {
			return [{ label: <LoadingMessage noIcon>No projects found</LoadingMessage>, noHover: true }];
		} else {
			return [{ label: <LoadingMessage>Loading Projects...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableProjects, pr]);

	const setProject = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding to Project..." : "Removing from Project...");
		await dispatch(
			api("toggleProjectOnPullRequest", {
				projectId: id,
				onOff
			})
		);
		setIsLoadingMessage("");
	};

	const fetchAvailableMilestones = async (e?) => {
		const milestones = (await dispatch(
			api("getMilestones", {
				owner: ghRepo.repoOwner,
				repo: ghRepo.repoName
			})
		)) as any;
		setAvailableMilestones(milestones);
	};

	const milestoneMenuItems = React.useMemo(() => {
		if (availableMilestones && availableMilestones.length) {
			const existingMilestoneId = pr.milestone ? pr.milestone.id : "";
			const menuItems = availableMilestones.map((_: any) => {
				const checked = existingMilestoneId === _.id;
				return {
					checked,
					label: _.title,
					searchLabel: _.title,
					key: _.id,
					subtext: _.dueOn && (
						<>
							Due by
							<Timestamp time={_.dueOn} dateOnly />
						</>
					),
					action: () => setMilestone(_.id, !checked)
				};
			}) as any;
			menuItems.unshift({ type: "search", placeholder: "Filter Milestones" });
			return menuItems;
		} else if (availableMilestones) {
			return [
				{ label: <LoadingMessage noIcon>No milestones found</LoadingMessage>, noHover: true }
			];
		} else {
			return [{ label: <LoadingMessage>Loading Milestones...</LoadingMessage>, noHover: true }];
		}
	}, [derivedState.currentPullRequest, availableMilestones, pr]);

	const setMilestone = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Milestone..." : "Clearing Milestone...");
		await dispatch(
			api("toggleMilestoneOnPullRequest", {
				milestoneId: id,
				onOff
			})
		);
		setIsLoadingMessage("");
	};

	// const fetchAvailableIssues = async (e?) => {
	// 	const issues = (await dispatch(
	// 		api("getIssues", {
	// 			owner: ghRepo.repoOwner,
	// 			repo: ghRepo.repoName
	// 		})
	// 	)) as any;
	// 	setAvailableIssues(issues);
	// };

	// const issueMenuItems = React.useMemo(() => {
	// 	if (availableIssues && availableIssues.length) {
	// 		const existingIssueIds = pr.issues ? pr.issues.nodes.map(_ => _.id) : [];
	// 		const menuItems = availableIssues.map((_: any) => {
	// 			const checked = existingIssueIds.includes(_.id);
	// 			return {
	// 				checked,
	// 				label: <>{_.name}</>,
	// 				searchLabel: _.name,
	// 				key: _.id,
	// 				subtext: <div style={{ maxWidth: "250px", whiteSpace: "normal" }}>{_.description}</div>,
	// 				action: () => setIssue(_.id, !checked)
	// 			};
	// 		}) as any;
	// 		menuItems.unshift({ type: "search", placeholder: "Filter" });
	// 		return menuItems;
	// 	} else {
	// 		return [{ label: <LoadingMessage>Loading Issues...</LoadingMessage>, noHover: true }];
	// 	}
	// }, [availableIssues, pr]);

	// const setIssue = async (id: string, onOff: boolean) => {
	// 	setIsLoadingMessage(onOff ? "Adding Issue..." : "Removing Issue...");
	// 	await dispatch(
	// 		api("setIssueOnPullRequest", {
	// 			owner: ghRepo.repoOwner,
	// 			repo: ghRepo.repoName,
	// 			issueId: id,
	// 			onOff
	// 		})
	// 	);
	// };

	const toggleSubscription = async () => {
		const onOff = pr.viewerSubscription === "SUBSCRIBED" ? false : true;
		setIsLoadingMessage(onOff ? "Subscribing..." : "Unsubscribing...");
		await dispatch(
			api("updatePullRequestSubscription", {
				owner: ghRepo.repoOwner,
				repo: ghRepo.repoName,
				onOff
			})
		);
	};

	const requiredApprovingReviewCount = useMemo(() => {
		if (ghRepo.branchProtectionRules) {
			const rules = ghRepo.branchProtectionRules.nodes.find(
				rule =>
					rule && rule.matchingRefs.nodes.find(matchingRef => matchingRef.name === pr.baseRefName)
			);
			return rules ? rules.requiredApprovingReviewCount : undefined;
		}
	}, [ghRepo, pr]);

	// console.warn("ASSI: ", assigneeMenuItems);

	const lastCommit =
		pr &&
		pr.commits &&
		pr.commits.nodes &&
		pr.commits.nodes.length &&
		pr.commits.nodes[0] &&
		pr.commits.nodes[0].commit
			? pr.commits.nodes[0].commit
			: {
					statusCheckRollup: null
			  };
	return (
		<PRContent>
			{isLocking && (
				<Modal translucent verticallyCenter>
					{pr.locked ? (
						<Dialog
							title="Unlock conversation on this pull request"
							onClose={() => setIsLocking(false)}
							narrow
						>
							<UL>
								<li>
									<b>Everyone</b> will be able to comment on this pull request once more.
								</li>
								<li>You can always lock this pull request again in the future.</li>
							</UL>
							<Button fillParent onClick={() => unlockPullRequest()} isLoading={isLoadingLocking}>
								Unlock conversation on this pull request
							</Button>
						</Dialog>
					) : (
						<Dialog
							title="Lock conversation on this pull request"
							onClose={() => setIsLocking(false)}
							narrow
						>
							<UL>
								<li>
									Other users <b>can’t add new comments</b> to this pull request.
								</li>
								<li>
									You and other members of teams with write access to this repository{" "}
									<b>can still leave comments</b> that others can see.
								</li>
								<li>You can always unlock this pull request again in the future.</li>
							</UL>
							<b>Reason for locking</b>
							<div style={{ margin: "5px 0" }}>
								<InlineMenu
									items={[
										{
											label: "Choose a reason",
											key: "choose",
											action: () => setIsLockingReason("Choose a reason")
										},
										{
											label: "Off-topic",
											key: "topic",
											action: () => setIsLockingReason("Off-topic")
										},
										{
											label: "Too heated",
											key: "heated",
											action: () => setIsLockingReason("Too heated")
										},
										{
											label: "Resolved",
											key: "resolved",
											action: () => setIsLockingReason("Resolved")
										},
										{ label: "Spam", key: "spam", action: () => setIsLockingReason("Spam") }
									]}
								>
									{isLockingReason || "Choose a reason"}
								</InlineMenu>
							</div>
							<div className="subtle" style={{ fontSize: "smaller", margin: "10px 0 20px 0" }}>
								Optionally, choose a reason for locking that others can see. Learn more about when
								it’s appropriate to{" "}
								<Link href="https://docs.github.com/en/github/building-a-strong-community/locking-conversations">
									lock conversations
								</Link>
								.
							</div>
							<Button fillParent onClick={() => lockPullRequest()} isLoading={isLoadingLocking}>
								Lock conversation on this pull request
							</Button>
						</Dialog>
					)}
				</Modal>
			)}
			<div className="main-content">
				<PRConversation>
					{/* in the GH data model, the top box is part of the pr, rather than the timeline */}
					<PullRequestTimelineItems
						pr={pr}
						setIsLoadingMessage={setIsLoadingMessage}
						quote={quote}
					/>
					<PRFoot />
				</PRConversation>

				{!pr.merged && pr.mergeable === "MERGEABLE" && pr.state !== "CLOSED" && (
					<PRTimelineItem>
						<PRAction>
							Add more commits by pushing to the{" "}
							<Link href={`${pr.headRepository?.url}/tree/${encodeURIComponent(pr.headRefName)}`}>
								<PRBranch>{pr.headRefName}</PRBranch>
							</Link>{" "}
							branch{" "}
							{pr.headRepositoryOwner?.login && pr.headRepository?.name && (
								<>
									on{" "}
									<Link href={pr.headRepository?.url}>
										<PRBranch>
											{pr.headRepositoryOwner.login}/{pr.headRepository.name}
										</PRBranch>
									</Link>
								</>
							)}
							.
						</PRAction>
					</PRTimelineItem>
				)}

				<PRComment>
					{pr.isDraft ? (
						<PRCommentCard>
							<PRStatusHeadshot className="gray-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							<PullRequestReviewStatus
								pr={pr}
								opinionatedReviews={Object.values(opinionatedReviewsHash)}
							/>
							<PRCommentCardRowsWrapper>
								{lastCommit.statusCheckRollup && <CommitCheckSuite commit={lastCommit} />}
								<PRCommentCardRow>
									<PRIconButton className="gray-background">
										<Icon name="alert" />
									</PRIconButton>
									<div className="middle">
										<h1>This pull request is still a work in progress</h1>
										Draft pull requests cannot be merged
									</div>
									<Button
										className="no-wrap"
										variant="secondary"
										onClick={() => markPullRequestReadyForReview(true)}
									>
										Ready for review
									</Button>
								</PRCommentCardRow>
							</PRCommentCardRowsWrapper>
						</PRCommentCard>
					) : pr.mergeStateStatus === "BLOCKED" ? (
						<PRCommentCard>
							<PRStatusHeadshot className="gray-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							<PRCommentCardRowsWrapper>
								{pr.reviewDecision === "REVIEW_REQUIRED" ? (
									<>
										<PRCommentCardRow>
											<PRIconButton className="red-background">
												<Icon name="x" />
											</PRIconButton>
											<div className="middle">
												<h1 className="red-color">Review Required</h1>
												{requiredApprovingReviewCount ? (
													<>
														At least {requiredApprovingReviewCount} approving review
														{requiredApprovingReviewCount > 1 ? "s" : ""} are required by reviewers
														with write access.{" "}
														<Link href="https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-request-reviews">
															Learn more.
														</Link>
													</>
												) : (
													<>Reviews are required by reviewers with write access.</>
												)}
											</div>
										</PRCommentCardRow>
										<PullRequestReviewStatus
											pr={pr}
											opinionatedReviews={Object.values(opinionatedReviewsHash)}
										/>
										{lastCommit.statusCheckRollup && <CommitCheckSuite commit={lastCommit} />}
										<PRCommentCardRow>
											<PRIconButton className="red-background">
												<Icon name="x" />
											</PRIconButton>
											<div className="middle">
												<h1 className="red-color">Merging is blocked</h1>
												{requiredApprovingReviewCount && (
													<>
														Merging can be performed automatically with{" "}
														{requiredApprovingReviewCount} approving review
														{requiredApprovingReviewCount > 1 ? "s" : ""}.
													</>
												)}
											</div>
										</PRCommentCardRow>
										{ghRepo.viewerPermission === "ADMIN" && (
											<Merge
												ghRepo={ghRepo}
												action={mergePullRequest}
												onSelect={setMergeMethod}
												defaultMergeMethod={derivedState.defaultMergeMethod}
												mergeText="As an administrator, you may still merge this pull request."
											/>
										)}
									</>
								) : ghRepo.viewerPermission === "READ" ? (
									<>
										{lastCommit.statusCheckRollup && <CommitCheckSuite commit={lastCommit} />}
										<PRCommentCardRow>
											<PRIconButton className="red-background">
												<Icon name="x" />
											</PRIconButton>
											<div className="middle">
												<h1 className="red-color">Merging is blocked</h1>
												The base branch restricts merging to authorized users.{" "}
												<Link href="https://docs.github.com/en/github/administering-a-repository/about-protected-branches">
													Learn more about protected branches.
												</Link>
											</div>
										</PRCommentCardRow>
									</>
								) : (
									<>
										{lastCommit.statusCheckRollup && <CommitCheckSuite commit={lastCommit} />}
										<PRCommentCardRow>
											<PRIconButton className="red-background">
												<Icon name="x" />
											</PRIconButton>
											<div className="middle">
												<h1 className="red-color">Merging is blocked</h1>
											</div>
										</PRCommentCardRow>
									</>
								)}
							</PRCommentCardRowsWrapper>
						</PRCommentCard>
					) : !pr.merged && pr.mergeable === "MERGEABLE" && pr.state !== "CLOSED" ? (
						<PRCommentCard className="green-border dark-header">
							<PRStatusHeadshot className="green-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							{lastCommit.statusCheckRollup && <CommitCheckSuite commit={lastCommit} />}
							<PullRequestReviewStatus
								pr={pr}
								opinionatedReviews={Object.values(opinionatedReviewsHash)}
							/>
							<PRCommentHeader>
								<div style={{ display: "flex", marginTop: "10px" }}>
									<PRIconButton className="green-background">
										<Icon name="check" />
									</PRIconButton>
									<div style={{ marginLeft: "10px" }}>
										{mergeMethod === "REBASE" ? (
											<>
												<h1>This branch has no conflicts with the base branch when rebasing</h1>
												{ghRepo.viewerPermission === "READ" ? (
													<p>
														Only those with write access to this repository can merge pull requests.
													</p>
												) : (
													<p>Rebase and merge can be performed automatically.</p>
												)}
											</>
										) : (
											<>
												<h1>This branch has no conflicts with the base branch</h1>
												{ghRepo.viewerPermission === "READ" ? (
													<p>
														Only those with write access to this repository can merge pull requests.
													</p>
												) : (
													<p>Merging can be performed automatically.</p>
												)}
											</>
										)}
									</div>
								</div>
							</PRCommentHeader>
							{ghRepo.viewerPermission !== "READ" && (
								<Merge
									ghRepo={ghRepo}
									action={mergePullRequest}
									onSelect={setMergeMethod}
									defaultMergeMethod={derivedState.defaultMergeMethod}
								/>
							)}
						</PRCommentCard>
					) : !pr.merged && pr.mergeable === "UNKNOWN" ? (
						<PRCommentCard>
							<PRStatusHeadshot className="gray-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							<PRCommentCardRowsWrapper>
								{lastCommit.statusCheckRollup && <CommitCheckSuite commit={lastCommit} />}
								<PRCommentCardRow>
									<PRIconButton className="gray-background">
										<Icon name="alert" />
									</PRIconButton>
									<div className="middle">
										{props.autoCheckedMergeability !== "UNKNOWN" && (
											<h1>Checking the merge status...</h1>
										)}
										{props.autoCheckedMergeability === "UNKNOWN" && (
											<h1>Unable to check the merge status.</h1>
										)}

										{props.autoCheckedMergeability !== "UNKNOWN" && (
											<p>This will update automatically</p>
										)}
									</div>
									{props.autoCheckedMergeability === "UNKNOWN" && (
										<Button
											className="no-wrap"
											variant="secondary"
											onClick={e => props.checkMergeabilityStatus(e)}
										>
											Check status
										</Button>
									)}
								</PRCommentCardRow>
							</PRCommentCardRowsWrapper>
						</PRCommentCard>
					) : !pr.merged && pr.mergeable === "CONFLICTING" ? (
						<PRCommentCard>
							<PRStatusHeadshot className="gray-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							<PullRequestReviewStatus
								pr={pr}
								opinionatedReviews={Object.values(opinionatedReviewsHash)}
							/>
							<PRCommentCardRowsWrapper>
								{lastCommit.statusCheckRollup && <CommitCheckSuite commit={lastCommit} />}
								<PRCommentCardRow>
									<PRIconButton className="gray-background">
										<Icon name="alert" />
									</PRIconButton>
									<div className="middle">
										<h1>This branch has conflicts that must be resolved</h1>
										<p>
											Use the <Link href={`${pr.url}/conflicts`}>web editor</Link> or the{" "}
											<Link onClick={toggleClInstructions}>command line</Link> to resolve conflicts.
										</p>
									</div>
									<Button
										className="no-wrap"
										variant="secondary"
										onClick={() => {
											HostApi.instance.send(OpenUrlRequestType, { url: `${pr.url}/conflicts` });
										}}
									>
										Resolve conflicts
									</Button>
								</PRCommentCardRow>
								{clInstructionsIsOpen && (
									<div>
										<hr />
										<h3>Checkout via command line</h3>
										<p>
											If you cannot merge a pull request automatically here, you have the option of
											checking it out via command line to resolve conflicts and perform a manual
											merge.
										</p>
										<PRCloneURLWrapper>
											<PRCloneURLButtons style={{ flexShrink: 0 }}>
												<Button
													variant={cloneURLType === "https" ? "primary" : "secondary"}
													onClick={e => {
														setCloneURLType("https");
														setCloneURL(`${pr.repository.url}.git`);
													}}
												>
													HTTPS
												</Button>
												<Button
													variant={cloneURLType === "ssh" ? "primary" : "secondary"}
													onClick={e => {
														setCloneURLType("ssh");
														setCloneURL(`git@github.com:${pr.repository.nameWithOwner}.git`);
													}}
												>
													SSH
												</Button>
												<Button
													variant={cloneURLType === "patch" ? "primary" : "secondary"}
													onClick={e => {
														setCloneURLType("patch");
														setCloneURL(`${pr.url}.patch`);
													}}
												>
													Patch
												</Button>
											</PRCloneURLButtons>
											<PRCloneURL>
												<input type="text" value={cloneURL} disabled={true} />
												<Icon
													title="Copy"
													placement="bottom"
													name="copy"
													className="clickable"
													onClick={e => copy(cloneURL)}
												/>
											</PRCloneURL>
										</PRCloneURLWrapper>
										<p>
											<b>Step 1:</b> From your project repository, bring in the changes and test.
										</p>
										<CopyableTerminal
											code={
												`git fetch origin\n` +
												`git checkout -b ${pr.headRefName} origin/${pr.headRefName}\n` +
												`git merge ${pr.baseRefName}`
											}
										/>
										<p>
											<b>Step 2:</b> Merge the changes and update on GitHub.
										</p>
										<CopyableTerminal
											code={
												`git checkout ${pr.baseRefName}\n` +
												`git merge --no-ff ${pr.headRefName}\n` +
												`git push origin ${pr.baseRefName}`
											}
										/>
									</div>
								)}
							</PRCommentCardRowsWrapper>
						</PRCommentCard>
					) : !pr.merged && pr.mergeable !== "CONFLICTING" && pr.state === "CLOSED" ? (
						<PRCommentCard>
							<PRStatusHeadshot className="gray-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							<div style={{ padding: "5px 0" }}>
								<h1>Closed with unmerged commits</h1>
								This pull request is closed, but the <PRBranch>{pr.headRefName}</PRBranch> branch
								has unmerged commits.
							</div>
						</PRCommentCard>
					) : pr.merged ? (
						<PRCommentCard>
							<PRStatusHeadshot className="pr-purple-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							<div style={{ padding: "5px 0" }}>
								<h1>Pull request successfully merged and closed</h1>
								You're all set&mdash;the <PRBranch>{pr.headRefName}</PRBranch> branch can be safely
								deleted.
							</div>
						</PRCommentCard>
					) : null}
				</PRComment>
				<PullRequestBottomComment
					pr={pr}
					setIsLoadingMessage={setIsLoadingMessage}
					__onDidRender={__onDidRender}
				/>
			</div>
			<PRSidebar>
				<PRSection>
					<h1>
						<InlineMenu
							className="subtle"
							items={reviewerMenuItems}
							onOpen={fetchAvailableReviewers}
							title="Request up to 15 reviewers"
							noChevronDown
							noFocusOnSelect
						>
							<Icon name="gear" className="settings clickable" onClick={() => {}} />
							Reviewers
						</InlineMenu>
					</h1>
					{reviewers.length > 0
						? reviewers.map((_, index) => (
								<PRReviewer key={index}>
									<PRHeadshotName key={_.avatarUrl} person={_} size={20} />
									<div className="status">
										{_.isPending && (
											<Tooltip placement="top" title={"Awaiting requested review from " + _.login}>
												<b className="pending" />
											</Tooltip>
										)}
										{_.state === "CHANGES_REQUESTED" && (
											<>
												<Tooltip placement="top" title={"Re-request review"}>
													<Icon name="refresh" onClick={e => addReviewer(_.id)} />
												</Tooltip>
												<Tooltip placement="top" title={_.login + " requested changes"}>
													<Icon name="file-diff" className="rejected" />
												</Tooltip>
											</>
										)}
										{_.state === "COMMENTED" && (
											<>
												{_.login !== pr.viewer.login && (
													<Tooltip placement="top" title={"Re-request review"}>
														<Icon name="refresh" onClick={e => addReviewer(_.id)} />
													</Tooltip>
												)}
												<Tooltip placement="top" title={_.login + " left review comments"}>
													<Icon name="comment" />
												</Tooltip>
											</>
										)}
										{_.state === "APPROVED" && (
											<>
												{_.login !== pr.viewer.login && (
													<Tooltip placement="top" title={"Re-request review"}>
														<Icon name="refresh" onClick={e => addReviewer(_.id)} />
													</Tooltip>
												)}
												<Tooltip placement="top" title={_.login + " approved these changes"}>
													<Icon name="check" className="approved" />
												</Tooltip>
											</>
										)}
									</div>
								</PRReviewer>
						  ))
						: "No reviewers"}
				</PRSection>
				<PRSection>
					<h1>
						<InlineMenu
							className="subtle"
							items={assigneeMenuItems}
							onOpen={fetchAvailableAssignees}
							title="Assign up to 10 people to this pull request"
							noChevronDown
							noFocusOnSelect
						>
							<Icon name="gear" className="settings clickable" onClick={() => {}} />
							Assignees
						</InlineMenu>
					</h1>
					{pr.assignees && pr.assignees.nodes.length > 0 ? (
						pr.assignees.nodes.map((_: any, index: number) => (
							<span key={index}>
								<PRHeadshotName key={_.avatarUrl} person={_} size={20} />
								<br />
							</span>
						))
					) : (
						<>
							No one&mdash;
							<a onClick={() => toggleAssignee(pr.viewer.id, true)}>assign yourself</a>
						</>
					)}
				</PRSection>
				<PRSection>
					<h1>
						<InlineMenu
							className="subtle"
							items={labelMenuItems}
							onOpen={fetchAvailableLabels}
							title="Apply labels to this pull request"
							noChevronDown
							noFocusOnSelect
						>
							<Icon name="gear" className="settings clickable" />
							Labels
						</InlineMenu>
					</h1>
					{pr.labels && pr.labels.nodes.length > 0
						? pr.labels.nodes.map((_, index) => {
								return (
									<Tag
										key={index}
										tag={{
											label: _.name.replace(
												emojiRegex,
												(s: string, code: string) => emojiMap[code] || s
											),
											color: `#${_.color}`
										}}
									/>
								);
						  })
						: "None yet"}
				</PRSection>
				<PRSection>
					<h1>
						<InlineMenu
							className="subtle"
							items={projectMenuItems}
							onOpen={fetchAvailableProjects}
							title="Projects"
							noChevronDown
							noFocusOnSelect
						>
							<Icon name="gear" className="settings clickable" onClick={() => {}} />
							Projects
						</InlineMenu>
					</h1>
					{pr.projectCards && pr.projectCards.nodes.length > 0
						? pr.projectCards.nodes.map((_: any) => (
								<div key={_.project.name} style={{ marginBottom: "5px" }}>
									<Icon name="project" /> {_.project.name}
								</div>
						  ))
						: "None yet"}
				</PRSection>
				<PRSection>
					<h1>
						<InlineMenu
							className="subtle"
							items={milestoneMenuItems}
							onOpen={fetchAvailableMilestones}
							title="Set milestone"
							noChevronDown
							noFocusOnSelect
						>
							<Icon name="gear" className="settings clickable" onClick={() => {}} />
							Milestone
						</InlineMenu>
					</h1>
					{pr.milestone ? <div>{pr.milestone.title}</div> : "No milestone"}
				</PRSection>
				{/* https://github.community/t/get-all-issues-linked-to-a-pull-request/14653 
				<PRSection>
					<h1>
						<InlineMenu
							className="subtle"
							items={issueMenuItems}
							onOpen={fetchAvailableIssues}
							title="Link an issue from this repository"
							noChevronDown
							noFocusOnSelect
						>
							<Icon name="gear" className="settings clickable" onClick={() => {}} />
							Linked Issues
						</InlineMenu>
					</h1>
					Successfully merging this pull request may close these issues.
					<div style={{ height: "10px" }}></div>
					None yet
				</PRSection>
				*/}
				{!derivedState.isInVscode && (
					<PRSection>
						<h1>
							{/* <Icon name="gear" className="settings clickable" onClick={() => {}} /> */}
							Notifications
						</h1>
						{pr.viewerSubscription === "SUBSCRIBED" ? (
							<>
								<Button variant="secondary" className="no-wrap" onClick={toggleSubscription}>
									<Icon name="mute" /> <span className="wide-text">Unsubscribe</span>
								</Button>
								<span className="wide-text">
									You’re receiving notifications because you’re watching this repository.
								</span>
							</>
						) : (
							<>
								<Button variant="secondary" onClick={toggleSubscription}>
									<Icon name="unmute" /> <span className="wide-text">Subscribe</span>
								</Button>
								<span className="wide-text">
									You’re not receiving notifications from this pull request.
								</span>
							</>
						)}
					</PRSection>
				)}
				<PRSection>
					<h1>{participantsLabel}</h1>
					<PRHeadshots>
						{pr.participants &&
							pr.participants.nodes.map((_: any) => (
								<PRHeadshot display="inline-block" key={_.avatarUrl} person={_} size={20} />
							))}
					</PRHeadshots>
				</PRSection>
				<PRSection style={{ borderBottom: "none" }}>
					{pr.viewerCanUpdate && (
						<h1 style={{ margin: 0 }}>
							{pr.locked ? (
								<a onClick={() => setIsLocking(true)} style={{ display: "flex" }}>
									<Icon name="key" className="clickable" style={{ marginRight: "5px" }} />
									Unlock Conversation
								</a>
							) : (
								<a onClick={() => setIsLocking(true)} style={{ display: "flex" }}>
									<Icon name="lock" className="clickable" style={{ marginRight: "5px" }} />
									Lock Conversation
								</a>
							)}
						</h1>
					)}
				</PRSection>
			</PRSidebar>
		</PRContent>
	);
};

const Merge = (props: {
	ghRepo: any;
	onSelect: Function;
	action: Function;
	defaultMergeMethod: string;
	mergeText?: string;
}) => {
	const { ghRepo, onSelect, action, defaultMergeMethod, mergeText } = props;
	return (
		<div style={{ padding: "5px 0" }}>
			{mergeText}
			<PRButtonRow className="align-left">
				<DropdownButton
					items={[
						{
							key: "MERGE",
							label: "Create a merge commit",
							subtext: (
								<span>
									All commits from this branch will be added to
									<br />
									the base branch via a merge commit.
									{!ghRepo.mergeCommitAllowed && (
										<>
											<br />
											<small>Not enabled for this repository</small>
										</>
									)}
								</span>
							),
							disabled: !ghRepo.mergeCommitAllowed,
							onSelect: () => onSelect("MERGE"),
							action: () => action({ mergeMethod: "MERGE" })
						},
						{
							key: "SQUASH",
							label: "Squash and merge",
							subtext: (
								<span>
									The commits from this branch will be combined
									<br />
									into one commit in the base branch.
								</span>
							),
							disabled: !ghRepo.squashMergeAllowed,
							onSelect: () => onSelect("SQUASH"),
							action: () => action({ mergeMethod: "SQUASH" })
						},
						{
							key: "REBASE",
							label: "Rebase and merge",
							subtext: (
								<span>
									The commits from this branch will be rebased
									<br />
									and added to the base branch.
								</span>
							),
							disabled: !ghRepo.rebaseMergeAllowed,
							onSelect: () => onSelect("REBASE"),
							action: () => action({ mergeMethod: "REBASE" })
						}
					]}
					selectedKey={defaultMergeMethod}
					variant="success"
					splitDropdown
				/>
			</PRButtonRow>
		</div>
	);
};

const CommitCheckSuite = (props: { commit: any }) => {
	const [isChecksOpen, toggleChecks] = useReducer((open: boolean) => !open, true);

	const { commit } = props;
	if (!commit.statusCheckRollup) {
		return <></>;
	}

	const checksData = React.useMemo(() => {
		return getChecksData(commit.statusCheckRollup.contexts.nodes);
	}, [commit]);

	const statusMeta = React.useMemo(() => {
		let status = "";
		const checkStatuses = {
			success: {
				count: 0,
				title: "successful"
			},
			inProgress: {
				count: 0,
				title: "in progress"
			},
			cancel: {
				count: 0,
				title: "cancelled"
			},
			failure: {
				count: 0,
				title: "failing"
			},
			actionRequired: {
				count: 0,
				title: "action required"
			},
			error: {
				count: 0,
				title: "errored"
			},
			pending: {
				count: 0,
				title: "pending"
			},
			queued: {
				count: 0,
				title: "queued"
			},
			neutral: {
				count: 0,
				title: "neutral"
			},
			skipped: {
				count: 0,
				title: "skipped"
			},
			total: {
				count: 0,
				title: "total"
			}
		};

		// if (checksData.length === 0) {
		// 	return {label: "", data: checkStatuses};
		// }

		checksData.map(checkData => {
			if (checkStatuses[checkData.state]) {
				checkStatuses[checkData.state].count++;
				if (checkData.state !== "skipped") checkStatuses.total.count++;
			}
		});

		const statuses = Object.entries(checkStatuses)
			.filter(([, statusType]) => statusType.count > 0 && statusType.title !== "total")
			.map(([, statusType]) => `${statusType.count} ${statusType.title}`);

		const statusLabel = checkStatuses.total.count > 1 ? "checks" : "check";
		if (statuses.length === 1) {
			status = `${statuses[0]} ${statusLabel}`;
		} else if (statuses.length === 2) {
			status = `${statuses.join(" and ")} ${statusLabel}`;
		} else {
			statuses[statuses.length - 1] = `and ${statuses[statuses.length - 1]}`;
			status = `${statuses.join(", ")} ${statusLabel}`;
		}

		return { label: status, data: checkStatuses };
	}, [commit]);

	const statusTitle = React.useMemo(() => {
		switch (commit.statusCheckRollup.state) {
			case "SUCCESS":
				return "All checks have passed";
			case "ERROR":
			case "FAILURE":
				const failureChecks =
					statusMeta.data.failure.count +
					statusMeta.data.error.count +
					statusMeta.data.actionRequired.count;
				const totalChecks = statusMeta.data.total.count;
				return failureChecks === totalChecks
					? "All checks have failed"
					: "Some checks were not successful";
			case "EXPECTED":
			case "PENDING":
				return "Some checks haven’t completed yet";
		}
		return "";
	}, [commit]);

	const statusTitleColor = React.useMemo(() => {
		switch (commit.statusCheckRollup.state) {
			case "SUCCESS":
				return "";
			case "ERROR":
			case "FAILURE":
				return "red";
			case "EXPECTED":
			case "PENDING":
				return "gray";
		}
		return "";
	}, [commit]);

	const CheckSuiteStatusIcon = () => {
		switch (commit.statusCheckRollup.state) {
			case "SUCCESS":
				return (
					<PRIconButton className="green-background">
						<Icon name="check" />
					</PRIconButton>
				);
			case "ERROR":
			case "FAILURE":
				const totalChecks = statusMeta.data.total.count;
				const successChecks = statusMeta.data.success.count;
				const failureChecks =
					statusMeta.data.failure.count +
					statusMeta.data.error.count +
					statusMeta.data.actionRequired.count;
				const pendingChecks = statusMeta.data.pending.count;
				const neutralChecks = statusMeta.data.neutral.count;
				const totalDonutChecks = successChecks + failureChecks + pendingChecks + neutralChecks;
				if (totalChecks > failureChecks && totalDonutChecks > 0) {
					const green = (360 * successChecks) / totalDonutChecks;
					const red = (360 * failureChecks) / totalDonutChecks;
					const yellow = (360 * pendingChecks) / totalDonutChecks;
					const gray = (360 * neutralChecks) / totalDonutChecks;
					return <ColorDonut green={green} red={red} yellow={yellow} gray={gray} />;
				}
				return (
					<PRIconButton className="red-background">
						<Icon name="x" />
					</PRIconButton>
				);
			case "EXPECTED":
			case "PENDING":
				return (
					<PRIconButton className="yellow-background">
						<Icon name="check" />
					</PRIconButton>
				);
			default:
				return <></>;
		}
	};

	return (
		<PRCommentCardRow>
			<StatusMetaRow>
				<div className="titleRow">
					<CheckSuiteStatusIcon />
					<div className="middle">
						<div style={{ float: "right" }}>
							<Link onClick={toggleChecks}>{isChecksOpen ? "Hide" : "Show"} all checks</Link>
						</div>
						<h1 className={`${statusTitleColor}-color`}>{statusTitle}</h1>
						{statusMeta.label}
					</div>
				</div>
				{isChecksOpen && (
					<div className={cx("checkRuns", { expanded: isChecksOpen })}>
						{checksData.map(checkData => (
							<CommitCheckRun checkData={checkData} />
						))}
					</div>
				)}
			</StatusMetaRow>
		</PRCommentCardRow>
	);
};

const CommitCheckRun = (props: { checkData: CheckData }) => {
	const { checkData } = props;

	return (
		<div className="checkRun">
			<PRIconButton>
				{checkData.statusIcon && (
					<Icon name={checkData.statusIcon.name} className={checkData.statusIcon.className} />
				)}
			</PRIconButton>
			{checkData.appIcon && checkData.appIcon.src && (
				<Icon
					src={
						checkData.appIcon.src.match(/^http/)
							? checkData.appIcon.src
							: `https://github.com${checkData.appIcon.src}`
					}
					title={checkData.appIcon.title}
					className="appIcon"
				/>
			)}
			{checkData.Description && <>{checkData.Description}</>}
			<Link href={checkData.detailsLink} className="details">
				Details
			</Link>
		</div>
	);
};

const CopyableTerminal = (props: any) => {
	return (
		<PRCopyableTerminal>
			<code>
				<pre>{props.code}</pre>
			</code>
			<Icon
				title="Copy"
				placement="bottom"
				name="copy"
				className="clickable"
				onClick={e => copy(props.code)}
			/>
		</PRCopyableTerminal>
	);
};

const getChecksData = (statusChecks: (CheckRun | StatusContext)[]) => {
	let checksData: CheckData[] = [];
	statusChecks.map(statusCheck => {
		const checkData = {} as CheckData;

		if (statusCheck.__typename === "CheckRun") {
			const check = statusCheck as CheckRun;
			let description: JSX.Element | string = "";
			switch (check.status) {
				case "QUEUED":
					checkData.state = "queued";
					description = <i>In progress — This check has started...</i>;
					break;
				case "IN_PROGRESS":
					checkData.state = "inProgress";
					description = <i>Queued — Waiting to run this check...</i>;
					break;
				case "COMPLETED":
					let formattedDuration;
					if (check.startedAt && check.completedAt) {
						formattedDuration = getCheckDuration(check.startedAt, check.completedAt);
					}

					switch (check.conclusion) {
						case "SUCCESS":
							checkData.state = "success";
							description = (
								<span>{formattedDuration > "" ? `Successful in ${formattedDuration}` : ""}</span>
							);
							break;
						case "FAILURE":
							checkData.state = "failure";
							description = (
								<span>{formattedDuration > "" ? `Failing after ${formattedDuration}` : ""}</span>
							);
							break;
						case "CANCELLED":
							description = (
								<span>{formattedDuration > "" ? `Cancelled after ${formattedDuration}` : ""}</span>
							);
							checkData.state = "cancel";
							break;
						case "NEUTRAL":
							checkData.state = "neutral";
							break;
						case "SKIPPED":
							checkData.state = "skipped";
							break;
						case "ACTION_REQUIRED":
							checkData.state = "actionRequired";
							break;
						default:
							checkData.state = "undefined";
							break;
					}
					break;
				default:
					checkData.state = "undefined";
					break;
			}

			if (check.checkSuite.app) {
				checkData.appIcon = {
					src: check.checkSuite.app.logoUrl,
					title: `@${check.checkSuite.app.slug} generated this status`
				};
			} else {
				checkData.appIcon = { src: "", title: "" };
			}
			checkData.Description = (
				<div className="description">
					<strong style={{ marginRight: "8px" }}>{check.name}</strong> {description}{" "}
					{check.title && <> — {check.title}</>}
				</div>
			);
			checkData.sortBy = check.name;
			checkData.detailsLink = check.detailsUrl;
		}

		if (statusCheck.__typename === "StatusContext") {
			const check = statusCheck as StatusContext;
			switch (check.state) {
				case "EXPECTED":
					checkData.state = "expected";
					break;
				case "ERROR":
					checkData.state = "error";
					break;
				case "FAILURE":
					checkData.state = "failure";
					break;
				case "PENDING":
					checkData.state = "pending";
					break;
				case "SUCCESS":
					checkData.state = "success";
					break;
				default:
					checkData.state = "undefined";
					break;
			}

			checkData.appIcon = {
				src: check.avatarUrl,
				title: ` generated this status`
			};
			checkData.Description = (
				<div className="description">
					<strong>{check.context}</strong>
					{check.description && <> — {check.description}</>}
				</div>
			);
			checkData.detailsLink = check.targetUrl;
			checkData.sortBy = check.context;
		}

		switch (checkData.state) {
			case "actionRequired":
			case "error":
			case "failure":
				checkData.statusIcon = {
					name: "x",
					className: "red-color"
				};
				break;
			case "inProgress":
				checkData.statusIcon = {
					name: "dot-fill",
					className: "yellow-color"
				};
				break;
			case "pending":
				checkData.statusIcon = {
					name: "dot-fill",
					className: "yellow-color"
				};
				break;
			case "queued":
				checkData.statusIcon = {
					name: "dot-fill",
					className: "yellow-color"
				};
				break;
			case "success":
				checkData.statusIcon = {
					name: "check",
					className: "green-color"
				};
				break;
			case "expected":
				checkData.statusIcon = {
					name: "dot-fill",
					className: "yellow-color"
				};
				break;
			case "neutral":
				checkData.statusIcon = {
					name: "dot-fill",
					className: "gray-color"
				};
				break;
			case "cancel":
				checkData.statusIcon = {
					name: "stop",
					className: "gray-color"
				};
				break;
			case "undefined":
			default:
				checkData.statusIcon = {
					name: "dot-fill",
					className: "yellow-color"
				};
				break;
		}

		checksData.push(checkData);
	});

	// github sorts by status by section.... i think. commenting out because this clearly isn't correct
	// checksData.sort((a, b) => (a.sortBy || "").localeCompare(b.sortBy || ""));

	return checksData;
};

const getCheckDuration = (startedAt, completedAt): string => {
	const startTime = new Date(startedAt);
	const endTime = new Date(completedAt);
	const duration = endTime.getTime() - startTime.getTime();
	const minutes = Math.floor(duration / 60000);
	const seconds = ((duration % 60000) / 1000).toFixed(0);

	return minutes > 0 ? `${minutes}m` : `${seconds}s`;
};

interface CheckData {
	state:
		| "queued"
		| "inProgress"
		| "failure"
		| "error"
		| "cancel"
		| "success"
		| "pending"
		| "expected"
		| "neutral"
		| "skipped"
		| "actionRequired"
		| "undefined";
	statusIcon: {
		name: string;
		className: string;
	};
	appIcon: {
		src: string;
		title: string;
	};
	sortBy: string;
	Description: JSX.Element;
	detailsLink: string;
}
