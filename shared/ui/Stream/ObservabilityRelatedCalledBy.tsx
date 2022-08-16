import { forEach as _forEach } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedEntity } from "./ObservabilityRelatedEntity";
import { ObservabilityAssignmentsDropdown } from "./ObservabilityAssignmentsDropdown";
import { any } from "prop-types";

interface Props {
	// observabilityErrors: any;
	// observabilityRepo: any;
	// observabilityAssignments: any;
	// entityGuid: string;
}

export const ObservabilityRelatedCalledBy = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);

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
				<span style={{ marginLeft: "2px" }}>Called By</span>
			</Row>
			{expanded && <ObservabilityRelatedEntity />}
		</>
	);
});
