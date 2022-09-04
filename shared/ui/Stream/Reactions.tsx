import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import styled from "styled-components";
import React, { useState } from "react";
import { emojify } from "../Stream/Markdowner";
import { includes as _includes } from "lodash-es";
import { PostPlus } from "@codestream/protocols/agent";
import Tooltip from "../Stream/Tooltip";
import Icon from "../Stream/Icon";
import { CodeStreamState } from "../store";
import * as userSelectors from "../store/users/reducer";
import EmojiPicker from "./EmojiPicker";
import { reactToPost } from "./actions";

const Reaction = styled.div`
	margin: 5px 5px 0 0;
	line-height: 1.5em;
	display: inline-block;
	padding: 2px 7px 2px 2px;
	border: 1px solid var(--base-border-color);
	border-radius: 15px;
	background: var(--base-background-color);
	white-space: normal;
	cursor: pointer;
	.emoji {
		vertical-align: -0.2em;
	}
	p {
		display: inline;
		margin: 0;
		padding: 0;
	}
	&.add-reaction {
		opacity: 0;
	}
	&.mine,
	&.add-reaction {
		border-color: var(--button-background-color);
		background: var(--button-background-color);
		color: var(--button-foreground-color);
	}
	&:hover,
	&.mine:hover,
	&.add-reaction:hover {
		background: var(--button-background-color-hover);
		color: var(--button-foreground-color) !important;
		.icon {
			color: var(--button-foreground-color) !important;
		}
	}
`;

const toggleReaction = (post: PostPlus, currentUserId: string, emojiId: string, event?) => {
	if (event) event.stopPropagation();
	const { reactions } = post;
	return reactions && reactions[emojiId] && _includes(reactions[emojiId], currentUserId)
		? false
		: true;
};

export const AddReactionIcon = styled((props: { post: PostPlus; className?: string }) => {
	const { post } = props;

	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return { currentUserId: state.session.userId! };
	});
	const [emojiTarget, setEmojiTarget] = useState(null);

	const handleReactionClick = event => {
		event.stopPropagation();
		setEmojiTarget(emojiTarget ? null : event.target);
	};

	const react = emojiId => {
		setEmojiTarget(null);
		if (emojiId) {
			const value = toggleReaction(post, derivedState.currentUserId, emojiId);
			dispatch(reactToPost(post, emojiId, value));
		}
	};

	return (
		<span className={props.className}>
			<Tooltip title="Add Reaction" placement="topRight">
				<span>
					<Icon name="smiley" className="smiley clickable" onClick={handleReactionClick} />
				</span>
			</Tooltip>
			{emojiTarget && (
				<EmojiPicker
					onClick={e => e.stopPropagation()}
					addEmoji={emoji => react(emoji.id)}
					target={emojiTarget}
				/>
			)}
		</span>
	);
})``;

export const Reactions = styled((props: { post: PostPlus; className?: string }) => {
	const { post } = props;
	const { reactions = {} } = post;

	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const usernamesById = userSelectors.getUsernamesById(state);
		return { currentUserId: state.session.userId!, usernamesById };
	});
	const [emojiTarget, setEmojiTarget] = useState(null);

	const handleReactionClick = event => {
		event.stopPropagation();
		setEmojiTarget(emojiTarget ? null : event.target);
	};

	const react = emojiId => {
		setEmojiTarget(null);
		if (emojiId) {
			const value = toggleReaction(post, derivedState.currentUserId, emojiId);
			dispatch(reactToPost(post, emojiId, value));
		}
	};

	const keys = Object.keys(reactions);
	if (keys.length === 0) return null;
	let atLeastOneReaction = false;
	return (
		<div className={props.className}>
			{keys.map(emojiId => {
				const reactors = reactions[emojiId] || [];
				if (reactors.length == 0) return null;
				const emoji = emojify(":" + emojiId + ":");
				const tooltipText =
					reactors.map(id => derivedState.usernamesById[id]).join(", ") +
					" reacted with " +
					emojiId;
				const className = _includes(reactors, derivedState.currentUserId) ? "mine" : "";
				atLeastOneReaction = true;
				return (
					<Tooltip title={tooltipText} key={emojiId} placement="top">
						<Reaction className={className} onClick={() => react(emojiId)}>
							<span dangerouslySetInnerHTML={{ __html: emoji }} />
							{reactors.length}
						</Reaction>
					</Tooltip>
				);
			})}
			{atLeastOneReaction && (
				<Tooltip title="Add Reaction" key="add" placement="top">
					<Reaction className="add-reaction" onClick={handleReactionClick}>
						<Icon name="smiley" onClick={handleReactionClick} />
					</Reaction>
				</Tooltip>
			)}
			{emojiTarget && <EmojiPicker addEmoji={emoji => react(emoji.id)} target={emojiTarget} />}
		</div>
	);
})`
	padding: 5px 0 0 25px;
	&.no-pad-left {
		padding-left: 0;
	}
	&:hover {
		.add-reaction {
			opacity: 1;
			padding: 2px 4px;
		}
	}
`;
