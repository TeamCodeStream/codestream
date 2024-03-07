import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip as ReTooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	CriticalPathSpan,
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryResponse,
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	MethodGoldenMetricsResult,
	ObservabilityAnomaly,
	ObservabilityError,
	WarningOrError,
} from "@codestream/protocols/agent";
import styled from "styled-components";
import { DelayedRender } from "@codestream/webview/Container/DelayedRender";
import { OpenUrlRequestType } from "@codestream/webview/ipc/host.protocol";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { CodeStreamState } from "@codestream/webview/store";
import { setCurrentObservabilityAnomaly } from "@codestream/webview/store/context/actions";
import { useDidMount, usePrevious } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { closePanel } from "../actions";
import CancelButton from "../CancelButton";
import { WarningBox } from "../WarningBox";
import { MetaLabel } from "../Codemark/BaseCodemark";
import Icon from "../Icon";
import { PanelHeader } from "../../src/components/PanelHeader";
import { ErrorRow } from "../Observability";
import { openErrorGroup } from "@codestream/webview/store/codeErrors/thunks";
import { CLMSettings } from "@codestream/protocols/api";
import { Link } from "../Link";
import { isEmpty as _isEmpty } from "lodash-es";

const Root = styled.div``;

const ApmServiceTitle = styled.span`
	opacity: 0.5;
	a {
		color: var(--text-color-highlight);
		text-decoration: none;
	}
	.open-external {
		margin-left: 5px;
		font-size: 12px;
		visibility: hidden;
		color: var(--text-color-highlight);
	}
	& .open-external {
		visibility: visible;
	}
`;

const EntityDropdownContainer = styled.div`
	margin: 0 0 4px 0;
`;

const DataRow = styled.div`
	display: flex;
	align-items: flex-start;
	width: 85%;
`;
const DataLabel = styled.div`
	margin-right: 5px;
`;
const DataValue = styled.div`
	color: var(--text-color-subtle);
	word-wrap: break-word;
	width: 92%;
`;

const CriticalPathSpanWrapper = styled.div`
	display: flex;
	align-items: baseline;
`;

const CriticalPathSpanMiddleSection = styled.span`
	overflow: hidden;
	height: inherit;
	flex: 0 1 auto;
	white-space: nowrap;
	direction: rtl;
	text-overflow: ellipsis;
	text-overflow: "...";
	min-width: 14px;
`;

const computedStyle = getComputedStyle(document.body);
const colorSubtle = computedStyle.getPropertyValue("--text-color-subtle").trim();
const colorPrimary = computedStyle.getPropertyValue("--text-color").trim();
const colorLine = "#8884d8";

const EMPTY_ARRAY = [];
export const ObservabilityAnomalyPanel = () => {
	const dispatch = useDispatch<any>();

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			showGoldenSignalsInEditor: state?.configs.showGoldenSignalsInEditor,
			currentObservabilityAnomaly: (state.context.currentObservabilityAnomaly ||
				{}) as ObservabilityAnomaly,
			currentObservabilityAnomalyEntityGuid:
				state.context.currentObservabilityAnomalyEntityGuid || "",
			currentObservabilityAnomalyEntityName:
				state.context.currentObservabilityAnomalyEntityName || "",
			observabilityRepoEntities:
				(state.users[state.session.userId!].preferences || {}).observabilityRepoEntities ||
				EMPTY_ARRAY,
			clmSettings: (state.preferences.clmSettings || {}) as CLMSettings,
			sessionStart: state.context.sessionStart,
			isProductionCloud: state.configs.isProductionCloud,
		};
	});

	const [telemetryResponse, setTelemetryResponse] = useState<
		GetMethodLevelTelemetryResponse | undefined
	>(undefined);
	const [remappedDeployments, setRemappedDeployments] = useState({});
	const [loading, setLoading] = useState<boolean>(true);
	const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);
	const previousCurrentObservabilityAnomaly = usePrevious(derivedState.currentObservabilityAnomaly);
	const [showGoldenSignalsInEditor, setshowGoldenSignalsInEditor] = useState<boolean>(
		derivedState.showGoldenSignalsInEditor || false
	);
	const [titleHovered, setTitleHovered] = useState<boolean>(false);

	const loadData = async (newRelicEntityGuid: string) => {
		setLoading(true);
		try {
			const anomaly = derivedState.currentObservabilityAnomaly;
			const isPlural = anomaly.totalDays > 1 ? "s" : "";
			const since = `${anomaly.totalDays} day${isPlural} ago`;
			const response = await HostApi.instance.send(GetMethodLevelTelemetryRequestType, {
				newRelicEntityGuid: newRelicEntityGuid,
				metricTimesliceNameMapping: {
					source: "metric",
					duration: anomaly.metricTimesliceName,
					errorRate: anomaly.errorMetricTimesliceName,
					sampleSize: anomaly.metricTimesliceName,
				},
				scope: anomaly.scope,
				since,
				includeDeployments: true,
				includeErrors: true,
				timeseriesGroup: "1 day",
			});

			response.goldenMetrics?.forEach(gm => {
				gm.result.forEach(r => {
					if (r.endTimeSeconds) {
						const midnight = new Date(r.endTimeSeconds * 1000);
						midnight.setHours(0, 0, 0, 0);
						r.endTimeSeconds = Math.ceil(midnight.getTime() / 1000);
					}
				});
			});

			const deploymentsObject = {};
			response.deployments?.forEach(item => {
				const { seconds, version } = item;

				const midnight = new Date(seconds * 1000);
				midnight.setHours(0, 0, 0, 0);
				const midnightSeconds = Math.ceil(midnight.getTime() / 1000);

				if (version !== "") {
					if (!deploymentsObject[midnightSeconds]) {
						deploymentsObject[midnightSeconds] = [version];
					} else {
						deploymentsObject[midnightSeconds].push(version);
					}
				}
			});

			if (!response.deployments || !response.deployments.length) {
				const date = new Date();
				date.setHours(0, 0, 0, 0);
				const nDaysAgo = derivedState?.clmSettings?.compareDataLastValue;
				date.setDate(date.getDate() - parseInt(nDaysAgo as string));
				const isPlural = parseInt(nDaysAgo as string) > 1 ? "s" : "";

				deploymentsObject[Math.floor(date.getTime() / 1000)] = [`${nDaysAgo} day${isPlural} ago`];
			}

			setRemappedDeployments(deploymentsObject);
			setTelemetryResponse(response);
		} catch (ex) {
			setWarningOrErrors([{ message: ex.toString() }]);
		} finally {
			setLoading(false);
		}
	};

	useDidMount(() => {
		loadData(derivedState.currentObservabilityAnomalyEntityGuid);
	});

	useEffect(() => {
		if (
			!previousCurrentObservabilityAnomaly ||
			JSON.stringify(previousCurrentObservabilityAnomaly) ===
				JSON.stringify(derivedState.currentObservabilityAnomaly)
		) {
			return;
		}

		loadData(derivedState.currentObservabilityAnomalyEntityGuid);
	}, [derivedState.currentObservabilityAnomaly]);

	const renderTitle = () => {
		if (!derivedState.currentObservabilityAnomaly.scope) {
			//@TODO - put this href construction logic in the agent
			const baseUrl = derivedState.isProductionCloud
				? "https://one.newrelic.com/nr1-core/apm-features/transactions/"
				: "https://staging-one.newrelic.com/nr1-core/apm-features/transactions/";

			const href = `${baseUrl}${derivedState.currentObservabilityAnomalyEntityGuid}`;

			return (
				<Link
					style={{ color: "inherit", textDecoration: "none" }}
					onClick={e => {
						e.preventDefault();
						HostApi.instance.track("codestream/link_to_newrelic clicked", {
							entity_guid: derivedState.currentObservabilityAnomalyEntityGuid,
							meta_data: "destination: transactions",
							meta_data_2: `codestream_section: transactions`,
							event_type: "click",
						});
						HostApi.instance.send(OpenUrlRequestType, {
							url: href,
						});
					}}
				>
					<span style={{ marginRight: "6px" }}>
						{derivedState.currentObservabilityAnomaly.name}
					</span>
					{titleHovered && <Icon title="Open on New Relic" delay={1} name="link-external" />}
				</Link>
			);
		}

		return (
			<span data-testid={`anomaly-title`}>{derivedState.currentObservabilityAnomaly.name}</span>
		);
	};

	const goldenMetricAvgDuration = telemetryResponse?.goldenMetrics?.find(
		_ => _.name === "responseTimeMs"
	);
	const goldenMetricErrorRate = telemetryResponse?.goldenMetrics?.find(
		_ => _.name === "errorsPerMinute"
	);
	const goldenMetricSampleRate = telemetryResponse?.goldenMetrics?.find(
		_ => _.name === "samplesPerMinute"
	);
	const { chartHeaderTexts } = derivedState.currentObservabilityAnomaly;
	const avgDurationTitle = goldenMetricAvgDuration?.title || "";
	const errorRateTitle = goldenMetricErrorRate?.title || "";
	const avgDurationHeaderText =
		chartHeaderTexts[avgDurationTitle] != null
			? "Average duration " + chartHeaderTexts[avgDurationTitle]
			: null;
	const errorRateHeaderText =
		chartHeaderTexts[errorRateTitle] != null
			? "Errors rate " + chartHeaderTexts[errorRateTitle]
			: null;
	const isAvgDurationAnomaly = avgDurationHeaderText != null;

	return (
		<Root className="full-height-codemark-form">
			{!loading && (
				<div
					onMouseEnter={() => {
						setTitleHovered(true);
					}}
					onMouseLeave={() => {
						setTitleHovered(false);
					}}
					style={{
						width: "100%",
						wordBreak: "break-word",
					}}
				>
					<PanelHeader title={renderTitle()}></PanelHeader>
				</div>
			)}
			<CancelButton
				onClick={() => {
					dispatch(setCurrentObservabilityAnomaly());
					dispatch(closePanel());
				}}
			/>

			<div className="plane-container" style={{ padding: "5px 20px 0px 10px" }}>
				<div className="standard-form vscroll">
					{warningOrErrors ? (
						<WarningBox items={warningOrErrors} />
					) : (
						<>
							{loading ? (
								<>
									<DelayedRender>
										<div style={{ display: "flex", alignItems: "center" }}>
											<LoadingMessage>Loading Telemetry...</LoadingMessage>
										</div>
									</DelayedRender>
								</>
							) : (
								<div>
									<div
										data-testid={`anomaly-transaction-redcolor-index-0`}
										style={{ color: "red" }}
									>
										{avgDurationHeaderText || errorRateHeaderText}
									</div>
									<br />
									{derivedState.currentObservabilityAnomaly.scope && (
										<DataRow>
											<DataLabel>Transaction:</DataLabel>
											<DataValue>{derivedState.currentObservabilityAnomaly.scope}</DataValue>
										</DataRow>
									)}
									{derivedState.currentObservabilityAnomalyEntityName && (
										<DataRow>
											<DataLabel>Service:</DataLabel>
											<DataValue data-testid={`service-label`}>
												{derivedState.currentObservabilityAnomalyEntityName}
											</DataValue>
										</DataRow>
									)}
									<br />

									{isAvgDurationAnomaly ? (
										<>
											<AvgDuration
												criticalPath={telemetryResponse?.criticalPath}
												sessionStart={derivedState.sessionStart}
												goldenMetricAvgDuration={goldenMetricAvgDuration}
												remappedDeployments={remappedDeployments}
												index={0}
											/>
											<ErrorRate
												errors={telemetryResponse?.errors}
												sessionStart={derivedState.sessionStart}
												goldenMetricErrorRate={goldenMetricErrorRate}
												remappedDeployments={remappedDeployments}
												index={1}
											/>
										</>
									) : (
										<>
											<ErrorRate
												errors={telemetryResponse?.errors}
												sessionStart={derivedState.sessionStart}
												goldenMetricErrorRate={goldenMetricErrorRate}
												remappedDeployments={remappedDeployments}
												index={0}
											/>
											<AvgDuration
												criticalPath={telemetryResponse?.criticalPath}
												sessionStart={derivedState.sessionStart}
												goldenMetricAvgDuration={goldenMetricAvgDuration}
												remappedDeployments={remappedDeployments}
												index={1}
											/>
										</>
									)}

									{goldenMetricSampleRate != null && (
										<AnomalyChart
											title={goldenMetricSampleRate.title}
											result={goldenMetricSampleRate.result}
											index={2}
											remappedDeployments={remappedDeployments}
										/>
									)}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</Root>
	);
};

interface CustomTooltipProps {
	active?: boolean;
	payload?: any[];
	label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
	const computedStyle = getComputedStyle(document.body);
	const colorSubtle = computedStyle.getPropertyValue("--text-color-subtle").trim();
	const colorBackgroundHover = computedStyle
		.getPropertyValue("--app-background-color-hover")
		.trim();

	if (active && payload && payload.length && label) {
		const dataValue = payload[0].value;
		const dataTime = payload[0].payload.endTimeSeconds;
		const date = new Date(dataTime * 1000); // Convert to milliseconds
		const humanReadableDate = date.toLocaleDateString();

		return (
			<div
				style={{
					zIndex: 9999,
					padding: "5px",
					border: `${colorSubtle} solid 1px`,
					background: colorBackgroundHover,
				}}
			>
				<div>{humanReadableDate}</div>
				<div style={{ marginTop: "3px" }}>{dataValue}</div>
			</div>
		);
	}
	return null;
};

// The label property in recharts must be wrapped in a <g> tag.
// To get the correct location, we have to take the  viewBox x and y coords
// and modfiy them for a transform property.
const renderCustomLabel = ({ viewBox: { x, y } }, title) => {
	const d = 20;
	const r = d / 2;

	const transform = `translate(${x - r} ${y - d - 5})`;
	return (
		<g transform={transform}>
			<foreignObject x={0} y={0} width={100} height={100}>
				<Icon
					style={{ paddingLeft: "4px" }}
					name="info"
					className="circled"
					title={title}
					placement="top"
				/>
			</foreignObject>
		</g>
	);
};

interface AnomalyChartProps {
	title?: string;
	result: MethodGoldenMetricsResult[];
	index: number;
	remappedDeployments: Object;
}

const AnomalyChart = (props: AnomalyChartProps) => {
	const yValues = props.result.map(o => o[props.title as any]);
	const sanitizedYValues = (yValues as (number | undefined)[]).map(_ => (_ != undefined ? _ : 0));
	const maxY = Math.max(...sanitizedYValues);
	return (
		<>
			<div key={"chart-" + props.index} style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<MetaLabel data-testid={`anomaly-transaction-title-index-${props.index}`}>
					{props.title}
				</MetaLabel>
				<ResponsiveContainer width="100%" height={300} debounce={1}>
					<LineChart
						width={500}
						height={300}
						data={props.result}
						margin={{
							top: 25,
							right: 0,
							left: 0,
							bottom: 5,
						}}
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="endTimeSeconds"
							tick={{ fontSize: 12 }}
							tickFormatter={label => new Date(label * 1000).toLocaleDateString()}
						/>
						<YAxis tick={{ fontSize: 12 }} domain={[0, maxY]} />
						<ReTooltip
							content={<CustomTooltip />}
							contentStyle={{ color: colorLine, textAlign: "center" }}
						/>
						<Line
							type="monotone"
							dataKey={props.title}
							stroke={colorLine}
							activeDot={{ r: 8 }}
							connectNulls={true}
							name={props.title}
							dot={{ style: { fill: colorLine } }}
						/>
						{Object.entries(props.remappedDeployments).map(([key, value]: [string, any]) => {
							return (
								<ReferenceLine
									x={parseInt(key)}
									stroke={value?.length ? colorPrimary : colorSubtle}
									label={e => renderCustomLabel(e, value.join(", "))}
								/>
							);
						})}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</>
	);
};

interface CriticalPathProps {
	criticalPath: CriticalPathSpan[];
}

const CriticalPath = props => {
	const CriticalPathRoot = styled.div`
		margin-bottom: "30px";
	`;

	const FlexContainer = styled.div`
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		position: relative;
	`;

	const Duration = styled.div`
		white-space: nowrap;
		position: absolute;
		top: 0;
		right: 0;
		transform: translate(0%, 0);
		z-index: 1;
		background: var(--app-background-color);
		padding-left: 2px;
	`;

	const Container = styled.div`
		position: relative;
	`;
	const SpanName = styled.div`
		color: var(--text-color-subtle);
		word-wrap: break-word;
		width: 75%;
	`;

	return (
		<CriticalPathRoot>
			<MetaLabel>Slowest operations</MetaLabel>
			<DataValue style={{ marginBottom: "10px" }}>
				Based on a sample of slowest transactions for the last 30 minutes.
			</DataValue>
			{props.criticalPath.map((span, index) => {
				return (
					<Container key={index}>
						<FlexContainer>
							<SpanName>{formatCriticalPathSpan(span.name)}</SpanName>
							<Duration>{span.duration.toFixed(2)} ms</Duration>
						</FlexContainer>
					</Container>
				);
			})}
		</CriticalPathRoot>
	);
};
interface ErrorsProps {
	errors: ObservabilityError[];
	sessionStart: number | undefined;
}

const Errors = (props: ErrorsProps) => {
	const dispatch = useDispatch<any>();
	const [isLoadingErrorGroupGuid, setIsLoadingErrorGroupGuid] = useState("");

	return (
		<div style={{ marginBottom: "30px" }}>
			<MetaLabel>Errors</MetaLabel>
			<br />
			<div>
				{props.errors.map((_, index) => {
					const indexedErrorGroupGuid = `${_.errorGroupGuid}_${index}`;
					return (
						<ErrorRow
							key={`observability-error-${index}`}
							title={_.errorClass}
							tooltip={_.message}
							subtle={_.message}
							alternateSubtleRight={`${_.count}`} // we want to show count instead of timestamp
							url={_.errorGroupUrl}
							customPadding={"0"}
							isLoading={isLoadingErrorGroupGuid === indexedErrorGroupGuid}
							onClick={async e => {
								try {
									setIsLoadingErrorGroupGuid(indexedErrorGroupGuid);
									const response = (await HostApi.instance.send(
										GetObservabilityErrorGroupMetadataRequestType,
										{ errorGroupGuid: _.errorGroupGuid }
									)) as GetObservabilityErrorGroupMetadataResponse;
									dispatch(
										openErrorGroup(_.errorGroupGuid, _.occurrenceId, {
											multipleRepos: response?.relatedRepos?.length > 1,
											relatedRepos: response?.relatedRepos || undefined,
											timestamp: _.lastOccurrence,
											sessionStart: props.sessionStart,
											pendingEntityId: response?.entityId || _.entityId,
											occurrenceId: response?.occurrenceId || _.occurrenceId,
											pendingErrorGroupGuid: _.errorGroupGuid,
											openType: "CLM Details",
											remote: _?.remote || undefined,
											stackSourceMap: response?.stackSourceMap,
										})
									);
								} catch (ex) {
									console.error(ex);
								} finally {
									setIsLoadingErrorGroupGuid("");
								}
							}}
						/>
					);
				})}
			</div>
		</div>
	);
};

interface ErrorRateProps {
	errors?: ObservabilityError[];
	sessionStart?: number;
	goldenMetricErrorRate?: any;
	remappedDeployments: Object;
	index: number;
}

const ErrorRate = (props: ErrorRateProps) => {
	const hasErrors = props.errors && props.errors.length > 0;
	const hasResult =
		props.goldenMetricErrorRate != null &&
		props.goldenMetricErrorRate.result != null &&
		props.goldenMetricErrorRate.result.length > 0;
	return (
		<>
			{hasErrors && <Errors errors={props.errors!} sessionStart={props.sessionStart} />}
			{hasResult && (
				<AnomalyChart
					title={props.goldenMetricErrorRate.title}
					result={props.goldenMetricErrorRate.result}
					index={props.index}
					remappedDeployments={props.remappedDeployments}
				/>
			)}
		</>
	);
};

interface AvgDurationProps {
	criticalPath?: CriticalPathSpan[];
	sessionStart?: number;
	goldenMetricAvgDuration?: any;
	remappedDeployments: Object;
	index: number;
}

const AvgDuration = (props: AvgDurationProps) => {
	return (
		<>
			{props.criticalPath != null && props.criticalPath.length > 0 && (
				<CriticalPath criticalPath={props.criticalPath!} />
			)}
			{props.goldenMetricAvgDuration != null && (
				<AnomalyChart
					title={props.goldenMetricAvgDuration.title}
					result={props.goldenMetricAvgDuration.result}
					index={props.index}
					remappedDeployments={props.remappedDeployments}
				/>
			)}
		</>
	);
};

const formatCriticalPathSpan = (span: String) => {
	const sections = span.split("/");
	const first = sections[0];
	const middle = sections.slice(1, -1).join("/");
	const last = sections[sections.length - 1];

	return (
		<CriticalPathSpanWrapper>
			<span>
				{first}
				{!_isEmpty(middle) && <>/</>}
			</span>
			{!_isEmpty(middle) && <CriticalPathSpanMiddleSection>{middle}</CriticalPathSpanMiddleSection>}
			<span>/{last}</span>
		</CriticalPathSpanWrapper>
	);
};
