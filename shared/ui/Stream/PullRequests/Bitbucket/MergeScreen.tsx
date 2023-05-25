import React, { useState } from "react";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";

import { Dialog } from "../../../src/components/Dialog";
import Button from "../../Button";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import { Modal } from "../../Modal";
import { WarningBox } from "../../WarningBox";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	onClose: () => void;
}

export const MergeScreen = (props: Props) => {
	const dispatch = useAppDispatch();
	const [mergeMessage, setMergeMessage] = useState("");
	const [mergeMethod, setMergeMethod] = useState("merge_commit");
	const [mergeSelection, setMergeSelection] = useState("Merge commit");
	const [isCloseSourceBranch, setIsCloseSourceBranch] = useState(false);
	const [isChecked, setIsChecked] = useState(false);
	const [mergeError, setMergeError] = useState("");

	const handleChange = () => {
		if (isChecked) {
			setIsChecked(false);
			setIsCloseSourceBranch(false);
		} else {
			setIsChecked(true);
			setIsCloseSourceBranch(true);
		}
	};

	let result;

	const mergePullRequest = async () => {
		setMergeError("");
		result = (await dispatch(
			api({
				method: "mergePullRequest",
				params: {
					mergeMethod: mergeMethod,
					mergeMessage: mergeMessage,
					closeSourceBranch: isCloseSourceBranch,
				},
			})
		)) as any;
		if (result.payload.error) {
			setMergeError(result.payload.error);
		} else {
			return props.onClose();
		}
	};

	return (
		<Modal translucent>
			<Dialog
				narrow
				title="Merge pull request"
				onClose={() => {
					props.onClose();
				}}
			>
				<div className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							{mergeError && <WarningBox items={[{ message: mergeError }]}></WarningBox>}
							<small title="Source">Destination: {props.pr.headRefName} </small>
							<br style={{ marginBottom: "10px 0 10px 0" }}></br>
							<small title="Desitnation">Source: {props.pr.baseRefName} </small>
							<div style={{ margin: "20px 0" }}>
								<div className="controls" style={{ marginBottom: "10px" }}>
									<label style={{ marginBottom: "10px" }}>Commit message</label>
									<input
										style={{ marginBottom: "10px" }}
										autoFocus
										placeholder="your commit message"
										className="input-text control"
										type="text"
										name="message"
										value={mergeMessage}
										onChange={e => {
											setMergeMessage(e.target.value);
										}}
									/>

									<InlineMenu
										items={[
											{
												label: "Merge commit",
												key: "merge_commit",
												action: () => {
													setMergeMethod("merge_commit"), setMergeSelection("Merge commit");
												},
											},
											{
												label: "Squash",
												key: "squash",
												action: () => {
													setMergeMethod("squash"), setMergeSelection("Squash");
												},
											},
											{
												label: "Fast forward",
												key: "fast_forward",
												action: () => {
													setMergeMethod("fast_forward"), setMergeSelection("Fast forward");
												},
											},
										]}
									>
										{mergeSelection}
									</InlineMenu>
									<div style={{ height: "10px" }} />
								</div>
								<div style={{ marginBottom: "10px" }}>
									<label>
										<input type="checkbox" checked={isChecked} onChange={handleChange} />
										Close source branch
									</label>
								</div>
							</div>
							<div>
								<Button style={{ padding: "0 5px 0 5px" }} onClick={mergePullRequest}>
									Merge
								</Button>
							</div>
						</div>
					</fieldset>
				</div>
			</Dialog>
		</Modal>
	);
};
