import { CodeStreamState } from "@codestream/webview/store";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import Icon from "../../Icon";
import { Button } from "../../../src/components/Button";
import { PullRequestQuery } from "@codestream/protocols/api";
import { Link } from "../../Link";
import { replaceHtml } from "../../../utils";
import { PRBranch, PRError } from "../../PullRequestComponents";
import { api, getMyPullRequests } from "../../../store/providerPullRequests/actions";
import MessageInput from "../../MessageInput";
import { TextInput } from "@codestream/webview/Authentication/TextInput";
import { Modal } from "../../Modal";
import { Dialog } from "@codestream/webview/src/components/Dialog";
import { PullRequestRoot } from "./PullRequest";
import { confirmPopup } from "../../Confirm";
import { closeAllModals } from "@codestream/webview/store/context/actions";
import { DropdownButton } from "../../Review/DropdownButton";
import { Checkbox } from "@codestream/webview/src/components/Checkbox";
import { SmartFormattedList } from "../../SmartFormattedList";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import Timestamp from "../../Timestamp";
import { Circle } from "../../PullRequestConversationTab";
import { HostApi } from "@codestream/webview/index";
import { OpenUrlRequestType } from "../../../ipc/host.protocol";
import { getCurrentProviderPullRequest } from "@codestream/webview/store/providerPullRequests/reducer";
import * as providerSelectors from "../../../store/providers/reducer";
import { FetchProviderDefaultPullRequestsType } from "@codestream/protocols/agent";

const Label = styled.div`
	margin-top: 20px;
	color: var(--text-color-highlight);
	font-weight: bold;
`;

const Subtle = styled.div`
	color: var(--text-color-subtle);
`;

const ButtonRow = styled.div`
	display: flex;
	align-items: center;
	padding: 20px 0 0 0;
`;

const Right = styled.div`
	margin-left: auto;
	button {
		margin-left: 10px;
	}
`;

const ResponsiveRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: top;
`;

const ResponsiveLabel = styled.label`
	text-align: right;
	color: var(--text-color-highlight);
	font-weight: bold;
	.codemark-form & {
		margin-top: 10px !important;
	}
	padding-right: 5px;
	flex: 0 0 22%;
	max-width: 22%;
	@media only screen and (max-width: 350px) {
		flex: 0 0 100%;
		max-width: 100%;
		text-align: left;
	}
`;

const ResponsiveValue = styled.div`
	flex: 0 0 75%;
	max-width: 75%;
	@media only screen and (max-width: 350px) {
		flex: 0 0 100%;
		max-width: 100%;
		padding: 5px 0 5px 0;
	}
	padding: 5px 0 5px 10px;
	button {
		width: 200px;
	}
	a {
		white-space: nowrap;
	}
`;

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
const EMPTY_ARRAY_2 = [];
const EMPTY_ARRAY_3 = [];
let insertText;
let insertNewline;
let focusOnMessageInput;

export const EditPullRequest = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const team = state.teams[state.context.currentTeamId];
		const teamSettings = team.settings ? team.settings : (EMPTY_HASH as any);
		const { preferences } = state;

		const prConnectedProviders = providerSelectors.getConnectedSupportedPullRequestHosts(state);

		return {
			supportsReviewers:
				currentPullRequest?.conversations?.project?.mergeRequest?.supports?.reviewers,
			supportsMultipleAssignees: teamSettings.gitLabMultipleAssignees,
			supportsMultipleReviewers: teamSettings.gitLabMultipleAssignees,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			pullRequestQueries: state.preferences.pullRequestQueries,
			PRConnectedProviders: prConnectedProviders,
			allRepos:
				preferences.pullRequestQueryShowAllRepos == null
					? true
					: preferences.pullRequestQueryShowAllRepos
		};
	});

	const { pr, setIsEditing } = props;
	const [title, setTitle] = useState<string>(pr.title || "");
	const [description, setDescription] = useState<string>(pr.description || "");
	const [isPreviewing, setIsPreviewing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [deleteSourceBranch, setDeleteSourceBranch] = useState(pr.forceRemoveSourceBranch);
	const [squashCommits, setSquashCommits] = useState(pr.squashOnMerge);
	const [targetBranch, setTargetBranch] = useState(pr.targetBranch);
	const [defaultQueries, setDefaultQueries] = React.useState({});

	useDidMount(() => {
		(async () => {
			const defaultQueriesResponse: any = (await HostApi.instance.send(
				FetchProviderDefaultPullRequestsType,
				{}
			)) as any;
			if (defaultQueriesResponse) {
				setDefaultQueries(defaultQueriesResponse);
			}
		})();
	});

	const save = async () => {
		setIsLoading(true);
		await dispatch(
			api("updatePullRequest", {
				title,
				description: replaceHtml(description),
				targetBranch,
				labels: labelsField.map(_ => _.title).join(","),
				availableLabels: availableLabels,
				milestoneId: milestoneField
					? milestoneField.id.toString().replace("gid://gitlab/Milestone/", "")
					: "",
				assigneeIds: assigneesField
					.filter(_ => _.id)
					.map(_ => _.id.toString().replace("gid://gitlab/User/", ""))
					.join(","),
				reviewerIds: derivedState.supportsReviewers
					? reviewersField
							.filter(_ => _.id)
							.map(_ => _.id.toString().replace("gid://gitlab/User/", ""))
							.join(",")
					: undefined,
				deleteSourceBranch,
				squashCommits
			})
		);
		await new Promise(resolve => {
			setTimeout(resolve, 2000);
		});
		fetchPRs();
		cancel();
	};

	const fetchPRs = async () => {
		for (const connectedProvider of derivedState.PRConnectedProviders) {
			if (connectedProvider.id === derivedState.currentPullRequestProviderId) {
				try {
					if (derivedState.pullRequestQueries || defaultQueries[connectedProvider.id]) {
						const options = { force: true, alreadyLoading: false };

						const providerQuery: PullRequestQuery[] = derivedState.pullRequestQueries
							? derivedState.pullRequestQueries[connectedProvider.id]
							: defaultQueries[connectedProvider.id];
						const queryStrings = Object.values(providerQuery).map(_ => _.query);

						await dispatch(
							getMyPullRequests(
								connectedProvider.id,
								queryStrings,
								!derivedState.allRepos,
								options,
								true
							)
						);
					}
				} catch (error) {
					console.error(error);
				}
			}
		}
	};

	const deletePR = () => {
		confirmPopup({
			title: "Are you sure?",
			message: "Merge request will be removed.",
			centered: true,
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Delete",
					className: "delete",
					wait: true,
					action: () => {
						dispatch(api("deletePullRequest", {}));
						dispatch(closeAllModals());
					}
				}
			]
		});
	};

	const [remoteBranches, setRemoteBranches] = useState([] as any[]);

	const fetchRemoteBranches = async () => {
		const response = (await dispatch(api("remoteBranches", {}))) as any;
		setRemoteBranches(response.filter(_ => _.name !== pr.sourceBranch));
	};

	useDidMount(() => {
		fetchAvailableAssignees();
		if (derivedState.supportsReviewers) fetchAvailableReviewers();
		fetchAvailableMilestones();
		fetchAvailableLabels();
		fetchRemoteBranches();
	});

	const cancel = () => setIsEditing(false);

	const [availableReviewers, setAvailableReviewers] = useState(EMPTY_ARRAY_3);
	const fetchAvailableReviewers = async (e?) => {
		if (availableReviewers === undefined) {
			setAvailableReviewers([]);
		}
		const reviewers = (await dispatch(api("getReviewers", {}))) as any;
		setAvailableReviewers(reviewers.users);
	};

	const [reviewersField, setReviewersField] = useState(pr.reviewers ? pr.reviewers.nodes : []);
	const reviewersLabel =
		reviewersField.length > 0 ? (
			<SmartFormattedList value={reviewersField.map(_ => _.login)} />
		) : (
			"None"
		);

	const reviewersMenuItems = React.useMemo(() => {
		const reviewerIds = reviewersField.map(_ => _.login);
		if (availableReviewers && availableReviewers.length) {
			const menuItems = (availableReviewers || []).map((_: any) => {
				const longId = `gid://gitlab/User/${_.id}`;
				const checked = reviewerIds.includes(_.login) || reviewerIds.includes(longId);
				return {
					checked,
					label: <PRHeadshotName person={{ ..._, user: _.login }} className="no-padding" />,
					subtle: _.name,
					searchLabel: `${_.login}:${_.name}`,
					key: _.id,
					action: () => {
						if (derivedState.supportsMultipleReviewers) {
							const newReviewers = [
								...reviewersField.filter(reviewer => reviewer.id !== _.id && reviewer.id !== longId)
							];
							if (!checked) newReviewers.unshift(_);
							setReviewersField(newReviewers);
						} else {
							setReviewersField([{ ..._ }]);
						}
					}
				} as any;
			});
			menuItems.unshift({ label: "-" });
			menuItems.unshift({
				checked: reviewerIds.length === 0,
				label: "Unassigned",
				key: "unassigned",
				action: () => setReviewersField([])
			});
			menuItems.unshift({ type: "search", placeholder: "Type or choose a name" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading reviewerss...</LoadingMessage>, noHover: true }];
		}
	}, [availableReviewers, reviewersField]);

	const [availableAssignees, setAvailableAssignees] = useState(EMPTY_ARRAY_3);
	const fetchAvailableAssignees = async (e?) => {
		if (availableAssignees === undefined) {
			setAvailableAssignees(EMPTY_ARRAY);
		}
		const assignees = (await dispatch(api("getReviewers", {}))) as any;
		setAvailableAssignees(assignees.users);
	};

	const [assigneesField, setAssigneesField] = useState(pr.assignees ? pr.assignees.nodes : []);
	const assigneesLabel =
		assigneesField.length > 0 ? (
			<SmartFormattedList value={assigneesField.map(_ => _.login)} />
		) : (
			"None"
		);

	const assigneeMenuItems = React.useMemo(() => {
		const assigneeIds = assigneesField.map(_ => _.login);
		if (availableAssignees && availableAssignees.length) {
			const menuItems = availableAssignees.map((_: any) => {
				const longId = `gid://gitlab/User/${_.id}`;
				const checked = assigneeIds.includes(_.login) || assigneeIds.includes(longId);
				return {
					checked,
					label: <PRHeadshotName person={{ ..._, user: _.login }} className="no-padding" />,
					subtle: _.name,
					searchLabel: `${_.login}:${_.name}`,
					key: _.id,
					action: () => {
						if (derivedState.supportsMultipleAssignees) {
							const newAssignees = [
								...assigneesField.filter(assignee => assignee.id !== _.id && assignee.id !== longId)
							];
							if (!checked) newAssignees.unshift(_);
							setAssigneesField(newAssignees);
						} else {
							setAssigneesField([{ ..._ }]);
						}
					}
				} as any;
			});
			menuItems.unshift({ label: "-" });
			menuItems.unshift({
				checked: assigneeIds.length === 0,
				label: "Unassigned",
				key: "unassigned",
				action: () => setAssigneesField([])
			});
			menuItems.unshift({ type: "search", placeholder: "Type or choose a name" });
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Assignees...</LoadingMessage>, noHover: true }];
		}
	}, [availableAssignees, assigneesField]);

	const assignedToMe =
		pr.viewer && assigneesField.length === 1 && assigneesField[0].username === pr.viewer.login;

	const [labelsField, setLabelsField] = useState(pr.labels ? pr.labels.nodes : []);
	const [availableLabels, setAvailableLabels] = useState<any[] | undefined>(undefined);
	const labelsLabel =
		labelsField.length > 0 ? <SmartFormattedList value={labelsField.map(_ => _.title)} /> : "None";

	const fetchAvailableLabels = async (e?) => {
		const labels = (await dispatch(api("getLabels", {}))) as any;
		setAvailableLabels(labels);
	};

	const labelMenuItems = React.useMemo(() => {
		if (availableLabels) {
			const existingLabelIds = labelsField ? labelsField.map(_ => _.id) : [];
			const menuItems = availableLabels.map((_: any) => {
				const longId = `gid://gitlab/ProjectLabel/${_.id}`;
				const checked = existingLabelIds.includes(_.id) || existingLabelIds.includes(longId);
				return {
					checked,
					label: (
						<>
							<Circle style={{ backgroundColor: `${_.color}` }} />
							{_.title}
						</>
					),
					searchLabel: _.title,
					key: _.id,
					subtext: <div style={{ maxWidth: "250px", whiteSpace: "normal" }}>{_.description}</div>,
					action: () => {
						const newLabels = [
							...labelsField.filter(label => label.id !== _.id && label.id !== longId)
						];
						if (!checked) newLabels.unshift(_);
						setLabelsField(newLabels);
					}
				};
			}) as any;

			if (availableLabels.length > 5)
				menuItems.unshift({ type: "search", placeholder: "Filter labels" });

			if (availableLabels.length > 0) menuItems.push({ label: "-" });

			menuItems.push({
				label: "Manage Labels",
				action: () => {
					HostApi.instance.send(OpenUrlRequestType, {
						url: `${pr.repository.url}/-/labels`
					});
					setAvailableLabels(undefined);
				}
			});
			return menuItems;
		} else {
			return [{ label: <LoadingMessage>Loading Labels...</LoadingMessage>, noHover: true }];
		}
	}, [availableLabels, labelsField]);

	const [milestoneField, setMilestoneField] = useState(pr.milestone);
	const [availableMilestones, setAvailableMilestones] = useState<[] | undefined>();

	const fetchAvailableMilestones = async (e?) => {
		const milestones = (await dispatch(api("getMilestones", {}))) as any;
		setAvailableMilestones(milestones);
	};

	const milestoneMenuItems = React.useMemo(() => {
		if (availableMilestones && availableMilestones.length) {
			const existingMilestoneId = milestoneField ? milestoneField.id : "";
			const menuItems = availableMilestones.map((_: any) => {
				const checked =
					existingMilestoneId === `gid://gitlab/Milestone/${_.id}` || existingMilestoneId === _.id;
				return {
					checked,
					label: _.title,
					searchLabel: _.title,
					key: _.id,
					subtext: (_.dueOn || _.due_on) && (
						<>
							Due by
							<Timestamp time={_.dueOn || _.due_on} dateOnly />
						</>
					),
					action: () => setMilestoneField(_)
				};
			}) as any;
			menuItems.unshift({ type: "search", placeholder: "Filter Milestones" });
			menuItems.push({ label: "-", searchLabel: "" });
			menuItems.push({
				label: "No milestone",
				searchLabel: "",
				checked: false,
				action: () => setMilestoneField(undefined)
			});
			return menuItems;
		} else if (availableMilestones) {
			return [
				{ label: <LoadingMessage noIcon>No milestones found</LoadingMessage>, noHover: true }
			];
		} else {
			return [{ label: <LoadingMessage>Loading Milestones...</LoadingMessage>, noHover: true }];
		}
	}, [availableMilestones, milestoneField]);

	const milestoneLabel = milestoneField ? milestoneField.title : "None";

	return (
		<Modal translucent>
			<Dialog wide onClose={cancel} title={`Edit Merge Request !${pr.number}`}>
				<PullRequestRoot style={{ position: "static", background: "inherit !important" }}>
					<div className="standard-form codemark-form">
						<fieldset className="form-body">
							<div id="controls" className="control-group">
								From <PRBranch>{pr.sourceBranch}</PRBranch> into{" "}
								<DropdownButton
									variant="secondary"
									items={remoteBranches.map(branch => {
										return {
											label: branch.name,
											key: branch.name,
											action: () => setTargetBranch(branch.name)
										};
									})}
								>
									<span className="monospace">{targetBranch}</span>
								</DropdownButton>
								{pr.error && pr.error.message && (
									<PRError>
										<Icon name="alert" />
										<div>{pr.error.message}</div>
									</PRError>
								)}
								<Label>Title</Label>
								<TextInput value={title} onChange={setTitle} />
								<Subtle>
									{title.startsWith("Draft: ") ? (
										<>
											<Link href="" onClick={() => setTitle(title.replace("Draft: ", ""))}>
												Remove the Draft prefix
											</Link>{" "}
											from the title to allow this merge request to be merged when it's ready.
										</>
									) : (
										<>
											<Link href="" onClick={() => setTitle(`Draft: ${title}`)}>
												Start the title with Draft: or WIP:
											</Link>{" "}
											to prevent a merge request that is a work in progress from being merged before
											it's ready.
										</>
									)}
									<br />
									Add{" "}
									<Link href={`${pr.baseWebUrl}/help/user/project/description_templates`}>
										description templates
									</Link>{" "}
									to help your contributors communicate effectively!
								</Subtle>
								<Label>Description</Label>
								<MessageInput
									multiCompose
									text={description}
									placeholder="Describe the goal of the changes and what reviewers should be aware of"
									onChange={setDescription}
									setIsPreviewing={value => setIsPreviewing(value)}
								/>
								<div style={{ height: "10px" }} />
								<ResponsiveRow>
									<ResponsiveLabel>Assignee</ResponsiveLabel>
									<ResponsiveValue>
										<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
											{pr?.userPermissions?.canAssign && (
												<>
													<DropdownButton fillParent variant="secondary" items={assigneeMenuItems}>
														{assigneesLabel}
													</DropdownButton>
													{!assignedToMe && pr.viewer.login && (
														<div style={{ paddingLeft: "10px" }}>
															<Link
																href=""
																onClick={() =>
																	setAssigneesField([{ ...pr.viewer, username: pr.viewer.login }])
																}
															>
																Assign to me
															</Link>
														</div>
													)}
												</>
											)}
											{!pr?.userPermissions?.canAssign && (
												<span style={{ paddingLeft: "10px", lineHeight: "30px" }}>
													{assigneesLabel}
												</span>
											)}
										</div>
									</ResponsiveValue>
								</ResponsiveRow>
								{derivedState.supportsReviewers && (
									<ResponsiveRow>
										<ResponsiveLabel>Reviewer(s)</ResponsiveLabel>
										<ResponsiveValue>
											<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
												<DropdownButton fillParent variant="secondary" items={reviewersMenuItems}>
													{reviewersLabel}
												</DropdownButton>
											</div>
										</ResponsiveValue>
									</ResponsiveRow>
								)}
								<ResponsiveRow>
									<ResponsiveLabel>Milestone</ResponsiveLabel>
									<ResponsiveValue>
										<DropdownButton fillParent variant="secondary" items={milestoneMenuItems}>
											{milestoneLabel}
										</DropdownButton>
									</ResponsiveValue>
								</ResponsiveRow>
								<ResponsiveRow>
									<ResponsiveLabel>Labels</ResponsiveLabel>
									<ResponsiveValue>
										<DropdownButton
											fillParent
											variant="secondary"
											onOpen={fetchAvailableLabels}
											items={labelMenuItems}
										>
											{labelsLabel}
										</DropdownButton>
									</ResponsiveValue>
								</ResponsiveRow>
								{false && (
									<ResponsiveRow>
										<ResponsiveLabel>Merge options</ResponsiveLabel>
										<ResponsiveValue>
											{false && (
												<Checkbox
													name="delete-branch"
													checked={deleteSourceBranch}
													onChange={() => setDeleteSourceBranch(!deleteSourceBranch)}
												>
													Delete source branch when merge request is accepted.
												</Checkbox>
											)}
											<Checkbox
												name="squash"
												checked={squashCommits}
												onChange={() => setSquashCommits(!squashCommits)}
											>
												Squash commits when merge request is accepted.{" "}
												<Link
													href={`${pr.baseWebUrl}/help/user/project/merge_requests/squash_and_merge`}
												>
													<Icon name="info" />
												</Link>
											</Checkbox>
										</ResponsiveValue>
									</ResponsiveRow>
								)}
								<ButtonRow>
									<Button variant="success" onClick={save} isLoading={isLoading}>
										Save changes
									</Button>
									<Right>
										<Button variant="destructive" onClick={deletePR}>
											Delete
										</Button>
										<Button variant="secondary" onClick={cancel}>
											Cancel
										</Button>
									</Right>
								</ButtonRow>
							</div>
						</fieldset>
					</div>
				</PullRequestRoot>
			</Dialog>
		</Modal>
	);
};
