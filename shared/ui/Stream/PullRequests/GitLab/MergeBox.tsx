import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { Checkbox } from "@codestream/webview/src/components/Checkbox";
import { CodeStreamState } from "@codestream/webview/store";
import { setUserPreference } from "../../actions";
import { Link } from "../../Link";
import { CommandLineInstructions } from "./CommandLineInstructions";
import styled from "styled-components";
import { api } from "../../../store/providerPullRequests/actions";

export const IconButton = styled.div`
	flex-grow: 0;
	flex-shrink: 0;
	padding: 5px 0;
	width: 25px;
	text-align: center;
	margin: 0 10px 0 5px;
	cursor: pointer;
	border-radius: 4px;
	&:hover {
		background: var(--base-background-color);
	}
`;

export const MergeBox = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const deleteBranch =
			"pullRequestDeleteSourceBranch" in preferences
				? preferences.pullRequestDeleteSourceBranch
				: true;
		const squash = preferences.pullRequestSquashCommits;

		return {
			deleteBranch,
			squash
		};
	});
	const [modifyCommit, setModifyCommit] = useState(false);
	const [showCommandLine, setShowCommandLine] = useState(false);
	const { deleteBranch, squash } = derivedState;
	if (showCommandLine) {
		return <CommandLineInstructions pr={props.pr} onClose={() => setShowCommandLine(false)} />;
	}

	const mergePullRequest = async (e: any) => {
		//setIsLoadingMessage("Merging...");
		dispatch(
			api("mergePullRequest", {
				message: "",
				deleteSourceBranch: deleteBranch,
				squashCommits: squash
				// includeMergeRequestDescription: false // ???????????
			})
		);
	};

	return (
		<OutlineBox>
			<FlexRow>
				<Icon name="check-circle" className="bigger green-color" />
				<Button className="action-button" variant="success" onClick={e => mergePullRequest(e)}>
					Merge
				</Button>
				<div className="pad-left">
					<Checkbox
						checked={deleteBranch}
						name="delete-branch"
						noMargin
						onChange={() => {
							dispatch(setUserPreference(["pullRequestDeleteSourceBranch"], !deleteBranch));
						}}
					>
						Delete source branch
					</Checkbox>
				</div>
				<div className="pad-left">
					<Checkbox
						checked={squash}
						name="squash"
						noMargin
						onChange={() => {
							dispatch(setUserPreference(["pullRequestSquashCommits"], !squash));
						}}
					>
						Squash commits <Icon name="info" title="What is squashing?" placement="top" />
					</Checkbox>
				</div>
			</FlexRow>
			<FlexRow
				onClick={() => setModifyCommit(!modifyCommit)}
				style={{
					background: "var(--base-background-color)",
					borderTop: "1px solid var(--base-border-color)",
					borderBottom: "1px solid var(--base-border-color)",
					flexWrap: "nowrap",
					cursor: "pointer"
				}}
			>
				{modifyCommit ? (
					<>
						<IconButton>
							<Icon name="chevron-down" />
						</IconButton>
						<div>Collapse</div>
					</>
				) : (
					<>
						<IconButton>
							<Icon name="chevron-right" />
						</IconButton>
						<div>
							<b>{"2 commits"}</b> and <b>{"1 merge commit"}</b> will be added to{" "}
							{props.pr.targetBranch}.{" "}
							<Link href="" onClick={() => setModifyCommit(true)}>
								Modify merge commit
							</Link>
						</div>
					</>
				)}
			</FlexRow>
			{modifyCommit && (
				<FlexRow>
					<div style={{ paddingLeft: "40px", width: "100%" }}>
						<b>Merge commit message</b>
						<textarea></textarea>
						<Checkbox noMargin name="commitMessage" onChange={() => {}}>
							Include merge request description
						</Checkbox>
					</div>
				</FlexRow>
			)}
			<FlexRow>
				<div style={{ paddingLeft: "40px", width: "100%" }}>
					<i>You can merge this merge request manually using the</i>{" "}
					<Link href="" onClick={() => setShowCommandLine(!showCommandLine)}>
						command line
					</Link>
				</div>
			</FlexRow>
		</OutlineBox>
	);
};
