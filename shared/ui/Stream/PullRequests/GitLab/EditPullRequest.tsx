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
import { HostApi } from "../../../webview-api";
import MessageInput from "../../MessageInput";
import { TextInput } from "@codestream/webview/Authentication/TextInput";
import { Modal } from "../../Modal";
import { Dialog } from "@codestream/webview/src/components/Dialog";

const Root = styled.div``;

const Header = styled.div`
	display: flex;
`;

const ButtonRow = styled.div`
	display: flex;
	align-items: center;
	padding: 10px 0 0 0;
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
	const [isLoadingMessage, setIsLoadingMessage] = useState("");

	const save = () => {};
	const deletePR = () => {};
	const cancel = () => setIsEditing(false);

	return (
		<Root>
			<Modal translucent>
				<Dialog onClose={cancel} title={`Edit Merge Request !{pr.number}`}>
					From <PRBranch>{pr.sourceBranch}</PRBranch> into {pr.targetBranch}
					<HR />
					{pr.error && pr.error.message && (
						<PRError>
							<Icon name="alert" />
							<div>{pr.error.message}</div>
						</PRError>
					)}
					<table>
						<tr>
							<td>
								<label>Title</label>
							</td>
							<td>
								<TextInput value={title} onChange={setTitle}></TextInput>
								<br />
								<Link href="" onClick={() => {}}>
									Remove the Draft prefix
								</Link>{" "}
								from the title to allow this merge request to be merged when it's ready.
								<br />
								Add{" "}
								<Link href="" onClick={() => {}}>
									description templates
								</Link>{" "}
								to help your contributors communicate effectively!
							</td>
						</tr>
						<tr>
							<td>
								<label>Description</label>
							</td>
							<td>
								<MessageInput
									multiCompose
									text={description}
									placeholder="Describe the goal of the changes and what reviewers should be aware of"
									onChange={setDescription}
									setIsPreviewing={value => setIsPreviewing(value)}
								/>
							</td>
						</tr>
					</table>
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
				</Dialog>
			</Modal>
		</Root>
	);
};
