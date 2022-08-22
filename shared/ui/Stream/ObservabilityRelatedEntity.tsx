import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useEffect, useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import { useDidMount } from "../utilities/hooks";
import { GetNewRelicRelatedEntitiesRequestType } from "@codestream/protocols/agent";
import { HostApi } from "..";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import styled from "styled-components";
import { PaneNodeName } from "../src/components/Pane";
import { GetServiceLevelTelemetryRequestType } from "@codestream/protocols/agent";

import { any } from "prop-types";
interface Props {
	relatedEntity: any;
	currentRepoId: string;
}

export const ObservabilityRelatedEntity = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(true);
	const [goldenMetrics, setGoldenMetrics] = useState<any | undefined>(undefined);
	const { relatedEntity } = props;
	const alertSeverityColor = ALERT_SEVERITY_COLORS[relatedEntity?.alertSeverity];

	const EntityHealth = styled.div<{ backgroundColor: string }>`
		background-color: ${props => (props.backgroundColor ? props.backgroundColor : "white")};
		width: 10px;
		height: 10px;
		display: inline-block;
	`;

	useEffect(() => {
		if (expanded) {
			setLoadingGoldenMetrics(true);
			fetchGoldenMetrics(relatedEntity.guid);
		}
	}, [expanded]);

	const fetchGoldenMetrics = async (entityGuid?: string | null) => {
		if (entityGuid) {
			const response = await HostApi.instance.send(GetServiceLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: props.currentRepoId,
				skipRepoFetch: true
			});
			if (response?.goldenMetrics) {
				setGoldenMetrics(response.goldenMetrics);
				// setNewRelicUrl(response.newRelicUrl);
			}
			setLoadingGoldenMetrics(false);
		}
	};

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
					<span className="subtle" style={{ fontSize: "11px", verticalAlign: "bottom" }}>
						{relatedEntity.accountName && relatedEntity.accountName.length > 15
							? relatedEntity.accountName.substr(0, 15) + "..."
							: relatedEntity.accountName}
						{relatedEntity?.domain ? ` (${relatedEntity?.domain})` : ""}
					</span>
				</span>
			</Row>
			{expanded && (
				<>
					<ObservabilityGoldenMetricDropdown
						goldenMetrics={goldenMetrics}
						loadingGoldenMetrics={loadingGoldenMetrics}
						noDropdown={true}
					/>
				</>
			)}
		</>
	);
});
