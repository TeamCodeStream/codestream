import { forEach as _forEach } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "..";
import { useDidMount } from "../utilities/hooks";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { ObservabilityRelatedCalls } from "./ObservabilityRelatedCalls";
import { ObservabilityRelatedCalledBy } from "./ObservabilityRelatedCalledBy";
import { any } from "prop-types";

interface Props {
	// observabilityErrors: any;
	// observabilityRepo: any;
	// observabilityAssignments: any;
	// entityGuid: string;
}

export const ObservabilityRelatedWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const [relatedEntities, setRelatedEntities] = useState<any | undefined>(undefined);

	useDidMount(() => {
		(async () => {
			// @TODO: hardcoded guid, CHANGE
			const response = await HostApi.instance.send(GetNewRelicRelatedEntitiesRequestType, {
				entityGuid: "MTExODkwMzh8QVBNfEFQUExJQ0FUSU9OfDE3NDY3MzAw"
			});
			console.warn("relatedEntities on useDidMount", response);
			setRelatedEntities(response);
		})();
	});

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Related Services</span>
			</Row>
			{expanded && relatedEntities && (
				<>
					<ObservabilityRelatedCalls relatedEntities={relatedEntities.CALLS} />
					<ObservabilityRelatedCalledBy relatedEntities={relatedEntities.CONNECTS_TO} />
				</>
			)}
		</>
	);
});
