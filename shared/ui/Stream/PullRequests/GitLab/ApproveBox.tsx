import React from "react";
import { useDispatch } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { api } from "../../../store/providerPullRequests/actions";

export const ApproveBox = props => {
	const dispatch = useDispatch();

	const onApproveClick = async (e: React.MouseEvent<Element, MouseEvent>, approve: boolean) => {
		dispatch(
			api("togglePullRequestApproval", {
				approve: approve
			})
		);
	};

	const iHaveApproved =
		props.pr.approvedBy &&
		props.pr.approvedBy.nodes &&
		props.pr.approvedBy.nodes.find(_ => _.username === props.pr.viewer.login);

	return (
		<OutlineBox>
			<FlexRow>
				<div style={{ position: "relative" }}>
					<Icon name="person" className="bigger" />
					<Icon name="check" className="overlap" />
				</div>
				<Button className="action-button" onClick={e => onApproveClick(e, !iHaveApproved)}>
					{iHaveApproved ? <>Revoke Approval</> : <>Approve</>}
				</Button>
				<div className="pad-left">
					Approval is optional <Icon name="info" title="About this feature" placement="top" />
				</div>
				<div className="pad-left">
					{props.pr.approvedBy.nodes.length > 0 && <span>Approved by</span>}{" "}
					{props.pr.approvedBy &&
						props.pr.approvedBy.nodes &&
						props.pr.approvedBy.nodes.map(_ => {
							return <span>{_.username}</span>;
						})}
				</div>
			</FlexRow>
		</OutlineBox>
	);
};
