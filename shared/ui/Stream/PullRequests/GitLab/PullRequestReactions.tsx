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

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	targetId: string;
	setIsLoadingMessage: Function;
	className?: string;
	reactionGroups?: any;
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
		const me = props.pr.viewer ? props.pr.viewer.login : "FIXME";
		if (!props.reactionGroups) return false;
		const reaction = props.reactionGroups.find(_ => _.content === key);
		if (!reaction) return false;
		return reaction.users.nodes.find(_ => _.login === me);
	};

	const makeIcon = (name: string, title: string, key: string) => {
		const emoji = emojify(":" + name + ":");
		const iReacted = isMine(key);
		return (
			<PRReact
				onMouseEnter={() => setMenuTitle(title)}
				onMouseLeave={() => setMenuTitle("")}
				onClick={() => saveReaction(key, !iReacted)}
				className={iReacted ? "mine" : ""}
			>
				<span dangerouslySetInnerHTML={{ __html: emoji }} />
			</PRReact>
		);
	};
	return (
		<span className={props.className}>
			{open && (
				<Menu
					title={
						<div style={{ fontSize: "13px", fontWeight: "normal" }}>
							{menuTitle || "Pick your reaction"}
						</div>
					}
					align="bottomRight"
					noCloseIcon
					target={open}
					items={[
						{ label: "-" },
						{
							fragment: (
								<div style={{ padding: "10px" }}>
									{makeIcon("+1", "+1", "THUMBS_UP")}
									{makeIcon("-1", "-1", "THUMBS_DOWN")}
									{makeIcon("smile", "Laugh", "LAUGH")}
									{makeIcon("tada", "Hooray", "HOORAY")}
									<div style={{ height: "5px" }} />
									{makeIcon("confused", "Confused", "CONFUSED")}
									{makeIcon("heart", "Heart", "HEART")}
									{makeIcon("rocket", "Rocket", "ROCKET")}
									{makeIcon("eyes", "Eyes", "EYES")}
								</div>
							)
						}
					]}
					action={() => setOpen(undefined)}
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
	${PullRequestReactButton} {
		border: 1px solid var(--base-border-color);
		border-radius: 4px;
		padding: 3px 10px !important;
		margin-right: 5px;
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
	const saveReaction = async (key: string, onOff: boolean) => {
		props.setIsLoadingMessage("Saving Reaction...");

		await dispatch(
			api("toggleReaction", {
				subjectId: props.targetId,
				content: key,
				onOff
			})
		);
	};

	const me = props.pr.viewer ? props.pr.viewer.login : "FIXME";

	const makeReaction = (reactionId, index) => {
		const reaction = reactionGroups.find(r => r.content === reactionId) || { content: reactionId };
		const num = reaction.users ? reaction.users.nodes.length : 0;
		// if (num == 0) return null;
		const emoji = emojify(":" + reaction.content + ":");
		const loginList = reaction.users ? reaction.users.nodes.map(_ => _.login) : [];
		const logins = <SmartFormattedList value={loginList} />;
		const title =
			loginList.length > 0 ? (
				<>
					{logins} reacted with {REACTION_NAME_MAP[reaction.content]} emoji
				</>
			) : (
				""
			);
		const iReacted = loginList.includes(me);
		return (
			<Tooltip key={index} placement="bottomLeft" delay={1} title={title} trigger={["hover"]}>
				<PRReaction
					className={iReacted ? "mine" : ""}
					onClick={() => saveReaction(reaction.content, !iReacted)}
				>
					<span dangerouslySetInnerHTML={{ __html: emoji }} /> {num}
				</PRReaction>
			</Tooltip>
		);
	};

	const reactions = reactionGroups
		.map((reaction, index) => makeReaction(reaction, index))
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
