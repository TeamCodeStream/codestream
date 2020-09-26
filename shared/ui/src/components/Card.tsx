import React from "react";
import styled from "styled-components";
import { PropsWithTheme, isDarkTheme } from "../themes";

export interface CardProps {
	onClick?: React.MouseEventHandler;
	hoverEffect?: boolean;
	className?: string;
	noCard?: boolean;
}

export const getCardProps = (props: CardProps & { [k: string]: any }): CardProps => ({
	onClick: props.onClick,
	hoverEffect: props.hoverEffect,
	className: props.className,
	noCard: props.noCard
});

const Root = styled.div((props: Omit<PropsWithTheme<CardProps>, "hoverEffect">) => {
	const { theme, noCard } = props;

	if (noCard)
		return `
			cursor: ${props.onClick != undefined ? "pointer" : "default"};
			display: flex;
			margin: -10px;
			border: 1px solid transparent;
		`;

	const boxShadow = isDarkTheme(theme)
		? "0 5px 10px rgba(0, 0, 0, 0.2)"
		: "0 2px 5px rgba(0, 0, 0, 0.08)";

	return `
		cursor: ${props.onClick != undefined ? "pointer" : "default"};
		display: flex;
		box-shadow: ${boxShadow};
		background: ${theme.colors.baseBackground};
		border: 1px solid ${theme.colors.baseBorder};
 	 `;
});

export const CardBanner = styled.div`
	margin-top: -10px;
	margin-left: -10px;
	margin-bottom: 10px;
	padding: 10px;
	width: calc(100% + 20px);
	border-bottom: 1px solid ${props => props.theme.colors.baseBorder};
	background: repeating-linear-gradient(
		-45deg,
		transparent,
		transparent 5px,
		${props => props.theme.colors.appBackground} 5px,
		${props => props.theme.colors.appBackground} 10px
	);
	:empty {
		display: none;
	}
`;

export const CardFooter = styled.div`
	margin-top: 10px;
	margin-left: -10px;
	margin-bottom: -10px;
	padding: 10px;
	width: calc(100% + 20px);
	border-top: 1px solid ${props => props.theme.colors.baseBorder};
	:empty {
		display: none;
	}
`;

export const CardBody = styled.div`
	display: flex;
	flex-direction: column;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow-x: hidden;
	padding: 1px;
`;

const Content = styled.div<CardProps>`
	width: 100%;
	height: 100%;
	padding: 10px 10px 5px 10px;
	position: relative;
	display: flex;
	flex-direction: column;
	background-color: transparent;
	${CardBanner} {
		order: 1;
	}
	${CardBody} {
		order: 2;
	}
	${CardFooter} {
		order: 3;
	}
	color: ${props => props.theme.colors.text};
	${props => {
		if (!props.hoverEffect) return "";

		return `
		${Root}:hover & {
			background: rgba(127, 127, 127, 0.05);
			color: ${props.theme.colors.textHighlight};
		}`;
	}}
`;

export const Card = (props: React.PropsWithChildren<CardProps>) => {
	return (
		<Root onClick={props.onClick} noCard={props.noCard} className={props.className}>
			<Content noCard={props.noCard} hoverEffect={props.hoverEffect}>
				{props.children}
			</Content>
		</Root>
	);
};
