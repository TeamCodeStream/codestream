import {
	EntityGoldenMetrics,
	GetIssuesResponse,
	GetNewRelicUrlRequestType,
	GetServiceLevelTelemetryRequestType,
	isNRErrorResponse,
	RelatedEntityByType,
} from "@codestream/protocols/agent";
import cx from "classnames";
import React, { useEffect, useState } from "react";

import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
import { HostApi } from "@codestream/webview/webview-api";
import { PaneNodeName } from "../src/components/Pane";
import { useDidMount, useInterval } from "../utilities/hooks";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import Icon from "./Icon";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import { ObservabilityAlertViolations } from "./ObservabilityAlertViolations";

interface Props {
	accountId: number;
	relatedEntity: RelatedEntityByType;
	currentRepoId: string;
}

export const ObservabilityRelatedEntity = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(true);
	const [entityGoldenMetrics, setEntityGoldenMetrics] = useState<EntityGoldenMetrics>();
	const [entityGoldenMetricsErrors, setEntityGoldenMetricsErrors] = useState<Array<string>>([]);
	const [newRelicUrl, setNewRelicUrl] = useState<string>("");
	const [recentIssues, setRecentIssues] = useState<GetIssuesResponse | undefined>();

	const { relatedEntity, accountId } = props;
	const alertSeverityColor = ALERT_SEVERITY_COLORS[relatedEntity?.alertSeverity];

	useDidMount(() => {
		fetchNewRelicUrl(relatedEntity.guid);
	});

	useEffect(() => {
		if (expanded) {
			HostApi.instance.track("codestream/related_service clicked", {
				entity_guid: relatedEntity.guid,
				account_id: accountId,
				target: "related_service",
				event_type: "click",
			});
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
				entityGuid,
			});
			if (response) {
				setNewRelicUrl(response.newRelicUrl);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	const fetchGoldenMetrics = async (entityGuid?: string | null) => {
		if (entityGuid) {
			const response = await HostApi.instance.send(GetServiceLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: props.currentRepoId,
				skipRepoFetch: true,
				fetchRecentIssues: true,
			});

			const errors: string[] = [];

			if (isNRErrorResponse(response.entityGoldenMetrics)) {
				errors.push(
					response.entityGoldenMetrics.error.message ?? response.entityGoldenMetrics.error.type
				);
			} else {
				setEntityGoldenMetrics(response.entityGoldenMetrics);
			}

			if (isNRErrorResponse(response.recentIssues)) {
				errors.push(response.recentIssues.error.message ?? response.recentIssues.error.type);
			} else {
				setRecentIssues(response.recentIssues);
			}

			setEntityGoldenMetricsErrors(errors);

			setLoadingGoldenMetrics(false);
		}
	};

	return (
		<>
			<PaneNodeName
				title={
					<div style={{ display: "flex", alignItems: "center" }}>
						<HealthIcon color={alertSeverityColor} />
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
							"icon-override-actions-visible": true,
						})}
						title="View on New Relic"
						placement="bottomLeft"
						delay={1}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.track("codestream/link_to_newrelic clicked", {
								entity_guid: props.relatedEntity.guid,
								account_id: props.accountId,
								meta_data: "destination: apm_service_summary",
								meta_data_2: `codestream_section: related_services`,
								event_type: "click",
							});
							HostApi.instance.send(OpenUrlRequestType, {
								url: newRelicUrl,
							});
						}}
					/>
				)}
			</PaneNodeName>
			{expanded && (
				<>
					<ObservabilityAlertViolations
						issues={recentIssues?.recentIssues}
						customPadding={"2px 10px 2px 55px"}
						entityGuid={relatedEntity.guid}
					/>
					<ObservabilityGoldenMetricDropdown
						entityGoldenMetrics={entityGoldenMetrics}
						errors={entityGoldenMetricsErrors}
						loadingGoldenMetrics={loadingGoldenMetrics}
						noDropdown={true}
						entityGuid={relatedEntity.guid}
					/>
				</>
			)}
		</>
	);
});
