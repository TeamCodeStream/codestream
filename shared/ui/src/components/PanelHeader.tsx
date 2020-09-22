import { PropsWithChildren } from "react";
import React from "react";
import styled, { CSSProperties } from "styled-components";

const Header = styled.div`
	padding: 15px 20px 5px 20px;
	color: var(--text-color-subtle);
	.align-right-button {
		position: absolute;
		// opacity: 0.4;
		cursor: pointer;
		transition: transform 0.1s;
		display: inline-block;
		top: 10px;
		right: 20px;
		&:hover {
			opacity: 1;
			color: var(--text-color-info);
			transform: scale(1.4);
			background: none;
		}
	}
	&.active-review {
		// background: var(--base-background-color);
		// border-bottom: 1px solid var(--base-border-color);
		width: 100%;
		z-index: 30;
	}
`;

const Title = styled.div`
	color: var(--text-color-highlight);
	font-size: 16px;
	@media only screen and (max-width: 430px) {
		font-size: 14px;
	}
	@media only screen and (max-width: 350px) {
		font-size: 13px;
	}
	@media only screen and (max-width: 270px) {
		font-size: 12px;
	}
`;

interface Props {
	position?: "static" | "fixed";
	title?: string | JSX.Element;
	className?: string;
}

export function PanelHeader(props: PropsWithChildren<Props>) {
	const { position = "static", className = "" } = props;
	return (
		<Header style={{ position }} className={className}>
			{props.title && (
				<Title>
					{props.title}
					<div style={{ height: "5px" }} />
				</Title>
			)}
			{props.children}
		</Header>
	);
}
