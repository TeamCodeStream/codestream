import React, { useEffect, useRef, useState } from "react";
import { components } from "react-select";
import Icon from "./Icon";
import styled from "styled-components";
import { AsyncPaginateCustomStyles } from "./AsyncPaginateCustomStyles";

interface SelectedValueContainerProps {
	styles?: any;
	onClick: Function;
}

const SelectedValueContainer = styled.div<SelectedValueContainerProps>`
	${({ styles }) => styles}
	padding: 4px;
	margin-bottom: 8px;
	border: 1px solid var(--base-border-color);
	background: var(--base-background-color);
	border-radius: 2px;
`;

const SelectedValueRow = styled.div`
	display: flex;
	justify-content: space-between;
	margin-left: 2px;
	margin-right: 2px;
`;

const LoadingSpan = styled.span`
	font-style: italic;
`;

interface DropdownWithSearchProps {
	loadOptions?: Function;
	selectedOption?: any;
	name?: string;
	id?: string;
	handleChangeCallback: Function;
	tabIndex?: number;
	customOption?: any;
	placeholder?: any;
	customSelectedValueStyles?: any;
	customWidth?: string;
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
	customSelectedValueStyles,
	customWidth,
}) => {
	const [value, setValue] = useState<any | null>(null);
	const [showSelect, setShowSelect] = useState<boolean>(false);
	const selectRef = useRef(null);

	// const customStyles = {
	// 	control: provided => ({
	// 		...provided,
	// 		borderBottomRightRadius: 0,
	// 		borderBottomLeftRadius: 0,
	// 		backgroundColor: "var(--app-background-color-hover) !important",
	// 		cursor: "text !important",
	// 	}),
	// 	menu: provided => ({
	// 		...provided,
	// 		borderTopWidth: 0,
	// 		borderTopRightRadius: 0,
	// 		borderTopLeftRadius: 0,
	// 		marginTop: 0,
	// 		backgroundColor: "var(--base-background-color) !important",
	// 	}),
	// 	menuList: provided => ({
	// 		...provided,
	// 		paddingTop: 0,
	// 	}),
	// 	indicatorSeparator: provided => ({
	// 		...provided,
	// 		display: "none",
	// 	}),
	// 	dropdownIndicator: provided => ({
	// 		...provided,
	// 	}),
	// 	option: provided => ({
	// 		...provided,
	// 		backgroundColor: "var(--app-background-color) !important",
	// 	}),
	// 	loadingMessage: provided => ({
	// 		...provided,
	// 		backgroundColor: "var(--app-background-color) !important",
	// 	}),
	// };

	const focusSelect = () => {
		if (selectRef?.current) {
			//@ts-ignore
			selectRef.current.select.focus();
		}
	};

	const CustomDropdownIndicator = props => {
		return (
			<components.DropdownIndicator {...props}>
				<Icon name="search" className="search" />
			</components.DropdownIndicator>
		);
	};

	const handleOnBlur = () => {
		console.warn("blurred");
		setShowSelect(false);
	};

	const handleClickSelected = event => {
		event.stopPropagation();
		if (showSelect) {
			setShowSelect(false);
		} else {
			setShowSelect(true);
			focusSelect();
		}
	};

	useEffect(() => {
		console.warn(showSelect);
	}, [showSelect]);

	return (
		<div>
			<SelectedValueContainer
				styles={customSelectedValueStyles ? customSelectedValueStyles : undefined}
				onClick={e => handleClickSelected(e)} // Pass the event to handleClickSelected
			>
				<SelectedValueRow>
					<span style={{ color: "var(--text-color)" }}>
						{selectedOption?.label || <LoadingSpan>Loading...</LoadingSpan>}
					</span>
					<span>
						<Icon name="chevron-down" />
					</span>
				</SelectedValueRow>
			</SelectedValueContainer>
			<div
				tabIndex={tabIndex}
				onBlur={handleOnBlur}
				style={{
					visibility: showSelect ? "visible" : "hidden",
					position: "absolute",
					width: `${customWidth}px` || "400px",
				}}
			>
				<AsyncPaginateCustomStyles
					selectRef={selectRef}
					id={id}
					name={name}
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
				/>
			</div>
		</div>
	);
};
