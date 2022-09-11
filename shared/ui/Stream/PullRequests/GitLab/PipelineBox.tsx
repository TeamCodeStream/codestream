import { GitLabMergeRequest, GitLabMergeRequestWrapper } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import React from "react";
import styled from "styled-components";
import { getCurrentProviderPullRequestRootObject } from "../../../store/providerPullRequests/slice";
import Icon from "../../Icon";
import { Link } from "../../Link";
import Tooltip from "../../Tooltip";
import { FlexRow, OutlineBox } from "./PullRequest";

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

const iconForStatus = {
	running: { icon: "clock" },
	prepare: { icon: "clock" },
	pending: { icon: "pause" },
	passed: { icon: "check-circle" },
	success: { icon: "check-circle" },
	failed: { icon: "x" },
	canceled: { icon: "cancel" },
	skipped: { icon: "double-chevron-right" },
};

export const PipelineBox = (props: { pr: GitLabMergeRequest; setIsLoadingMessage: Function }) => {
	const pr = props.pr;
	const pipeline = pr?.headPipeline;
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			prRoot: getCurrentProviderPullRequestRootObject(
				state
			) as unknown as GitLabMergeRequestWrapper, // TODO fix typing
		};
	});

	if (
		derivedState?.prRoot?.project?.onlyAllowMergeIfPipelineSucceeds &&
		(!pipeline || pipeline.status === "CANCELED")
	) {
		return (
			<OutlineBox>
				<FlexRow style={{ flexWrap: "nowrap" }}>
					<Icon name="sync" className="spin row-icon" />
					<div className="pad-left">
						Checking pipeline status{" "}
						<Link href={`${pr.baseWebUrl}/help/ci/troubleshooting.md`}>
							<Icon name="question" />
						</Link>
					</div>
				</FlexRow>
			</OutlineBox>
		);
	}
	if (!pipeline) return null;

	const iconWrapper = iconForStatus[pipeline.status.toLowerCase()] || { icon: "clock" };
	return (
		<OutlineBox>
			<FlexRow style={{ flexWrap: "nowrap" }}>
				<Link href={pipeline.webUrl} className="row-icon">
					<Icon name={iconWrapper.icon} className="bigger" />
				</Link>
				<div>
					{pipeline.stages && (
						<div className="float-right">
							{pipeline.stages.nodes.map(_ => {
								const iconWrapper = iconForStatus[_.detailedStatus.label] || { icon: "clock" };

								return (
									<Tooltip
										placement="top"
										delay={1}
										trigger={["hover"]}
										overlayStyle={{ zIndex: "3000" }}
										title={`${_.name}: ${_.detailedStatus.tooltip}`}
									>
										<span>
											<Icon name={iconWrapper.icon} style={{ paddingRight: "5px" }} />
										</span>
									</Tooltip>
								);
							})}
						</div>
					)}
					Merge request pipeline{" "}
					<Link href={pipeline.webUrl}>
						#{pipeline.id.replace("gid://gitlab/Ci::Pipeline/", "")}
					</Link>{" "}
					{pipeline.detailedStatus.label} for{" "}
					<Link href={`${pr.baseWebUrl}/${pr.repository.nameWithOwner}/-/commit/${pipeline.sha}`}>
						{pipeline.sha!.substring(0, 8)}
					</Link>
				</div>
			</FlexRow>
		</OutlineBox>
	);
};
