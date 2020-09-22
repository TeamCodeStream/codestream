import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { setUserPreference } from "./actions";
import { HostApi } from "../webview-api";
import { CSMe } from "@codestream/protocols/api";
import Icon from "./Icon";
import { ButtonRow } from "../src/components/Dialog";
import { Modal } from "./Modal";
import { Button } from "../src/components/Button";
import { Checkbox } from "../src/components/Checkbox";
import { TextInput } from "../Authentication/TextInput";
import { EMPTY_STATUS } from "./WorkInProgress";
import styled from "styled-components";
import { RepoHunkDiffs } from "./RepoHunkDiffs";
import { PanelHeader } from "../src/components/PanelHeader";
import { DiffBranchesRequestType } from "@codestream/protocols/agent";
import { useDidMount } from "../utilities/hooks";
import CancelButton from "./CancelButton";
import ScrollBox from "./ScrollBox";

const Root = styled.div`
	#controls {
		padding-top: 10px;
	}
	strong {
		font-weight: normal;
		color: var(--text-color-highlight);
	}
	a {
		text-decoration: none;
		color: var(--text-color-highlight);
		&:hover {
			color: var(--text-color-info) !important;
		}
	}
	.no-padding {
		padding: 0;
	}
`;

const IconLabel = styled.span`
	color: var(--text-color-subtle);
	white-space: nowrap;
	padding-right: 10px;
	.icon {
		margin-right: 5px;
	}
`;

const HR = styled.div`
	margin-top: 20px;
	border-top: 1px solid var(--base-border-color);
`;

interface Props {
	repoId: string;
	repoName: string;
	branch: string;
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
	const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);
	const [filesChanged, setFilesChanged] = useState<any[]>([]);
	const [scmError, setScmError] = useState("");

	const setPushPreference = value => {
		dispatch(setUserPreference(["pushAfterCommit"], value));
	};
	const save = async () => {};

	useDidMount(() => {
		fetchFilesChanged();
	});
	const fetchFilesChanged = async () => {
		setIsLoadingDiffs(true);
		const response = await HostApi.instance.send(DiffBranchesRequestType, {
			repoId: props.repoId,
			baseRef: "HEAD"
		});

		if (response && response.error) {
			setFilesChanged([]);
			setScmError(response.error);
		} else if (response && response.filesChanged) {
			const { patches, data } = response.filesChanged;
			console.warn("PATHES ARE: ", patches);
			const filesChanged = patches.map(_ => {
				return {
					..._,
					linesAdded: _.additions,
					linesRemoved: _.deletions,
					file: _.newFileName,
					filename: _.newFileName,
					hunks: _.hunks,
					sha: _.sha
				};
			});
			setFilesChanged(filesChanged);
			setScmError("");
		}
		setIsLoadingDiffs(false);
	};

	return (
		<Modal noPadding>
			<Root className="full-height-codemark-form">
				<PanelHeader title="Commit &amp; Push">
					<IconLabel>
						<Icon name="repo" />
						{props.repoName}
					</IconLabel>
					<IconLabel>
						<Icon name="git-branch" />
						{props.repoName}
					</IconLabel>
				</PanelHeader>
				<CancelButton onClick={e => props.onClose(e)} />
				<span className="plane-container" style={{ height: "100%" }}>
					<div className="codemark-form-container">
						<form className="codemark-form standard-form" id="code-comment-form">
							<fieldset className="form-body">
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
					</div>
					<div style={{ margin: "0 -20px" }}>
						<HR />
						<ScrollBox>
							<div className="vscroll">
								{scmError && <>Error: {scmError}</>}
								<RepoHunkDiffs repoId={props.repoId} filesChanged={filesChanged} />
							</div>
						</ScrollBox>
					</div>
				</span>
			</Root>
		</Modal>
	);
};
