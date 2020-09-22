import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import { setUserPreference, closeModal } from "./actions";
import { HostApi } from "../webview-api";
import { CSNotificationDeliveryPreference, CSMe } from "@codestream/protocols/api";
import Icon from "./Icon";
import { Dialog, ButtonRow } from "../src/components/Dialog";
import { Modal } from "./Modal";
import { Button } from "../src/components/Button";
import { Checkbox } from "../src/components/Checkbox";
import { TextInput } from "../Authentication/TextInput";
import { EMPTY_STATUS } from "./WorkInProgress";
import styled from "styled-components";
import { PRSelectorButtons } from "./PullRequestComponents";
import { RepoHunkDiffs } from "./RepoHunkDiffs";
import { PanelHeader } from "../src/components/PanelHeader";

const Diffs = styled.div`
	margin: 20px 0 0 0;
	padding: 20px;
	border-top: 1px solid var(--base-border-color);
	i {
		display: block;
		text-align: center;
	}
`;

interface Props {
	repoId: string;
	onClose: (e: React.SyntheticEvent) => any;
}

export const CommitAndPush = (props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const currentUser = state.users[state.session.userId!] as CSMe;
		const status =
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;

		return {
			currentUserId: state.session.userId || "",
			pushAfterCommit: preferences.pushAfterCommit,
			userStatus: status
		};
	});
	const [isLoading, setIsLoading] = useState(false);
	// const [pushField, setPushField] = useState(derivedState.pushAfterCommit);
	const [commitMessageField, setCommitMessageField] = useState("");
	const [mode, setMode] = useState("hunks");

	const setPushPreference = value => {
		dispatch(setUserPreference(["pushAfterCommit"], value));
	};
	const save = async () => {};

	return (
		<Modal translucent>
			<Dialog maximizable wide noPadding onClose={props.onClose}>
				<PanelHeader title="Commit &amp; Push" />
				<form className="standard-form vscroll">
					<fieldset className="form-body" style={{ maxWidth: "none", padding: "0 20px" }}>
						<div id="controls">
							<div key="title" className="control-group has-input-actions two-buttons">
								<TextInput
									name="title"
									value={commitMessageField}
									placeholder="Commit Message"
									autoFocus
									onChange={setCommitMessageField}
								/>
								<div className="actions">
									{commitMessageField.length > 0 && (
										<Icon
											name="x"
											placement="top"
											title="Clear Message"
											className="clickable"
											onClick={() => setCommitMessageField("")}
										/>
									)}
									{derivedState.userStatus.label && (
										<Icon
											placement="top"
											title="Use Current Ticket"
											name={derivedState.userStatus.ticketProvider || "ticket"}
											className="clickable"
											onClick={() => setCommitMessageField(derivedState.userStatus.label)}
										/>
									)}
								</div>
							</div>
							<div style={{ margin: "10px 0 0 0", float: "left" }}>
								<Checkbox
									name="push"
									checked={derivedState.pushAfterCommit}
									onChange={() => setPushPreference(!derivedState.pushAfterCommit)}
								>
									Push to [origin]
								</Checkbox>
							</div>
						</div>
						<ButtonRow style={{ whiteSpace: "nowrap", float: "right", marginTop: 0 }}>
							<Button variant="secondary" onClick={props.onClose}>
								Cancel
							</Button>
							<Button
								isLoading={isLoading}
								disabled={commitMessageField.length === 0}
								onClick={save}
							>
								{derivedState.pushAfterCommit ? "Commit and Push" : "Commit"}
							</Button>
						</ButtonRow>
					</fieldset>
				</form>
				<Diffs>
					<RepoHunkDiffs repoId={props.repoId} />
				</Diffs>
			</Dialog>
		</Modal>
	);
};
