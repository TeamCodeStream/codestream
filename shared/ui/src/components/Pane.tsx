import React, { PropsWithChildren } from "react";
import styled from "styled-components";
import Icon from "@codestream/webview/Stream/Icon";
import ScrollBox from "@codestream/webview/Stream/ScrollBox";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { WebviewPanels } from "@codestream/protocols/webview";
import {
	setUserPreference,
	setPaneCollapsed,
	setPaneMaximized
} from "@codestream/webview/Stream/actions";

export enum PaneState {
	Open = "open",
	Minimized = "minimized",
	Collapsed = "collapsed"
}

const EMPTY_HASH = {};

export const NoContent = styled.div`
	color: var(--text-color-subtle);
	margin: 0 20px 5px 20px;
	font-size: 12px;
`;

interface PaneNodeNameProps {
	title: string | React.ReactNode;
	id?: string;
	className?: string;
	onClick?: any;
	isLoading?: boolean;
	count?: number;
	subtitle?: string | React.ReactNode;
	collapsed?: boolean;
}
export const PaneNodeName = styled((props: PropsWithChildren<PaneNodeNameProps>) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const hiddenPaneNodes = preferences.hiddenPaneNodes || EMPTY_HASH;
		return {
			collapsed: props.id ? hiddenPaneNodes[props.id] : props.collapsed
		};
	});
	const toggleNode = e => {
		if (e.target.closest(".actions")) return;
		if (!props.id) return;
		dispatch(setUserPreference(["hiddenPaneNodes"], { [props.id]: !derivedState.collapsed }));
	};

	return (
		<div className={props.className} onClick={props.onClick || toggleNode}>
			{props.isLoading && <Icon name="sync" className="spin" />}
			{!props.isLoading && (
				<Icon
					name={derivedState.collapsed ? "chevron-right-thin" : "chevron-down-thin"}
					className="expander"
				/>
			)}
			{props.title}
			{props.count && props.count > 0 ? <span className="subtle"> ({props.count})</span> : null}
			{!derivedState.collapsed && props.subtitle ? (
				<span className="subtle"> {props.subtitle}</span>
			) : null}
			{!derivedState.collapsed && <div className="actions">{props.children}</div>}
		</div>
	);
})`
	padding: 2px 20px;
	display: flex;
	cursor: pointer;
	position: relative;
	> .icon {
		display: inline-block;
		width: 16px;
		text-align: center;
	}
	&:hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
	.actions {
		position: absolute;
		right: 5px;
		top: 2px;
		background: var(--app-background-color-hover);
		display: none;
		.icon {
			margin: 0 5px;
			opacity: 0.7;
		}
	}
	&:hover .actions {
		display: block;
	}
	.subtle {
		padding-left: 5px;
		font-weight: normal;
		text-transform: none;
	}
`;

export const PaneNode = styled.div`
	.pane-row {
		padding-left: 40px;
		.selected-icon {
			left: 20px;
		}
	}
`;

interface PaneHeaderProps {
	title: string | React.ReactNode;
	className?: string;
	id: WebviewPanels | string;
	count?: number;
	subtitle?: string | React.ReactNode;
	isLoading?: boolean;
	warning?: React.ReactNode;
}
export const PaneHeader = styled((props: PropsWithChildren<PaneHeaderProps>) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const panePreferences = preferences.sidebarPanes || EMPTY_HASH;
		const settings = panePreferences[props.id] || EMPTY_HASH;
		const anyMaximized = Object.keys(panePreferences).find(
			id => (panePreferences[id] || {}).maximized
		);
		const stateIcon =
			anyMaximized && !settings.maximized
				? "dash"
				: settings.maximized
				? "chevron-down-thin"
				: settings.collapsed
				? "chevron-right-thin"
				: "chevron-down-thin";
		return {
			stateIcon,
			settings,
			maximized: settings.maximized,
			collapsed: settings.collapsed,
			anyMaximized
		};
	});
	const togglePanel = e => {
		if (e.target.closest(".actions")) return;
		dispatch(setPaneCollapsed(props.id, !derivedState.collapsed));
	};
	const maximize = () => {
		dispatch(setPaneMaximized(props.id, !derivedState.maximized));
	};

	return (
		<div className={props.className} onClick={togglePanel}>
			<Icon name={derivedState.stateIcon} className="expander" />
			{props.title}
			{props.count && props.count > 0 ? <span className="subtle"> ({props.count})</span> : null}
			{!derivedState.collapsed && props.subtitle ? (
				<span className="subtle"> {props.subtitle}</span>
			) : null}
			{!derivedState.collapsed && (!derivedState.anyMaximized || derivedState.maximized) && (
				<div className="actions">
					{props.children}
					<Icon
						name={derivedState.maximized ? "minimize" : "maximize"}
						className="maximize"
						onClick={maximize}
					/>
				</div>
			)}
			{props.warning && props.warning}
			{props.isLoading && (
				<div className="progress-container">
					<div className="progress-bar">
						<div className="progress-cursor" />
					</div>
				</div>
			)}
		</div>
	);
})`
	position: fixed;
	// color: var(--text-color-highlight);
	font-weight: 700;
	font-size: 11px;
	text-transform: uppercase;
	margin: -20px 0 5px 0;
	padding-left: 5px;
	.toggle {
		opacity: 0;
		margin: 0 5px 0 -13px;
		vertical-align: -1px;
		transition: opacity 0.1s;
	}
	.maximize {
		transform: scale(0.8) rotate(-45deg);
	}
	&:hover .toggle {
		opacity: 1;
	}
	z-index: 49;
	width: 100%;
	cursor: pointer;
	.progress-container {
		position: absolute;
		top: 21px;
	}
	.actions {
		position: absolute;
		right: 0;
		top: 2px;
		display: none;
		margin-right: 10px;
		background: var(--app-background-color);
		.icon {
			vertical-align: 2px !important;
			cursor: pointer;
			display: inline-block;
			opacity: 0.7;
			&:hover {
				opacity: 1;
			}
			margin: 0px 5px !important;
			padding: 0 !important;
			&:active {
				transform: scale(1.2);
			}
			&.maximize:active {
				transform: scale(1) rotate(-45deg);
			}
		}
	}
	.expander {
		vertical-align: 2px;
	}
	.subtle {
		padding-left: 5px;
		font-weight: normal;
		text-transform: none;
	}
`;

interface PaneBodyProps {}
export function PaneBody(props: PropsWithChildren<PaneBodyProps>) {
	return (
		<ScrollBox>
			<div className="vscroll">{props.children}</div>
		</ScrollBox>
	);
}

const Root = styled.div`
	padding: 22px 0 0px 0;
	.icon {
		&.ticket,
		&.link-external {
			margin-right: 0;
		}
	}
	border: 1px solid transparent;
	border-bottom: 1px solid var(--base-border-color);
	.instructions {
		display: none;
		padding: 0 20px 20px 20px;
		text-align: center;
	}
	&.show-instructions .instructions {
		display: block;
	}
	&:focus ${PaneHeader} .actions,
	&:hover ${PaneHeader} .actions {
		display: inline;
	}
	position: absolute;
	overflow: hidden;
	width: calc(100% - 2px); // absolute element w/a border
	left: 1px;
	&:focus {
		outline: none;
		border: 1px solid var(--text-focus-border-color);
	}
	.animate-height & {
		transition: height 0.25s, top 0.25s;
	}
	.expander {
		margin: 0 2px 0 -2px;
	}
`;

interface PaneProps {
	className?: string;
	top: number;
	height: number;
	tabIndex: number;
}

export function Pane(props: PropsWithChildren<PaneProps>) {
	return (
		<Root
			className={props.className}
			style={{ top: `${props.top}px`, height: `${props.height}px` }}
			tabIndex={props.tabIndex}
		>
			{props.children}
		</Root>
	);
}
