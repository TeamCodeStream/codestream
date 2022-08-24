import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedEntity } from "./ObservabilityRelatedEntity";
import { ObservabilityRelatedSearch } from "./ObservabilityRelatedSearch";
import { ErrorRow } from "./Observability";
import { RelatedEntitiesByType } from "@codestream/protocols/agent";
interface Props {
	relatedEntities: RelatedEntitiesByType;
	currentRepoId: string;
	loadingRelatedEntities: boolean;
}

// Note: This could potentially be depreciated and abstracted into ObservabilityRelatedCalls.tsx
// 		 At this point in time it feels like its worth to keep them sepearte components, but
//       they could easily be merged into one.
export const ObservabilityRelatedCalledBy = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const { relatedEntities, loadingRelatedEntities } = props;

	const relatedEntitiesSliced = relatedEntities?.slice(0, 10);
	const relatedEntitiesForSearch = relatedEntities?.slice(10);

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
			{!loadingRelatedEntities && expanded && _isEmpty(relatedEntitiesSliced) && (
				<ErrorRow customPadding={"0 10px 0 50px"} title={"No related services"}></ErrorRow>
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
