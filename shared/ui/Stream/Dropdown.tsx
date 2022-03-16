import React, { useState } from "react";
import Icon from "./Icon";
import Menu from "./Menu";

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

export const Dropdown = (props: Props) => {
	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};

	const [selectedValue, setSelectedValue] = React.useState<string>();

	return (
		<>
			{/* Just show label if only one dropdown item */}
			{props.items.length === 1 && <label>{selectedValue || props.selectedValue}</label>}
			{/* If more than 1 dropdown item, render dropdown */}
			{props.items.length > 1 && (
				<label onClick={toggleEllipsisMenu} style={{ cursor: "pointer" }}>
					{selectedValue || props.selectedValue}
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
					{ellipsisMenuOpen && props.noModal && <div>hi</div>}
				</label>
			)}
		</>
	);
};
