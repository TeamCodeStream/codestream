import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState, useEffect } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Select from "react-select";
import ReactDOM from "react-dom";
import { mapFilter } from "@codestream/webview/utils";
import { useDidMount } from "../utilities/hooks";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { HostApi } from "..";
import { ObservabilityErrorDropdown } from "./ObservabilityErrorDropdown";
import { ObservabilityRelatedEntity } from "./ObservabilityRelatedEntity";
import { any } from "prop-types";

interface Props {
	searchItems: any;
}

export const ObservabilityRelatedSearch = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [selectedValue, setSelectedValue] = useState<string>("");
	const [selectOptions, setSelectOptions] = useState<any>({ value: "", label: "" });
	const { searchItems } = props;

	// Note: searchItems[0] example structure for reference, delete later
	//
	// accountName: "NewRelic Administration"
	// alertSeverity: null
	// domain: "VIZ"
	// guid: "MXxWSVp8REFTSEJPQVJEfDEyNzM1MA"
	// name: " Tischler Researching 05/01 Incident"
	// type: "CALLS"

	useEffect(() => {
		const _selectOptions = searchItems.map(item => {
			return {
				value: item?.guid,
				label: item?.name
			};
		});

		// const _selectOptions = mapFilter(searchItems, item => {
		// 	return {
		// 		value: item?.guid,
		// 		label: item?.name
		// 	};
		// });
		setSelectOptions(_selectOptions);
	}, [searchItems, expanded]);

	const handleChange = e => {
		e.preventDefault();
		e.stopPropagation();
	};

	// const options = [
	// 	{ label: "apple", value: "1" },
	// 	{ label: "orange", value: "2" },
	// 	{ label: "kiwi", value: "3" }
	// ];

	// console.warn("eric options", options);
	console.warn("eric selectOptions", selectOptions);

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 50px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>
					Search for {searchItems.length} additional services
				</span>
			</Row>
			{expanded && !_isEmpty(searchItems) && (
				<>
					<div
						style={{
							padding: "2px 10px 2px 50px",
							width: "100%"
						}}
					>
						<Select
							id="input-related-services"
							name="relatedservices"
							classNamePrefix="react-select"
							value={selectedValue}
							placeholder="Related Service"
							options={selectOptions}
							onChange={e => handleChange(e)}
						/>
					</div>
				</>
			)}
		</>
	);
});

// import Select from "react-select";
// import React, { useState, useEffect } from "react";

// const options = [
// 	{ label: "apple", value: "1" },
// 	{ label: "orange", value: "2" },
// 	{ label: "kiwi", value: "3" }
// ];

// export const ObservabilityRelatedSearch = React.memo(() => {
// 	const [items, setItems] = useState<any>();

// 	console.log(items);

// 	const handleOption = selections => {
// 		setItems(selections);
// 	};

// 	return (
// 		<div className="App">
// 			<h1>Hello CodeSandbox</h1>
// 			<Select options={options} onChange={handleOption} />
// 		</div>
// 	);
// });
