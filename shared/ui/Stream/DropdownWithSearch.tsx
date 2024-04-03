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
	border: 1px solid var(--base-border-color);
	background: var(--base-background-color);
	border-radius: 2px;
`;

const SelectedValueRow = styled.div`
	display: flex;
	justify-content: space-between;
	position: relative;
	margin-left: 2px;
	margin-right: 2px;
`;

const LoadingSpan = styled.span`
	font-style: italic;
`;

const ChevronIcon = styled.span`
	position: absolute;
	right: 0;
	top: 60%;
	transform: translateY(-50%);
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

	const CustomDropdownIndicator = props => {
		return (
			<components.DropdownIndicator {...props}>
				<Icon name="search" className="search" />
			</components.DropdownIndicator>
		);
	};

	const handleOnBlur = () => {
		// timeout not ideal, but given the constraints of using async-paginate
		// nested in a seperate container seperate from the selected value, where
		// the selected value container and paginate blur modify the same state value,
		// it seems like a neccssary evil in order to make sure state values
		// are modified in the correct order.
		setTimeout(() => {
			if (showSelect) {
				setShowSelect(false);
			}
		}, 100);
	};

	const handleClickSelected = event => {
		event.stopPropagation();
		setShowSelect(!showSelect);
	};

	useEffect(() => {
		if (showSelect) {
			if (selectRef?.current) {
				//@ts-ignore
				selectRef.current?.select?.focus();
			}
		}
	}, [showSelect]);

	return (
		<div>
			<SelectedValueContainer
				styles={customSelectedValueStyles ? customSelectedValueStyles : undefined}
				onClick={e => handleClickSelected(e)}
			>
				<SelectedValueRow>
					<span style={{ color: "var(--text-color)" }}>
						{selectedOption?.label || <LoadingSpan>Loading...</LoadingSpan>}
					</span>
					<ChevronIcon>
						<Icon name="chevron-down" />
					</ChevronIcon>
				</SelectedValueRow>
			</SelectedValueContainer>
			{showSelect && (
				<div
					tabIndex={tabIndex}
					onBlur={handleOnBlur}
					style={{
						position: "absolute",
						width: `${customWidth}px` || "400px",
						paddingTop: "8px",
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
			)}
		</div>
	);
};
