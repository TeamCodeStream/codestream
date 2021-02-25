import React from "react";
import { useDispatch } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { api } from "../../../store/providerPullRequests/actions";
import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
import Tooltip from "../../Tooltip";

export const ApproveBox = props => {
	const dispatch = useDispatch();

	const onApproveClick = async (e: React.MouseEvent<Element, MouseEvent>, approve: boolean) => {
		dispatch(
			api("togglePullRequestApproval", {
				approve: approve
			})
		);
	};

	const approvers = props.pr.approvedBy ? props.pr.approvedBy.nodes : [];
	const iHaveApproved = approvers.find(_ => _.username === props.pr.viewer.login);
	const isApproved = approvers.length > 0;

	return (
		<OutlineBox>
			<FlexRow>
				<div style={{ position: "relative" }}>
					<Icon name="person" className="bigger" />
					<Icon name="check" className="overlap" />
				</div>
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
					<Button className="action-button" onClick={e => onApproveClick(e, !iHaveApproved)}>
						Approve
					</Button>
				)}
				<div className="pad-left">
					{isApproved ? (
						<>
							<b>Merge request approved. </b>
							Approved by{" "}
							{approvers.map(_ => (
								<PRHeadshotName person={_} />
							))}
						</>
					) : (
						<>
							Approval is optional <Icon name="info" title="About this feature" placement="top" />
						</>
					)}
				</div>
			</FlexRow>
		</OutlineBox>
	);
};
