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
import {
	setCurrentCodemark,
	setCurrentReview,
	setCurrentCodeError,
	closeAllPanels
} from "../store/context/actions";
import { getActivity } from "../store/activityFeed/reducer";
import { useDidMount, useIntersectionObserver, usePrevious } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import {
	FetchActivityRequestType,
	PostPlus,
	CodemarkPlus,
	PinReplyToCodemarkRequestType,
	GetReposScmRequestType,
	ReposScm,
	DirectoryTree,
	ChangeDataType,
	DidChangeDataNotificationType
} from "@codestream/protocols/agent";
import { savePosts } from "../store/posts/actions";
import { addOlderActivity } from "../store/activityFeed/actions";
import { saveCodemarks } from "../store/codemarks/actions";
import { safe, emptyArray } from "../utils";
import { markStreamRead, setUserPreference } from "./actions";
import {
	CSUser,
	CSReview,
	ActivityFilter,
	RepoSetting,
	CSCodeError
} from "@codestream/protocols/api";
import { resetLastReads } from "../store/unreads/actions";
import { PanelHeader } from "../src/components/PanelHeader";
import { getPost, getThreadPosts } from "../store/posts/reducer";
import Menu from "./Menu";
import { FormattedPlural } from "react-intl";
import { Codemark } from "./Codemark/index";
import { Review } from "./Review";
import { CodeError } from "./CodeError";
import { saveReviews } from "../store/reviews/actions";
import { saveCodeErrors } from "../store/codeErrors/actions";
import { Reply } from "./Posts/Reply";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { Headshot } from "../src/components/Headshot";
import { ProfileLink } from "../src/components/ProfileLink";
import { Keybindings } from "./Keybindings";
import { Dialog } from "../src/components/Dialog";

interface MenuItem {
	label: any;
	checked?: boolean;
	key?: string;
	title?: string;
	action?: Function;
	submenu?: MenuItem[];
}

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

const DEFAULT_ACTIVITY_FILTER = { mode: "openInIde", settings: { repos: [] } };
export const ActivityPanel = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const usernames = userSelectors.getUsernames(state);
		const { preferences } = state;
		return {
			usernames,
			users: state.users,
			noCodemarksAtAll: !codemarkSelectors.teamHasCodemarks(state),
			postsByStreamId: state.posts.byStream,
			currentUserName: state.users[state.session.userId!].username,
			currentUserId: state.session.userId,
			currentTeamId: state.context.currentTeamId,
			activity: getActivity(state),
			hasMoreActivity: state.activityFeed.hasMore,
			codemarkTypeFilter: state.context.codemarkTypeFilter,
			umis: state.umis,
			webviewFocused: state.context.hasFocus,
			repos: state.repos,
			activityFilter:
				preferences[state.context.currentTeamId]?.activityFilter || DEFAULT_ACTIVITY_FILTER
		};
	});

	const previousActivityFilter = usePrevious(derivedState.activityFilter);

	const [activityFilterMenuItems, setActivityFilterMenuItems] = React.useState<any[] | undefined>(
		undefined
	);
	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};
	const [repos, setRepos] = React.useState<ReposScm[]>([]);
	const [maximized, setMaximized] = React.useState(false);
	const [lastFetchedActivity, setLastFetchedActivity] = React.useState<string>();
	const [lastFilteredActivity, setLastFilteredActivity] = React.useState<string>();

	const setActivityPreferences = (
		data: ActivityFilter,
		src: "Folder" | "Everyone" | "Open Repos"
	) => {
		dispatch(setUserPreference([derivedState.currentTeamId, "activityFilter"], data));

		HostApi.instance.track("Activity Feed Filtered", {
			"Selected Filter": src
		});
	};

	const activity = React.useMemo(() => {
		let _activity = derivedState.activity;

		if (!repos?.length) {
			return _activity;
		}

		let repoSettings: RepoSetting[] = [];
		let isFallback = false;
		if (derivedState.activityFilter.mode === "selectedRepos") {
			repoSettings = derivedState.activityFilter?.settings?.repos || [];
			let mappedRepoIds = repos.map(_ => _.id);

			repoSettings = repoSettings?.filter(_ => _.id != null && mappedRepoIds.includes(_.id));

			if (!repoSettings.length) {
				// couldn't find a matching repo open in the ide, fallback to open in IDE
				isFallback = true;
			}
		}
		if (isFallback || derivedState.activityFilter.mode === "openInIde") {
			repoSettings = repos
				?.filter(_ => _.id != null)
				.map(_ => {
					return { id: _.id!, paths: [] };
				});
		} else if (!repoSettings.length) return _activity;

		const filtered = _activity.map(_ => {
			const streams = derivedState.postsByStreamId[_.record.streamId];
			const post = streams[_.record.postId];
			if (post) {
				if (post.mentionedUserIds?.includes(derivedState.currentUserId!)) {
					return _;
				}
				// check replies as well
				const parentPosts = Object.values(streams).find(_ => {
					return _.parentPostId &&
						_.parentPostId === post.id &&
						_.mentionedUserIds?.includes(derivedState.currentUserId!)
						? _
						: null;
				});
				if (parentPosts) {
					return _;
				}
			}

			if (_.type === "codemark") {
				if (_.record.assignees?.includes(derivedState.currentUserId!)) {
					return _;
				}
				let found: any = undefined;
				for (const repoSetting of repoSettings) {
					const match = _.record.markers?.find(m => {
						let isPathMatch = true;
						if (repoSetting.paths && repoSetting.paths[0] != null) {
							isPathMatch = (m.file || "").replace(/\\/g, "/").indexOf(repoSetting.paths![0]) === 0;
						}
						return isPathMatch && repoSetting.id === m.repoId;
					});
					found = match ? _ : undefined;
					if (found) {
						return found;
					}
				}
				return found;
			} else if (_.type === "review") {
				if (_.record.reviewers?.includes(derivedState.currentUserId!)) {
					return _;
				}

				let found: any = undefined;
				for (const repoSetting of repoSettings) {
					const match = _.record.reviewChangesets?.find(m => {
						let isPathMatch = true;
						if (repoSetting.paths && repoSetting.paths[0] != null) {
							isPathMatch = !!m.modifiedFiles.find(
								_ => (_.file || "").replace(/\\/g, "/").indexOf(repoSetting.paths![0]) === 0
							);
						}
						return isPathMatch && repoSetting.id === m.repoId;
					});
					found = match ? _ : undefined;
					if (found) {
						return found;
					}
				}
				return found;
			} else if (_.type === "codeError") {
				let found: any = undefined;
				for (const repoSetting of repoSettings) {
					const match = _.record.stackTraces?.find(m => {
						return repoSetting.id === m.repoId;
					});
					found = match ? _ : undefined;
					if (found) {
						return found;
					}
				}
				return found;
			}
			return null;
		});
		return filtered.filter(Boolean);
	}, [derivedState.activity, repos, derivedState.activityFilter, derivedState.postsByStreamId]);

	const filterLabel = React.useMemo(() => {
		if (derivedState.activityFilter.mode === "selectedRepos") {
			let repoSettings = derivedState.activityFilter?.settings?.repos || [];
			if (repoSettings.length) {
				let mappedRepoIds = repos.map(_ => _.id);
				repoSettings = repoSettings?.filter(_ => _.id != null && mappedRepoIds.includes(_.id));

				// couldn't find a matching repo open in the ide, fallback to open in IDE
				if (!repoSettings.length) {
					console.error("falling back to openInIDE");
					return "my IDE";
				}

				const labels: string[] = [];
				for (const repoSetting of repoSettings) {
					const foundRepo = repos.find(_ => _.id === repoSetting.id);

					labels.push(
						`${foundRepo?.folder?.name || `selected repo`}${
							repoSetting.paths ? " (" + repoSetting.paths[0] + ")" : ""
						}`
					);
				}

				return labels ? labels.join(", ") : "selected repos";
			}
			return "selected repos";
		}
		if (derivedState.activityFilter.mode === "openInIde") {
			return "my IDE";
		}

		return "my organization";
	}, [derivedState.activity, repos]);

	const lastFetchedActivityPostId = safe(() => _last(derivedState.activity)!.record.postId);
	const lastFilteredActivityPostId = safe(() => _last(activity)!.record.postId);
	const fetchActivity = React.useCallback(async () => {
		setLastFetchedActivity(lastFetchedActivityPostId);
		setLastFilteredActivity(lastFilteredActivityPostId);
		let response = await HostApi.instance.send(FetchActivityRequestType, {
			limit: 50,
			before: lastFetchedActivityPostId
		});
		dispatch(savePosts(response.posts));
		dispatch(saveCodemarks(response.codemarks));
		dispatch(saveReviews(response.reviews));
		dispatch(saveCodeErrors(response.codeErrors));
		dispatch(
			addOlderActivity({
				activities: response.records,
				hasMore: Boolean(response.more)
			})
		);
	}, [lastFetchedActivityPostId]);

	// when we fetch results but all new results get filtered out, we need to
	// fetch more data (if there is more data to fetch)
	React.useEffect(() => {
		if (
			lastFetchedActivityPostId !== lastFetchedActivity &&
			derivedState.hasMoreActivity &&
			(lastFilteredActivityPostId === lastFilteredActivity || activity.length === 0)
		) {
			fetchActivity();
		}
	});

	const renderFilter = async () => {
		const repoResponse = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			withSubDirectoriesDepth: 2
		});

		if (repoResponse && repoResponse.repositories) {
			setRepos(repoResponse.repositories);
			const selectedReposSubMenuItems: any[] = [];
			const menuTreeBuilder = (r: DirectoryTree) => {
				const checked = () => {
					if (derivedState.activityFilter.mode === "selectedRepos") {
						const repo = derivedState.activityFilter.settings?.repos?.find(_ => _.id === r.id);
						if (repo && repoResponse.repositories?.find(_ => _.id === repo.id)) {
							if (repo.paths && repo.paths.length) {
								const path = (repo.paths[0] || "").replace(/\\/g, "/");
								if (r.partialPath) {
									const joined = r.partialPath.join("/");
									return joined === path || path.indexOf(joined) === 0;
								}
							}
						}
						return false;
					}
					return false;
				};
				const menuItem: MenuItem = {
					key: r.id + "-" + r.name,
					checked: checked(),
					label: r.name,
					action: () => {
						setActivityPreferences(
							{
								mode: "selectedRepos",
								settings: {
									repos: [
										{
											id: r.id!,
											paths: [r.partialPath.join("/")]
										}
									]
								}
							},
							"Folder"
						);
					}
				};
				if (r?.children != null && r?.children.length) {
					const menuItems: MenuItem[] = [];
					r.children.forEach((child: any) => {
						menuItems.push(menuTreeBuilder(child));
					});
					menuItem.submenu = menuItems;
				}
				return menuItem;
			};

			const mappedRepoIds =
				derivedState.activityFilter.settings?.repos?.filter(_ => _.id).map(_ => _.id) || [];
			const hasASelectedRepo = !!repoResponse.repositories?.find(
				r => r.id && mappedRepoIds.includes(r.id)
			);
			repoResponse.repositories.forEach(_ => {
				const checked = () => {
					if (derivedState.activityFilter.mode === "selectedRepos") {
						const repo = derivedState.activityFilter.settings?.repos?.find(r => r.id === _.id);
						return !!(repo && repoResponse.repositories?.find(r => r.id === repo.id));
					}
					return false;
				};

				const repoMenu = {
					key: _.id,
					checked: checked(),
					label: _.folder.name,
					action: () => {
						setActivityPreferences(
							{
								mode: "selectedRepos",
								settings: {
									repos: [
										{
											id: _.id!
										}
									]
								}
							},
							"Folder"
						);
					}
				} as any;
				selectedReposSubMenuItems.push(repoMenu);
				if (_.directories && _.directories.children != null && _.directories.children.length) {
					const submenuItems: any[] = [];
					_.directories.children.forEach(child => {
						submenuItems.push(menuTreeBuilder(child));
					});
					repoMenu.submenu = submenuItems;
				}
			});
			const mainFilterChoices = [
				{
					checked: derivedState.activityFilter.mode === "everyone",
					key: "everyone",
					label: "Activity from everyone in the organization",
					action: () => {
						setActivityPreferences(
							{
								mode: "everyone",
								settings: {
									repos: []
								}
							},
							"Everyone"
						);
					}
				},
				{
					checked:
						derivedState.activityFilter.mode === "openInIde" ||
						(derivedState.activityFilter.mode === "selectedRepos" && !hasASelectedRepo),
					key: "openInIde",
					label: "Activity associated with code open in my IDE",
					action: () => {
						setActivityPreferences(
							{
								mode: "openInIde",
								settings: {
									repos: []
								}
							},
							"Open Repos"
						);
					}
				},
				{
					checked: derivedState.activityFilter.mode === "selectedRepos" && hasASelectedRepo,
					label: "Activity associated with code in selected folder",
					key: "selectedRepos",
					submenu: selectedReposSubMenuItems
				}
			] as MenuItem[];
			setActivityFilterMenuItems(mainFilterChoices);
		}

		return { repos: repoResponse?.repositories || [] };
	};

	React.useEffect(() => {
		if (JSON.stringify(previousActivityFilter) !== JSON.stringify(derivedState.activityFilter)) {
			renderFilter();
		}
	}, [derivedState.activityFilter]);

	useDidMount(() => {
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Activity Feed" });

		renderFilter().then(() => {
			if (activity.length === 0) fetchActivity();
		});

		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			if (e.type === ChangeDataType.Workspace) {
				renderFilter();
			}
		});

		return () => {
			dispatch(resetLastReads());
			disposable.dispose();
		};
	});

	React.useEffect(() => {
		for (let streamId in derivedState.umis.unreads) {
			dispatch(markStreamRead(streamId));
		}
	}, [derivedState.webviewFocused]);

	const { targetRef, rootRef } = useIntersectionObserver(entries => {
		if (!entries[0].isIntersecting) return;
		if (!derivedState.hasMoreActivity || activity.length === 0) return;
		fetchActivity();
	});

	const renderActivity = () => {
		if (activity.length === 0 && !derivedState.hasMoreActivity) {
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

		return activity.map(({ type, record }) => {
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
									post={post}
									hoverEffect
									isUnread={isUnread}
									onClick={e => {
										const target = e.target;
										if (
											target &&
											// @ts-ignore
											(target.closest(".emoji-mart") || target.closest(".reactions"))
										)
											return;
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
								<span className="verb">requested feedback {repoName && <>in {repoName}</>}</span>{" "}
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
									onClick={e => {
										const target = e.target;
										if (
											target &&
											// @ts-ignore
											(target.closest(".emoji-mart") || target.closest(".reactions"))
										)
											return;

										dispatch(setCurrentReview(record.id));
									}}
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

			if (type === "codeError") {
				if (
					derivedState.codemarkTypeFilter != "all" &&
					"codeError" !== derivedState.codemarkTypeFilter
				)
					return null;

				const repo = null;

				return (
					<ActivityWrapper key={record.id}>
						<ActivityVerb>
							<ProfileLink id={person.id}>
								<Headshot size={24} person={person} />
							</ProfileLink>
							<div>
								<b>{person.username}</b>{" "}
								<span className="verb">
									started a conversation about a code error {repo && <>in {repo}</>}
								</span>{" "}
								<Timestamp relative time={record.createdAt} className="no-padding" />
							</div>
						</ActivityVerb>
						<ActivityItem streamId={record.streamId} postId={record.postId}>
							{({ className, post }) => (
								<CodeError
									className={className}
									codeError={record as CSCodeError}
									collapsed
									hoverEffect
									onClick={e => {
										const target = e.target;
										if (
											target &&
											// @ts-ignore
											(target.closest(".emoji-mart") || target.closest(".reactions"))
										)
											return;
										dispatch(
											setCurrentCodeError(record.id, {
												openType: "Activity Feed"
											})
										);
									}}
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

	return (
		<Dialog
			wide
			noPadding
			onMaximize={() => setMaximized(true)}
			onMinimize={() => setMaximized(false)}
			onClose={() => dispatch(closeAllPanels())}
		>
			<PanelHeader title="Activity">
				{activityFilterMenuItems && (
					<>
						<label onClick={toggleEllipsisMenu} id="activity-filter" style={{ cursor: "pointer" }}>
							<span>
								{derivedState.activityFilter.mode === "everyone"
									? "Activity from everyone in"
									: "Activity associated with code in"}{" "}
							</span>
							{filterLabel}
							<Icon
								name="chevron-down-thin"
								className="smaller"
								style={{ verticalAlign: "-1px" }}
							/>
							{ellipsisMenuOpen && (
								<Menu
									items={activityFilterMenuItems}
									action={() => setEllipsisMenuOpen(undefined)}
									target={ellipsisMenuOpen}
								/>
							)}
						</label>
					</>
				)}
			</PanelHeader>
			<div
				style={{
					height: maximized ? "calc(100vh - 50px)" : "calc(100vh - 120px)",
					overflow: "hidden"
				}}
			>
				<ScrollBox>
					<div ref={rootRef} className="channel-list vscroll">
						{renderActivity()}
						{derivedState.hasMoreActivity &&
							(activity.length === 0 ? (
								<LoadingMessage>Loading latest activity...</LoadingMessage>
							) : (
								<LoadingMessage ref={targetRef}>Loading more...</LoadingMessage>
							))}
					</div>
				</ScrollBox>
			</div>
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
