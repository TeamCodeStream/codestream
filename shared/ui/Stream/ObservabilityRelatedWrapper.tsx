import { forEach as _forEach } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "..";
import { useRequestType, useDidMount } from "../utilities/hooks";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { ObservabilityRelatedCalls } from "./ObservabilityRelatedCalls";
import { ObservabilityRelatedCalledBy } from "./ObservabilityRelatedCalledBy";
import { GetNewRelicRelatedEntitiesResponse } from "@codestream/protocols/agent";

interface Props {
	currentRepoId: string;
	entityGuid: string;
}

export const ObservabilityRelatedWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const {
		loading,
		data
	}: {
		loading: boolean;
		data: GetNewRelicRelatedEntitiesResponse;
	} = useRequestType(GetNewRelicRelatedEntitiesRequestType, { entityGuid: props.entityGuid });

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
			{expanded && data && (
				<>
					{/* 
						Could possibly merge these to components together, 
						for now keeping seperate for clarity 
					*/}
					<ObservabilityRelatedCalls
						currentRepoId={props.currentRepoId}
						relatedEntities={data?.CALLS || []}
						loadingRelatedEntities={loading}
					/>
					<ObservabilityRelatedCalledBy
						currentRepoId={props.currentRepoId}
						relatedEntities={data?.CONNECTS_TO || []}
						loadingRelatedEntities={loading}
					/>
				</>
			)}
		</>
	);
});
