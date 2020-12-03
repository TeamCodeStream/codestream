import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import Menu from "./Menu";
import { emojify } from "./Markdowner";
import styled from "styled-components";
import { PRReactions, PRReaction } from "./PullRequestComponents";
import Tooltip from "./Tooltip";
import { SmartFormattedList } from "./SmartFormattedList";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { api } from "../store/providerPullRequests/actions";

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
		const me = props.pr.viewer.login;
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

interface ReactionProps {
	pr: FetchThirdPartyPullRequestPullRequest;
	// node: any;
	reactionGroups: any;
	targetId: string;
	setIsLoadingMessage: Function;
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

	const me = props.pr.viewer.login;
	const reactions = reactionGroups
		.map((reaction, index) => {
			const num = reaction.users ? reaction.users.nodes.length : 0;
			if (num == 0) return null;
			const emoji = emojify(":" + REACTION_MAP[reaction.content] + ":");
			const loginList = reaction.users.nodes.map(_ => _.login);
			const logins = <SmartFormattedList value={loginList} />;
			const title = (
				<>
					{logins} reacted with {REACTION_NAME_MAP[reaction.content]} emoji
				</>
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
		})
		.filter(Boolean);

	if (reactions.length > 0)
		return (
			<PRReactions>
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
