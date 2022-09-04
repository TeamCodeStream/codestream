import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { api } from "../../../store/providerPullRequests/thunks";
import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
import Tooltip from "../../Tooltip";
import { GitLabMergeRequest } from "@codestream/protocols/agent";

export const ApproveBox = (props: { pr: GitLabMergeRequest }) => {
	const dispatch = useAppDispatch();

	if (!props.pr.userPermissions?.canApprove || !props.pr.supports.approvals) return null;

	const [isLoading, setIsLoading] = useState(false);
	const onApproveClick = async (e: React.MouseEvent<Element, MouseEvent>, approve: boolean) => {
		setIsLoading(true);
		try {
			await dispatch(
				api({
					method: "togglePullRequestApproval",
					params: {
						approve: approve,
					},
				})
			);
		} catch (ex) {
			console.error(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const approvers =
		props.pr.supports?.approvedBy && props.pr.approvedBy ? props.pr.approvedBy.nodes : [];
	const iHaveApproved = approvers.find(_ => _.login === props.pr.viewer.login);
	const isApproved = approvers.length > 0;

	const render = () => {
		if (isApproved) {
			return (
				<>
					<b>Merge request approved. </b>
					{approvers?.length && (
						<>
							Approved by{" "}
							{approvers.map(_ => (
								<PRHeadshotName person={_} />
							))}
						</>
					)}
				</>
			);
		}
		return null;
		// const approvalOptional = (
		// 	<>
		// 		Approval is optional
		// 		{!props.pr.mergedAt && (
		// 			<>
		// 				{" "}
		// 				<Link
		// 					href={`${props.pr.baseWebUrl}/help/user/project/merge_requests/merge_request_approvals`}
		// 				>
		// 					<Icon name="info" title="About this feature" placement="top" />
		// 				</Link>
		// 			</>
		// 		)}
		// 	</>
		// );
		// if (props.pr.supports.approvalsRequired) {
		// 	if (!props.pr.approvalsRequired) {
		// 		return approvalOptional;
		// 	} else {
		// 		return <>Requires approval</>;
		// 	}
		// }
		// return approvalOptional;
	};

	if (
		// needs to check for exactly false, because it might be undefined if this endpoint doesn't exist
		// on this GL instance
		props.pr.approvalsAuthorCanApprove === false &&
		props.pr.author?.login === props.pr.viewer.login
	) {
		return (
			<OutlineBox>
				<FlexRow>
					<div className="row-icon" style={{ position: "relative" }}>
						<Icon name="person" className="bigger" />
						<Icon name="check" className="overlap" />
					</div>
					<Tooltip title="This user cannot approve this merge request">
						<span>
							<Button className="action-button" disabled={true} variant="neutral">
								Approve
							</Button>
						</span>
					</Tooltip>
					<div>{render()}</div>
				</FlexRow>
			</OutlineBox>
		);
	}

	return (
		<OutlineBox>
			<FlexRow>
				<div className="row-icon" style={{ position: "relative" }}>
					<Icon name="person" className="bigger" />
					<Icon name="check" className="overlap" />
				</div>
				{!props.pr.merged && (
					<>
						{iHaveApproved ? (
							<Tooltip title="Revoke approval" placement="top">
								<Button
									className="action-button"
									variant="warning"
									onClick={e => onApproveClick(e, !iHaveApproved)}
								>
									Revoke
								</Button>
							</Tooltip>
						) : (
							<Button
								isLoading={isLoading}
								className="action-button"
								onClick={e => onApproveClick(e, !iHaveApproved)}
							>
								Approve
							</Button>
						)}
					</>
				)}
				{props.pr.merged && (
					<Tooltip title="Merge request has already been merged">
						<span>
							<Button className="action-button" disabled={true} variant="neutral">
								Approve
							</Button>
						</span>
					</Tooltip>
				)}

				<div className="pad-left">{render()}</div>
			</FlexRow>
		</OutlineBox>
	);
};
