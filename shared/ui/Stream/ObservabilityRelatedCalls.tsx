import { forEach as _forEach } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { useDidMount } from "../utilities/hooks";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { HostApi } from "..";
import { ObservabilityErrorDropdown } from "./ObservabilityErrorDropdown";
import { ObservabilityAssignmentsDropdown } from "./ObservabilityAssignmentsDropdown";
import { any } from "prop-types";
interface Props {
	// observabilityErrors: any;
	// observabilityRepo: any;
	// observabilityAssignments: any;
	// entityGuid: string;
}

export const ObservabilityRelatedCalls = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);

	// useDidMount(() => {
	// 	(async () => {
	// 		// @TODO: hardcoded guid, CHANGE
	// 		const response = await HostApi.instance.send(GetNewRelicRelatedEntitiesRequestType, {
	// 			entityGuid: "MTExODkwMzh8QVBNfEFQUExJQ0FUSU9OfDE3NDY3MzAw"
	// 		});

	// 		console.warn("ERIC HERE RESPONSE", response);
	// 	})();
	// });

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 40px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Calls</span>
			</Row>
			{expanded && (
				<Row
					style={{
						padding: "0 10px 0 50px"
					}}
					className={"pr-row"}
				>
					Hello World
				</Row>
			)}
		</>
	);
});
