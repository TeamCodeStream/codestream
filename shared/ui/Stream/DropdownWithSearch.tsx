import React, { useEffect, useRef, useState } from "react";
import { components, OptionProps } from "react-select";
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

const ValuePlaceholder = styled.span`
	opacity: 0.5;
`;

interface SelectOptionType {
	label: string;
	value: string;
}

interface DropdownWithSearchProps {
	loadOptions?: Function;
	selectedOption?: SelectOptionType | any;
	name?: string;
	id?: string;
	handleChangeCallback: Function;
	tabIndex?: number;
	customOption?: ((props: OptionProps) => JSX.Element) | JSX.Element;
	placeholder?: string;
	customWidth?: string;
	valuePlaceholder?: string;
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
	customWidth,
	valuePlaceholder,
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

	const selectedOptionOutput = () => {
		if (selectedOption?.label) {
			return selectedOption?.label;
		}
		if (valuePlaceholder) {
			return <ValuePlaceholder>{valuePlaceholder}</ValuePlaceholder>;
		}
		return <LoadingSpan>Loading...</LoadingSpan>;
	};

	return (
		<div>
			<SelectedValueContainer onClick={e => handleClickSelected(e)}>
				<SelectedValueRow>
					<span style={{ color: "var(--text-color)" }}>{selectedOptionOutput()}</span>
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
							setShowSelect(false);
							handleChangeCallback(newValue);
						}}
						components={{ Option: customOption, DropdownIndicator: CustomDropdownIndicator }}
						autoFocus
					/>
				</div>
			)}
		</div>
	);
};
