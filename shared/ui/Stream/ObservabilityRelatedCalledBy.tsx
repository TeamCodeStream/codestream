import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import { logError } from "../logger";
import { useRequestType } from "../utilities/hooks";
import { mapOrder } from "../utils";
import { ALERT_SEVERITY_SORTING_ORDER } from "./CodeError/index";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ErrorRow } from "./Observability";
import { ObservabilityRelatedEntity } from "./ObservabilityRelatedEntity";
import { ObservabilityRelatedSearch } from "./ObservabilityRelatedSearch";
import { ObservabilityLoadingRelatedServiceEntities } from "@codestream/webview/Stream/ObservabilityLoading";

interface Props {
	accountId: number;
	currentRepoId: string;
	entityGuid: string;
}

export const ObservabilityRelatedCalledBy = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const { loading, data, error } = useRequestType(GetNewRelicRelatedEntitiesRequestType, {
		entityGuid: props.entityGuid,
		direction: "INBOUND",
	});

	if (error) {
		const errorMessage = typeof error === "string";
		logError(`Unexpected error during related entities fetch: ${errorMessage}`, {
			currentRepoId: props.currentRepoId,
			entityGuid: props.entityGuid,
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
					padding: "2px 10px 2px 40px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Called By</span>
			</Row>
			{expanded && !_isEmpty(relatedEntitiesSlicedSorted) && (
				<>
					{relatedEntitiesSlicedSorted.map(_ => {
						return (
							<ObservabilityRelatedEntity
								accountId={props.accountId}
								currentRepoId={props.currentRepoId}
								relatedEntity={_}
							/>
						);
					})}
				</>
			)}
			{!loading && expanded && _isEmpty(relatedEntitiesSlicedSorted) && (
				<ErrorRow
					dataTestId={`no-related-services-called-by`}
					customPadding={"0 10px 0 50px"}
					title={"No related services"}
				></ErrorRow>
			)}
			{!loading && expanded && !_isEmpty(relatedEntitiesForSearch) && (
				<ObservabilityRelatedSearch
					currentRepoId={props.currentRepoId}
					searchItems={relatedEntitiesForSearch || []}
					entityGuid={props.entityGuid}
				/>
			)}
			{loading && expanded && <ObservabilityLoadingRelatedServiceEntities />}
		</>
	);
});
