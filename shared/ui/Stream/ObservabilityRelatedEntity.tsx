import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useEffect, useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import { HostApi } from "..";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import styled from "styled-components";
import { PaneNodeName } from "../src/components/Pane";
import {
	GetServiceLevelTelemetryRequestType,
	GetNewRelicUrlRequestType
} from "@codestream/protocols/agent";
import { useDidMount, useInterval } from "../utilities/hooks";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import cx from "classnames";

interface Props {
	relatedEntity: any;
	currentRepoId: string;
}

export const ObservabilityRelatedEntity = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(true);
	const [goldenMetrics, setGoldenMetrics] = useState<any | undefined>(undefined);
	const [newRelicUrl, setNewRelicUrl] = useState<any>("");

	const { relatedEntity } = props;
	const alertSeverityColor = ALERT_SEVERITY_COLORS[relatedEntity?.alertSeverity];

	const EntityHealth = styled.div<{ backgroundColor: string }>`
		background-color: ${props => (props.backgroundColor ? props.backgroundColor : "white")};
		width: 10px;
		height: 10px;
		display: inline-block;
		margin-right: 4px;
	`;

	const RowIcons = styled.div`
		text-align: right;
		// position: absolute;
		// right: 5px;
		// top: 2px;
		white-space: nowrap;
		margin-left: auto;
		display: "block";
		.icon {
			opacity: 0.7;
		}
		.icon-override-actions-visible {
			display: none;
		}
	`;

	useDidMount(() => {
		fetchNewRelicUrl(relatedEntity.guid);
	});

	useEffect(() => {
		if (expanded) {
			setLoadingGoldenMetrics(true);
			fetchGoldenMetrics(relatedEntity.guid);
		}
	}, [expanded]);

	useInterval(() => {
		if (expanded) {
			fetchGoldenMetrics(relatedEntity.guid);
		}
	}, 300000);

	const fetchNewRelicUrl = async (entityGuid?: string | null) => {
		if (entityGuid) {
			const response = await HostApi.instance.send(GetNewRelicUrlRequestType, {
				entityGuid
			});
			if (response) {
				setNewRelicUrl(response);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	const fetchGoldenMetrics = async (entityGuid?: string | null) => {
		if (entityGuid) {
			const response = await HostApi.instance.send(GetServiceLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: props.currentRepoId,
				skipRepoFetch: true
			});
			if (response?.goldenMetrics) {
				setGoldenMetrics(response.goldenMetrics);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	return (
		<>
			<PaneNodeName
				title={
					<div style={{ display: "flex", alignItems: "center" }}>
						<EntityHealth backgroundColor={alertSeverityColor} />
						<div>
							<span>{relatedEntity?.name}</span>
							<span className="subtle" style={{ fontSize: "11px", verticalAlign: "bottom" }}>
								{relatedEntity.accountName && relatedEntity.accountName.length > 25
									? relatedEntity.accountName.substr(0, 25) + "..."
									: relatedEntity.accountName}
								{relatedEntity?.domain ? ` (${relatedEntity?.domain})` : ""}
							</span>
						</div>
					</div>
				}
				labelIsFlex={true}
				collapsed={!expanded}
				showChildIconOnCollapse={true}
				actionsVisibleIfOpen={true}
				customPadding={`2px 10px 2px 50px`}
				onClick={() => setExpanded(!expanded)}
			>
				{newRelicUrl && (
					<Icon
						name="globe"
						className={cx("clickable", {
							"icon-override-actions-visible": true
						})}
						title="View on New Relic"
						placement="bottomLeft"
						delay={1}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.send(OpenUrlRequestType, {
								url: newRelicUrl
							});
						}}
					/>
				)}
			</PaneNodeName>

			{/*  
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
				<RowIcons>
					{newRelicUrl && (
						<Icon
							name="globe"
							className={cx("clickable", {
								"icon-override-actions-visible": true
							})}
							title="View on New Relic"
							placement="bottomLeft"
							delay={1}
							onClick={e => {
								e.preventDefault();
								e.stopPropagation();
								HostApi.instance.send(OpenUrlRequestType, {
									url: newRelicUrl
								});
							}}
						/>
					)}
				</RowIcons>
			</Row>

			*/}
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
