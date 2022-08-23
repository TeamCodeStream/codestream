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
import { ErrorRow } from "./Observability";

interface Props {
	relatedEntities: any;
	currentRepoId: string;
	loadingRelatedEntities: boolean;
}

export const ObservabilityRelatedCalls = React.memo((props: Props) => {
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
