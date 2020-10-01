import styled from "styled-components";
import cx from "classnames";
import { CSUser } from "@codestream/protocols/api";
import { PostPlus } from "@codestream/protocols/agent";
import React from "react";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { KebabIcon, MetaDescriptionForTags } from "../Codemark/BaseCodemark";
import Icon from "../Icon";
import Timestamp from "../Timestamp";
import { getCodemark } from "@codestream/webview/store/codemarks/reducer";
import { CodeStreamState } from "@codestream/webview/store";
import { useSelector, useDispatch } from "react-redux";
import { Post, isPending } from "@codestream/webview/store/posts/types";
import Menu from "../Menu";
import { confirmPopup } from "../Confirm";
import { deletePost, editPost } from "../actions";
import { RepliesToPostContext } from "./RepliesToPost";
import { getPost } from "@codestream/webview/store/posts/reducer";
import { MarkdownText } from "../MarkdownText";
import MarkerActions from "../MarkerActions";
import MessageInput from "../MessageInput";
import Button from "../Button";
import { Dispatch } from "@codestream/webview/store/common";
import { replaceHtml, escapeHtml } from "@codestream/webview/utils";
import {
	findMentionedUserIds,
	getTeamMembers,
	getTeamTagsHash
} from "@codestream/webview/store/users/reducer";
import { editCodemark } from "@codestream/webview/store/codemarks/actions";
import Tag from "../Tag";
import { ProfileLink } from "@codestream/webview/src/components/ProfileLink";
import { AddReactionIcon, Reactions } from "../Reactions";

export interface ReplyProps {
	author: Partial<CSUser>;
	post: Post;
	nestedReplies?: PostPlus[];
	renderMenu?: (target: any, onClose: () => void) => React.ReactNode;
	className?: string;
	showParentPreview?: boolean;
	editingPostId?: string;
	threadId?: string; // only set for nested replies
	lastNestedReply?: boolean;
}

const AuthorInfo = styled.div`
	display: flex;
	align-items: top;
	${Headshot} {
		margin-right: 7px;
		flex-shrink: 0;
	}
	.emote {
		font-weight: normal;
		padding-left: 4px;
	}
`;

const Root = styled.div`
	padding-bottom: 10px;
	padding-top: 10px;
	display: flex;
	flex-direction: column;
	position: relative;
	// not sure if there is a better way to deal with this,
	// but if the headshot is taller than the copy (i.e. in
	// a zero-height post such as an emote) we end up with
	// too little padding between the reply and the one below
	// since the other reply has a 5px extra padding from that body
	min-height: 35px;
	${AuthorInfo} {
		font-weight: 700;
	}
	.icon.reply {
		margin-left: 5px;
		margin-right: 10px;
		vertical-align: -2px;
	}
	${AddReactionIcon} {
		vertical-align: -2px;
		margin-left: 5px;
		margin-right: 5px;
	}
	.bar-left-not-last-child {
		width: 2px;
		height: 100%;
		position: absolute;
		top: 0px;
		left: 9px;
		background: var(--text-color);
		opacity: 0.25;
	}
	.bar-left-last-child {
		width: 2px;
		height: 27px;
		position: absolute;
		top: 0px;
		left: 9px;
		background: var(--text-color);
		opacity: 0.25;
	}
	.bar-left-connector {
		width: 19px;
		height: 2px;
		position: absolute;
		top: 25px;
		left: 11px;
		background: var(--text-color);
		opacity: 0.25;
	}
`;

const ReplyBody = styled.span`
	display: flex;
	flex-direction: column;
	position: relative;

	.kebab,
	.icon.reply,
	${AddReactionIcon} {
		visibility: hidden;
	}

	:hover .kebab,
	:hover .icon.reply,
	:hover ${AddReactionIcon} {
		visibility: visible;
	}
	:hover .icon.reply,
	:hover ${AddReactionIcon} {
		opacity: 0.6;
	}
	:hover .icon.reply:hover,
	:hover ${AddReactionIcon}:hover {
		opacity: 1;
	}
	.bar-left-parent {
		width: 2px;
		height: calc(100% - 20px);
		position: absolute;
		top: 20px;
		left: 9px;
		background: var(--text-color);
		opacity: 0.25;
	}
`;

const ParentPreview = styled.span`
	margin-left: 23px;
	height: 1.4em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: pre;
`;

const Content = styled.div`
	margin-left: 27px;
	display: flex;
	flex-direction: column;
	> *:not(:last-child) {
		margin-bottom: 10px;
	}
`;

const ReviewMarkerActionsWrapper = styled.div`
	margin-left: 13px;
	.code {
		margin: 5px 0 !important;
	}
	.file-info {
		font-size: 11px;
		display: flex;
		flex-flow: row wrap;
	}
	.file-info .monospace {
		display: block;
		white-space: nowrap;
	}
	.icon {
		vertical-align: 2px;
	}

	.internal-link {
		text-decoration: none;
	}
`;

const ComposeWrapper = styled.div.attrs(() => ({
	className: "compose codemark-compose"
}))`
	&&& {
		padding: 0 !important;
		padding-left: 25px !important;
	}
`;

export const Reply = (props: ReplyProps) => {
	const dispatch = useDispatch<Dispatch>();
	const { setEditingPostId, setReplyingToPostId } = React.useContext(RepliesToPostContext);
	const [menuState, setMenuState] = React.useState<{
		open: boolean;
		target?: any;
	}>({ open: false, target: undefined });

	const [isLoading, setIsLoading] = React.useState(false);
	const teamMembers = useSelector((state: CodeStreamState) => getTeamMembers(state));
	const teamTagsById = useSelector((state: CodeStreamState) => getTeamTagsHash(state));

	const submit = async () => {
		// don't create empty replies
		if (newReplyText.length === 0) return;

		const { post } = props;
		setIsLoading(true);

		if (codemark) {
			await dispatch(editCodemark(codemark.id, { text: replaceHtml(newReplyText)! }));
		} else {
			await dispatch(
				editPost(
					post.streamId,
					post.id,
					replaceHtml(newReplyText)!,
					findMentionedUserIds(teamMembers, newReplyText)
				)
			);
		}
		reset();
		setIsLoading(false);
	};

	const reset = () => {
		setNewReplyText(escapedPostText);
		setEditingPostId("");
	};

	const codemark = useSelector((state: CodeStreamState) =>
		isPending(props.post) ? null : getCodemark(state.codemarks, props.post.codemarkId)
	);

	const hasTags = codemark && codemark.tags && codemark.tags.length > 0;

	const parentPost = useSelector((state: CodeStreamState) => {
		return getPost(state.posts, props.post.streamId, props.post.parentPostId!);
	});

	const isNestedReply = props.showParentPreview && parentPost.parentPostId != null;
	const numNestedReplies = props.nestedReplies ? props.nestedReplies.length : 0;
	const hasNestedReplies = numNestedReplies > 0;

	const postText = codemark != null ? codemark.text : props.post.text;
	const escapedPostText = escapeHtml(postText);
	const [newReplyText, setNewReplyText] = React.useState(escapedPostText);

	const renderedMenu =
		props.renderMenu &&
		menuState.open &&
		props.renderMenu(menuState.target, () => setMenuState({ open: false }));

	const renderEmote = () => {
		let matches = (props.post.text || "").match(/^\/me\s+(.*)/);
		if (matches) {
			return (
				<MarkdownText
					text={matches[1]}
					className="emote"
					excludeParagraphWrap={true}
				></MarkdownText>
			);
		} else return null;
	};
	const emote = renderEmote();

	const markers = (() => {
		if (codemark == null || codemark.markers == null || codemark.markers.length === 0) return;

		const numMarkers = codemark.markers.length;
		// not allowing any of the capabilities (they default to off anyway)
		const capabilities: any = {};
		return codemark.markers.map((marker, index) => (
			<ReviewMarkerActionsWrapper>
				<MarkerActions
					key={marker.id}
					codemark={codemark}
					marker={marker}
					capabilities={capabilities}
					isAuthor={false}
					alwaysRenderCode={true}
					markerIndex={index}
					numMarkers={numMarkers}
					jumpToMarker={false}
					selected={true}
					disableHighlightOnHover={true}
					disableDiffCheck={true}
				/>
			</ReviewMarkerActionsWrapper>
		));
	})();

	const isEditing = props.editingPostId === props.post.id;
	const checkpoint = props.post.reviewCheckpoint;

	return (
		<Root className={props.className}>
			{props.threadId && !props.lastNestedReply && <div className="bar-left-not-last-child" />}
			{props.threadId && props.lastNestedReply && <div className="bar-left-last-child" />}
			{props.threadId && <div className="bar-left-connector" />}
			<ReplyBody>
				{hasNestedReplies && <div className="bar-left-parent" />}
				<AuthorInfo style={{ fontWeight: 700 }}>
					<ProfileLink id={props.author.id || ""}>
						<Headshot size={20} person={props.author} />{" "}
					</ProfileLink>
					<span>
						{props.author.username}
						{emote}
						{checkpoint && (
							<span className="emote">
								added{" "}
								<a
									onClick={() => {
										const element = document.getElementById("commits-update-" + checkpoint);
										if (element) {
											element.scrollIntoView({ behavior: "smooth" });
											element.classList.add("highlight-pulse");
											setTimeout(() => element.classList.remove("highlight-pulse"), 1500);
										}
									}}
								>
									update #{checkpoint}
								</a>{" "}
								to this review
							</span>
						)}
						{codemark && codemark.isChangeRequest && (
							<span className="emote">requested a change</span>
						)}
						<Timestamp relative time={props.post.createdAt} edited={props.post.hasBeenEdited} />
					</span>
					<div style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
						<Icon
							title="Reply"
							name="reply"
							placement="top"
							className="reply clickable"
							onClick={() => setReplyingToPostId(props.threadId || props.post.id)}
						/>
						{!isPending(props.post) && <AddReactionIcon post={props.post} />}
						{renderedMenu}
						{props.renderMenu && (
							<KebabIcon
								className="kebab"
								onClick={e => {
									e.preventDefault();
									e.stopPropagation();
									if (menuState.open) {
										setMenuState({ open: false });
									} else {
										setMenuState({ open: true, target: e.currentTarget });
									}
								}}
							>
								<Icon name="kebab-vertical" className="clickable" />
							</KebabIcon>
						)}
					</div>
				</AuthorInfo>
				{isNestedReply && (
					<ParentPreview>
						Reply to <a>{parentPost.text.substring(0, 80)}</a>
					</ParentPreview>
				)}
				{isEditing && (
					<>
						<ComposeWrapper>
							<MessageInput
								text={escapedPostText}
								onChange={setNewReplyText}
								onSubmit={submit}
								multiCompose
								autoFocus
							/>
						</ComposeWrapper>
						<div style={{ display: "flex", justifyContent: "flex-end" }}>
							<Button
								className="control-button cancel"
								style={{
									// fixed width to handle the isLoading case
									width: "80px",
									margin: "10px 10px"
								}}
								onClick={reset}
							>
								Cancel
							</Button>
							<Button
								style={{
									// fixed width to handle the isLoading case
									width: "80px",
									margin: "10px 0"
								}}
								className={cx("control-button", { cancel: newReplyText.length === 0 })}
								type="submit"
								disabled={newReplyText.length === 0}
								onClick={submit}
								loading={isLoading}
							>
								Submit
							</Button>
						</div>
					</>
				)}
				{emote || isEditing ? null : (
					<>
						<Content>
							<MarkdownText text={postText} />
							{hasTags && (
								<MetaDescriptionForTags>
									{codemark!.tags!.map((tagId: string) => {
										const tag = teamTagsById[tagId];

										if (tag == undefined) return;
										return <Tag key={tagId} tag={tag} />;
									})}
								</MetaDescriptionForTags>
							)}
						</Content>
						{markers}
					</>
				)}
				{!isPending(props.post) && <Reactions post={props.post} />}
			</ReplyBody>
			{props.nestedReplies &&
				props.nestedReplies.length > 0 &&
				props.nestedReplies.map((r, index) => (
					<NestedReply
						editingPostId={props.editingPostId}
						key={r.id}
						post={r}
						threadId={props.post.id}
						lastNestedReply={index === numNestedReplies - 1}
					/>
				))}
		</Root>
	);
};

const NestedReply = (props: {
	post: Post;
	threadId: string;
	editingPostId?: string;
	lastNestedReply?: boolean;
}) => {
	const dispatch = useDispatch();
	const { setReplyingToPostId, setEditingPostId } = React.useContext(RepliesToPostContext);
	const author = useSelector((state: CodeStreamState) => state.users[props.post.creatorId]);
	const currentUserId = useSelector((state: CodeStreamState) => state.session.userId);

	const menuItems = React.useMemo(() => {
		const menuItems: any[] = [];

		menuItems.push({
			label: "Reply",
			key: "reply",
			action: () => setReplyingToPostId(props.threadId)
		});

		if (props.post.creatorId === currentUserId) {
			menuItems.push({ label: "Edit", key: "edit", action: () => setEditingPostId(props.post.id) });
			menuItems.push({
				label: "Delete",
				key: "delete",
				action: () => {
					confirmPopup({
						title: "Are you sure?",
						message: "Deleting a post cannot be undone.",
						centered: true,
						buttons: [
							{ label: "Go Back", className: "control-button" },
							{
								label: "Delete Post",
								className: "delete",
								wait: true,
								action: () => {
									dispatch(deletePost(props.post.streamId, props.post.id));
								}
							}
						]
					});
				}
			});
		}

		return menuItems;
	}, [props.post]);

	return (
		<NestedReplyRoot
			author={author}
			post={props.post}
			editingPostId={props.editingPostId}
			threadId={props.threadId}
			lastNestedReply={props.lastNestedReply}
			renderMenu={(target, close) => <Menu target={target} action={close} items={menuItems} />}
		/>
	);
};

const NestedReplyRoot = styled(Reply)`
	padding-top: 15px;
	padding-left: 25px;
	padding-bottom: 0;
`;
