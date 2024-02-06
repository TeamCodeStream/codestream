import React, { useMemo, useState, useEffect } from "react";
import { Dropdown, DropdownItem } from "../Dropdown";
import styled from "styled-components";
import { isEmpty as _isEmpty } from "lodash-es";
import { ResultsTypeGuess } from "@codestream/protocols/agent";

interface StatesToDisplay {
	[key: string]: string;
}
const STATES_TO_DISPLAY_STRINGS: StatesToDisplay = {
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
	resultsTypeGuess: ResultsTypeGuess;
}) => {
	const [selectedValue, setSelectedValue] = useState("Table");

	const populateItems = (): DropdownItem[] => {
		return [
			...Object.entries(STATES_TO_DISPLAY_STRINGS).map(([key, label]: [string, string]) => {
				const disabled = !(
					props.resultsTypeGuess.enabled && props.resultsTypeGuess.enabled?.includes(key)
				);
				return {
					key,
					label,
					action: e => {
						setSelectedValue(STATES_TO_DISPLAY_STRINGS[key]);
						props.onSelectCallback(key);
					},
					disabled,
				};
			}),
		];
	};

	const dropdownItems: DropdownItem[] = useMemo(() => populateItems(), [props.disabledFields]);

	// Avoid empty dropdown visual during loading
	useEffect(() => {
		if (!_isEmpty(props.resultsTypeGuess) && props.resultsTypeGuess.selected) {
			setSelectedValue(STATES_TO_DISPLAY_STRINGS[props.resultsTypeGuess.selected]);
		}
	}, [props.resultsTypeGuess.selected]);

	return (
		<StyledDropdownContainer>
			<Dropdown items={dropdownItems} selectedValue={selectedValue} noModal={true} />
		</StyledDropdownContainer>
	);
};
