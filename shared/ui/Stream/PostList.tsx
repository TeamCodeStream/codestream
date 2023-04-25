import { CSPost, CSUser } from "@codestream/protocols/api";
import { debounce as _debounce } from "lodash-es";
import React from "react";
import { findLast, rAFThrottle, safe } from "../utils";
import Icon from "./Icon";
import infiniteLoadable from "./infiniteLoadable";
import { Post } from "./Post";

interface State {}
export interface Props {
	currentUserId?: string;
	currentUserName: string;
	editingPostId?: string;
	hasFocus: boolean;
	hasMore: boolean;
	isActive: boolean;
	isFetchingMore: boolean;
	isThread: boolean;
	newMessagesAfterSeqNum?: any;
	posts: CSPost[];
	renderIntro?: any;
	skipParentPost: boolean;
	streamId: string;
	teamId: string;
	teammates?: CSUser[];
	threadId: string;
	disableEdits: boolean;
	onCancelEdit?: () => void;
	onDidSaveEdit?: () => void;
	renderHeaderIfPostsExist?: string;
	reverse?: boolean;

	markRead: any;
	onDidChangeVisiblePosts: any;
	onDidScrollToTop: any;
	onScroll: any;
	postAction?: Function;
}

const noop = () => {};
export default infiniteLoadable(
	class PostList extends React.Component<Props, State> {
		static defaultProps = {
			disableEdits: false,
			onDidChangeVisiblePosts: noop,
		};
		list = React.createRef<HTMLDivElement>();
		showUnreadBanner = true;
		scrolledOffBottom = false;
		state = {};

		componentDidMount() {
			this.markAsRead();
			if (!this.props.isThread) {
				this.scrollToBottom();
			}
		}

		getSnapshotBeforeUpdate(prevProps, _prevState) {
			if (prevProps.isFetchingMore && !this.props.isFetchingMore) {
				const $list = this.list.current;
				if ($list == null) return null;

				return $list.scrollHeight - $list.scrollTop;
			}
			return null;
		}

		componentDidUpdate(prevProps, _prevState, snapshot) {
			if (snapshot && this.list.current != null) {
				this.list.current.scrollTop = this.list.current.scrollHeight - snapshot;
			}

			const prevPosts = prevProps.posts;
			const { posts } = this.props;

			const streamChanged = this.props.streamId && prevProps.streamId !== this.props.streamId;
			const wasToggled =
				prevProps.isActive !== this.props.isActive || prevProps.hasFocus !== this.props.hasFocus;
			if (streamChanged) {
				this.scrollToBottom();
				this.resetUnreadBanner();
			}
			if (prevProps.isActive && !this.props.isActive) {
				this.showUnreadBanner = false;
				this.findFirstUnread(this.list.current);
			}
			if (streamChanged || wasToggled) {
				this.markAsRead();
			}
			if (!streamChanged && prevPosts.length !== posts.length) {
				if (!this.scrolledOffBottom) {
					this.markAsRead();
					// TODO: only scroll to the first unread message
					this.scrollToBottom();
					this.resetUnreadBanner();
				}
			}

			if (
				!streamChanged &&
				prevProps.newMessagesAfterSeqNum !== this.props.newMessagesAfterSeqNum
			) {
				this.resetUnreadBanner();
			}
		}

		componentWillUnmount() {
			this.handleScroll.cancel();
			this.findFirstUnread.cancel();
		}

		markAsRead = () => {
			if (this.props.isThread) return;

			const { hasFocus, isActive, posts, streamId } = this.props;

			const lastPost = findLast(posts, post => post.creatorId !== "codestream");
			if (hasFocus && isActive && lastPost) {
				if (lastPost.streamId === streamId) this.props.markRead(lastPost.id);
			}
		};

		resize = () => {
			requestAnimationFrame(() => {
				if (!this.scrolledOffBottom) {
					this.scrollToBottom();
				}
			});
		};

		scrollToBottom = () => {
			requestAnimationFrame(() => {
				if (this.list.current) {
					const { clientHeight, scrollHeight } = this.list.current;
					this.list.current.scrollTop = scrollHeight - clientHeight + 10000;
				}
			});
		};

		scrollToUnread = () => {
			const $firstUnreadPost =
				this.list.current && this.list.current.getElementsByClassName("post new-separator").item(0);
			$firstUnreadPost && $firstUnreadPost.scrollIntoView({ behavior: "smooth" });
		};

		getUsersMostRecentPost = () => {
			const { editingPostId, posts } = this.props;
			const editingPostIndex = editingPostId && posts.findIndex(post => post.id === editingPostId);
			const beginSearchIndex = editingPostIndex || posts.length - 1;
			for (let index = beginSearchIndex; index >= 0; index--) {
				const post = posts[index];
				if (editingPostIndex && index >= editingPostIndex) continue;
				if (post.creatorId === this.props.currentUserId) {
					return post;
				}
			}

			return undefined;
		};

		scrollTo = id => {
			const { posts } = this.props;
			if (id === posts[posts.length - 1].id) {
				this.scrollToBottom();
			} else if (this.list.current != null) {
				this.list.current
					.getElementsByClassName("post")
					.namedItem(id)!
					.scrollIntoView({ behavior: "smooth" });
			}
		};

		handleScroll = rAFThrottle(target => {
			const { clientHeight, scrollTop } = target;
			const bottomOfListViewPort = clientHeight + target.getBoundingClientRect().y;
			if (scrollTop < 60) this.props.onDidScrollToTop();

			const $posts = target.getElementsByClassName("post");
			const lastPostPosition = $posts[$posts.length - 1].getBoundingClientRect().y;

			if (lastPostPosition >= bottomOfListViewPort) {
				this.scrolledOffBottom = true;
			} else {
				this.scrolledOffBottom = false;
			}
		});

		onScroll = event => {
			if (this.props.isThread) return;
			this.props.onScroll();
			this.handleScroll(event.target);
			this.findFirstUnread(event.target);
		};

		findFirstUnread = rAFThrottle($list => {
			const { newMessagesAfterSeqNum, onDidChangeVisiblePosts } = this.props;

			let unreadsAbove = false;
			let unreadsBelow = false;

			if (!$list || !this.showUnreadBanner || !newMessagesAfterSeqNum) {
				return onDidChangeVisiblePosts({ unreadsAbove, unreadsBelow });
			}

			let $firstUnreadPost = $list.getElementsByClassName("post new-separator").item(0);
			if (!$firstUnreadPost) return onDidChangeVisiblePosts({ unreadsAbove, unreadsBelow });
			const postDimensions = $firstUnreadPost.getBoundingClientRect();

			if (postDimensions.top < $list.getBoundingClientRect().top) {
				unreadsAbove = true;
			} else if (
				this.scrolledOffBottom &&
				postDimensions.top > $list.getBoundingClientRect().bottom
			) {
				unreadsBelow = true;
			}
			onDidChangeVisiblePosts({ unreadsBelow, unreadsAbove });
			if (!(unreadsAbove || unreadsBelow)) this.showUnreadBanner = false;
		});

		resetUnreadBanner = _debounce(() => {
			const { posts, currentUserId } = this.props;
			if (posts.length === 0) return;
			if (posts[posts.length - 1].creatorId !== currentUserId) {
				this.showUnreadBanner = true;
				if (!this.props.isThread) this.findFirstUnread(this.list.current);
			}
		}, 1000);

		onPostDidResize = postId => {
			if (this.props.posts[this.props.posts.length - 1].id === postId)
				if (!this.scrolledOffBottom) {
					this.scrollToBottom();
				}
		};

		render() {
			const {
				editingPostId,
				isActive,
				newMessagesAfterSeqNum,
				postAction,
				renderIntro,
				isFetchingMore,
				hasMore,
				posts,
				reverse,
				renderHeaderIfPostsExist,
			} = this.props;

			const postsInOrder = reverse ? [...posts].reverse() : posts;

			return (
				<div className="postslist" data-scrollable="true" ref={this.list} onScroll={this.onScroll}>
					{hasMore || isFetchingMore ? (
						<div className="loading-message">
							<Icon name="sync" className="spin" /> Loading more posts...
						</div>
					) : (
						safe(renderIntro)
					)}
					{renderHeaderIfPostsExist && posts && posts.length > 1 && (
						<div className="posts-header">{renderHeaderIfPostsExist}</div>
					)}
					{postsInOrder.map((post, index) => {
						if (
							this.props.skipParentPost &&
							(!post.parentPostId ||
								post.parentPostId === post.id ||
								post.id === this.props.threadId)
						) {
							return null;
						}

						const hasNewMessageLine = safe(() => {
							if (!newMessagesAfterSeqNum) return false;

							const postIsAfterLastRead =
								Number(this.props.posts[index - 1].seqNum) === newMessagesAfterSeqNum;
							if (postIsAfterLastRead && post.creatorId !== this.props.currentUserId) {
								return true;
							}
							return false;
						});

						return (
							<React.Fragment key={post.id}>
								<Post
									id={post.id}
									teammates={this.props.teammates ?? []}
									currentUserId={this.props.currentUserId}
									currentUserName={this.props.currentUserName}
									newMessageIndicator={hasNewMessageLine}
									editing={isActive && post.id === editingPostId}
									action={postAction}
									showDetails={this.props.isThread}
									streamId={this.props.streamId}
									onDidResize={this.onPostDidResize}
									disableEdits={this.props.isThread && post.parentPostId && post.codemarkId}
									onCancelEdit={this.props.onCancelEdit}
									onDidSaveEdit={this.props.onDidSaveEdit}
								/>
							</React.Fragment>
						);
					})}
				</div>
			);
		}
	}
) as any;
