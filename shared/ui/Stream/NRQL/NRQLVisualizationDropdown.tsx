import React, { useMemo, useState, useEffect } from "react";
import { DropdownButtonItems } from "../DropdownButton";
import { Dropdown } from "../Dropdown";
import styled from "styled-components";
import { isEmpty as _isEmpty } from "lodash-es";

const STATES_TO_DISPLAY_STRINGS = {
	table: "Table",
	billboard: "Billboard",
	line: "Line",
	json: "JSON",
	bar: "Bar",
};

const StyledDropdownContainer = styled.div`
	background: var(--app-background-color-hover);
	border: 1px solid var(--app-background-color-hover);
	border-radius: 2px;
	padding: 2px 2px 2px 6px;
	min-width: 65px;
`;

export const NRQLVisualizationDropdown = (props: {
	onSelectCallback: Function;
	disabledFields: string[];
	selectedValue: string;
}) => {
	const [selectedValue, setSelectedValue] = useState("Table");

	const populateItems = (): DropdownButtonItems[] => {
		return [
			...Object.entries(STATES_TO_DISPLAY_STRINGS).map(([key, label]) => {
				return {
					key,
					label,
					action: e => {
						console.warn("eric callback here", key, label);
						setSelectedValue(key);
						props.onSelectCallback(key);
					},
				};
			}),
		];
	};

	const dropdownItems: DropdownButtonItems[] = useMemo(
		() => populateItems(),
		[props.disabledFields, props.selectedValue]
	);

	// Avoid empty dropdown visual during loading
	useEffect(() => {
		if (!_isEmpty(props.selectedValue)) {
			setSelectedValue(STATES_TO_DISPLAY_STRINGS[props.selectedValue]);
		}
	}, [props.selectedValue]);

	return (
		<StyledDropdownContainer>
			<Dropdown items={dropdownItems} selectedValue={selectedValue} noModal={true} />
		</StyledDropdownContainer>
	);
};
