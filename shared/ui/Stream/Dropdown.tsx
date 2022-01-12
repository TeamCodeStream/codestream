import React, { useState } from "react";
import Icon from "./Icon";
import Menu from "./Menu";

interface Props {
	selectedValue: string;
	items: { label: string; action: Function; key: string; checked: boolean }[];
}

export const Dropdown = (props: Props) => {
	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};

	const [selectedValue, setSelectedValue] = React.useState<string>();

	if (props.items.length === 1) {
		return <label>{selectedValue || props.selectedValue}</label>;
	}
	return (
		<label onClick={toggleEllipsisMenu} style={{ cursor: "pointer" }}>
			{selectedValue || props.selectedValue}
			<Icon name="chevron-down-thin" className="smaller" style={{ verticalAlign: "-1px" }} />
			{ellipsisMenuOpen && (
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
		</label>
	);
};
