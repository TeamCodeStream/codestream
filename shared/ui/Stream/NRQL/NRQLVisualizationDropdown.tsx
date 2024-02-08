import { ResultsTypeGuess } from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { isEmpty as _isEmpty } from "lodash-es";
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Dropdown, DropdownItem } from "../Dropdown";

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
	accountId: number;
	onSelectCallback: Function;
	resultsTypeGuess: ResultsTypeGuess;
}) => {
	const [selectedValue, setSelectedValue] = useState("Table");
	const prevVisualizationType = useRef(props.resultsTypeGuess?.selected);

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
						HostApi.instance.track("codestream/nrql/visualization changed", {
							event_type: "change",
							account_id: props.accountId,
							meta_data: `old_value: ${prevVisualizationType.current}; new_value: ${key}`,
						});
						prevVisualizationType.current = key;
						setSelectedValue(STATES_TO_DISPLAY_STRINGS[key]);
						props.onSelectCallback(key);
					},
					disabled,
				};
			}),
		];
	};

	const dropdownItems: DropdownItem[] = useMemo(() => populateItems(), []);

	// Avoid empty dropdown during loading
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
