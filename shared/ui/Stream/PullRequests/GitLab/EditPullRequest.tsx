import { CSMe } from "@codestream/protocols/api";
import { FloatingLoadingMessage } from "@codestream/webview/src/components/FloatingLoadingMessage";
import { CodeStreamState } from "@codestream/webview/store";

import Tooltip from "../../Tooltip";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import Icon from "../../Icon";
import { Button } from "../../../src/components/Button";
import { Link } from "../../Link";
import { PRBranch, PRError, PRHeader, PRTitle } from "../../PullRequestComponents";
import { api } from "../../../store/providerPullRequests/actions";
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

const FormRow = styled.div`
	margin: 10px 20px;
	display: flex;
	align-items: flex-start;
	> label {
		text-align: right;
		padding-top: 5px;
		padding-right: 10px;
		min-width: 20vw;
		color: var(--text-color-highlight);
		font-weight: bold;
	}
	> div {
		flex-grow: 2;
	}
`;

const HR = styled.div`
	margin: 10px 0;
	height: 1px;
	background: var(--base-border-color);
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
let insertText;
let insertNewline;
let focusOnMessageInput;

export const EditPullRequest = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		return {};
	});

	const { pr, setIsEditing } = props;
	const [title, setTitle] = useState<string>(pr.title || "");
	const [description, setDescription] = useState<string>(pr.description || "");
	const [isPreviewing, setIsPreviewing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const save = async () => {
		setIsLoading(true);
		await dispatch(
			api("updatePullRequest", {
				title,
				description
			})
		);
		cancel();
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
	const cancel = () => setIsEditing(false);

	const assignees =
		pr.assignees && pr.assignees.nodes.length > 0 ? (
			<SmartFormattedList value={pr.assignees.nodes.map(_ => _.username)} />
		) : (
			"None"
		);
	const assignedToMe =
		pr.viewer &&
		pr.assignees &&
		pr.assignees.nodes.length === 1 &&
		pr.assignees.nodes[0].username === pr.viewer.login;

	const labels =
		pr.labels && pr.labels.nodes.length > 0 ? (
			<SmartFormattedList value={pr.labels.nodes.map(_ => _.title)} />
		) : (
			"None"
		);

	return (
		<Modal translucent>
			<Dialog wide onClose={cancel} title={`Edit Merge Request !${pr.number}`}>
				<PullRequestRoot style={{ position: "static", background: "inherit !important" }}>
					<div className="standard-form codemark-form">
						<fieldset className="form-body">
							<div id="controls" className="control-group">
								From <PRBranch>{pr.sourceBranch}</PRBranch> into{" "}
								<DropdownButton variant="secondary" items={[]}>
									<span className="monospace">{pr.targetBranch}</span>
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
									<Link href="http://gitlab.codestream.us/help/user/project/description_templates">
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
											<DropdownButton fillParent variant="secondary" items={[]}>
												{assignees}
											</DropdownButton>
											{!assignedToMe && pr.viewer.login && (
												<div style={{ paddingLeft: "10px" }}>
													<Link href="" onClick={() => {}}>
														Assign to me
													</Link>
												</div>
											)}
										</div>
									</ResponsiveValue>
								</ResponsiveRow>
								<ResponsiveRow>
									<ResponsiveLabel>Milestone</ResponsiveLabel>
									<ResponsiveValue>
										<DropdownButton fillParent variant="secondary" items={[]}>
											{pr.milestone && pr.milestone.title ? pr.milestone.title : "None"}
										</DropdownButton>
									</ResponsiveValue>
								</ResponsiveRow>
								<ResponsiveRow>
									<ResponsiveLabel>Labels</ResponsiveLabel>
									<ResponsiveValue>
										<DropdownButton fillParent variant="secondary" items={[]}>
											{labels}
										</DropdownButton>
									</ResponsiveValue>
								</ResponsiveRow>
								<ResponsiveRow>
									<ResponsiveLabel>Merge options</ResponsiveLabel>
									<ResponsiveValue>
										<Checkbox name="delete-branch" onChange={() => {}}>
											Delete source branch when merge request is accepted.
										</Checkbox>
										<Checkbox name="delete-branch" onChange={() => {}}>
											Squash commits when merge request is accepted.{" "}
											<Link href="http://gitlab.codestream.us/help/user/project/merge_requests/squash_and_merge">
												<Icon name="info" />
											</Link>
										</Checkbox>
									</ResponsiveValue>
								</ResponsiveRow>
								<ButtonRow>
									<Button variant="success" onClick={save}>
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
