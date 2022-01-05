import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { CodeStreamState } from "@codestream/webview/store";
import { Link } from "../../Link";
import styled from "styled-components";
import { DropdownButton } from "../../DropdownButton";
import { PRBranch, PRBranchTruncated } from "../../PullRequestComponents";
import copy from "copy-to-clipboard";
import Tooltip from "../../Tooltip";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "../../../webview-api";
import { GitLabMergeRequest, SwitchBranchRequestType } from "@codestream/protocols/agent";
import { confirmPopup } from "../../Confirm";
import { getProviderPullRequestRepoObject } from "@codestream/webview/store/providerPullRequests/reducer";
import { pluralize } from "@codestream/webview/utilities/strings";
import { logError } from "@codestream/webview/logger";

export const Root = styled.div`
	margin: 0 20px 10px 20px;
	display: flex;
	align-items: stretch;
	padding-bottom: 15px;
	border-bottom: 1px solid var(--base-border-color);
	button {
		margin-left: 10px;
		height: 35px;
	}
`;
export const SummaryBox = (props: {
	pr: GitLabMergeRequest;
	openRepos: { name: string; currentBranch: string }[];
	getOpenRepos: Function;
}) => {
	const { pr, openRepos, getOpenRepos } = props;

	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		return {
			order: preferences.pullRequestTimelineOrder || "oldest",
			filter: preferences.pullRequestTimelineFilter || "all",
			currentRepoObject: getProviderPullRequestRepoObject(state)
		};
	});
	const [isLoadingBranch, setIsLoadingBranch] = useState(false);

	const cantCheckoutReason = useMemo(() => {
		if (pr) {
			const currentRepo = openRepos.find(
				_ => _?.name?.toLowerCase() === pr.repository?.name?.toLowerCase()
			);
			if (!currentRepo) {
				return `You don't have the ${pr.repository?.name} repo open in your IDE`;
			}
			if (currentRepo.currentBranch == pr.headRefName) {
				return `You are on the ${pr.headRefName} branch`;
			}
			return "";
		} else {
			return "PR not loaded";
		}
	}, [pr, openRepos]);

	const checkout = async () => {
		if (!pr) return;

		setIsLoadingBranch(true);
		const repoId =
			derivedState.currentRepoObject && derivedState.currentRepoObject.currentRepo
				? derivedState.currentRepoObject.currentRepo.id
				: "";
		const result = await HostApi.instance.send(SwitchBranchRequestType, {
			branch: pr!.headRefName,
			repoId: repoId
		});
		if (result.error) {
			logError(result.error, {
				...(derivedState.currentRepoObject || {}),
				branch: pr.headRefName,
				repoId: repoId,
				prRepository: pr!.repository
			});

			confirmPopup({
				title: "Git Error",
				className: "wide",
				message: (
					<div className="monospace" style={{ fontSize: "11px" }}>
						{result.error}
					</div>
				),
				centered: false,
				buttons: [{ label: "OK", className: "control-button" }]
			});
			setIsLoadingBranch(false);
		} else {
			setIsLoadingBranch(false);
			getOpenRepos();
		}
	};

	return (
		<OutlineBox>
			<FlexRow style={{ flexWrap: "nowrap" }}>
				<Icon name="pull-request" className="bigger row-icon" />
				<div style={{ flexGrow: 10 }}>
					<div className="float-right">
						<Button className="margin-right-10" variant="secondary">
							{isLoadingBranch ? (
								<Icon name="sync" className="spin" />
							) : (
								<span onClick={cantCheckoutReason ? () => {} : checkout}>
									<Tooltip
										title={
											<>
												Checkout Branch
												{cantCheckoutReason && (
													<div className="subtle smaller" style={{ maxWidth: "200px" }}>
														Disabled: {cantCheckoutReason}
													</div>
												)}
											</>
										}
										trigger={["hover"]}
										placement="top"
									>
										<span>
											<Icon className="narrow-text" name="git-branch" />
											<span className="wide-text">Check out branch</span>
										</span>
									</Tooltip>
								</span>
							)}
						</Button>
						<DropdownButton
							title="Download as"
							noCloseIcon
							variant="secondary"
							narrow
							items={[
								{
									label: "Email patches",
									key: "email",
									action: () => {
										HostApi.instance.send(OpenUrlRequestType, {
											url: `${pr.repository.url}/-/merge_requests/${pr.number}.patch`
										});
									}
								},
								{
									label: "Plain diff",
									key: "plain",
									action: () => {
										HostApi.instance.send(OpenUrlRequestType, {
											url: `${pr.repository.url}/-/merge_requests/${pr.number}.diff`
										});
									}
								}
							]}
						>
							<Icon name="download" title="Download..." placement="top" />
						</DropdownButton>
					</div>
					<b>Request to merge</b>{" "}
					<Link href={`${pr.repository.url}/-/tree/${pr.sourceBranch}`}>
						<Tooltip title={pr.sourceBranch} trigger={["hover"]} placement="top">
							<PRBranchTruncated>{pr.sourceBranch}</PRBranchTruncated>
						</Tooltip>
					</Link>{" "}
					<Icon
						name="copy"
						className="clickable"
						title="Copy source branch"
						placement="top"
						onClick={e => copy(pr.sourceBranch)}
					/>{" "}
					<b>into</b>{" "}
					<Link href={`${pr.repository.url}/-/tree/${pr.targetBranch}`}>
						<PRBranch>
							{pr.repository && pr.repository.name}:{pr.targetBranch}
						</PRBranch>
					</Link>
					{pr.divergedCommitsCount > 0 && (
						<>
							<br />
							The source branch is{" "}
							<Link href={`${pr.url}/-/commits/${pr.targetBranch}`}>
								{pr.divergedCommitsCount} {pluralize("commit", pr.divergedCommitsCount)} behind
							</Link>{" "}
							the target branch
						</>
					)}
				</div>
			</FlexRow>
		</OutlineBox>
	);
};
