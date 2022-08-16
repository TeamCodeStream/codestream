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

export const ObservabilityRelatedEntity = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);

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
				<span style={{ marginLeft: "2px" }}>RELATED ENTIITY TITLE</span>
			</Row>
			{expanded && (
				<Row
					style={{
						padding: "2px 10px 2px 60px"
					}}
					className={"pr-row"}
				>
					RELATED ENTITY CONTENT
				</Row>
			)}
		</>
	);
});
