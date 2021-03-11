import React from "react";
import { useSelector } from "react-redux";
import Icon from "../../Icon";
import { OutlineBox, FlexRow } from "./PullRequest";
import styled from "styled-components";
import { GitLabMergeRequest, GitLabMergeRequestWrapper } from "@codestream/protocols/agent";
import Tooltip from "../../Tooltip";
import { Link } from "../../Link";
import { getCurrentProviderPullRequestRootObject } from "../../../store/providerPullRequests/reducer";
import { CodeStreamState } from "@codestream/webview/store";

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
	canceled: { icon: "alert" },
	skipped: { icon: "sad" }
};

export const PipelineBox = (props: { pr: GitLabMergeRequest; setIsLoadingMessage: Function }) => {
	const pr = props.pr;
	const pipeline = pr?.pipelines?.nodes[0];
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			prRoot: getCurrentProviderPullRequestRootObject(state) as GitLabMergeRequestWrapper
		};
	});

	if (
		derivedState?.prRoot?.project?.onlyAllowMergeIfPipelineSucceeds &&
		(!pipeline || pipeline.status === "CANCELED")
	) {
		return (
			<OutlineBox>
				<FlexRow>
					<Icon name="sync" className="spin" />
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
			<FlexRow>
				<Link href={pipeline.webUrl}>
					<Icon name={iconWrapper.icon} className="bigger" />
				</Link>
				<div>
					Detached merge request pipeline <Link href={pipeline.webUrl}>#{pipeline.id}</Link>{" "}
					{pipeline.status.toLowerCase()} for{" "}
					<Link href={`${pr.baseWebUrl}/${pr.repository.nameWithOwner}/-/commit/${pipeline.sha}`}>
						{pipeline.sha!.substring(0, 8)}
					</Link>
				</div>
				<div className="pad-left" style={{ flex: "auto", textAlign: "right" }}>
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
			</FlexRow>
		</OutlineBox>
	);
};
