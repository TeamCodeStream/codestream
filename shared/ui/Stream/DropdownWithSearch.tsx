import React, { useEffect, useRef, useState } from "react";
import { components, OptionProps } from "react-select";
import Icon from "./Icon";
import styled from "styled-components";
import { AsyncPaginateCustomStyles } from "./AsyncPaginateCustomStyles";

interface SelectedValueContainerProps {
	styles?: React.CSSProperties;
	onClick: Function;
}

const SelectedValueContainer = styled.div<SelectedValueContainerProps>`
	${({ styles }) =>
		styles &&
		Object.entries(styles)
			.map(([key, value]) => `${key}: ${value};`)
			.join("\n")}
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
	value: string | number;
}

interface DropdownWithSearchProps {
	loadOptions?: Function;
	selectedOption?: SelectOptionType;
	name?: string;
	id?: string;
	handleChangeCallback: Function;
	tabIndex?: number;
	customOption?: ((props: OptionProps) => JSX.Element) | JSX.Element;
	placeholder?: string;
	customWidth?: string;
	valuePlaceholder?: string;
	isLoading?: boolean;
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
	isLoading = false,
}) => {
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
		// nested in a seperate container from the selected value display, where
		// the selected value container and async-paginate blur modify the same state value,
		// it seems like a neccssary evil in order to ensure state values
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

		if (isLoading) {
			return <LoadingSpan>Loading...</LoadingSpan>;
		}

		if (valuePlaceholder) {
			return <ValuePlaceholder>{valuePlaceholder}</ValuePlaceholder>;
		}

		return "Search"; //to match placeholder
	};

	return (
		<div>
			<SelectedValueContainer onClick={e => handleClickSelected(e)}>
				<SelectedValueRow>
					<span
						style={{
							color: "var(--text-color)",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							paddingRight: "10px",
						}}
					>
						{selectedOptionOutput()}
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
						width: customWidth ? `${customWidth}px` : "90%",
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
