import React, { useEffect } from "react";
import { Button, getButtonProps, ButtonProps } from "../src/components/Button";
import styled from "styled-components";
import Icon from "./Icon";
import Menu from "./Menu";

// This implementation isn't quite ideal.
// [The <Menu/> should appear below the caret button as if they are connected -this part is done now -Pez]
// The api for consumers could probably be better, but it's only used in the review component for now

export interface DropdownButtonItems {
	label?: any;
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
	type?: string;
	floatRight?: any;
	placeholder?: string;
}

export interface DropdownButtonProps extends ButtonProps {
	items: DropdownButtonItems[];
	title?: string;
	onChangeSearch?: Function;
	spread?: boolean;
	splitDropdown?: boolean;
	splitDropdownInstantAction?: boolean;
	wrap?: boolean;
	onOpen?: Function;
	selectedKey?: string;
	noCloseIcon?: boolean;
	isMultiSelect?: boolean;
	itemsRange?: string[];
	align?: string;
	/** if true, prevents e.stopPropagation() from being called onclick */
	preventStopPropagation?: boolean;
	onButtonClicked?: Function;
	noChevronDown?: boolean;
	noSearchTermFilter?: boolean;
}

// operates in two modes. if splitDropdown is false (the default), it's a dropdown menu.
// if splitDropdown is true, then the chevron is separated from the main button action,
// and it opens the menu. selecting a menu item just changes the selection, but you have
// to click the button to perform the action
//
// however -- if splitDropdownInstantAction is true, then the dropdown will:
// a) perform the action immediately on the main button
// b) open a menu if you click the chevron
// c) perform the action immediately when the menu is exposed and you select an option
// for an example, see the dropdown here: http://gitlab.codestream.us/pez/onprem-awesome-1/-/merge_requests/1
export function DropdownButton(props: React.PropsWithChildren<DropdownButtonProps>) {
	const buttonRef = React.useRef<HTMLElement>(null);
	const [menuIsOpen, setMenuIsOpen] = React.useState(false);
	const [selectedKey, setSelectedKey] = React.useState(props.selectedKey);

	const maybeToggleMenu = action => {
		if (action !== "noop") setMenuIsOpen(!menuIsOpen);
	};

	let align = props.align || (props.splitDropdown ? "dropdownLeft" : "dropdownRight");
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
			if (selectedKey) item.checked = item.key === selectedKey;
			item.action = () => {
				if (props.splitDropdownInstantAction && item.buttonAction) item.buttonAction();
				else setSelectedKey(item.key);
				item.onSelect && item.onSelect();
			};
		});
	}

	useEffect(() => {
		if (menuIsOpen && props.onOpen) {
			props.onOpen();
		}
	}, [menuIsOpen]);

	return (
		<Root
			className={props.className}
			splitDropdown={props.splitDropdown}
			fillParent={props.fillParent}
		>
			{props.splitDropdown ? (
				<span style={{ display: "inline-block" }} ref={buttonRef}>
					<Button
						{...getButtonProps(props)}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							selectedItem.buttonAction && selectedItem.buttonAction(e);
						}}
					>
						{selectedItem.label}
					</Button>
					<Button
						{...getButtonProps(props)}
						isLoading={false}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							setMenuIsOpen(!menuIsOpen);
						}}
						narrow
					>
						{props.noChevronDown ? null : (
							<Icon name="chevron-down-thin" className="chevron-down" />
						)}
					</Button>
				</span>
			) : (
				<Button
					{...getButtonProps(props)}
					onClick={e => {
						e.preventDefault();
						if (!props.preventStopPropagation) {
							e.stopPropagation();
							setMenuIsOpen(!menuIsOpen);
						}
						if (props.onButtonClicked) {
							props.onButtonClicked(e);
						}
					}}
					ref={buttonRef}
				>
					{props.children}
					{props.noChevronDown ? null : <Icon name="chevron-down-thin" className="chevron-down" />}
				</Button>
			)}
			{menuIsOpen && buttonRef.current && (
				<Menu
					align={align}
					action={maybeToggleMenu}
					target={buttonRef.current}
					title={props.title}
					onChangeSearch={props?.onChangeSearch}
					items={items}
					noCloseIcon={props.noCloseIcon}
					focusOnSelect={buttonRef.current}
					wrap={props.wrap}
					isMultiSelect={props.isMultiSelect}
					itemsRange={props.itemsRange}
					noSearchTermFilter={props?.noSearchTermFilter}
				/>
			)}
		</Root>
	);
}

const Root = styled.div<{ splitDropdown?: boolean; fillParent?: boolean }>`
	display: ${props => (props.fillParent ? "block" : "inline-block")};
	position: relative;
	.octicon-chevron-down-thin {
		margin-left: ${props => (props.splitDropdown ? "0" : "5px")};
		transform: scale(0.85);
	}
	${props => {
		return props.splitDropdown
			? `	button:first-of-type {
		border-top-right-radius: 0 !important;
		border-bottom-right-radius: 0 !important;
	}
	button:last-of-type {
		border-top-left-radius: 0 !important;
		border-bottom-left-radius: 0 !important;
	}
`
			: "";
	}}
	button + button {
		// border-left: 1px solid var(--base-border-color) !important;
		margin-left: 1px !important;
	}
	white-space: ${props => (props.splitDropdown ? "nowrap" : "")};
	${props => {
		return props.fillParent
			? `
			button {
	justify-content: left;
	text-align: left;
	> span {
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left;
		width: 100%;
		.icon {
			float: right;
		}
	}
}
`
			: "";
	}}
`;
