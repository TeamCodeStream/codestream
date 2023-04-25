import React, { ReactElement } from "react";
import styled from "styled-components";
import Icon from "../../../Stream/Icon";
import Menu from "../../../Stream/Menu";

export interface MenuItem {
	label?: string | ReactElement;
	fragment?: ReactElement;
	action?: string | (() => void);
	dontCloseOnSelect?: boolean;
	key?: string;
	default?: boolean;
	checked?: boolean;
	subtle?: string;
	type?: string;
	subtext?: string;
	subtextNoPadding?: string;
	placeholder?: string;
	floatRight?: any;
	icon?: any;
	noHover?: boolean;
	disabled?: boolean;
	searchLabel?: string;
	tabs?: MenuItem[];
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
	align?: string;
	/** if true, still renders the surrounding TextButton UI  */
	allowEmpty?: boolean;
	/** if true, prevents e.stopPropagation() from being called onclick */
	preventStopPropagation?: boolean;
	/** if true, leave the menu visible after selecting an item */
	dontCloseOnSelect?: boolean;
	/** if true, render a multiselect menu */
	isMultiSelect?: boolean;
	/** render item as a fixed position footer */
	footer?: MenuItem;
	onChevronClick?: Function;
	preventMenuStopPropagation?: boolean;
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
	.octicon-chevron-down,
	.octicon-chevron-down-thin {
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
		.octicon-chevron-down,
		.octicon-chevron-down-thin {
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

type Action = { type: string };
const toggleMenuReducer = (open: boolean, _action: Action): boolean => {
	return !open;
};

export function InlineMenu(props: InlineMenuProps) {
	const buttonRef = React.useRef<HTMLSpanElement>(null);
	const [isOpen, toggleMenu] = React.useReducer(toggleMenuReducer, false);

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (event.key == "Enter") return toggleMenu({ type: "TOGGLE" });
	};

	const maybeToggleMenu = action => {
		if (action?.stopPropagation && props.preventMenuStopPropagation) {
			action.stopPropagation();
		}
		if (action !== "noop") {
			toggleMenu(action);
		}
		if (props.onChange) props.onChange(action);
	};

	if (!props.items.length && !props.allowEmpty) {
		return <>{props.children}</>;
	}

	return (
		<>
			{isOpen && buttonRef.current && (
				<Menu
					align={props.align || "center"}
					preventMenuStopPropagation={props.preventMenuStopPropagation}
					action={maybeToggleMenu}
					title={props.title}
					titleIcon={props.titleIcon}
					noCloseIcon={props.noCloseIcon}
					target={buttonRef.current}
					items={props.items}
					focusOnSelect={props.noFocusOnSelect ? null : buttonRef.current}
					dontCloseOnSelect={props.dontCloseOnSelect}
					isMultiSelect={props.isMultiSelect}
					footer={props.footer}
				/>
			)}
			<TextButton
				ref={buttonRef}
				onClickCapture={e => {
					e.preventDefault();
					if (props.preventStopPropagation) {
						// noop
					} else {
						e.stopPropagation();
						if (!isOpen && props.onOpen) props.onOpen();
						toggleMenu({ type: "TOGGLE" });
					}
				}}
				tabIndex={0}
				onKeyPress={handleKeyPress}
				className={props.className}
			>
				{props.children}
				{!props.noChevronDown && (
					<span style={{ whiteSpace: "nowrap" }}>
						&#65279;
						<Icon
							name="chevron-down-thin"
							onClick={e => (props.onChevronClick ? props.onChevronClick(e) : undefined)}
						/>
					</span>
				)}
			</TextButton>
		</>
	);
}
