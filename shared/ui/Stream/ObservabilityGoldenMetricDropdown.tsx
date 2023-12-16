import { EntityGoldenMetrics, GetIssuesResponse } from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
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
}

export const ObservabilityGoldenMetricDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const [isPillsErrorHover, setPillsErrorHover] = useState<boolean>(false);
	const [isPillsResponseTimeHover, setPillsResponseTimeHover] = useState<boolean>(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const goldenMetricsDropdownIsExpanded = preferences?.goldenMetricsDropdownIsExpanded ?? true;

		return {
			goldenMetricsDropdownIsExpanded,
		};
	});

	const { errors, entityGuid, entityGoldenMetrics, loadingGoldenMetrics, noDropdown } = props;

	const pillsData = entityGoldenMetrics?.pillsData;

	function getErrorPillsJSX() {
		if (pillsData?.errorRateData) {
			return (
				<span
					onMouseLeave={e => {
						setPillsErrorHover(false);
					}}
					onMouseEnter={e => {
						setPillsErrorHover(true);
					}}
					style={{ color: pillsData.errorRateData.color }}
				>
					{isPillsErrorHover ? (
						<>{getGlobeIcon()} </>
					) : (
						<>(+{pillsData.errorRateData.percentChange}%)</>
					)}
				</span>
			);
		}
		return undefined;
	}

	function getResponseTimePillsJSX() {
		if (pillsData?.responseTimeData) {
			return (
				<span
					onMouseLeave={e => {
						setPillsResponseTimeHover(false);
					}}
					onMouseEnter={e => {
						setPillsResponseTimeHover(true);
					}}
					style={{ color: pillsData.responseTimeData.color }}
				>
					{isPillsResponseTimeHover ? (
						<>{getGlobeIcon()} </>
					) : (
						<>(+{pillsData.responseTimeData.percentChange}%)</>
					)}
				</span>
			);
		}
		return undefined;
	}

	function getGlobeIcon() {
		if (pillsData) {
			return (
				<Icon
					name="globe"
					className="clickable"
					title="View on New Relic"
					placement="bottomLeft"
					delay={1}
					onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						HostApi.instance.send(OpenUrlRequestType, {
							url:
								(pillsData.responseTimeData && pillsData.responseTimeData.permalinkUrl) ||
								(pillsData.errorRateData && pillsData.errorRateData.permalinkUrl) ||
								"",
						});
					}}
				/>
			);
		}
		return undefined;
	}

	const errorTitle: string | undefined =
		errors.length === 0 ? undefined : `Last request failed:\n${errors.join("\n")}`;

	const goldenMetricOutput = () => {
		return (
			<>
				{entityGoldenMetrics?.metrics.map(gm => {
					return (
						<Row
							style={{
								padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 42px",
							}}
							className={"pr-row no-shrink"}
						>
							<div data-testid={`${gm.name}-${entityGuid}`}>
								<Tooltip placement="topRight" title={gm.title} delay={1}>
									<span style={{ marginRight: "5px" }}>{gm.title}</span>
								</Tooltip>
							</div>

							<div className="icons">
								<span className={"details"}>
									{gm.value || gm.value === 0 ? (
										<>
											{gm.displayValue}{" "}
											{gm.displayUnit &&
											gm.name !== "throughput" &&
											(!isPillsErrorHover || !isPillsResponseTimeHover) ? (
												<>{gm.displayUnit}</>
											) : (
												gm.displayUnit && <>{gm.displayUnit}</>
											)}
											{pillsData?.errorRateData &&
												pillsData.errorRateData.isDisplayErrorChange &&
												gm.name === "errorRate" && <> {getErrorPillsJSX()}</>}
											{pillsData?.responseTimeData &&
												pillsData.responseTimeData.isDisplayTimeResponseChange &&
												gm.name === "responseTimeMs" && <> {getResponseTimePillsJSX()}</>}
										</>
									) : (
										<>No Data</>
									)}
								</span>
							</div>
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
						{}
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
