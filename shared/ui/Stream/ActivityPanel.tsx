import React, { PropsWithChildren } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "./Icon";
import ScrollBox from "./ScrollBox";
import Timestamp from "./Timestamp";
import * as codemarkSelectors from "../store/codemarks/reducer";
import * as userSelectors from "../store/users/reducer";
import styled from "styled-components";
import { includes as _includes, sortBy as _sortBy, last as _last } from "lodash-es";
import { CodeStreamState } from "../store";
import { setCurrentCodemark, setCurrentReview, closeAllPanels } from "../store/context/actions";
import { getActivity } from "../store/activityFeed/reducer";
import { useDidMount, useIntersectionObserver } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import {
	FetchActivityRequestType,
	PostPlus,
	CodemarkPlus,
	PinReplyToCodemarkRequestType
} from "@codestream/protocols/agent";
import { savePosts } from "../store/posts/actions";
import { addOlderActivity } from "../store/activityFeed/actions";
import { saveCodemarks } from "../store/codemarks/actions";
import { safe, emptyArray } from "../utils";
import { markStreamRead } from "./actions";
import { CSUser, CodemarkType, CSReview } from "@codestream/protocols/api";
import { resetLastReads } from "../store/unreads/actions";
import { PanelHeader } from "../src/components/PanelHeader";
import { getPost, getThreadPosts } from "../store/posts/reducer";
import Menu from "./Menu";
import { FormattedPlural } from "react-intl";
import { Codemark } from "./Codemark/index";
import { Review } from "./Review";
import { saveReviews } from "../store/reviews/actions";
import { Reply } from "./Posts/Reply";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { Headshot } from "../src/components/Headshot";
import { ProfileLink } from "../src/components/ProfileLink";
import { Keybindings } from "./Keybindings";
import { Dialog } from "../src/components/Dialog";

// see comment in SmartFormattedList.tsx
const FormattedPluralAlias = FormattedPlural as any;

const EmptyMessage = styled.div`
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	p {
		width: 20em;
		margin: 0 auto;
		color: var(--text-color-subtle);
		text-align: center;
	}
`;

export const ActivityPanel = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const usernames = userSelectors.getUsernames(state);

		return {
			usernames,
			users: state.users,
			noCodemarksAtAll: !codemarkSelectors.teamHasCodemarks(state),
			currentUserName: state.users[state.session.userId!].username,
			activity: getActivity(state),
			hasMoreActivity: state.activityFeed.hasMore,
			codemarkTypeFilter: state.context.codemarkTypeFilter,
			umis: state.umis,
			webviewFocused: state.context.hasFocus,
			repos: state.repos
			// apiCapabilities: state.apiVersioning.apiCapabilities
		};
	});

	const fetchActivity = React.useCallback(async () => {
		const response = await HostApi.instance.send(FetchActivityRequestType, {
			limit: 50,
			before: safe(() => _last(derivedState.activity)!.record.postId)
		});
		dispatch(savePosts(response.posts));
		dispatch(saveCodemarks(response.codemarks));
		dispatch(saveReviews(response.reviews));
		dispatch(
			addOlderActivity({
				activities: response.records,
				hasMore: Boolean(response.more)
			})
		);
	}, [derivedState.activity]);

	useDidMount(() => {
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Activity Feed" });

		if (derivedState.activity.length === 0) fetchActivity();
		return () => {
			dispatch(resetLastReads());
		};
	});

	React.useEffect(() => {
		for (let streamId in derivedState.umis.unreads) {
			dispatch(markStreamRead(streamId));
		}
	}, [derivedState.webviewFocused]);

	const { targetRef, rootRef } = useIntersectionObserver(entries => {
		if (!entries[0].isIntersecting) return;
		if (!derivedState.hasMoreActivity || derivedState.activity.length === 0) return;
		fetchActivity();
	});

	const renderActivity = () => {
		if (derivedState.activity.length === 0 && !derivedState.hasMoreActivity) {
			return (
				<div style={{ height: "75vh" }}>
					<Keybindings>
						The activity feed will let you know when your teammates create codemarks, assign issues,
						request reviews, or add replies.
						<br />
						<br />
					</Keybindings>
				</div>
			);
		}

		return derivedState.activity.map(({ type, record }) => {
			const person = derivedState.users[record.creatorId || ""];
			if (!person) return null;

			if (type === "codemark") {
				const codemark = record as CodemarkPlus;
				if (
					derivedState.codemarkTypeFilter != "all" &&
					codemark.type !== derivedState.codemarkTypeFilter
				)
					return null;

				return (
					<ActivityWrapper key={codemark.id}>
						<ActivityVerb>
							<ProfileLink id={person.id}>
								<Headshot size={24} person={person} />
							</ProfileLink>
							<div>
								<b>{person.username}</b>
								<span className="verb">{codemark.type === "issue" ? " opened an issue " : ""}</span>
								<Timestamp relative time={codemark.createdAt} />
							</div>
						</ActivityVerb>
						<ActivityItem streamId={codemark.streamId} postId={codemark.postId}>
							{({ className, isUnread, post }) => (
								// @ts-ignore because typescript isn't handling the union props well
								<Codemark
									className={className}
									collapsed={!isUnread}
									codemark={codemark}
									hoverEffect
									isUnread={isUnread}
									onClick={() => {
										HostApi.instance.track("Codemark Clicked", {
											"Codemark ID": codemark.id,
											"Codemark Location": "Activity Feed"
										});
										dispatch(setCurrentCodemark(codemark.id));
									}}
									renderActions={true}
									renderFooter={Footer => (
										<Footer
											style={{ borderTop: "none", paddingLeft: 0, paddingRight: 0, marginTop: 0 }}
										>
											<RepliesForActivity
												parentPost={post}
												pinnedReplies={codemark.pinnedReplies}
											/>
										</Footer>
									)}
								/>
							)}
						</ActivityItem>
					</ActivityWrapper>
				);
			}

			if (type === "review") {
				if (
					derivedState.codemarkTypeFilter != "all" &&
					"review" !== derivedState.codemarkTypeFilter
				)
					return null;

				// @ts-ignore
				const repoName = record.reviewChangesets
					.map(changeset =>
						derivedState.repos[changeset.repoId]
							? derivedState.repos[changeset.repoId].name
							: undefined
					)
					// remove duplictes
					.filter((val, index, arr) => arr.indexOf(val) === index)
					.filter(Boolean)
					.join(", ");

				return (
					<ActivityWrapper key={record.id}>
						<ActivityVerb>
							<ProfileLink id={person.id}>
								<Headshot size={24} person={person} />
							</ProfileLink>
							<div>
								<b>{person.username}</b>{" "}
								<span className="verb">requested a review {repoName && <>in {repoName}</>}</span>{" "}
								<Timestamp relative time={record.createdAt} className="no-padding" />
							</div>
						</ActivityVerb>
						<ActivityItem streamId={record.streamId} postId={record.postId}>
							{({ className, post }) => (
								<Review
									className={className}
									review={record as CSReview}
									collapsed
									hoverEffect
									onClick={() => dispatch(setCurrentReview(record.id))}
									renderFooter={Footer => (
										<Footer
											style={{ borderTop: "none", paddingLeft: 0, paddingRight: 0, marginTop: 0 }}
										>
											<RepliesForActivity parentPost={post} />
										</Footer>
									)}
								/>
							)}
						</ActivityItem>
					</ActivityWrapper>
				);
			}

			return null;
		});
	};

	// const showActivityLabels = {
	// 	all: "all activity",
	// 	[CodemarkType.Comment]: "comments",
	// 	[CodemarkType.Review]: "code reviews",
	// 	[CodemarkType.Issue]: "issues"
	// };

	// const menuItems = [
	// 	{ label: "All Activity", action: "all" },
	// 	{ label: "-" },
	// 	{ label: "Comments", icon: <Icon name="comment" />, action: CodemarkType.Comment },
	// 	{ label: "Issues", icon: <Icon name="issue" />, action: CodemarkType.Issue }
	// ];
	// if (derivedState.apiCapabilities.lightningCodeReviews) {
	// 	menuItems.push({
	// 		label: "Code Reviews",
	// 		icon: <Icon name="review" />,
	// 		action: CodemarkType.Review
	// 	});
	// }

	console.warn("RENDERING ACTIVITY!");
	return (
		<Dialog maximizable wide noPadding onClose={() => dispatch(closeAllPanels())}>
			<PanelHeader title="Activity" />
			<ScrollBox>
				<div ref={rootRef} className="channel-list vscroll">
					{renderActivity()}
					{derivedState.hasMoreActivity &&
						(derivedState.activity.length === 0 ? (
							<LoadingMessage>Loading latest activity...</LoadingMessage>
						) : (
							<LoadingMessage ref={targetRef}>Loading more...</LoadingMessage>
						))}
				</div>
			</ScrollBox>
		</Dialog>
	);
};

type ActivityItemChildren = (props: {
	post: PostPlus;
	className?: string;
	isUnread?: boolean;
}) => any;

// this component is a wrapper which generates the unread styling
const ActivityItemWrapper = styled(
	(props: {
		post: PostPlus;
		isUnread?: boolean;
		children: ActivityItemChildren;
		className?: string;
	}) => {
		const { children, ...childProps } = props;
		return children(childProps);
	}
)`
	${props =>
		props.isUnread
			? `
		border-left: 2px solid var(--text-color-info);
		${StyledReply} { border-left: none; }
		`
			: ""}
	margin-left: 30px;
	@media only screen and (max-width: 350px) {
		margin-left: 0;
	}
`;

const ActivityVerb = styled.div`
	display: flex;
	align-items: center;
	margin: 5px 0 5px 0;
	${Headshot} {
		flex-shrink: 0;
		display: inline-block;
		margin-right: 8px;
		margin-left: 0;
	}
	b {
		font-weight: normal;
		color: var(--text-color-highlight);
	}
	color: var(--text-color-subtle);
	.icon {
		vertical-align: -2px;
	}
	.verb {
		margin-right: 5px;
	}
	time {
		padding: 0;
		white-space: nowrap;
		opacity: 0.5;
	}
`;

/*
	For each activity, given postId + streamId, this component will look up the post
	and determine if it's unread. The child to this is a render function that receives
	the `ActivityItemChildren` args, which contains info about the activity and post and also
	a `className` for style overrides
*/
const ActivityItem = (props: {
	postId: string;
	streamId: string;
	children: ActivityItemChildren;
}) => {
	const { isUnread, post } = useSelector((state: CodeStreamState) => {
		const post = getPost(state.posts, props.streamId, props.postId);
		const lastReadForStream = state.umis.lastReads[props.streamId];

		return {
			isUnread:
				lastReadForStream != undefined &&
				post != undefined &&
				(post as PostPlus).seqNum > lastReadForStream,
			post
		};
	});

	return <ActivityItemWrapper isUnread={isUnread} children={props.children} post={post} />;
};

const SeeReplies = styled.div`
	text-align: center;
`;

const StyledReply = styled(Reply)`
	padding-left: 10px;
	padding-right: 10px;
	border-left: 2px solid var(--text-color-info);
`;

const UnreadReply = (props: {
	author: Partial<CSUser>;
	post: PostPlus;
	starred?: boolean;
	codemarkId?: string;
}) => {
	const menuItems = React.useMemo(() => {
		// sine the only menu item right now is for pinning replies, don't show it if this is not a reply to a codemark
		if (props.codemarkId == null) return emptyArray;

		return [
			{
				label: props.starred ? "Un-Star Reply" : "Star Reply",
				key: "star",
				action: () => {
					HostApi.instance.send(PinReplyToCodemarkRequestType, {
						codemarkId: props.codemarkId!,
						postId: props.post.id,
						value: !props.starred
					});
				}
			}
		];
	}, [props.starred]);

	return (
		<StyledReply
			author={props.author}
			post={props.post}
			showParentPreview
			renderMenu={
				menuItems.length === 0
					? undefined
					: (target, close) => target && <Menu items={menuItems} target={target} action={close} />
			}
		/>
	);
};

const createUnknownUser = id => ({ username: id, fullName: "Unknown" });

const RepliesForActivity = (props: { parentPost?: PostPlus; pinnedReplies?: string[] }) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		if (props.parentPost == undefined) return { numberOfReplies: 0, unreadReplies: [] };
		const lastUnreadForStream = state.umis.lastReads[props.parentPost.streamId] as
			| number
			| undefined;
		const unreadReplies: PostPlus[] =
			lastUnreadForStream != undefined
				? (getThreadPosts(state, props.parentPost.streamId, props.parentPost.id).filter(
						post => (post as any).seqNum > lastUnreadForStream
				  ) as PostPlus[])
				: [];

		return { numberOfReplies: props.parentPost.numReplies, unreadReplies };
	});

	const users = useSelector((state: CodeStreamState) => state.users);

	if (derivedState.numberOfReplies === 0) return null;

	if (derivedState.unreadReplies.length === 0) return null; //<SeeReplies>See replies</SeeReplies>;

	const otherReplyCount = derivedState.numberOfReplies - derivedState.unreadReplies.length;

	return (
		<>
			{derivedState.unreadReplies.map(post => (
				<UnreadReply
					key={post.id}
					post={post}
					author={users[post.creatorId] || createUnknownUser(post.creatorId)}
					starred={Boolean(props.pinnedReplies && props.pinnedReplies.includes(post.id))}
					codemarkId={props.parentPost!.codemarkId}
				/>
			))}
			{false && otherReplyCount > 0 && (
				<SeeReplies>
					See {otherReplyCount} earlier{" "}
					<FormattedPluralAlias value={otherReplyCount} one="reply" other="replies" />
				</SeeReplies>
			)}
		</>
	);
};

const ActivityWrapper = styled.div`
	// tag: codemark-width
	margin: 5px 10px 30px 20px;
	.codemark-details {
		margin-bottom: 5px;
	}
	.activity-verb {
	}
`;
