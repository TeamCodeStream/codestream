import { PropsWithChildren } from "react";
import React from "react";
import styled, { CSSProperties } from "styled-components";
import Icon from "../../Stream/Icon";

interface CarouselProps {
	children: React.ReactNode;
	className?: string;
	onChange: Function;
	active: number;
	lastContent: number;
}

interface ContentProps {
	active?: boolean;
	children: React.ReactNode;
	className?: string;
}

const Prev = styled.div`
	margin-right: 20px;
	@media only screen and (max-width: 450px) {
		width: 30px !important;
		height: 30px !important;
		margin-right: 15px;
	}
	@media only screen and (max-width: 350px) {
		width: 25px !important;
		height: 25px !important;
		margin-right: 10px;
	}
`;
const Next = styled.div`
	margin-left: 20px;
	@media only screen and (max-width: 450px) {
		width: 30px !important;
		height: 30px !important;
		margin-left: 15px;
	}
	@media only screen and (max-width: 350px) {
		width: 25px !important;
		height: 25px !important;
		margin-left: 10px;
	}
`;

export const Carousel = styled((props: PropsWithChildren<CarouselProps>) => {
	return (
		<div className={props.className}>
			<Prev
				className={props.active > 0 ? "" : "dim"}
				onClick={() => {
					if (props.active > 0) props.onChange(props.active - 1);
				}}
			>
				<Icon name="chevron-left" />
			</Prev>
			{props.children}
			<Next
				className={props.active < props.lastContent ? "" : "dim"}
				onClick={() => {
					if (props.active < props.lastContent) props.onChange(props.active + 1);
				}}
			>
				<Icon name="chevron-right" />
			</Next>
		</div>
	);
})`
	display: inline-flex;
	flex-direction: row;
	align-items: flex-start;
	margin: 20px 0;
	position: relative;
	text-align: left;

	${Prev}, ${Next} {
		// position: absolute;
		flex-shrink: 0;
		margin-top: 80px;
		width: 40px;
		height: 40px;
		background: var(--button-background-color);
		&:hover:not(.dim) {
			background: var(--button-background-color-hover);
		}
		color: var(--button-foreground-color);
		border-radius: 20px;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		transition: opacity 0.2s;
		&.dim {
			cursor: auto;
			opacity: 0.25;
			background: rgba(127, 127, 127, 0.25);
		}
		user-select: none;
		z-index: 2;
	}
`;

export const Content = styled((props: PropsWithChildren<ContentProps>) => {
	return <div className={props.className}>{props.children}</div>;
})`
	// ${props => (props.active ? "" : "display:none")}
`;
