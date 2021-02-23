import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { CodeStreamState } from "@codestream/webview/store";
import { Link } from "../../Link";
import styled from "styled-components";
import { DropdownButton } from "../../Review/DropdownButton";
import { PRBranch } from "../../PullRequestComponents";
import copy from "copy-to-clipboard";
import Tooltip from "../../Tooltip";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "../../../webview-api";
import { SwitchBranchRequestType } from "@codestream/protocols/agent";
import { confirmPopup } from "../../Confirm";
import { getProviderPullRequestRepo2 } from "@codestream/webview/store/providerPullRequests/reducer";

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
export const SummaryBox = props => {
	const { pr, openRepos, getOpenRepos, setIsLoadingMessage } = props;

	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		return {
			order: preferences.pullRequestTimelineOrder || "oldest",
			filter: preferences.pullRequestTimelineFilter || "all",
			currentRepo: getProviderPullRequestRepo2(state)
		};
	});
	const [isLoadingBranch, setIsLoadingBranch] = useState(false);

	const cantCheckoutReason = useMemo(() => {
		if (pr) {
			const currentRepo = openRepos.find(_ => _.name === pr.repository.name);
			if (!currentRepo) {
				return `You don't have the ${pr.repository.name} repo open in your IDE`;
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
		const result = await HostApi.instance.send(SwitchBranchRequestType, {
			branch: pr!.headRefName,
			repoId: derivedState.currentRepo ? derivedState.currentRepo.id : ""
		});
		if (result.error) {
			console.warn("ERROR FROM SET BRANCH: ", result.error);
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
			return;
		} else {
			setIsLoadingBranch(false);
			getOpenRepos();
		}
		// i don't think we need to reload here, do we?
		// fetch("Reloading...");
	};

	return (
		<OutlineBox>
			<FlexRow>
				<Icon name="pull-request" className="bigger" />
				<div>
					<b>Request to merge</b>{" "}
					<Link href={`${pr.repository.url}/-/tree/${pr.sourceBranch}`}>
						<PRBranch>{pr.sourceBranch}</PRBranch>
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
						<PRBranch>{pr.targetBranch}</PRBranch>
					</Link>
				</div>
				<div className="right">
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
						variant="secondary"
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
			</FlexRow>
		</OutlineBox>
	);
};
