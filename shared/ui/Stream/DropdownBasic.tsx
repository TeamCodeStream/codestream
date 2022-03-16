import React, { useState } from "react";
import Icon from "./Icon";
import Menu from "./Menu";

interface Props {
	selectedItem: string;
	items: {
		label?: string;
		action?: Function | string;
		key?: string;
	}[];
}

export const DropdownBasic = (props: Props) => {
	const [isOpen, setOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);

	const toggleDropdown = () => setOpen(!isOpen);

	const handleItemClick = id => {
		selectedItem == id ? setSelectedItem(null) : setSelectedItem(id);
	};

	return (
		<div className="dropdown">
			<div className="dropdown-header" onClick={toggleDropdown}>
				{selectedItem ? props.items.find(item => item?.key == selectedItem)?.label : "Select..."}
				<i className={`fa fa-chevron-right icon ${isOpen && "open"}`}></i>
			</div>
			<div className={`dropdown-body ${isOpen && "open"}`}>
				{props.items.map(item => (
					<div
						className="dropdown-item"
						onClick={e => handleItemClick(e.target?.key)}
						key={item.key}
					>
						<span className={`dropdown-item-dot ${item.key == selectedItem && "selected"}`}>
							•{" "}
						</span>
						{item.label}
					</div>
				))}
			</div>
		</div>
	);
};
