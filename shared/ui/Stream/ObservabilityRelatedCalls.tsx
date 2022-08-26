import { forEach as _forEach, isEmpty as _isEmpty, sortBy as _sortBy } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedSearch } from "./ObservabilityRelatedSearch";
import { ObservabilityRelatedEntity } from "./ObservabilityRelatedEntity";
import { ErrorRow } from "./Observability";
import { RelatedEntitiesByType } from "@codestream/protocols/agent";
import { ALERT_SEVERITY_SORTING_ORDER } from "./CodeError/index";
import { mapOrder } from "../utils";
import { logError } from "../logger";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { useRequestType } from "../utilities/hooks";

interface Props {
	currentRepoId: string;
	entityGuid: string;
}

export const ObservabilityRelatedCalls = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);

	const { loading, data, error } = useRequestType(GetNewRelicRelatedEntitiesRequestType, {
		entityGuid: props.entityGuid,
		direction: "OUTBOUND"
	});

	if (error) {
		const errorMessage = typeof error === "string";
		logError(`Unexpected error during related entities fetch: ${errorMessage}`, {
			currentRepoId: props.currentRepoId,
			entityGuid: props.entityGuid
		});
	}

	const relatedEntitiesSliced: any = data?.slice(0, 10);
	const relatedEntitiesSlicedSorted = mapOrder(
		relatedEntitiesSliced,
		ALERT_SEVERITY_SORTING_ORDER,
		"alertSeverity"
	);
	const relatedEntitiesForSearch = data?.slice(10);

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
			{expanded && !_isEmpty(relatedEntitiesSlicedSorted) && (
				<>
					{relatedEntitiesSlicedSorted.map(_ => {
						return (
							<ObservabilityRelatedEntity currentRepoId={props.currentRepoId} relatedEntity={_} />
						);
					})}
				</>
			)}
			{!loading && expanded && _isEmpty(relatedEntitiesSlicedSorted) && (
				<ErrorRow customPadding={"0 10px 0 50px"} title={"No related services"}></ErrorRow>
			)}
			{!loading && expanded && !_isEmpty(relatedEntitiesForSearch) && (
				<ObservabilityRelatedSearch
					currentRepoId={props.currentRepoId}
					searchItems={relatedEntitiesForSearch}
				/>
			)}
			{loading && expanded && (
				<Row
					style={{
						padding: "0 10px 0 60px"
					}}
					className={"pr-row"}
				>
					<Icon
						style={{
							marginRight: "5px"
						}}
						className="spin"
						name="sync"
					/>{" "}
					Loading...
				</Row>
			)}
		</>
	);
});
