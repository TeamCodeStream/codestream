import React from "react";
import styled from "styled-components";
import { Headshot, PRHeadshot } from "./Headshot";
import { useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import cx from "classnames";

export interface HeadshotNameProps {
	person?: {
		email?: string;
		avatar?: { image?: string; image48?: string };
		fullName?: string;
		username?: string;
		color?: number;
		id?: string;
	};
	id?: string;
	size?: number;
	onClick?: React.MouseEventHandler;
	className?: string;
	highlightMe?: boolean;
	addThumbsUp?: boolean;
	noName?: boolean;
}

interface ClickProps {
	hasOnClick?: boolean;
}

export const HeadshotWrapper = styled.span`
	display: inline-block;
	padding-right: 5px;
	vertical-align: -5px;
	&.no-padding {
		padding: 0;
	}
`;

const Root = styled.div<ClickProps>`
	display: inline-block;
	padding: 0 10px 5px 0;
	white-space: nowrap;
	cursor: ${props => (props.onClick ? "pointer" : "auto")};
	&:hover {
		color: ${props => props.theme.colors.textHighlight};
	}
	&.no-padding {
		padding: 0;
	}
`;

export function HeadshotName(props: HeadshotNameProps) {
	const derivedState = useSelector((state: CodeStreamState) => {
		return { users: state.users, currentUserId: state.session.userId };
	});
	const person = props.person || derivedState.users[props.id || ""];
	if (!person) return null;
	const me = props.highlightMe && person.id === derivedState.currentUserId;
	return (
		<Root className={props.className} onClick={props.onClick}>
			<HeadshotWrapper className={props.noName ? "no-padding" : ""}>
				<Headshot
					person={person}
					size={props.size || 20}
					className={props.className}
					hardRightBorder={me}
					addThumbsUp={props.addThumbsUp}
				/>
			</HeadshotWrapper>
			{!props.noName && (
				<span className={cx("headshot-name", { "at-mention me": me })}>{person.username}</span>
			)}
		</Root>
	);
}

export interface PRHeadshotNameProps {
	person: {
		avatarUrl: string;
		login?: string;
		username?: string;
		name?: string;
		user?: {
			login: string;
		};
	};
	size?: number;
	hardRightBorder?: boolean;
	display?: string;
	onClick?: React.MouseEventHandler;
	className?: string;
	addThumbsUp?: boolean;
	noName?: boolean;
}

export const PRHeadshotName = styled((props: PRHeadshotNameProps) => {
	if (!props.person) return null;

	// leave this for future when we can determine it's you
	const me = false;

	const username = props.person.login || props.person.username || "";

	return (
		<Root className={props.className} onClick={props.onClick}>
			<HeadshotWrapper className={props.noName ? "no-padding" : ""}>
				<PRHeadshot
					person={props.person}
					size={props.size || 20}
					className={props.className}
					hardRightBorder={me}
					addThumbsUp={props.addThumbsUp}
				/>
			</HeadshotWrapper>
			{!props.noName && (
				<span className={cx("headshot-name", { "at-mention me": me })}>
					{username || (props.person.user ? props.person.user.login : props.person.name)}
				</span>
			)}
		</Root>
	);
})``;
