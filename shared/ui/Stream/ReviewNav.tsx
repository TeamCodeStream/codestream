import React from "react";
import styled from "styled-components";
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
import { markItemRead, setReviewStatus } from "./actions";
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
import { getPRLabel } from "../store/providers/reducer";
import { getSidebarLocation } from "../store/editorContext/reducer";

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
		margin-left: 8px;
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
export const ClearModal = styled.div`
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
	&.tour-on {
		${Nav},
		${Meta},
		${Description},
		${ExpandedAuthor},
		${Header},
		.replies-to-review {
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
				padding: 3px 5px;
				line-height: 1em;
			}
		}
		.wide-text {
			display: none;
		}
	}
`;

export const Subtext = styled.div`
	padding-top: 5px;
	font-size: smaller;
	color: var(--text-color-subtle);
`;

export const ComposeArea = styled.div<{ side: "right" | "left" }>`
	width: 35px;
	height: 100%;
	position: fixed;
	left: ${props => (props.side === "right" ? "-36px" : "auto")};
	right: ${props => (props.side === "left" ? "-36px" : "auto")};
	top: 0;
	transition: left 0.1s;
	// background: var(--base-background-color);
	// border-right: 1px solid var(--base-border-color);
	background: var(--button-background-color);
	&.pulse {
		left: ${props => (props.side === "right" ? "0" : "auto")};
		right: ${props => (props.side === "left" ? "0" : "auto")};
		z-index: 5;
	}
`;

export const StyledReview = styled.div``;

export const Tip = styled.div`
	display: flex;
	button {
		margin-top: 10px;
		float: right;
	}
	b {
		display: block;
		clear: both;
	}
`;

export const Step = styled.div`
	display: flex;
	flex-shrink: 0;
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
			cr2prEnabled: isFeatureEnabled(state, "cr2pr"),
			sidebarLocation: getSidebarLocation(state),
			prLabel: getPRLabel(state)
		};
	}, shallowEqual);

	const [isEditing, setIsEditing] = React.useState(false);
	const [isAmending, setIsAmending] = React.useState(false);
	const [isApproving, setIsApproving] = React.useState(false);
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

	const unreadEnabled = useSelector((state: CodeStreamState) =>
		isFeatureEnabled(state, "readItem")
	);

	const markRead = () => {
		// @ts-ignore
		if (review && unreadEnabled) dispatch(markItemRead(review.id, review.numReplies || 0));
	};

	useDidMount(() => {
		let isValid = true;
		if (review == null) {
			dispatch(fetchReview(props.reviewId)).then(result => {
				if (!isValid) return;
				if (result == null) setNotFound(true);
				markRead();
			});
		} else {
			markRead();
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

	const approve = async () => {
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
			setIsApproving(true);
			await dispatch(setReviewStatus(review!.id, "approved"));
			showReview();
			setIsApproving(false);
		}
	};

	const reject = () => {
		confirmPopup({
			title: "Are you sure?",
			message: "Author will be notified you are requesting this code be re-worked.",
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Request Changes",
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
								placement="top"
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
							<Tooltip title="Amend Review (add code)" placement="top">
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
								placement="top"
							>
								<Button variant="secondary" onClick={reopen}>
									<Icon className="narrow-icon" name="diff-removed" />
									<span className="wide-text">Withdraw</span>
								</Button>
							</Tooltip>
						)}
						{numOpenChangeRequests === 0 && !approvedByMe && (
							<Tooltip title="Approve Feedback Request" placement="top">
								<Button variant="success" onClick={approve} isLoading={isApproving}>
									<Icon className="narrow-icon" name="thumbsup" />
									<span className="wide-text">Approve</span>
								</Button>
							</Tooltip>
						)}
						<Tooltip title="Request Changes" placement="top">
							<Button variant="destructive" onClick={reject}>
								<Icon className="narrow-icon" name="sync" />
								<span className="wide-text">Request Changes</span>
							</Button>
						</Tooltip>
						<Tooltip title="More actions" placement="top">
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
								<Tooltip title={`Create a ${derivedState.prLabel.PR}`} placement="top">
									<Button onClick={pr}>
										<Icon className="narrow-icon" name="pull-request" />
										<span className="wide-text">Create {derivedState.prLabel.PR}</span>
									</Button>
								</Tooltip>
							)}
						{isMine && review.pullRequestUrl == null && (
							<Tooltip title="Reopen & Amend Review (add code)" placement="top">
								<Button onClick={amend}>
									<Icon className="narrow-icon" name="plus" />
									<span className="wide-text">Amend</span>
								</Button>
							</Tooltip>
						)}
						{review.pullRequestUrl == null && (
							<Tooltip title="Reopen Review" placement="top">
								<Button variant="secondary" onClick={reopen}>
									<Icon className="narrow-icon" name="reopen" />
									<span className="wide-text">Reopen</span>
								</Button>
							</Tooltip>
						)}
						<Tooltip title="More actions" placement="top">
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

	const filesTip =
		hoverButton === "files" ? (
			<Tip>
				<Step>1</Step>
				<div>
					Step through the changes of the review
					<Subtext>By clicking on filenames in any order</Subtext>
					<Button onClick={() => setHoverButton("comment")}>Next &gt;</Button>
				</div>
			</Tip>
		) : (
			undefined
		);

	const commentTip =
		hoverButton === "comment" ? (
			<Tip>
				<Step>2</Step>
				<div>
					Comment by selecting code in the right side of the diff
					<Subtext>You can also comment on related code as part of the review</Subtext>
					<Button
						onClick={() => {
							const el = document.getElementById("nav-header");
							if (el) el.scrollIntoView(true);
							setHoverButton("actions");
						}}
					>
						Next &gt;
					</Button>
				</div>
			</Tip>
		) : (
			undefined
		);

	const actionsTip =
		hoverButton === "actions" ? (
			<Tip>
				<Step>3</Step>
				<div>
					Approve or reject the review when finished
					<Subtext>Or pause to come back to it later</Subtext>
					<Button onClick={tourDone}>Done</Button>
				</div>
			</Tip>
		) : (
			undefined
		);

	if (isEditing) {
		return <ReviewForm isEditing editingReview={review} onClose={() => setIsEditing(false)} />;
	}

	const { sidebarLocation } = derivedState;

	return (
		<Root className={derivedState.hideReviewInstructions ? "" : "tour-on"}>
			{!derivedState.hideReviewInstructions && <ClearModal onClick={() => tourDone()} />}
			<NavHeader id="nav-header">
				<BaseReviewHeader
					review={review}
					collapsed={false}
					setIsEditing={setIsEditing}
					setIsAmending={setIsAmending}
				>
					<></>
				</BaseReviewHeader>
				<Nav className={hoverButton == "actions" ? "pulse" : ""}>
					<TourTip title={actionsTip} placement="bottomLeft">
						{statusButtons()}
					</TourTip>
				</Nav>
			</NavHeader>
			{props.composeOpen ? null : (
				<div className="scroll-container">
					<ScrollBox>
						<div
							className="vscroll"
							id="review-container"
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
											const el = document.getElementById("changed-files");
											if (el) el.scrollIntoView(true);
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
			<TourTip title={commentTip} placement={sidebarLocation === "right" ? "right" : "left"}>
				<ComposeArea
					side={sidebarLocation === "right" ? "right" : "left"}
					className={hoverButton == "comment" ? "pulse" : ""}
				/>
			</TourTip>
		</Root>
	);
}
