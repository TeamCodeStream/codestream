import { CollaborationComment, NewRelicErrorGroup, PostPlus } from "@codestream/protocols/agent";
import { CSPost, CSUser } from "@codestream/protocols/api";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { ProfileLink } from "@codestream/webview/src/components/ProfileLink";
import { CodeStreamState } from "@codestream/webview/store";
import { editCodemark } from "@codestream/webview/store/codemarks/thunks";
import { Post } from "@codestream/webview/store/posts/types";
import { getTeamMembers, getTeamTagsHash } from "@codestream/webview/store/users/reducer";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { escapeHtml, replaceHtml } from "@codestream/webview/utils";
import cx from "classnames";
import React, { forwardRef, Ref } from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Attachments } from "../Attachments";
import Button from "../Button";
import { KebabIcon } from "../Codemark/BaseCodemark";
import Icon from "../Icon";
import { MarkdownText } from "../MarkdownText";
import { MessageInput } from "../MessageInput";
import { AddReactionIcon } from "../Reactions";
import { NrAiComponent } from "@codestream/webview/Stream/Posts/NrAiComponent";
import { FunctionToEdit } from "@codestream/webview/store/codeErrors/types";

const AuthorInfo = styled.div`
	display: flex;
	align-items: flex-start;

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

	.related {
		margin: 10px 0;
	}
`;

export const ReplyBody = styled.span`
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

export const MarkdownContent = styled.div`
	margin-left: 27px;
	display: flex;
	flex-direction: column;

	> *:not(:last-child) {
		margin-bottom: 10px;
	}
`;

const ComposeWrapper = styled.div.attrs(() => ({
	className: "compose codemark-compose",
}))`
	&&& {
		padding: 0 !important;
		padding-left: 25px !important;
	}
`;

export interface ReplyProps {
	author: Partial<CSUser>;
	post?: Post;
	comment: CollaborationComment;
	file?: string;
	functionToEdit?: FunctionToEdit;
	codeErrorId?: string;
	errorGroup?: NewRelicErrorGroup;
	nestedReplies?: PostPlus[];
	renderMenu?: (target: any, onClose: () => void) => React.ReactNode;
	className?: string;
	showParentPreview?: boolean;
	editingPostId?: string;
	threadId?: string; // only set for nested replies
	lastNestedReply?: boolean;
	noReply?: boolean;
}

export const Reply = forwardRef((props: ReplyProps, ref: Ref<HTMLDivElement>) => {
	const dispatch = useAppDispatch();
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
			await dispatch(editCodemark(codemark, { text: replaceHtml(newReplyText)! }));
		} else {
			// await dispatch(
			// 	editPost(
			// 		post.streamId,
			// 		post.id,
			// 		replaceHtml(newReplyText)!,
			// 		findMentionedUserIds(teamMembers, newReplyText)
			// 	)
			// );
		}
		reset();
		setIsLoading(false);
	};

	const reset = () => {
		setNewReplyText(escapedPostText);
	};

	const codemark = undefined;
	// useSelector((state: CodeStreamState) =>
	// 	isPending(props.post) ? null : getCodemark(state.codemarks, props.post.codemarkId)
	// );

	const hasTags = false; //codemark && codemark.tags && codemark.tags.length > 0;

	const parentPost = undefined;
	// useSelector((state: CodeStreamState) => {
	// 	return getPost(state.posts, props.post.streamId, props.post.parentPostId!);
	// });

	const isForGrok = false; // !isPending(props.post) && props.post.forGrok;

	const postText = props.comment.body; // codemark != null ? codemark.text : props.post?.text;
	const escapedPostText = escapeHtml(postText);
	const [newReplyText, setNewReplyText] = React.useState(escapedPostText);

	const renderedMenu =
		props.renderMenu &&
		menuState.open &&
		props.renderMenu(menuState.target, () => setMenuState({ open: false }));

	const renderEmote = () => {
		//let matches = (props.post.text || "").match(/^\/me\s+(.*)/);
		let matches = (props.comment.body || "").match(/^\/me\s+(.*)/);
		if (matches) {
			return <MarkdownText text={matches[1]} className="emote" inline={true}></MarkdownText>;
		} else return null;
	};
	const emote = renderEmote();

	const markers = [];
	//  (() => {
	// 	if (codemark == null || codemark.markers == null || codemark.markers.length === 0) return;

	// 	const numMarkers = codemark.markers.length;
	// 	// not allowing any of the capabilities (they default to off anyway)
	// 	const capabilities: any = {};
	// 	return codemark.markers.map((marker, index) => (
	// 		<ReviewMarkerActionsWrapper key={index}>
	// 			<MarkerActions
	// 				key={marker.id}
	// 				codemark={codemark}
	// 				marker={marker}
	// 				capabilities={capabilities}
	// 				isAuthor={false}
	// 				alwaysRenderCode={true}
	// 				markerIndex={index}
	// 				numMarkers={numMarkers}
	// 				jumpToMarker={false}
	// 				selected={true}
	// 				disableHighlightOnHover={true}
	// 				disableDiffCheck={true}
	// 			/>
	// 		</ReviewMarkerActionsWrapper>
	// 	));
	// })();

	const isEditing = false; // props.editingPostId === props.post.id;
	const checkpoint = false; //props.post.reviewCheckpoint;

	const author = props.author || { username: "???" };

	return (
		<Root ref={ref} className={props.className}>
			{props.threadId && !props.lastNestedReply && <div className="bar-left-not-last-child" />}
			{props.threadId && props.lastNestedReply && <div className="bar-left-last-child" />}
			{props.threadId && <div className="bar-left-connector" />}
			<ReplyBody>
				<AuthorInfo style={{ fontWeight: 700 }}>
					{author.id && (
						<ProfileLink id={props.author.id || ""}>
							<Headshot size={20} person={props.author} />{" "}
						</ProfileLink>
					)}
					<span className="reply-author">
						{props.comment.creator.name}
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
					</span>
					<div style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
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
									margin: "10px 10px",
								}}
								onClick={reset}
							>
								Cancel
							</Button>
							<Button
								style={{
									// fixed width to handle the isLoading case
									width: "80px",
									margin: "10px 0",
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
				{isForGrok && props.errorGroup && (
					<NrAiComponent
						codeErrorId={props.codeErrorId}
						post={props.post as PostPlus}
						errorGroup={props.errorGroup}
						postText={postText}
						file={props.file!}
						functionToEdit={props.functionToEdit}
					/>
				)}
				{emote || isEditing || isForGrok ? null : (
					<>
						<MarkdownContent className="reply-content-container">
							<MarkdownText
								text={postText}
								includeCodeBlockCopy={props.comment.creator.name === "AI"}
								className="reply-markdown-content"
							/>
							<Attachments post={props.post as CSPost} />
						</MarkdownContent>
						{markers}
					</>
				)}
			</ReplyBody>
		</Root>
	);
});
