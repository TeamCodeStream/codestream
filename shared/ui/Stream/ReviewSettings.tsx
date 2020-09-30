import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CancelButton from "./CancelButton";
import { CodeStreamState } from "../store";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import { closePanel, closeModal } from "./actions";
import { HostApi } from "../webview-api";
import { CSReviewApprovalSetting, CSReviewAssignmentSetting } from "@codestream/protocols/api";
import { UpdateTeamSettingsRequestType } from "@codestream/protocols/agent";
import { getTeamSetting } from "../store/teams/reducer";
import ScrollBox from "./ScrollBox";
import { Dialog } from "../src/components/Dialog";

export const ReviewSettings = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];
		return {
			teamId,
			reviewApproval: getTeamSetting(team, "reviewApproval"),
			reviewAssignment: getTeamSetting(team, "reviewAssignment")
		};
	});
	const [loadingApproval, setLoadingApproval] = useState("");
	const [loadingAssignment, setLoadingAssignment] = useState("");

	const changeApproval = async (value: string) => {
		setLoadingApproval(value);
		HostApi.instance.track("Review Multiple Approval Setting Changed", { Value: value });
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: derivedState.teamId,
			settings: { reviewApproval: value }
		});
		// give it 100 miliseconds to update react state
		// otherwise it flashes for a second on the old radio button
		setTimeout(() => setLoadingApproval(""), 100);
	};

	const changeAssignment = async (value: string) => {
		setLoadingAssignment(value);
		HostApi.instance.track("Review Assignment Setting Changed", { Value: value });
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: derivedState.teamId,
			settings: { reviewAssignment: value }
		});
		// give it 100 miliseconds to update react state
		setTimeout(() => setLoadingAssignment(""), 100);
	};

	return (
		<Dialog title="Feedback Request Settings" onClose={() => dispatch(closeModal())}>
			<ScrollBox>
				<form className="standard-form vscroll">
					<fieldset className="form-body">
						<div id="controls">
							<label>When a review has multiple assigned reviewers</label>
							<RadioGroup
								name="approval"
								selectedValue={loadingApproval || derivedState.reviewApproval}
								onChange={changeApproval}
								loading={loadingApproval !== ""}
							>
								<Radio value={CSReviewApprovalSetting.Anyone}>Any reviewer can approve</Radio>
								<Radio value={CSReviewApprovalSetting.All}>
									All reviewers must approve individually
								</Radio>
								<Radio value={CSReviewApprovalSetting.User}>
									Developer who requests the review decides
								</Radio>
							</RadioGroup>
							<div style={{ height: "20px" }}></div>
							<label>Suggested Reviewers</label>
							<RadioGroup
								name="delivery"
								selectedValue={loadingAssignment || derivedState.reviewAssignment}
								onChange={changeAssignment}
								loading={loadingAssignment !== ""}
							>
								<Radio value={CSReviewAssignmentSetting.None}>None</Radio>
								<Radio value={CSReviewAssignmentSetting.RoundRobin}>Round-robin</Radio>
								<Radio value={CSReviewAssignmentSetting.Random}>Random assignment</Radio>
								<Radio value={CSReviewAssignmentSetting.Authorship1}>
									Authorship (suggest one)
								</Radio>
								<Radio value={CSReviewAssignmentSetting.Authorship2}>
									Authorship (suggest up to two)
								</Radio>
								<Radio value={CSReviewAssignmentSetting.Authorship3}>
									Authorship (suggest up to three)
								</Radio>
							</RadioGroup>
							<p className="explainer" style={{ paddingLeft: "28px" }}>
								Suggests reviewers based on the number of affected (changed) lines of code of which
								they authored. Also takes into account commits pushed to the branch.
							</p>

							<p>&nbsp;</p>

							<p>
								<a href="https://docs.codestream.com/userguide/features/managing-the-team/#code-review-assignment--approval">
									Learn more about Code Review Assignment
								</a>
							</p>
						</div>
					</fieldset>
				</form>
			</ScrollBox>
		</Dialog>
	);
};
