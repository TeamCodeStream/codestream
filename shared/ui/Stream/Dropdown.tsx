import React, { useState } from "react";
import Icon from "./Icon";
import Menu from "./Menu";
import styled from "styled-components";

const DropdownItemsContainer = styled.div`
	position: absolute;
	background: var(--panel-tool-background-color);
	margin-top: -20px;
	z-index: 9999;
	border-radius: 5px;
	box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
	.vscode-dark& {
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
	}
`;

const DropdownItemContainer = styled.div`
	margin: 8px 0 8px 0;
	padding: 0 8px 0 8px;
	&:hover {
		background: var(--button-background-color);
	}
`;

const CheckboxContainer = styled.span`
	min-width: 11px;
	display: inline-block;
	margin: 0 4px 0 0;
`;

interface Props {
	selectedValue: string;
	items: {
		label?: string;
		action?: Function | string;
		key?: string;
		checked?: boolean;
		type?: string;
		placeholder?: string;
		searchLabel?: string;
	}[];
	noModal?: boolean;
}

// Simple dropdown with two modes, modal which the full list of <Menu /> options (like search)
// and noModal, which is just a simplfied dropdown that can work without react portals
export const Dropdown = (props: Props) => {
	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};
	const [selectedValue, setSelectedValue] = React.useState<string | undefined>(
		props.selectedValue || ""
	);

	return (
		<>
			{/* Just show label if only one dropdown item */}
			{props.items.length === 1 && <label>{selectedValue}</label>}
			{/* If more than 1 dropdown item, render dropdown */}
			{props.items.length > 1 && (
				<label
					tabIndex={0}
					onBlur={toggleEllipsisMenu}
					onClick={toggleEllipsisMenu}
					style={{ cursor: "pointer" }}
				>
					{selectedValue}
					<Icon name="chevron-down-thin" className="smaller" style={{ verticalAlign: "-1px" }} />
					{ellipsisMenuOpen && !props.noModal && (
						<Menu
							items={props.items.map(_ => {
								// hijack the action to set the selected label first
								return {
									..._,
									action: () => {
										setSelectedValue(_.label);
										if (typeof _.action === "function") {
											_.action();
										}
									}
								};
							})}
							action={() => setEllipsisMenuOpen(undefined)}
							target={ellipsisMenuOpen}
						/>
					)}
					{ellipsisMenuOpen && props.noModal && (
						<DropdownItemsContainer>
							{props.items.map((_, index) => (
								<DropdownItemContainer
									key={`dropdown_item_${index}_${_?.label}`}
									onClick={e => {
										setSelectedValue(_.label);
										if (typeof _.action === "function") {
											_.action();
										}
									}}
								>
									<CheckboxContainer>{selectedValue === _.label && <>✔</>}</CheckboxContainer>
									{_?.label}
								</DropdownItemContainer>
							))}
						</DropdownItemsContainer>
					)}
				</label>
			)}
		</>
	);
};
