import React from "react";
import { Button, getButtonProps, ButtonProps } from "../../src/components/Button";
import styled from "styled-components";
import Icon from "../Icon";
import Menu from "../Menu";
import { mapFilter } from "@codestream/webview/utils";

// This implementation isn't quite ideal.
// [The <Menu/> should appear below the caret button as if they are connected -this part is done now -Pez]
// The api for consumers could probably be better, but it's only used in the review component for now

export interface DropdownButtonProps extends ButtonProps {
	items: {
		label: any;
		key?: string;
		action?: (range?: any) => void;
		buttonAction?: () => void;
		noHover?: boolean;
		disabled?: boolean;
		submenu?: any[];
		subtext?: any;
		icon?: any;
		checked?: boolean;
		onSelect?: () => void; // callback for when you select an item with a splitDropdown
	}[];
	title?: string;
	splitDropdown?: boolean;
	wrap?: boolean;
	selectedKey?: string;
	isMultiSelect?: boolean;
	itemsRange?: string[];
}

// operates in two modes. if splitDropdown is false (the default), it's a dropdown menu
// if splitDropdown is true, then the chevron just changes the selection, but you have
// to click the button to perform the action
export function DropdownButton(props: React.PropsWithChildren<DropdownButtonProps>) {
	const buttonRef = React.useRef<HTMLElement>(null);
	const [menuIsOpen, toggleMenu] = React.useReducer((open: boolean) => !open, false);
	const [selectedKey, setSelectedKey] = React.useState(props.selectedKey);

	const maybeToggleMenu = action => {
		if (action !== "noop") toggleMenu(action);
	};

	let align = props.splitDropdown ? "dropdownLeft" : "dropdownRight";
	let items = [...props.items];
	let selectedItem;
	let selectedAction;
	if (props.splitDropdown) {
		selectedItem = items.find(_ => _.key === selectedKey) || items[0];
		selectedAction = selectedItem.action;
		items.forEach(item => {
			if (!item.buttonAction) {
				item.buttonAction = item.action;
			}
			item.checked = item.key === selectedKey;
			item.action = () => {
				setSelectedKey(item.key);
				item.onSelect && item.onSelect();
			};
		});
	}

	return (
		<Root className={props.className} splitDropdown={props.splitDropdown}>
			{props.splitDropdown ? (
				<>
					<Button
						{...getButtonProps(props)}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							selectedItem.buttonAction && selectedItem.buttonAction(e);
						}}
						ref={buttonRef}
					>
						{selectedItem.label}
					</Button>
					<Button
						{...getButtonProps(props)}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							toggleMenu(true);
						}}
					>
						<Icon name="chevron-down" className="chevron-down" />
					</Button>
				</>
			) : (
				<Button
					{...getButtonProps(props)}
					onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						toggleMenu(true);
					}}
					ref={buttonRef}
				>
					{props.children}
					<Icon name="chevron-down" className="chevron-down" />
				</Button>
			)}
			{menuIsOpen && buttonRef.current && (
				<Menu
					align={align}
					action={maybeToggleMenu}
					target={buttonRef.current}
					title={props.title}
					items={items}
					focusOnSelect={buttonRef.current}
					wrap={props.wrap}
					isMultiSelect={props.isMultiSelect}
					itemsRange={props.itemsRange}
				/>
			)}
		</Root>
	);
}

const Root = styled.div<{ splitDropdown?: boolean }>`
	display: inline-block;
	position: relative;
	.octicon-chevron-down {
		margin-left: ${props => (props.splitDropdown ? "0" : "5px")};
		transform: scale(0.8);
	}
	button + button {
		// border-left: 1px solid var(--base-border-color) !important;
		margin-left: 1px !important;
	}
	white-space: ${props => (props.splitDropdown ? "nowrap" : "")};
`;
