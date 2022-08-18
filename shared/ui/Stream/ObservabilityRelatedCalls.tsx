import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { useDidMount } from "../utilities/hooks";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { HostApi } from "..";
import { ObservabilityRelatedSearch } from "./ObservabilityRelatedSearch";
import { ObservabilityRelatedEntity } from "./ObservabilityRelatedEntity";
import { any } from "prop-types";

interface Props {
	relatedEntities: any;
	currentRepoId: string;
}

export const ObservabilityRelatedCalls = React.memo((props: Props) => {
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
				<span style={{ marginLeft: "2px" }}>Calls</span>
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
				<ObservabilityRelatedSearch searchItems={relatedEntitiesForSearch} />
			)}
		</>
	);
});
