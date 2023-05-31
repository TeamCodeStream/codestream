import React, { useState } from "react";
import { Modal } from "../../Modal";
import {
	BitbucketParticipantRole,
	FetchThirdPartyPullRequestPullRequest,
} from "@codestream/protocols/agent";
import { Dialog } from "@codestream/webview/src/components/Dialog";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import Button from "../../Button";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	onClose: Function;
	isAddReviewer: boolean;
	addItems: {
		type?: string;
		user: {
			display_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			type?: string;
			uuid: string;
			account_id: string;
			nickname: string;
		};
		role: BitbucketParticipantRole;
		approved: boolean;
		state?: string; //"approved" | "changes_requested"
		participated_on: string;
	}[];
	removeItems: {
		type?: string;
		user: {
			display_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			type?: string;
			uuid: string;
			account_id: string;
			nickname: string;
		};
		role: BitbucketParticipantRole;
		approved: boolean;
		state?: string; //"approved" | "changes_requested"
		participated_on: string;
	}[];
}

export const BitbucketParticipantEditScreen = (props: Props) => {
	const pr = props;
	const dispatch = useAppDispatch();
	const [isAdd, setIsAdd] = useState(props.isAddReviewer);
	const [reviewerSelection, setReviewerSelection] = useState("Select reviewer");
	const [reviewerId, setReviewerId] = useState("");
	const [error, setError] = useState("");

	const removeReviewer = async () => {
		await dispatch(
			api({
				method: "removeReviewerFromPullRequest",
				params: {
					reviewerId: reviewerId,
					pullRequestId: props.pr.number,
					fullname: props.pr.repository.nameWithOwner,
				},
			})
		);
		return props.onClose();
	};

	const addReviewer = async () => {
		await dispatch(
			api({
				method: "addReviewerToPullRequest",
				params: {
					reviewerId: reviewerId,
					pullRequestId: props.pr.number,
					fullname: props.pr.repository.nameWithOwner,
				},
			})
		);
		return props.onClose();
	};

	return (
		<Modal translucent>
			{!isAdd ? (
				<>
					<Dialog
						narrow
						title="Remove reviewers"
						onClose={() => {
							props.onClose();
						}}
					>
						<div className="standard-form">
							<fieldset className="form-body">
								<div id="controls">
									{/* {reviewerError && <WarningBox items={[{ message: reviewerError }]}></WarningBox>} */}
									<div style={{ margin: "20px 0" }}>
										<div className="controls">
											<>
												<InlineMenu
													items={props.removeItems.map(_ => {
														return {
															label: _.user.display_name,
															key: _.user.account_id,
															action: () => {
																setReviewerId(_.user.account_id);
																setReviewerSelection(_.user.display_name);
															},
														};
													})}
												>
													{reviewerSelection}
												</InlineMenu>
												<div style={{ height: "10px" }} />
											</>
										</div>
									</div>
									<Button
										disabled={reviewerSelection === "Select reviewer"}
										style={{ padding: "0 5px 0 5px" }}
										onClick={removeReviewer}
									>
										Remove
									</Button>
								</div>
							</fieldset>
						</div>
					</Dialog>
				</>
			) : (
				<>
					<Dialog
						narrow
						title="Add reviewers"
						onClose={() => {
							props.onClose();
						}}
					>
						<div className="standard-form">
							<fieldset className="form-body">
								<div id="controls">
									{/* {reviewerError && <WarningBox items={[{ message: reviewerError }]}></WarningBox>} */}
									<div style={{ margin: "20px 0" }}>
										<div className="controls">
											<InlineMenu
												items={props.addItems.map(_ => {
													return {
														label: _.user.display_name,
														key: _.user.account_id,
														action: () => {
															setReviewerId(_.user.account_id);
															setReviewerSelection(_.user.display_name);
														},
													};
												})}
											>
												{reviewerSelection}
											</InlineMenu>
											<div style={{ height: "10px" }} />
										</div>
									</div>
									<Button
										disabled={reviewerSelection === "Select reviewer"}
										style={{ padding: "0 5px 0 5px" }}
										onClick={addReviewer}
									>
										Add
									</Button>
								</div>
							</fieldset>
						</div>
					</Dialog>
				</>
			)}
		</Modal>
	);
};
