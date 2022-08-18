import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
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
	const [selectedItem, setSelectedItem] = useState<boolean>(true);
	const { searchItems } = props;

	// Note: searchItems[0] example structure for reference, delete later
	//
	// accountName: "NewRelic Administration"
	// alertSeverity: null
	// domain: "VIZ"
	// guid: "MXxWSVp8REFTSEJPQVJEfDEyNzM1MA"
	// name: " Tischler Researching 05/01 Incident"
	// type: "CALLS"

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
					<Row
						style={{
							padding: "2px 10px 2px 60px"
						}}
						className={"pr-row"}
					>
						Search Dropdown here
					</Row>
				</>
			)}
		</>
	);
});
