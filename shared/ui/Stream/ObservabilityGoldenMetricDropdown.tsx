import { EntityGoldenMetrics, GetIssuesResponse } from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash-es";
import React from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import { ObservabilityLoadingGoldenMetrics } from "@codestream/webview/Stream/ObservabilityLoading";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
import { setUserPreference } from "./actions";
import { HostApi } from "../webview-api";
import { OpenUrlRequestType } from "../ipc/host.protocol";

interface Props {
	entityGoldenMetrics: EntityGoldenMetrics | undefined;
	errors: string[];
	loadingGoldenMetrics: boolean;
	noDropdown?: boolean;
	recentIssues?: GetIssuesResponse;
	entityGuid: string;
	accountId?: number;
}

export const ObservabilityGoldenMetricDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const goldenMetricsDropdownIsExpanded = preferences?.goldenMetricsDropdownIsExpanded ?? true;

		return {
			goldenMetricsDropdownIsExpanded,
		};
	});

	const { errors, entityGuid, accountId, entityGoldenMetrics, loadingGoldenMetrics, noDropdown } =
		props;

	const pillsData = entityGoldenMetrics?.pillsData;

	function getErrorPillsJSX(displayValue, displayUnits) {
		return (
			<>
				<span style={{ opacity: 1, color: "var(--text-color)" }}>
					<>
						{displayValue}
						{displayUnits && <>{displayUnits} </>}
					</>

					{pillsData?.errorRateData?.percentChange && pillsData.errorRateData.percentChange >= 0 ? (
						<span
							style={
								pillsData.errorRateData.percentChange >= 0 &&
								pillsData.errorRateData.percentChange <= 5
									? { color: "#FFD23D" }
									: pillsData.errorRateData.percentChange > 5
									? { color: "#DF2D24" }
									: {}
							}
						>
							<>
								{pillsData.errorRateData.percentChange === 0 ? (
									<>(+{"<"}1%)</>
								) : (
									<>(+{pillsData.errorRateData.percentChange}%)</>
								)}
							</>
						</span>
					) : (
						<></>
					)}
				</span>
				{pillsData?.errorRateData?.percentChange ? <>{getGlobeIcon()}</> : <></>}
			</>
		);
	}

	function getResponseTimePillsJSX(displayValue, displayUnits) {
		return (
			<>
				<span style={{ opacity: 1, color: "var(--text-color)" }}>
					<>
						{displayValue}
						{displayUnits && <>{displayUnits} </>}
					</>

					{pillsData?.responseTimeData?.percentChange &&
					pillsData.responseTimeData.percentChange >= 0 ? (
						<span
							style={
								pillsData.responseTimeData.percentChange >= 0 &&
								pillsData.responseTimeData.percentChange <= 5
									? { color: "#FFD23D" }
									: pillsData?.responseTimeData?.percentChange > 5
									? { color: "#DF2D24" }
									: {}
							}
						>
							<>
								{pillsData.responseTimeData.percentChange === 0 ? (
									<>(+{"<"}1%)</>
								) : (
									<>(+{pillsData.responseTimeData.percentChange}%)</>
								)}
							</>
						</span>
					) : (
						<></>
					)}
				</span>
				{pillsData?.responseTimeData?.percentChange ? <>{getGlobeIcon()}</> : <></>}
			</>
		);
	}

	function getGlobeIcon() {
		return (
			<Icon
				name="globe"
				className="clickable"
				title="View on New Relic"
				placement="bottomLeft"
				delay={1}
				style={{ padding: "5px 0 0 0" }}
				onClick={e => {
					e.preventDefault();
					e.stopPropagation();
					HostApi.instance.track("codestream/link_to_newrelic clicked", {
						entity_guid: entityGuid,
						account_id: accountId,
						meta_data: "destination: change_tracking",
						meta_data_2: `codestream_section: golden_metrics`,
						event_type: "click",
					});
					HostApi.instance.send(OpenUrlRequestType, {
						url:
							pillsData?.responseTimeData?.permalinkUrl ||
							pillsData?.errorRateData?.permalinkUrl ||
							"",
					});
				}}
			/>
		);
	}

	const errorTitle: string | undefined =
		errors.length === 0 ? undefined : `Last request failed:\n${errors.join("\n")}`;

	const goldenMetricOutput = () => {
		return (
			<>
				{entityGoldenMetrics?.metrics.map(gm => {
					return (
						<Row
							className={"pr-row no-shrink"}
							style={{
								padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 42px",
							}}
						>
							<div data-testid={`${gm.name}-${entityGuid}`}>
								<Tooltip placement="topRight" title={gm.title} delay={1}>
									<span style={{ marginRight: "5px" }}>{gm.title}</span>
								</Tooltip>
							</div>

							<span className={"icons"}>
								{gm.value || gm.value === 0 ? (
									<>
										{gm.name === "errorRate" ? (
											<> {getErrorPillsJSX(gm.displayValue, gm.displayUnit)}</>
										) : gm.name === "responseTimeMs" ? (
											<> {getResponseTimePillsJSX(gm.displayValue, gm.displayUnit)}</>
										) : (
											<>
												{gm.displayValue} {gm.displayUnit && <>{gm.displayUnit}</>}
											</>
										)}
									</>
								) : (
									<>No Data</>
								)}
							</span>
						</Row>
					);
				})}
			</>
		);
	};

	const handleRowOnClick = () => {
		const { goldenMetricsDropdownIsExpanded } = derivedState;

		dispatch(
			setUserPreference({
				prefPath: ["goldenMetricsDropdownIsExpanded"],
				value: !goldenMetricsDropdownIsExpanded,
			})
		);
	};

	return (
		<>
			{!noDropdown && (
				<>
					<Row
						style={{
							padding: "2px 10px 2px 30px",
						}}
						className={"pr-row"}
						onClick={() => handleRowOnClick()}
						data-testid={`golden-metrics-dropdown`}
					>
						{derivedState.goldenMetricsDropdownIsExpanded && <Icon name="chevron-down-thin" />}
						{!derivedState.goldenMetricsDropdownIsExpanded && <Icon name="chevron-right-thin" />}
						<span data-testid={`golden-metrics-${entityGuid}`} style={{ margin: "0 5px 0 2px" }}>
							Golden Metrics
						</span>
						{entityGoldenMetrics?.lastUpdated && (
							<Icon
								style={{ transform: "scale(0.8)" }}
								name="clock"
								className="clickable"
								placement="bottom"
								title={
									`Since ${entityGoldenMetrics.since} ago. Updated at ` +
									entityGoldenMetrics.lastUpdated
								}
								delay={1}
							/>
						)}
						{errorTitle && (
							<Icon
								style={{ transform: "scale(0.8)" }}
								name="alert"
								className="clickable"
								placement="bottom"
								title={errorTitle}
								delay={1}
							/>
						)}
					</Row>
				</>
			)}

			{derivedState.goldenMetricsDropdownIsExpanded && loadingGoldenMetrics && (
				<ObservabilityLoadingGoldenMetrics />
			)}
			{(noDropdown || derivedState.goldenMetricsDropdownIsExpanded) &&
				!loadingGoldenMetrics &&
				!_isEmpty(entityGoldenMetrics?.metrics) && <>{goldenMetricOutput()}</>}
		</>
	);
});
