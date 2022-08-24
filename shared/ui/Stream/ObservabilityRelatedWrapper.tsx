import { forEach as _forEach } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "..";
import { useDidMount } from "../utilities/hooks";
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
	const [relatedEntities, setRelatedEntities] = useState<GetNewRelicRelatedEntitiesResponse>();
	const [loadingRelatedEntities, setLoadingRelatedEntities] = useState<boolean>(true);

	useDidMount(() => {
		(async () => {
			setLoadingRelatedEntities(true);
			const response = await HostApi.instance.send(GetNewRelicRelatedEntitiesRequestType, {
				entityGuid: props.entityGuid
			});
			if (response) {
				setRelatedEntities(response);
			}
			setLoadingRelatedEntities(false);
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
					{/* 
						Could possibly merge these to components together, 
						for now keeping seperate for clarity 
					*/}
					<ObservabilityRelatedCalls
						currentRepoId={props.currentRepoId}
						relatedEntities={relatedEntities?.CALLS || []}
						loadingRelatedEntities={loadingRelatedEntities}
					/>
					<ObservabilityRelatedCalledBy
						currentRepoId={props.currentRepoId}
						relatedEntities={relatedEntities?.CONNECTS_TO || []}
						loadingRelatedEntities={loadingRelatedEntities}
					/>
				</>
			)}
		</>
	);
});
