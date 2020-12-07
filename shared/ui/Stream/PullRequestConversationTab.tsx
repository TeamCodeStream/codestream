import React, { useState, useReducer, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
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
	ExecuteThirdPartyTypedType,
	MergeMethod,
	MergePullRequestRequest,
	FetchThirdPartyPullRequestPullRequest
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
	PRResolveConflictsRow,
	PRHeadshots,
	PRResolveConflicts
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
import { api, removeFromMyPullRequests } from "../store/providerPullRequests/actions";
import { PullRequestReviewStatus } from "./PullRequestReviewStatus";
import { autoCheckedMergeabilityStatus } from "./PullRequest";

const Circle = styled.div`
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
	const { pr, node, isPending } = props;

	const badges: any[] = [];

	if (isPending) {
		badges.push(<div className="pending">Pending</div>);
	}

	const nodeAuthor = node.author || GHOST;
	const prAuthor = pr.author || GHOST;
	if (prAuthor.login === nodeAuthor.login) {
		const isMe = nodeAuthor.login === pr.viewer.login;
		badges.push(
			<Tooltip
				key="author"
				title={`${isMe ? "You are" : "This user is"} the author of this pull request`}
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
		console.warn("NO MEMBER ASSOCIATION FOR: ", node.authorAssociation);
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
	fetch: Function;
	ghRepo: any;
	checkMergeabilityStatus: Function;
	autoCheckedMergeability: autoCheckedMergeabilityStatus;
}) => {
	const { ghRepo, fetch, setIsLoadingMessage } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;
		const skipGitEmailCheck = state.preferences.skipGitEmailCheck;
		const addBlameMapEnabled = isFeatureEnabled(state, "addBlameMap");
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const { preferences } = state;

		return {
			defaultMergeMethod: preferences.lastPRMergeMethod || "SQUASH",
			currentUser,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			blameMap,
			currentPullRequest: currentPullRequest,
			pr: currentPullRequest.conversations.repository.pullRequest,
			team,
			skipGitEmailCheck,
			addBlameMapEnabled
		};
	});
	const { pr } = derivedState;

	const [availableLabels, setAvailableLabels] = useState(EMPTY_ARRAY);
	const [availableReviewers, setAvailableReviewers] = useState(EMPTY_ARRAY);
	const [availableAssignees, setAvailableAssignees] = useState(EMPTY_ARRAY);
	const [availableProjects, setAvailableProjects] = useState<[] | undefined>();
	const [availableMilestones, setAvailableMilestones] = useState<[] | undefined>();
	const [availableIssues, setAvailableIssues] = useState(EMPTY_ARRAY);
	const [isLocking, setIsLocking] = useState(false);
	const [isLockingReason, setIsLockingReason] = useState("");
	const [isLoadingLocking, setIsLoadingLocking] = useState(false);
	const [mergeMethod, setMergeMethod] = useState(derivedState.defaultMergeMethod);
	const [clInstructionsIsOpen, toggleClInstructions] = useReducer((open: boolean) => !open, false);
	const [cloneURLType, setCloneURLType] = useState("https");
	const [cloneURL, setCloneURL] = useState(`${pr.repository.url}.git`);

	const __onDidRender = functions => {
		insertText = functions.insertTextAtCursor;
		insertNewline = functions.insertNewlineAtCursor;
		focusOnMessageInput = functions.focus;
	};

	const quote = text => {
		if (!insertText) return;
		focusOnMessageInput &&
			focusOnMessageInput(() => {
				insertText && insertText(text.replace(/^/gm, "> "));
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
				dispatch(removeFromMyPullRequests(pr.providerId, derivedState.currentPullRequestId!));
			}
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
		const gb = _groupBy(pr.reviews.nodes, _ => _.author.id);
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
	}, [availableReviewers, pr]);

	const removeReviewer = async id => {
		setIsLoadingMessage("Removing Reviewer...");
		await dispatch(
			api("removeReviewerFromPullRequest", {
				userId: id
			})
		);
		fetch();
	};
	const addReviewer = async id => {
		setIsLoadingMessage("Requesting Review...");
		await dispatch(
			api("addReviewerToPullRequest", {
				pullRequestId: pr.id,
				userId: id
			})
		);
		fetch();
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
	}, [availableAssignees, pr]);

	const toggleAssignee = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Assignee..." : "Removing Assignee...");
		await dispatch(
			api("setAssigneeOnPullRequest", {
				assigneeId: id,
				onOff
			})
		);
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
							{_.name}
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
	}, [availableLabels, pr]);

	const setLabel = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Label..." : "Removing Label...");
		await dispatch(
			api("setLabelOnPullRequest", {
				labelId: id,
				onOff
			})
		);
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
	}, [availableProjects, pr]);

	const setProject = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding to Project..." : "Removing from Project...");
		await dispatch(
			api("toggleProjectOnPullRequest", {
				projectId: id,
				onOff
			})
		);
		fetch();
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
	}, [availableMilestones, pr]);

	const setMilestone = async (id: string, onOff: boolean) => {
		setIsLoadingMessage(onOff ? "Adding Milestone..." : "Clearing Milestone...");
		await dispatch(
			api("toggleMilestoneOnPullRequest", {
				milestoneId: id,
				onOff
			})
		);
		fetch();
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
	// 	fetch();
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
			const rules = ghRepo.branchProtectionRules.nodes.find(rule =>
				rule.matchingRefs.nodes.find(matchingRef => matchingRef.name === pr.baseRefName)
			);
			return rules ? rules.requiredApprovingReviewCount : undefined;
		}
	}, [ghRepo, pr]);

	// console.warn("ASSI: ", assigneeMenuItems);
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
						fetch={fetch}
						quote={quote}
					/>
					<PRFoot />
				</PRConversation>

				{!pr.merged && pr.mergeable === "MERGEABLE" && pr.state !== "CLOSED" && (
					<PRTimelineItem>
						<PRAction>
							Add more commits by pushing to the <PRBranch>{pr.headRefName}</PRBranch> branch on{" "}
							<PRBranch>
								{ghRepo.repoOwner}/{ghRepo.repoName}
							</PRBranch>
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
							<PRResolveConflictsRow>
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
							</PRResolveConflictsRow>
						</PRCommentCard>
					) : pr.mergeStateStatus === "BLOCKED" ? (
						<PRCommentCard>
							<PRStatusHeadshot className="gray-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
							{pr.reviewDecision === "REVIEW_REQUIRED" ? (
								<PRResolveConflicts>
									<PRResolveConflictsRow>
										<PRIconButton className="red-background">
											<Icon name="x" />
										</PRIconButton>
										<div className="middle">
											<h1>Review Required</h1>
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
									</PRResolveConflictsRow>
									<PullRequestReviewStatus
										pr={pr}
										opinionatedReviews={Object.values(opinionatedReviewsHash)}
									/>
									<PRResolveConflictsRow>
										<PRIconButton className="red-background">
											<Icon name="x" />
										</PRIconButton>
										<div className="middle">
											<h1>Merging is blocked</h1>
											{requiredApprovingReviewCount && (
												<>
													Merging can be performed automatically with {requiredApprovingReviewCount}{" "}
													approving review{requiredApprovingReviewCount > 1 ? "s" : ""}.
												</>
											)}
										</div>
									</PRResolveConflictsRow>
									{ghRepo.viewerPermission === "ADMIN" && (
										<Merge
											ghRepo={ghRepo}
											action={mergePullRequest}
											onSelect={setMergeMethod}
											defaultMergeMethod={derivedState.defaultMergeMethod}
											mergeText="As an administrator, you may still merge this pull request."
										/>
									)}
								</PRResolveConflicts>
							) : ghRepo.viewerPermission === "READ" ? (
								<PRResolveConflicts>
									<PRResolveConflictsRow>
										<PRIconButton className="red-background">
											<Icon name="x" />
										</PRIconButton>
										<div className="middle">
											<h1>Merging is blocked</h1>
											The base branch restricts merging to authorized users.{" "}
											<Link href="https://docs.github.com/en/github/administering-a-repository/about-protected-branches">
												Learn more about protected branches.
											</Link>
										</div>
									</PRResolveConflictsRow>
								</PRResolveConflicts>
							) : (
								<PRResolveConflicts>
									<PRResolveConflictsRow>
										<PRIconButton className="red-background">
											<Icon name="x" />
										</PRIconButton>
										<div className="middle">
											<h1>Merging is blocked</h1>
										</div>
									</PRResolveConflictsRow>
								</PRResolveConflicts>
							)}
						</PRCommentCard>
					) : !pr.merged && pr.mergeable === "MERGEABLE" && pr.state !== "CLOSED" ? (
						<PRCommentCard className="green-border dark-header">
							<PRStatusHeadshot className="green-background">
								<Icon name="git-merge" />
							</PRStatusHeadshot>
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
							<PRResolveConflicts>
								<PRResolveConflictsRow>
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
								</PRResolveConflictsRow>
							</PRResolveConflicts>
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
							<PRResolveConflicts>
								<PRResolveConflictsRow>
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
								</PRResolveConflictsRow>
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
							</PRResolveConflicts>
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
						? pr.labels.nodes.map((_, index) => (
								<Tag key={index} tag={{ label: _.name, color: `#${_.color}` }} />
						  ))
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
