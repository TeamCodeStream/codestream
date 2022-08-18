import { forEach as _forEach } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import { useDidMount } from "../utilities/hooks";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { HostApi } from "..";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import styled from "styled-components";
import { PaneNodeName } from "../src/components/Pane";
import { GetMethodLevelTelemetryRequestType } from "@codestream/protocols/agent";

import { any } from "prop-types";
interface Props {
	relatedEntity: any;
	currentRepoId: string;
}

export const ObservabilityRelatedEntity = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<any | undefined>(undefined);
	const [goldenMetrics, setGoldenMetrics] = useState<any | undefined>(undefined);
	const { relatedEntity } = props;
	const alertSeverityColor = ALERT_SEVERITY_COLORS[relatedEntity?.alertSeverity];
	const EntityHealth = styled.div<{ backgroundColor: string }>`
		background-color: ${props => (props.backgroundColor ? props.backgroundColor : "white")};
		width: 10px;
		height: 10px;
		margin-right: 4px;
	`;
	// Related Entity object structure for quick reference:
	// alertSeverity: _entity.alertSeverity,
	// guid: _entity.guid,
	// name: _entity.name,
	// type: _.type

	useDidMount(() => {
		fetchGoldenMetrics(relatedEntity.guid, true);
	});

	const fetchGoldenMetrics = async (entityGuid?: string | null, noLoadingSpinner?: boolean) => {
		if (entityGuid) {
			if (!noLoadingSpinner) {
				setLoadingGoldenMetrics(true);
			}
			const response = await HostApi.instance.send(GetMethodLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: props.currentRepoId
			});
			if (response?.goldenMetrics) {
				setGoldenMetrics(response.goldenMetrics);
				// setNewRelicUrl(response.newRelicUrl);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	console.warn(expanded);
	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 50px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>
					{" "}
					<EntityHealth backgroundColor={alertSeverityColor} /> {relatedEntity?.name}
				</span>
			</Row>
			{expanded && (
				<>
					<Row
						style={{
							padding: "2px 10px 2px 60px"
						}}
						className={"pr-row"}
					>
						Golden Signal 1
					</Row>
					<Row
						style={{
							padding: "2px 10px 2px 60px"
						}}
						className={"pr-row"}
					>
						Golden Signal 2
					</Row>
					<Row
						style={{
							padding: "2px 10px 2px 60px"
						}}
						className={"pr-row"}
					>
						Golden Signal 3
					</Row>
				</>
			)}
		</>
	);
});
