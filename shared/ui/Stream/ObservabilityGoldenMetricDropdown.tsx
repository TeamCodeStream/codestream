import { EntityGoldenMetrics } from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import { ObservabilityLoadingGoldenMetrics } from "@codestream/webview/Stream/ObservabilityLoading";
import { useAppSelector } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
import { HostApi } from "../webview-api";
import { OpenEditorViewNotificationType, OpenUrlRequestType } from "../ipc/host.protocol";
import { parseId } from "../utilities/newRelic";

interface Props {
	entityGoldenMetrics: EntityGoldenMetrics | undefined;
	errors: string[];
	loadingGoldenMetrics: boolean;
	noDropdown?: boolean;
	entityGuid: string;
	accountId?: number;
	isServiceSearch?: boolean;
}

export const ObservabilityGoldenMetricDropdown = React.memo((props: Props) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(props.isServiceSearch ? false : true);
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences, context, ide } = state;

		return {
			currentEntityGuid: context.currentEntityGuid,
			ideName: ide?.name,
			supportsExploreYourData: ide?.name === "VSC" || ide?.name === "JETBRAINS",
		};
	});

	const { errors, entityGuid, accountId, entityGoldenMetrics, loadingGoldenMetrics, noDropdown } =
		props;

	const pillsData = entityGoldenMetrics?.pillsData;

	const getTerminalIcon = (query: string) => {
		if (!query) return null;

		return (
			<Icon
				name="terminal"
				className="clickable"
				title="Explore this data"
				placement="bottomLeft"
				delay={1}
				onClick={e => {
					e.preventDefault();
					e.stopPropagation();

					HostApi.instance.notify(OpenEditorViewNotificationType, {
						panel: "nrql",
						title: "NRQL",
						entryPoint: "golden_metrics",
						query: query,
						accountId: parseId(derivedState.currentEntityGuid || "")?.accountId,
						entityGuid: derivedState.currentEntityGuid!,
						ide: {
							name: derivedState.ideName,
						},
					});
				}}
			/>
		);
	};

	const getGlobeIcon = () => {
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
					HostApi.instance.track("codestream/newrelic_link clicked", {
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
	};

	const errorTitle: string | undefined =
		errors.length === 0 ? undefined : `Last request failed:\n${errors.join("\n")}`;

	const goldenMetricOutput = () => {
		return (
			<>
				{entityGoldenMetrics?.metrics.map(gm => {
					const percentChange =
						gm.name === "errorRate"
							? pillsData?.errorRateData?.percentChange
							: gm.name === "responseTimeMs"
							? pillsData?.responseTimeData?.percentChange
							: undefined;
					return (
						<Row
							className={"pr-row no-shrink"}
							style={{
								padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 50px",
							}}
						>
							<div data-testid={`${gm.name}-${entityGuid}`}>
								<Tooltip placement="topRight" title={gm.title} delay={1}>
									<span style={{ marginRight: "5px" }}>{gm.title}</span>
								</Tooltip>
							</div>

							<span className={"icons"} style={{ display: "flex", alignItems: "center" }}>
								{gm.value || gm.value === 0 ? (
									<>
										<span style={{ opacity: 1, color: "var(--text-color)" }}>
											<>
												{gm.displayValue}
												{gm.displayUnit && <>{gm.displayUnit} </>}
											</>

											{percentChange && percentChange >= 0 ? (
												<span
													style={
														percentChange >= 0 && percentChange <= 5
															? { color: "#FFD23D" }
															: percentChange > 5
															? { color: "#DF2D24" }
															: {}
													}
												>
													<>{percentChange === 0 ? <>(+{"<"}1%)</> : <>(+{percentChange}%)</>}</>
												</span>
											) : (
												<></>
											)}
										</span>
										{derivedState.supportsExploreYourData
											? getTerminalIcon(gm.queries?.timeseries || "")
											: null}
										{/* only show the globe on hover if percent change is there*/}
										{percentChange ? <>{getGlobeIcon()}</> : <></>}
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
		setIsExpanded(!isExpanded);
	};

	return (
		<>
			{!noDropdown && (
				<>
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
						onClick={() => handleRowOnClick()}
						data-testid={`golden-metrics-dropdown`}
					>
						{isExpanded && <Icon name="chevron-down-thin" />}
						{!isExpanded && <Icon name="chevron-right-thin" />}
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

			{isExpanded && loadingGoldenMetrics && <ObservabilityLoadingGoldenMetrics />}
			{(noDropdown || isExpanded) &&
				!loadingGoldenMetrics &&
				!_isEmpty(entityGoldenMetrics?.metrics) && <>{goldenMetricOutput()}</>}
		</>
	);
});
