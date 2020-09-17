import React from "react";
import styled from "styled-components";
import CancelButton from "./CancelButton";
import Tooltip from "./Tooltip";
import { Button } from "../src/components/Button";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { setCurrentReview, setCreatePullRequest } from "@codestream/webview/store/context/actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "..";
import { fetchReview } from "@codestream/webview/store/reviews/actions";
import { CodeStreamState } from "../store";
import { getReview } from "../store/reviews/reducer";
import { MinimumWidthCard, Meta, BigTitle, Header } from "./Codemark/BaseCodemark";
import { setReviewStatus } from "./actions";
import { ReviewCloseDiffRequestType } from "../ipc/host.protocol.review";
import Icon from "./Icon";
import { confirmPopup } from "./Confirm";
import { setUserPreference } from "./actions";
import { Dispatch } from "../store/common";
import { Review, BaseReviewMenu, BaseReviewHeader, ExpandedAuthor, Description } from "./Review";
import ScrollBox from "./ScrollBox";
import { TourTip } from "../src/components/TourTip";
import { Modal } from "./Modal";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { getReviewChangeRequests } from "../store/codemarks/reducer";
import { ReviewForm } from "./ReviewForm";
import { openPanel } from "../store/context/actions";
import { WebviewPanels } from "@codestream/protocols/webview";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { PullRequest } from "./PullRequest";

const NavHeader = styled.div`
	// flex-grow: 0;
	// flex-shrink: 0;
	// display: flex;
	// align-items: flex-start;
	padding: 35px 10px 10px 15px;
	// justify-content: center;
	width: 100%;
	${Header} {
		margin-bottom: 0;
	}
	${BigTitle} {
		font-size: 16px;
	}
`;

const Nav = styled.div`
	white-space: nowrap;
	margin-left: auto;
	margin: 15px 0 5px 20px;
	z-index: 50;
	&.pulse {
		opacity: 1 !important;
	}
	.btn-group {
		display: inline-block;
		margin-left: 10px;
		transition: transform 0.1s;
		transform-origin: 50% 0%;
		&:last-child {
			transform-origin: 100% 0%;
		}
		button {
			margin-left: 10px;
			&:first-child {
				margin-left: 0;
			}
			.narrow-icon {
				// display: none;
				margin-right: 5px;
			}
		}
	}
`;
const ClearModal = styled.div`
	position: absolute;
	z-index: 51;
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
`;
const Root = styled.div`
	max-height: 100%;
	display: flex;
	flex-direction: column;
	background: (--panel-tool-background-color);
	&.tour-on {
		${Nav},
		${Meta},
		${Description},
		${ExpandedAuthor},
		${Header} {
			opacity: 0.25;
		}
	}
	#changed-files {
		transition: opacity 0.2s;
	}
	.pulse #changed-files {
		opacity: 1;
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		background: var(--app-background-color-hover);
	}

	.scroll-container {
		flex-grow: 1;
		width: 100%;
		overflow: auto;
		zindex: 1;
	}

	// prefer icons to text
	@media only screen and (max-width: 430px) {
		.btn-group {
			button {
				.narrow-icon {
					display: block;
					margin: 0;
				}
				.wide-text {
					display: none;
				}
				padding: 3px 5px;
				line-height: 1em;
			}
		}
	}
`;

const Subtext = styled.div`
	padding-top: 5px;
	font-size: smaller;
	color: var(--text-color-subtle);
`;

export const ComposeArea = styled.div`
	width: 35px;
	height: 100%;
	position: fixed;
	left: -36px;
	top: 0;
	transition: left 0.1s;
	// background: var(--base-background-color);
	// border-right: 1px solid var(--base-border-color);
	background: var(--button-background-color);
	&.pulse {
		left: 0;
		z-index: 5;
	}
`;

export const StyledReview = styled.div``;

const Tip = styled.div`
	button {
		margin-top: 10px;
		float: right;
	}
	b {
		display: block;
		clear: both;
	}
`;

const Step = styled.div`
	float: left;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	margin: 0 10px 10px 0;
	font-weight: bold;

	background: var(--button-background-color);
	color: var(--button-foreground-color);
	// background: var(--text-color-highlight);
	// color: var(--base-background-color);
`;

const modifier = navigator.appVersion.includes("Macintosh") ? "^ /" : "Ctrl-Shift-/";

export type Props = React.PropsWithChildren<{ reviewId: string; composeOpen: boolean }>;

export function ReviewNav(props: Props) {
	const dispatch = useDispatch<Dispatch>();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { scmInfo } = state.editorContext;
		const filePath = scmInfo && scmInfo.scm ? scmInfo.scm.file : "";
		const review = getReview(state.reviews, props.reviewId);

		const changeRequests = useSelector((state: CodeStreamState) =>
			review ? getReviewChangeRequests(state, review) : []
		);

		const currentUserId = state.session.userId || "";
		const approvedBy = (review && review.approvedBy) || {};

		return {
			review,
			changeRequests,
			editorContext: state.editorContext,
			filePath,
			hideReviewInstructions: state.preferences.hideReviewInstructions,
			currentCodemarkId: state.context.currentCodemarkId,
			isInVscode: state.ide.name === "VSC",
			approvedByMe: approvedBy[currentUserId] ? true : false,
			isMine: currentUserId === (review ? review.creatorId : ""),
			cr2prEnabled: isFeatureEnabled(state, "cr2pr")
		};
	}, shallowEqual);

	const [isEditing, setIsEditing] = React.useState(false);
	const [isAmending, setIsAmending] = React.useState(false);
	const [notFound, setNotFound] = React.useState(false);
	const [hoverButton, setHoverButton] = React.useState(
		derivedState.hideReviewInstructions ? "" : "files"
	);

	const { review } = derivedState;

	const exit = async () => {
		// clear out the current review (set to blank) in the webview
		await dispatch(setCurrentReview());
		// tell the extension to close the diff panel in the editor
		HostApi.instance.send(ReviewCloseDiffRequestType, {});
	};

	const showReview = async () => {
		await dispatch(setCurrentReview(review && review.id));
	};

	useDidMount(() => {
		let isValid = true;
		if (review == null) {
			dispatch(fetchReview(props.reviewId)).then(result => {
				if (!isValid) return;
				if (result == null) setNotFound(true);
			});
		}
		// Kind of a HACK leaving this here, BUT...
		// since <CancelButton /> uses the OLD version of Button.js
		// and not Button.tsx (below), there's no way to keep the style.
		// if Buttons can be consolidated, this could go away
		const disposable = KeystrokeDispatcher.onKeyDown(
			"Escape",
			event => {
				if (event.key === "Escape" && event.target.id !== "input-div") exit();
			},
			{ source: "ReviewNav.tsx", level: -1 }
		);

		return () => {
			disposable && disposable.dispose();
			isValid = false;
		};
	});

	const approve = () => {
		const numOpenChangeRequests = derivedState.changeRequests.filter(r => r.status !== "closed")
			.length;

		if (numOpenChangeRequests > 0) {
			confirmPopup({
				title: "Are you sure?",
				message: "This review has open change requests.",
				centered: true,
				buttons: [
					{ label: "Cancel", className: "control-button" },
					{
						label: "Approve Anyway",
						className: "success",
						wait: true,
						action: () => {
							dispatch(setReviewStatus(review!.id, "approved"));
							showReview();
						}
					}
				]
			});
		} else {
			dispatch(setReviewStatus(review!.id, "approved"));
			showReview();
		}
	};

	const reject = () => {
		confirmPopup({
			title: "Are you sure?",
			message: "Author will be notified you have rejected this set of changes.",
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Reject Changes",
					wait: true,
					action: rejectConfirm,
					className: "delete"
				}
			]
		});
	};

	const rejectConfirm = () => {
		dispatch(setReviewStatus(review!.id, "rejected"));
		showReview();
	};

	const reopen = () => {
		dispatch(setReviewStatus(review!.id, "open"));
	};

	const amend = () => {
		if (review!.status !== "open") reopen();
		setIsAmending(true);
	};

	const pr = async () => {
		await dispatch(setCreatePullRequest(props.reviewId));
		await dispatch(setCurrentReview(""));
		dispatch(openPanel(WebviewPanels.NewPullRequest));
	};

	const highlightChanges = () => {
		const $changeDiv = document.getElementById("change-requests");
		if ($changeDiv) {
			$changeDiv.classList.add("highlight-pulse");
			setTimeout(() => {
				$changeDiv.classList.remove("highlight-pulse");
			}, 1000);
		}
	};

	const statusButtons = () => {
		if (!review) return null;
		const { approvedByMe, isMine } = derivedState;
		const numOpenChangeRequests = derivedState.changeRequests.filter(r => r.status !== "closed")
			.length;
		switch (review.status) {
			case "open":
				return (
					<div className={hoverButton == "actions" ? "btn-group pulse" : "btn-group"}>
						{numOpenChangeRequests > 0 && !approvedByMe && (
							<Tooltip
								title={
									<>
										{numOpenChangeRequests} Pending Change Request
										{numOpenChangeRequests > 1 ? "s" : ""}
									</>
								}
								placement="bottom"
							>
								<Button variant="primary" onClick={highlightChanges}>
									<div
										className="narrow-icon"
										style={{
											display: "inline-block",
											height: "16px",
											minWidth: "16px",
											lineHeight: "16px",
											textAlign: "center"
										}}
									>
										{numOpenChangeRequests}
									</div>
									<span className="wide-text">Pending</span>
								</Button>
							</Tooltip>
						)}
						{isMine && (
							<Tooltip title="Amend Review (add code)" placement="bottom">
								<Button onClick={amend}>
									<Icon className="narrow-icon" name="plus" />
									<span className="wide-text">Amend</span>
								</Button>
							</Tooltip>
						)}
						{approvedByMe && (
							<Tooltip
								title={
									<div>
										You have approved this review.
										<br />
										Click to withdraw approval.
									</div>
								}
								placement="bottom"
							>
								<Button variant="secondary" onClick={reopen}>
									<Icon className="narrow-icon" name="diff-removed" />
									<span className="wide-text">Withdraw</span>
								</Button>
							</Tooltip>
						)}
						{numOpenChangeRequests === 0 && !approvedByMe && (
							<Tooltip title="Approve Review" placement="bottom">
								<Button variant="success" onClick={approve}>
									<Icon className="narrow-icon" name="thumbsup" />
									<span className="wide-text">Approve</span>
								</Button>
							</Tooltip>
						)}
						<Tooltip title="Require Changes" placement="bottom">
							<Button variant="destructive" onClick={reject}>
								<Icon className="narrow-icon" name="thumbsdown" />
								<span className="wide-text">Reject</span>
							</Button>
						</Tooltip>
						<Tooltip title="More actions" placement="bottom">
							<Button variant="secondary">
								<BaseReviewMenu
									review={review}
									setIsEditing={setIsEditing}
									setIsAmending={setIsAmending}
								/>
							</Button>
						</Tooltip>
					</div>
				);
			// case "closed":
			case "approved":
			case "rejected":
				return (
					<div className={hoverButton == "actions" ? "btn-group pulse" : "btn-group"}>
						{derivedState.cr2prEnabled &&
							isMine &&
							review.pullRequestUrl == null &&
							review.status === "approved" && (
								<Tooltip title="Create a PR" placement="bottom">
									<Button onClick={pr}>
										<Icon className="narrow-icon" name="pull-request" />
										<span className="wide-text">Create PR</span>
									</Button>
								</Tooltip>
							)}
						{isMine && review.pullRequestUrl == null && (
							<Tooltip title="Reopen & Amend Review (add code)" placement="bottom">
								<Button onClick={amend}>
									<Icon className="narrow-icon" name="plus" />
									<span className="wide-text">Amend</span>
								</Button>
							</Tooltip>
						)}
						{review.pullRequestUrl == null && (
							<Tooltip title="Reopen Review" placement="bottom">
								<Button variant="secondary" onClick={reopen}>
									<Icon className="narrow-icon" name="reopen" />
									<span className="wide-text">Reopen</span>
								</Button>
							</Tooltip>
						)}
						<Tooltip title="More actions" placement="bottom">
							<Button variant="secondary">
								<BaseReviewMenu
									review={review}
									setIsEditing={setIsEditing}
									setIsAmending={setIsAmending}
								/>
							</Button>
						</Tooltip>
					</div>
				);
			default:
				return null;
		}
		return null;
	};

	const toggleInstructions = () => {
		dispatch(setUserPreference(["hideReviewInstructions"], !derivedState.hideReviewInstructions));
	};

	if (notFound || !review)
		return (
			<Modal verticallyCenter={true} onClose={exit}>
				<MinimumWidthCard>
					This review was not found. Perhaps it was deleted by the author, or you don't have
					permission to view it.
					<br />
					<br />
					<Button onClick={exit}>Exit</Button>
				</MinimumWidthCard>
			</Modal>
		);
	if (derivedState.currentCodemarkId) return null;

	const tourDone = () => {
		setHoverButton("");
		toggleInstructions();
	};

	const titleTip =
		hoverButton === "files" ? (
			<Tip>
				<Step>1</Step> Step through the changes of the review
				<Subtext>By clicking on filenames in any order</Subtext>
				<Button onClick={() => setHoverButton("comment")}>Next &gt;</Button>
				<b></b>
			</Tip>
		) : (
			undefined
		);

	const filesTip =
		hoverButton === "files" ? (
			<Tip>
				<Step>1</Step> Step through the changes of the review
				<Subtext>By clicking on filenames in any order</Subtext>
				<Button onClick={() => setHoverButton("comment")}>Next &gt;</Button>
				<b></b>
			</Tip>
		) : (
			undefined
		);

	const commentTip =
		hoverButton === "comment" ? (
			<Tip>
				<Step>2</Step>Comment on changes in the left margin
				<Subtext>You can also comment on related code as part of the review</Subtext>
				<Button onClick={() => setHoverButton("actions")}>Next &gt;</Button>
				<b></b>
			</Tip>
		) : (
			undefined
		);

	const actionsTip =
		hoverButton === "actions" ? (
			<Tip>
				<Step>3</Step>Approve or reject the review when finished
				<Subtext>Or pause to come back to it later</Subtext>
				<Button onClick={tourDone}>Done</Button>
				<b></b>
			</Tip>
		) : (
			undefined
		);

	if (isEditing) {
		return <ReviewForm isEditing editingReview={review} onClose={() => setIsEditing(false)} />;
	}

	return (
		<Root className={derivedState.hideReviewInstructions ? "" : "tour-on"}>
			{!derivedState.hideReviewInstructions && <ClearModal />}
			<NavHeader>
				<BaseReviewHeader
					review={review}
					collapsed={false}
					setIsEditing={setIsEditing}
					setIsAmending={setIsAmending}
				>
					<></>
				</BaseReviewHeader>
				<Nav className={hoverButton == "actions" ? "pulse" : ""}>
					<TourTip title={actionsTip} placement="bottomRight">
						{statusButtons()}
					</TourTip>
				</Nav>
			</NavHeader>
			{props.composeOpen ? null : (
				<div className="scroll-container">
					<ScrollBox>
						<div
							className="vscroll"
							style={{
								padding: "0 20px 60px 40px",
								width: "100%"
							}}
						>
							<StyledReview className={hoverButton == "files" ? "pulse" : ""}>
								<Review
									review={review}
									isAmending={isAmending}
									setIsAmending={setIsAmending}
									filesTip={filesTip}
								/>
							</StyledReview>

							{derivedState.hideReviewInstructions && (
								<div
									style={{
										marginTop: "50px",
										float: "right",
										cursor: "pointer",
										fontSize: "smaller",
										opacity: 0.5
									}}
								>
									<span
										onClick={() => {
											setHoverButton("files");
											toggleInstructions();
										}}
									>
										Show Instructions
									</span>
								</div>
							)}
						</div>
					</ScrollBox>
				</div>
			)}
			<TourTip title={commentTip} placement="right">
				<ComposeArea className={hoverButton == "comment" ? "pulse" : ""} />
			</TourTip>
		</Root>
	);
}
