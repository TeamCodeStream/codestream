import { DEFAULT_FR_QUERIES } from "@codestream/webview/store/preferences/reducer";
import { bootstrapReviews } from "@codestream/webview/store/reviews/thunks";
import { setUserPreference } from "@codestream/webview/Stream/actions";
import React from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import * as reviewSelectors from "../store/reviews/reducer";
import * as userSelectors from "../store/users/reducer";
import { CodeStreamState } from "../store";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { Headshot } from "../src/components/Headshot";
import {
	setCurrentReview,
	setNewPostEntry,
	openPanel,
	openModal,
	setCreatePullRequest,
	clearCurrentPullRequest,
} from "../store/context/actions";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import Tooltip from "./Tooltip";
import Timestamp from "./Timestamp";
import { ReposScm } from "@codestream/protocols/agent";
import Tag from "./Tag";
import {
	PaneHeader,
	PaneBody,
	NoContent,
	PaneState,
	PaneNode,
	PaneNodeName,
} from "../src/components/Pane";
import { WebviewModals, WebviewPanels } from "../ipc/webview.protocol.common";
import { Link } from "./Link";

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

export const OpenReviews = React.memo(function OpenReviews(props: Props) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { session, preferences, reviews } = state;

		const queries = preferences.fetchRequestQueries || DEFAULT_FR_QUERIES;

		const currentUserId = session.userId!;
		const teamMembers = userSelectors.getTeamMembers(state);
		const reviewGroups = queries.map(_ => {
			const reviews = reviewSelectors.getByStatusAndUser(state, _.query, currentUserId);
			if (_.query === "approved" || _.query === "rejected") {
				reviews.sort((a, b) => b.modifiedAt - a.modifiedAt);
			}
			return _.limit ? reviews.slice(0, _.limit) : reviews;
		});

		return {
			team: state.teams[state.context.currentTeamId],
			teamTagsHash: userSelectors.getTeamTagsHash(state),
			queries,
			reviewGroups,
			currentUserId,
			teamMembers,
			unreadMap: userSelectors.unreadMap(state, Object.values(reviews.reviews)),
		};
	}, shallowEqual);

	const bootstrapped = useSelector((state: CodeStreamState) => state.reviews.bootstrapped);

	const setQueries = queries => {
		dispatch(setUserPreference({ prefPath: ["fetchRequestQueries"], value: [...queries] }));
	};

	useDidMount(() => {
		if (!bootstrapped) {
			dispatch(bootstrapReviews());
		}
	});

	const { teamMembers, reviewGroups, queries } = derivedState;
	const sortedReviewGroups = React.useMemo(() => {
		return reviewGroups.map(reviewArray => {
			const sorted = [...reviewArray];
			sorted.sort((a, b) => b.createdAt - a.createdAt);
			return sorted;
		});
	}, [reviewGroups]);

	const totalReviews = React.useMemo(() => {
		let total = 0;
		reviewGroups.map(_ => {
			total += _.length;
		});
		return total;
	}, [reviewGroups]);

	const toggleQueryHidden = (e, index) => {
		if (e.target.closest(".actions")) return;
		const newQueries = [...queries];
		newQueries[index].hidden = !newQueries[index].hidden;
		setQueries(newQueries);
	};

	// console.warn("Rendering reviews...");
	return (
		<>
			<PaneHeader
				title="Feedback Requests"
				count={totalReviews}
				id={WebviewPanels.OpenReviews}
				isLoading={!bootstrapped}
			>
				<Icon
					onClick={() => {
						dispatch(setNewPostEntry("Feedback Requests Section"));
						dispatch(setCreatePullRequest());
						dispatch(clearCurrentPullRequest());
						dispatch(setCurrentReview());
						dispatch(openPanel(WebviewPanels.NewReview));
					}}
					name="plus"
					title="Request Feedback"
					placement="bottom"
					delay={1}
				/>
				<Icon
					onClick={() => dispatch(openModal(WebviewModals.ReviewSettings))}
					name="gear"
					title="Feedback Request Settings"
					placement="bottom"
					delay={1}
				/>
			</PaneHeader>
			{props.paneState !== PaneState.Collapsed && (
				<PaneBody key={"openreviews"}>
					{!bootstrapped && (
						<Row>
							<Icon name="sync" className="spin margin-right" />
							<span>Loading...</span>
						</Row>
					)}
					{bootstrapped && totalReviews === 0 && (
						<NoContent>
							Lightweight, pre-PR code review. Get quick feedback on any code, even pre-commit.{" "}
							<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/request-feedback/">
								Learn more.
							</Link>
						</NoContent>
					)}
					{totalReviews > 0 && (
						<>
							{sortedReviewGroups.map((reviews, index) => {
								const query = queries[index];
								const count = reviews ? reviews.length : 0;
								return (
									<PaneNode key={index}>
										<PaneNodeName
											onClick={e => toggleQueryHidden(e, index)}
											title={query.name}
											collapsed={query.hidden}
											count={count}
											isLoading={false}
										/>
										{!query.hidden &&
											reviews &&
											reviews.map((review, index) => {
												const codeAuthorId = (review.codeAuthorIds || [])[0] || review.creatorId;
												const codeAuthor = teamMembers.find(user => user.id === codeAuthorId);
												const unreadClass = derivedState.unreadMap[review.id] ? " unread" : "";
												return (
													<Row
														key={"review-" + review.id}
														className="pane-row review"
														onClick={() => dispatch(setCurrentReview(review.id))}
													>
														<div>
															<Tooltip
																title={codeAuthor && codeAuthor.fullName}
																placement="bottomLeft"
															>
																<span>
																	<Headshot person={codeAuthor} />
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
															<Timestamp time={review.createdAt} relative abbreviated />
															{review.numReplies > 0 || derivedState.unreadMap[review.id] ? (
																<span
																	className={`badge${unreadClass}`}
																	style={{ margin: "0 0 0 10px", flexGrow: 0, flexShrink: 0 }}
																>
																	{review.numReplies > 0 ? (
																		review.numReplies
																	) : (
																		<>
																			&nbsp;
																			<span className="dot" />
																		</>
																	)}
																</span>
															) : (
																<span style={{ display: "inline-block", width: "26px" }} />
															)}
														</div>
													</Row>
												);
											})}
									</PaneNode>
								);
							})}
						</>
					)}
				</PaneBody>
			)}
		</>
	);
});
