import Icon from "@codestream/webview/Stream/Icon";
import React, { useEffect, useState } from "react";
import Gravatar from "react-gravatar";
import styled from "styled-components";

const Colors = {
	[0]: "#666",
	[1]: "#678",
	[2]: "#687",
	[3]: "#768",
	[4]: "#786",
	[5]: "#867",
	[6]: "#876",
	[7]: "#886",
	[8]: "#868",
	[9]: "#688",
	// [undefined]: "#666";
} as const;

export interface HeadshotProps {
	person?: {
		email?: string;
		avatar?: { image?: string; image48?: string };
		fullName?: string;
		username?: string;
		color?: number;
	};
	size?: number;
	hardRightBorder?: boolean;
	display?: string;
	onClick?: React.MouseEventHandler;
	className?: string;
	addThumbsUp?: boolean;
}

interface DimensionProps {
	size: number;
	hardRightBorder?: boolean;
}

const Root = styled.div<DimensionProps & { display?: string }>`
	position: relative;
	width: ${props => props.size}px;
	height: ${props => props.size}px;
	display: ${props => props.display};
	vertical-align: ${props => (props.display === "inline-block" ? "-5px" : "0")};
	margin-right: ${props => (props.display === "inline-block" ? "5px" : "0")};
	&.no-right-margin {
		margin-right: 0;
	}
	img {
		border-radius: ${props => (props.hardRightBorder ? "3px 0 0 3px" : "3px")};
	}
	&.make-room-for-thumbs-up {
		width: ${props => props.size + 7}px;
		padding-right: 10px;
	}
	&.left-pad {
		width: ${props => props.size + 5}px;
	}
`;

const Initials = styled.div<DimensionProps & { color: string }>`
	width: ${props => props.size}px;
	height: ${props => props.size}px;
	display: flex;
	justify-content: center;
	align-items: center;
	position: absolute;
	left: 0;
	border-radius: ${props => (props.hardRightBorder ? "3px 0 0 3px" : "3px")};
	font-size: ${props => props.size * 0.65}px;
	font-weight: normal;
	text-transform: capitalize;
	z-index: 1;
	color: ${props => props.theme.colors.appBackground};
	background-color: ${props => props.color};
`;

const Image = styled.img<DimensionProps>`
	position: absolute;
	width: ${props => props.size}px;
	height: ${props => props.size}px;
	z-index: 2;
`;

const StyledGravatar = styled(Gravatar)<DimensionProps>`
	display: flex;
	position: absolute;
	z-index: 2;
	border-radius: 3px;
`;

export const ThumbsUp = styled.div`
	position: absolute;
	right: -7px;
	bottom: -10px;
	width: 24px;
	height: 24px;
	padding: 4px;
	border-radius: 12px;
	background-color: #24a100;
	transform: scale(0.6);
	z-index: 5;
	.icon {
		color: white;
	}
`;

export const Headshot = styled((props: HeadshotProps) => {
	const [imageError, setImageError] = useState(false);
	const person = props.person;
	if (!person) return null;

	useEffect(() => {
		setImageError(false);
	}, [person.avatar]);

	let initials = (person.email && person.email.charAt(0)) || "";
	if (person.fullName) {
		initials = person.fullName.replace(/(\w)\w*/g, "$1").replace(/\s/g, "");
		if (initials.length > 2) initials = initials.substring(0, 2);
	} else if (person.username) {
		initials = person.username.charAt(0);
	}

	const size = props.size || 16;
	const display = props.display || "block";

	const className =
		(props.className || "") +
		(props.addThumbsUp && !props.hardRightBorder ? " make-room-for-thumbs-up" : "");

	// TODO: Using this img after failing to get this svg working in icons8-data. The icon displayed but the circle had tons of edge artifacts.
	// One possible fix is to ditch the icons-8 approach and just store the .svg files and use a data-loader to bundle them.
	if (person.username?.toLowerCase() === "ai") {
		return (
			<Root
				size={size}
				display={display}
				hardRightBorder={props.hardRightBorder}
				className={className}
				onClick={props.onClick}
			>
				<img
					src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzExMDZfNzgzMDgpIj4KPHBhdGggZD0iTTI0IDQ4QzM3LjI1NDggNDggNDggMzcuMjU0OCA0OCAyNEM0OCAxMC43NDUyIDM3LjI1NDggMCAyNCAwQzEwLjc0NTIgMCAwIDEwLjc0NTIgMCAyNEMwIDM3LjI1NDggMTAuNzQ1MiA0OCAyNCA0OFoiIGZpbGw9IiMxQ0U3ODMiLz4KPHBhdGggZD0iTTM0LjAyMjMgOC41Njk4MkgzMi4yMDIzQzMyLjIwMjMgMTIuNDc5OCAzMS41NjIzIDEzLjExOTggMjcuNjUyMyAxMy4xMTk4VjE0LjkzOThDMzEuNTYyMyAxNC45Mzk4IDMyLjIwMjMgMTUuNTc5OCAzMi4yMDIzIDE5LjQ4OThIMzQuMDIyM0MzNC4wMjIzIDE1LjU3OTggMzQuNjYyMyAxNC45Mzk4IDM4LjU3MjMgMTQuOTM5OFYxMy4xMTk4QzM0LjY2MjMgMTMuMTE5OCAzNC4wMjIzIDEyLjQ3OTggMzQuMDIyMyA4LjU2OTgyWiIgZmlsbD0iIzFEMjUyQyIvPgo8cGF0aCBkPSJNMjIuNTAwNyAzOS40Mjk5SDE5LjkzMDdDMTkuOTMwNyAzMi42OTk5IDE0LjQ1MDcgMjcuMjE5OSA3LjcyMDcgMjcuMjE5OVYyNC42NDk5QzE0LjQ1MDcgMjQuNjQ5OSAxOS45MzA3IDE5LjE2OTkgMTkuOTMwNyAxMi40Mzk5SDIyLjUwMDdDMjIuNTAwNyAxOS4xNjk5IDI3Ljk4MDcgMjQuNjQ5OSAzNC43MTA3IDI0LjY0OTlWMjcuMjE5OUMyNy45ODA3IDI3LjIxOTkgMjIuNTAwNyAzMi42OTk5IDIyLjUwMDcgMzkuNDI5OVpNMTMuNzUwNyAyNS45Mjk5QzE3LjA2MDcgMjcuNDE5OSAxOS43MzA3IDMwLjA4OTkgMjEuMjIwNyAzMy4zOTk5QzIyLjcxMDcgMzAuMDg5OSAyNS4zODA3IDI3LjQxOTkgMjguNjkwNyAyNS45Mjk5QzI1LjM4MDcgMjQuNDM5OSAyMi43MTA3IDIxLjc2OTkgMjEuMjIwNyAxOC40NTk5QzE5LjczMDcgMjEuNzY5OSAxNy4wNjA3IDI0LjQzOTkgMTMuNzUwNyAyNS45Mjk5WiIgZmlsbD0iIzFEMjUyQyIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzExMDZfNzgzMDgiPgo8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg=="
					alt="User avatar"
				/>
				{props.addThumbsUp && (
					<ThumbsUp>
						<Icon name="thumbsup" />
					</ThumbsUp>
				)}
			</Root>
		);
	}

	return (
		<Root
			size={size}
			display={display}
			hardRightBorder={props.hardRightBorder}
			className={className}
			onClick={props.onClick}
		>
			<StyledGravatar size={size} default="blank" protocol="https://" email={person.email} />
			<Initials
				hardRightBorder={props.hardRightBorder}
				size={size}
				color={Colors[person.color || 1]}
			>
				{initials}
			</Initials>
			{props.addThumbsUp && (
				<ThumbsUp>
					<Icon name="thumbsup" />
				</ThumbsUp>
			)}
		</Root>
	);
})``;

export function CodeStreamHeadshot(props: Omit<HeadshotProps, "person">) {
	const size = props.size || 16;

	return (
		<Root size={size} className={props.className} onClick={props.onClick}>
			<Image
				size={size}
				src="https://images.codestream.com/logos/grey_blue_transparent-400x400.png"
			/>
		</Root>
	);
}

export interface PRHeadshotProps {
	person: {
		login?: string;
		avatarUrl: string;
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
}

export const PRHeadshot = styled((props: PRHeadshotProps) => {
	const size = props.size || 16;
	if (!props.person) return null;

	const [imageError, setImageError] = useState(false);

	useEffect(() => {
		setImageError(false);
	}, [props.person.avatarUrl]);

	if (imageError) {
		let initials = "";
		const login = props.person.login || props.person.user?.login || "";
		if (login) {
			initials = login
				.replace(/[\-\_]+/g, " ")
				.replace(/(\w)\w*/g, "$1")
				.replace(/\s/g, "");
			if (initials.length > 2) initials = initials.substring(0, 2);

			initials = initials.toLocaleUpperCase();
		}
		return (
			<Root
				size={size}
				hardRightBorder={props.hardRightBorder}
				onClick={props.onClick}
				display={props.display}
				className={props.className}
			>
				<Initials hardRightBorder={props.hardRightBorder} size={size} color={Colors[1]}>
					{initials}
				</Initials>
				{props.addThumbsUp && (
					<ThumbsUp>
						<Icon name="thumbsup" />
					</ThumbsUp>
				)}
			</Root>
		);
	}

	return (
		<Root display={props.display} size={size} className={props.className} onClick={props.onClick}>
			<Image size={size} src={props.person.avatarUrl} onError={() => setImageError(true)} />
		</Root>
	);
})``;
