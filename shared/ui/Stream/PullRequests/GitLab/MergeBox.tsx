import Tooltip from "../../Tooltip";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../Icon";
import { Button, ButtonVariant } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { Checkbox } from "@codestream/webview/src/components/Checkbox";
import { CodeStreamState } from "@codestream/webview/store";
// import { setUserPreference } from "../../actions";
import { Link } from "../../Link";
import { CommandLineInstructions } from "./CommandLineInstructions";
import styled from "styled-components";
import { api } from "../../../store/providerPullRequests/actions";
import {
	getCurrentProviderPullRequestObject,
	getCurrentProviderPullRequestRootObject
} from "../../../store/providerPullRequests/reducer";
import { GitLabMergeRequest, GitLabMergeRequestWrapper } from "@codestream/protocols/agent";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import Timestamp from "../../Timestamp";

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
		const pr = getCurrentProviderPullRequestObject(state) as GitLabMergeRequest;
		return {
			pr: pr,
			pipeline: pr.headPipeline,
			prRoot: getCurrentProviderPullRequestRootObject(state) as GitLabMergeRequestWrapper
		};
	});

	const [isLoading, setIsLoading] = useState(false);
	const [modifyCommit, setModifyCommit] = useState(false);
	const [showCommandLine, setShowCommandLine] = useState(false);
	const [commitMessage, setCommitMessage] = useState("");
	const [includeMergeRequestDescription, setIncludeMergeRequestDescription] = useState(false);

	const _defaultMergeText = `Merge branch '${derivedState.pr.headRefName}' into '${derivedState.pr.baseRefName}'\n\n${derivedState.pr.title}`;
	const _defaultMergeTextSuffix = `See merge request ${derivedState.pr.references.full}`;
	const [deleteBranch, setDeleteBranch] = useState(false);
	const [squashChecked, setSquashChecked] = useState(false);

	useDidMount(() => {
		setCommitMessage(`${_defaultMergeText}\n${_defaultMergeTextSuffix}`);
	});

	useDidMount(() => {
		if (derivedState.prRoot && derivedState.prRoot.project.removeSourceBranchAfterMerge) {
			setDeleteBranch(true);
		} else {
			setDeleteBranch(false);
		}
		if (
			derivedState.prRoot &&
			(derivedState.prRoot.project.squashOption === "default_on" ||
				derivedState.prRoot.project.squashOption === "always")
		)
			setSquashChecked(true);
	});

	useEffect(() => {
		if (includeMergeRequestDescription) {
			setCommitMessage(
				`${_defaultMergeText}\n\n${derivedState.pr.description}\n\n${_defaultMergeTextSuffix}`
			);
		} else {
			setCommitMessage(`${_defaultMergeText}\n\n${_defaultMergeTextSuffix}`);
		}
	}, [includeMergeRequestDescription, derivedState.pr && derivedState.pr.description]);

	const mergePullRequest = async (e: any) => {
		setIsLoading(true);
		const message = derivedState.prRoot.project.mergeMethod !== "ff" ? commitMessage : undefined;
		const mergeWhenPipelineSucceeds =
			derivedState.pipeline && derivedState.pipeline.status === "RUNNING";
		try {
			await dispatch(
				api("mergePullRequest", {
					message: message,
					deleteSourceBranch: deleteBranch,
					squashCommits: squashChecked,
					mergeWhenPipelineSucceeds: mergeWhenPipelineSucceeds
				})
			);
		} catch (ex) {
			console.error(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const cancelMergeWhenPipelineSucceeds = async (e: any) => {
		dispatch(api("cancelMergeWhenPipelineSucceeds", {}));
	};

	const toggleWorkInProgress = async () => {
		const onOff = !props.pr.isDraft;
		props.setIsLoadingMessage(onOff ? "Marking as draft..." : "Marking as ready...");
		await dispatch(
			api("setWorkInProgressOnPullRequest", {
				onOff
			})
		);
		props.setIsLoadingMessage("");
	};

	if (showCommandLine) {
		return <CommandLineInstructions pr={props.pr} onClose={() => setShowCommandLine(false)} />;
	}

	if (derivedState?.pr?.mergedAt) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<Icon name="check-circle" className="bigger green-color" />
					<div className="pad-left">
						Merged at <Timestamp time={derivedState.pr.mergedAt!} />
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	if (!props.pr.diffRefs || !props.pr.diffRefs.headSha) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<div className="action-button-wrapper">
						<Icon name="alert" className="bigger" />
						<Button className="action-button" variant="secondary" disabled>
							Merge
						</Button>
					</div>
					<div className="pad-left">
						Source branch does not exist. Please restore it or use a different source branch{" "}
						<Tooltip
							title="If the source branch exists in your local repository, you can merge this merge request manually using the command line"
							placement="top"
						>
							<Icon name="question" placement="top" />
						</Tooltip>
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	if (derivedState.pr?.userPermissions?.canMerge === false) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<div className="action-button-wrapper">
						<Icon name="check-circle" className="bigger green-color" />
						<Button className="action-button disabled" variant="neutral" disabled={true}>
							Merge
						</Button>
					</div>
					<div className="pad-left">
						Ask someone with write access to this repository to merge this request
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	if (props.pr.isDraft) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<div className="action-button-wrapper">
						<Icon name="alert" className="bigger" />
						<Button className="action-button" variant="secondary" disabled>
							Merge
						</Button>
					</div>
					<FlexRow style={{ padding: "0" }}>
						<div className="pad-left">
							<b>This merge request is still a draft</b>
							<br />
							Draft merge requests can't be merged.
						</div>
						<div className="pad-left">
							<Button onClick={toggleWorkInProgress}>Mark as ready</Button>
						</div>
					</FlexRow>
				</FlexRow>
			</OutlineBox>
		);
	}

	if (
		derivedState.pr &&
		!derivedState.pr.mergeableDiscussionsState &&
		derivedState.prRoot.project.onlyAllowMergeIfAllDiscussionsAreResolved
	) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<div className="action-button-wrapper">
						<Icon name="check-circle" className="bigger" />
						<Button className="action-button disabled" variant="neutral" disabled={true}>
							Merge
						</Button>
					</div>
					<div className="pad-left">
						Before this can be merged, one or more threads must be resolved.
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	if (
		derivedState.prRoot &&
		derivedState.prRoot.project.onlyAllowMergeIfPipelineSucceeds &&
		!derivedState.pipeline
	) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<div className="action-button-wrapper">
						<Icon name="alert" className="bigger" />
						<Button className="action-button disabled" variant="neutral" disabled={true}>
							Merge
						</Button>
					</div>
					<div className="pad-left">
						A CI/CD pipeline must run and be successful before merge.
						<Link
							href={`${derivedState.pr.baseWebUrl}/help/user/project/merge_requests/merge_when_pipeline_succeeds.md#only-allow-merge-requests-to-be-merged-if-the-pipeline-succeeds`}
						>
							<Icon name="question" placement="top" />
						</Link>
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	if (
		derivedState.pipeline &&
		derivedState.prRoot.project.onlyAllowMergeIfPipelineSucceeds &&
		(derivedState.pipeline.status === "FAILED" || derivedState.pipeline.status === "CANCELED")
	) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<div className="action-button-wrapper">
						<Icon name="alert" className="bigger" />
						<Button className="action-button disabled" variant="neutral" disabled={true}>
							Merge
						</Button>
					</div>
					<div className="pad-left">
						{derivedState.pipeline.status === "FAILED" && (
							<>
								The pipeline for this merge request failed. Please retry the job or push a new
								commit to fix the failure
							</>
						)}
						{derivedState.pipeline.status === "CANCELED" && (
							<>You can only merge once the items above are resolved.</>
						)}
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	if (
		derivedState.pipeline &&
		derivedState.pr.mergeWhenPipelineSucceeds &&
		derivedState.pipeline.status === "RUNNING"
	) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<Icon name="check-circle" className="bigger" />
					<div className="pad-left">Set to be merged automatically when the pipeline succeeds</div>
					<div className="pad-left">
						<Button variant="neutral" onClick={e => cancelMergeWhenPipelineSucceeds(e)}>
							Cancel automatic merge
						</Button>
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	let verb: "Merge" | "Rebase" | "Merge when pipeline succeeds" = "Merge";
	let commitsLabel;
	let canModifyCommit = false;
	let mergeDisabled = false;
	let headerLabel;
	const setStandardMergeOptions = () => {
		canModifyCommit = true;
		commitsLabel = (
			<>
				{" "}
				<b>
					{derivedState.pr.commitCount === 1
						? "1 commit"
						: `${derivedState.pr.commitCount} commits`}
				</b>{" "}
				and <b>{"1 merge commit"}</b> will be added to {props.pr.targetBranch}.{" "}
			</>
		);
	};

	if (derivedState.pr.divergedCommitsCount > 0) {
		if (derivedState.prRoot.project.mergeMethod === "merge") {
			if (
				derivedState.prRoot.project.mergeRequest?.conflicts &&
				derivedState.prRoot.project.mergeRequest.conflicts === true
			) {
				mergeDisabled = true;
				headerLabel = <>Merge blocked: merge conflicts must be resolved.</>;
			} else {
				setStandardMergeOptions();
			}
		} else {
			mergeDisabled = true;
			verb = "Rebase";
			headerLabel = (
				<>Fast-forward merge is not possible. Rebase the source branch onto the target branch.</>
			);
		}
	} else {
		if (derivedState.prRoot.project.mergeMethod !== "ff") {
			setStandardMergeOptions();
		} else {
			commitsLabel = <> Fast-forward merge without a merge commit. </>;
		}
	}

	if (
		derivedState.pipeline &&
		["RUNNING", "PENDING"].find(_ => _ === derivedState.pipeline!.status)
	) {
		verb = "Merge when pipeline succeeds";
	}

	const colorVariant: ButtonVariant =
		derivedState.pipeline && derivedState.pipeline.status === "CANCELED"
			? "destructive"
			: mergeDisabled
			? "secondary"
			: "success";
	return (
		<OutlineBox>
			<FlexRow>
				<Icon name="check-circle" className={`bigger color-green`} />
				{mergeDisabled && (
					<Tooltip title="Rebase support coming soon" placement="top">
						<Button
							isLoading={isLoading}
							variant={colorVariant}
							disabled={mergeDisabled}
							onClick={e => mergePullRequest(e)}
						>
							{verb}
						</Button>
					</Tooltip>
				)}
				{!mergeDisabled && (
					<Button
						isLoading={isLoading}
						variant={colorVariant}
						disabled={mergeDisabled}
						onClick={e => mergePullRequest(e)}
					>
						{verb}
					</Button>
				)}
				{!headerLabel && (
					<>
						<div className="pad-left">
							<Checkbox
								checked={deleteBranch}
								name="delete-branch"
								noMargin
								onChange={() => {
									setDeleteBranch(!deleteBranch);
								}}
							>
								Delete source branch
							</Checkbox>
						</div>
						{derivedState.prRoot && (
							<>
								{derivedState.prRoot.project.squashOption === "always" ? (
									<div className="pad-left">
										<Checkbox
											checked={true}
											name="squash"
											noMargin
											onChange={() => {}}
											disabled=" "
											disabledEmpty={true}
										>
											Squash commits
										</Checkbox>
									</div>
								) : (
									derivedState.prRoot.project.squashOption !== "never" && (
										<div className="pad-left">
											<Checkbox
												checked={squashChecked}
												name="squash"
												noMargin
												onChange={() => {
													setSquashChecked(!squashChecked);
												}}
											>
												Squash commits
											</Checkbox>
										</div>
									)
								)}
								{derivedState.prRoot.project.squashOption !== "never" && (
									<div className="pl5">
										<Link
											href={`${derivedState.pr.baseWebUrl}/help/user/project/merge_requests/squash_and_merge`}
										>
											<Icon name="question" title="What is squashing?" placement="top" />
										</Link>
									</div>
								)}
							</>
						)}
					</>
				)}
				{headerLabel && <div className="pad-left">{headerLabel}</div>}
			</FlexRow>

			{canModifyCommit && (
				<>
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
									{commitsLabel}{" "}
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
								<textarea
									style={{ height: "147px" }}
									value={commitMessage}
									onChange={e => {
										setCommitMessage(e.target.value);
									}}
								></textarea>
								<Checkbox
									noMargin
									name="commitMessage"
									checked={includeMergeRequestDescription}
									onChange={() => {
										setIncludeMergeRequestDescription(!includeMergeRequestDescription);
									}}
								>
									Include merge request description
								</Checkbox>
							</div>
						</FlexRow>
					)}
				</>
			)}
			{!canModifyCommit && commitsLabel && (
				<FlexRow
					style={{
						background: "var(--base-background-color)",
						borderTop: "1px solid var(--base-border-color)",
						borderBottom: "1px solid var(--base-border-color)",
						flexWrap: "nowrap"
					}}
				>
					<div style={{ paddingLeft: "40px" }}>{commitsLabel}</div>
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
