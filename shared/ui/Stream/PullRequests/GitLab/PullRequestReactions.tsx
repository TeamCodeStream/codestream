import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../../../store";
import Icon from "../../Icon";
import Menu from "../../Menu";
import { emojify } from "../../Markdowner";
import styled from "styled-components";
import Tooltip from "../../Tooltip";
import { SmartFormattedList } from "../../SmartFormattedList";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { api } from "../../../store/providerPullRequests/actions";
import EmojiPicker from "../../EmojiPicker";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	targetId: string;
	setIsLoadingMessage: Function;
	className?: string;
	reactionGroups?: {
		content: string;
		data: {
			awardable_id: number;
			id: number;
			name: string;
			user: {
				id: number;
				avatar_url: string;
				username: string;
			};
		}[];
	}[];
}

export const PRReact = styled.div`
	display: inline-block;
	transition: transform 0.1s;
	cursor: pointer;
	&:hover {
		transform: scale(1.2);
	}
	p {
		color: var(--text-color-highlight);
		margin: 0 7px;
	}
	// have to repeat this here because it appears in menus
	&.mine {
		background: rgba(90, 127, 255, 0.08);
		border: 1px solid rgba(90, 127, 255, 0.18);
	}
`;

export const PRReaction = styled.div`
	display: inline-block;
	padding: 3px 10px;
	margin-right: 10px;
	border: 1px solid var(--base-border-color);
	border-radius: 4px;
	cursor: pointer;
	white-space: nowrap;
	height: 35px;
	p {
		white-space: nowrap;
		display: inline-block;
		margin: 0 2px 0 0;
		padding: 0;
		vertical-align: -1px;
		.emoji {
			color: var(--text-color-highlight);
		}
	}
`;

export const PullRequestReactButton = styled((props: Props) => {
	const dispatch = useDispatch();
	const [open, setOpen] = React.useState<EventTarget | undefined>();
	const [menuTitle, setMenuTitle] = React.useState("");

	const saveReaction = async (key: string, onOff: boolean) => {
		props.setIsLoadingMessage("Saving Reaction...");
		setOpen(undefined);

		await dispatch(
			api("toggleReaction", {
				subjectId: props.targetId,
				content: key,
				onOff
			})
		);
	};

	const isMine = (key: string) => {
		const me = props.pr.viewer ? props.pr.viewer.login : "";
		if (!me) return false;
		if (!props.reactionGroups) return false;
		const reaction = props.reactionGroups.find(_ => _.content === key);
		if (!reaction) return false;
		return reaction.data.find(_ => _.user.username === me);
	};

	return (
		<span className={props.className}>
			{open && (
				<EmojiPicker
					addEmoji={key => {
						saveReaction(key.id, !isMine(key.id));
					}}
					target={open}
					autoFocus={true}
				/>
			)}
			<Icon
				name="smiley"
				className="clickable"
				onClick={e => setOpen(open ? undefined : e.target)}
			/>
		</span>
	);
})``;

export const PRReactions = styled.div`
	display: flex;
	align-items: stretch;
	${PullRequestReactButton} {
		display: inline-block;
		border: 1px solid var(--base-border-color);
		border-radius: 4px;
		padding: 3px 10px !important;
		margin-right: 5px;
		display: flex;
		place-items: center;
	}
`;

interface ReactionProps {
	pr: FetchThirdPartyPullRequestPullRequest;
	// node: any;
	reactionGroups: any;
	targetId: string;
	setIsLoadingMessage: Function;
	thumbsFirst?: boolean;
}

const REACTION_MAP = {
	THUMBS_UP: "+1",
	THUMBS_DOWN: "-1",
	HOORAY: "tada",
	LAUGH: "smile",
	CONFUSED: "confused",
	HEART: "heart",
	ROCKET: "rocket",
	EYES: "eyes"
};

const REACTION_NAME_MAP = {
	THUMBS_UP: "+1",
	THUMBS_DOWN: "-1",
	HOORAY: "hooray",
	LAUGH: "laugh",
	CONFUSED: "confused",
	HEART: "heart",
	ROCKET: "rocket",
	EYES: "eyes"
};

export const PullRequestReactions = (props: ReactionProps) => {
	const { reactionGroups } = props;
	if (!reactionGroups) return null;

	const dispatch = useDispatch();
	const saveReaction = async (key: string, onOff: boolean, id?: string) => {
		props.setIsLoadingMessage("Saving Reaction...");

		await dispatch(
			api("toggleReaction", {
				subjectId: props.targetId,
				content: key,
				onOff,
				id
			})
		);
	};

	const me = props.pr.viewer ? props.pr.viewer.login : "";

	const makeReaction = (reactionId, index) => {
		const reaction = reactionGroups.find(r => r.content === reactionId);
		// this is the emoji's id aka "heart_eyes"
		const reactionContent = reaction ? reaction.content : reactionId;
		const data = reaction ? reaction.data : [];
		// if (num == 0) return null;
		const emoji = emojify(":" + reactionContent + ":");
		const loginList = data.map(_ => _.user.username);
		const logins = <SmartFormattedList value={loginList} />;
		const title =
			loginList.length > 0 ? (
				<>
					{logins} reacted with {REACTION_NAME_MAP[reactionContent]} emoji
				</>
			) : (
				""
			);
		const iReacted = loginList.includes(me);
		const myReaction = data.find(_ => _.user.username === me) || {};
		return (
			<Tooltip key={index} placement="bottomLeft" delay={1} title={title} trigger={["hover"]}>
				<PRReaction
					className={iReacted ? "mine" : ""}
					onClick={() => saveReaction(reactionContent, !iReacted, myReaction.id)}
				>
					<span dangerouslySetInnerHTML={{ __html: emoji }} /> {data.length}
				</PRReaction>
			</Tooltip>
		);
	};

	const reactions = reactionGroups
		.filter(_ =>
			props.thumbsFirst ? _.content !== "thumbsup" && _.content !== "thumbsdown" : true
		)
		.map((reaction, index) => makeReaction(reaction.content, index))
		.filter(Boolean);

	if (reactions.length > 0 || props.thumbsFirst)
		return (
			<PRReactions>
				{props.thumbsFirst && (
					<>
						{makeReaction("thumbsup", 10001)}
						{makeReaction("thumbsdown", 10002)}
					</>
				)}
				{reactions}
				<PullRequestReactButton
					pr={props.pr}
					targetId={props.targetId}
					setIsLoadingMessage={props.setIsLoadingMessage}
					reactionGroups={props.reactionGroups}
				/>
			</PRReactions>
		);
	else return null;
};
