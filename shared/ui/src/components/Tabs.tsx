import { PropsWithChildren } from "react";
import React from "react";
import styled from "styled-components";

interface TabProps {
	active?: boolean;
	children: React.ReactNode;
	disabled?: boolean;
	onClick?: any;
	id?: string;
	className?: string;
	style?: any;
}

interface ContentProps {
	active: boolean;
	children: React.ReactNode;
	className?: string;
}

export const Tabs = styled.div`
	display: flex;
	border-bottom: 1px solid var(--base-border-color);
	margin: 20px 0 20px 0;
	position: relative;
`;

export const Tab = styled((props: PropsWithChildren<TabProps>) => {
	return (
		<div className={props.className} onClick={props.onClick} id={props.id} style={props.style}>
			{props.children}
		</div>
	);
})`
	font-size: 15px;
	border: none;
	outline: none;
	cursor: pointer;
	position: relative;
	padding: 0 10px 10px 10px;
	border-bottom: ${props => (props.active ? "1px solid var(--text-color)" : "none")};
	color: ${props => (props.active ? "var(--text-color-highlight)" : "var(--text-color-subtle)")};
	font-weight: ${props => (props.active ? "500" : "normal")};
	margin-bottom: -1px;
	&.cancel {
		text-align: right;
		margin-left: auto;
		flex-grow: 10;
	}
	@media only screen and (max-width: 450px) {
		font-size: 14px;
	}
	@media only screen and (max-width: 350px) {
		font-size: 13px;
	}
`;

export const Content = styled((props: PropsWithChildren<ContentProps>) => {
	return <div className={props.className}>{props.children}</div>;
})`
	${props => (props.active ? "" : "display:none")}
`;
