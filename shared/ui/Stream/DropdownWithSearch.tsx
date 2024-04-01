import React, { useState } from "react";
import { AsyncPaginate } from "react-select-async-paginate";
import { components } from "react-select";
import Icon from "./Icon";

interface DropdownWithSearchProps {
	loadOptions?: Function;
	selectedOption?: any;
	name?: string;
	id?: string;
	handleChangeCallback: Function;
	tabIndex?: number;
	customOption?: any;
	placeholder?: any;
}

export const DropdownWithSearch: React.FC<DropdownWithSearchProps> = ({
	loadOptions,
	selectedOption,
	name,
	id,
	handleChangeCallback,
	tabIndex,
	customOption,
	placeholder,
}) => {
	const [value, setValue] = useState<any | null>(null);
	const [showSelect, setShowSelect] = useState<boolean>(false);

	const customStyles = {
		control: provided => ({
			...provided,
			borderBottomRightRadius: 0,
			borderBottomLeftRadius: 0,
		}),
		menu: provided => ({
			...provided,
			borderTopWidth: 0,
			borderTopRightRadius: 0,
			borderTopLeftRadius: 0,
			marginTop: 0,
			backgroundColor: "var(--base-background-color) !important",
		}),
		menuList: provided => ({
			...provided,
			paddingTop: 0,
		}),
		indicatorSeparator: provided => ({
			...provided,
			display: "none",
		}),
		dropdownIndicator: provided => ({
			...provided,
		}),
	};

	const CustomDropdownIndicator = props => {
		return (
			<components.DropdownIndicator {...props}>
				<Icon name="search" className="search" />
			</components.DropdownIndicator>
		);
	};

	const handleClickSelected = () => {
		setShowSelect(!showSelect);
	};

	return (
		<>
			<div
				style={{
					padding: "9px",
					marginBottom: "8px",
					border: "1px solid var(--base-border-color)",
				}}
				onClick={handleClickSelected}
			>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span>
						{selectedOption?.label || <span style={{ fontStyle: "italic" }}>Loading...</span>}
					</span>
					<span>
						<Icon name="chevron-down" />
					</span>
				</div>
			</div>
			{showSelect && (
				<div>
					<AsyncPaginate
						id={id}
						name={name}
						styles={customStyles}
						menuIsOpen={true}
						classNamePrefix="react-select"
						loadOptions={loadOptions}
						value={value}
						debounceTimeout={750}
						placeholder={placeholder || "Search"}
						onChange={newValue => {
							handleChangeCallback(newValue);
						}}
						components={{ Option: customOption, DropdownIndicator: CustomDropdownIndicator }}
						tabIndex={tabIndex}
					/>
				</div>
			)}
		</>
	);
};
