import React from "react";
import Menu from "../../../Stream/Menu";
import styled from "styled-components";
import Icon from "../../../Stream/Icon";

interface MenuItem {
	label: any;
	action?: string | (() => void);
	key?: string;
	default?: boolean;
}

export interface InlineMenuProps {
	items: MenuItem[];
	children?: React.ReactNode;
	onChange?: (item: MenuItem) => void;
	title?: string;
	titleIcon?: any;
	noCloseIcon?: boolean;
	className?: string;
	onOpen?: Function;
	noChevronDown?: boolean;
	noFocusOnSelect?: boolean;
}

export const TextButton = styled.span`
	color: ${props => props.theme.colors.textHighlight};
	&.subtle {
		color: var(--text-color-subtle);
		&:hover {
			color: ${props => props.theme.colors.textHighlight};
		}
	}
	cursor: pointer;
	white-space: nowrap;
	.octicon-chevron-down {
		transform: scale(0.7);
		margin-left: 2px;
		margin-right: 5px;
		white-space: nowrap;
	}
	.icon.inline-label {
		display: inline-block;
		transform: scale(0.7);
		margin-right: 1px;
		white-space: nowrap;
		vertical-align: 1px;
	}
	&.big-chevron {
		.octicon-chevron-down {
			transform: scale(1);
		}
	}
	&:focus {
		margin: -3px;
		border: 3px solid transparent;
	}
	&.no-padding {
		padding: 0 !important;
	}
`;

export function InlineMenu(props: InlineMenuProps) {
	const buttonRef = React.useRef<HTMLSpanElement>(null);
	const [isOpen, toggleMenu] = React.useReducer((open: boolean) => !open, false);

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (event.key == "Enter") return toggleMenu(event);
	};

	const maybeToggleMenu = action => {
		if (action !== "noop") toggleMenu(action);
		if (props.onChange) props.onChange(action);
	};

	if (!props.items.length) {
		return <>{props.children}</>;
	}

	return (
		<>
			{isOpen && buttonRef.current && (
				<Menu
					align="center"
					action={maybeToggleMenu}
					title={props.title}
					titleIcon={props.titleIcon}
					noCloseIcon={props.noCloseIcon}
					target={buttonRef.current}
					items={props.items}
					focusOnSelect={props.noFocusOnSelect ? null : buttonRef.current}
				/>
			)}
			<TextButton
				ref={buttonRef}
				onClickCapture={e => {
					e.preventDefault();
					e.stopPropagation();
					if (!isOpen && props.onOpen) props.onOpen();
					toggleMenu(isOpen);
				}}
				tabIndex={0}
				onKeyPress={handleKeyPress}
				className={props.className}
			>
				{props.children}
				{!props.noChevronDown && <Icon name="chevron-down" />}
			</TextButton>
		</>
	);
}
