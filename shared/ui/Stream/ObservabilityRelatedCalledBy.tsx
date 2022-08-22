import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedEntity } from "./ObservabilityRelatedEntity";
import { ObservabilityRelatedSearch } from "./ObservabilityRelatedSearch";
import { any } from "prop-types";

interface Props {
	relatedEntities: any;
	currentRepoId: string;
}

// Note: This could potentially be depreciated and abstracted into ObservabilityRelatedCalls.tsx
// 		 At this point in time it feels like its worth to keep them sepearte components, but
//       they could easily be merged into one.
export const ObservabilityRelatedCalledBy = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const { relatedEntities } = props;

	// @TODO change 2 to 10
	const relatedEntitiesSliced = relatedEntities.slice(0, 2);
	const relatedEntitiesForSearch = relatedEntities.slice(2);

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
			{expanded && !_isEmpty(relatedEntitiesSliced) && (
				<>
					{relatedEntitiesSliced.map(_ => {
						return (
							<ObservabilityRelatedEntity currentRepoId={props.currentRepoId} relatedEntity={_} />
						);
					})}
				</>
			)}
			{!_isEmpty(relatedEntitiesForSearch) && (
				<ObservabilityRelatedSearch
					currentRepoId={props.currentRepoId}
					searchItems={relatedEntitiesForSearch}
				/>
			)}
		</>
	);
});
