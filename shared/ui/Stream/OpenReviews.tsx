import React from "react";
import { useDispatch, useSelector } from "react-redux";
import * as reviewSelectors from "../store/reviews/reducer";
import * as userSelectors from "../store/users/reducer";
import { CodeStreamState } from "../store";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import Icon from "./Icon";
import { Headshot } from "../src/components/Headshot";
import { setCurrentReview, setNewPostEntry, openPanel, openModal } from "../store/context/actions";
import { useDidMount } from "../utilities/hooks";
import { bootstrapReviews } from "../store/reviews/actions";
import Tooltip from "./Tooltip";
import Timestamp from "./Timestamp";
import { ReposScm } from "@codestream/protocols/agent";
import Tag from "./Tag";
import { Pane, PaneHeader, PaneBody, NoContent, PaneState } from "../src/components/Pane";
import { WebviewModals, WebviewPanels } from "../ipc/webview.protocol.common";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { Link } from "./Link";

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

export function OpenReviews(props: Props) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { session } = state;

		const currentUserId = session.userId!;
		const teamMembers = userSelectors.getTeamMembers(state);
		const reviews = reviewSelectors.getByStatusAndUser(state, "open", currentUserId);

		return {
			team: state.teams[state.context.currentTeamId],
			teamTagsHash: userSelectors.getTeamTagsHash(state),
			reviews,
			currentUserId,
			teamMembers
		};
	});

	const reviewsState = useSelector((state: CodeStreamState) => state.reviews);

	useDidMount(() => {
		if (!reviewsState.bootstrapped) {
			dispatch(bootstrapReviews());
		}
	});

	const { team, reviews, teamMembers, currentUserId } = derivedState;
	const { adminIds } = team;

	const sortedReviews = React.useMemo(() => {
		const sorted = [...reviews];
		sorted.sort((a, b) => b.createdAt - a.createdAt);
		return sorted;
	}, [reviews]);

	return (
		<>
			<PaneHeader
				title="Feedback Requests"
				count={reviews.length}
				id={WebviewPanels.OpenReviews}
				isLoading={!reviewsState.bootstrapped}
			>
				<Icon
					onClick={() => {
						dispatch(setNewPostEntry("Status"));
						dispatch(openPanel(WebviewPanels.NewReview));
					}}
					name="plus"
					title="Request Feedback"
					placement="bottom"
					delay={1}
				/>
				{adminIds && adminIds.includes(currentUserId) && (
					<Icon
						onClick={() => dispatch(openModal(WebviewModals.ReviewSettings))}
						name="gear"
						title="Feedback Request Settings"
						placement="bottom"
						delay={1}
					/>
				)}
			</PaneHeader>
			{props.paneState !== PaneState.Collapsed && (
				<PaneBody>
					{!reviewsState.bootstrapped && (
						<Row>
							<Icon name="sync" className="spin margin-right" />
							<span>Loading...</span>
						</Row>
					)}
					{reviewsState.bootstrapped && sortedReviews.length === 0 && (
						<NoContent>
							Lightweight, pre-PR code review. Get quick feedback on any code, even pre-commit.{" "}
							<Link href="https://docs.codestream.com/userguide/workflow/feedback-requests">
								Learn more.
							</Link>
						</NoContent>
					)}
					{sortedReviews.map(review => {
						const creator = teamMembers.find(user => user.id === review.creatorId);
						return (
							<Row
								key={"review-" + review.id}
								onClick={() => dispatch(setCurrentReview(review.id))}
							>
								<div>
									<Tooltip title={creator && creator.fullName} placement="bottomLeft">
										<span>
											<Headshot person={creator} />
										</span>
									</Tooltip>
								</div>
								<div>
									<span>{review.title}</span>
									{review.tags && review.tags.length > 0 && (
										<span className="cs-tag-container">
											{(review.tags || []).map(tagId => {
												const tag = derivedState.teamTagsHash[tagId];
												return tag ? <Tag key={tagId} tag={tag} /> : null;
											})}
										</span>
									)}
									<span className="subtle">{review.text}</span>
								</div>
								<div className="icons">
									<Icon
										name="review"
										className="clickable"
										title="Review Changes"
										placement="bottomLeft"
										delay={1}
									/>
									<Timestamp time={review.createdAt} relative abbreviated />
								</div>
							</Row>
						);
					})}
				</PaneBody>
			)}
		</>
	);
}
