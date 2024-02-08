import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Range } from "vscode-languageserver-types";
import { CodeStreamState } from "../store";
import { PanelHeader } from "../src/components/PanelHeader";
import { CurrentTransactionSpan } from "../store/context/types";
import CancelButton from "./CancelButton";
import { closePanel, setCurrentTransactionSpan } from "../store/context/actions";
import { HostApi } from "../webview-api";
import {
	GetObservabilityErrorGroupMetadataRequestType,
	GetRepoFileFromAbsolutePathRequestType,
	GetSpanChartDataRequestType,
	GetSpanChartDataResponse,
	MatchReposRequestType,
	MatchReposResponse,
	NormalizeUrlRequestType,
	RelatedRepository,
	SpanHistogramData,
	SpanLineChartData,
} from "@codestream/protocols/agent";
import {
	EditorRevealSymbolRequestType,
	EditorSelectRangeRequestType,
} from "@codestream/protocols/webview";
import { MetaLabel } from "./Codemark/BaseCodemark";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip as ReTooltip,
	XAxis,
	YAxis,
} from "recharts";
import { DelayedRender } from "../Container/DelayedRender";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { useDidMount } from "../utilities/hooks";
import { CSRepository } from "@codestream/protocols/api";

const COLOR_LINE_1 = "#8884d8";
const COLOR_LINE_2 = "#7aa7d2";

interface CustomTooltipProps {
	active?: boolean;
	payload?: any[];
	label?: string;
}

const CustomLineChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
	const computedStyle = getComputedStyle(document.body);
	const colorSubtle = computedStyle.getPropertyValue("--text-color-subtle").trim();
	const colorBackgroundHover = computedStyle
		.getPropertyValue("--app-background-color-hover")
		.trim();

	if (active && payload && payload.length && label) {
		const thisHostValue = payload[0].payload.thisHost;
		const allHostsValue = payload[0].payload.allHosts;
		const dataTime = payload[0].payload.endTimeMs;
		const date = new Date(dataTime);
		const humanReadableDate = date.toLocaleString();

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
				{thisHostValue ? (
					<div style={{ marginTop: "3px", color: COLOR_LINE_1 }}>This host: {thisHostValue}</div>
				) : undefined}
				{allHostsValue ? (
					<div style={{ marginTop: "3px", color: COLOR_LINE_2 }}>All hosts: {allHostsValue}</div>
				) : undefined}
			</div>
		);
	}
	return null;
};

const CustomHistogramTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
	const computedStyle = getComputedStyle(document.body);
	const colorSubtle = computedStyle.getPropertyValue("--text-color-subtle").trim();
	const colorBackgroundHover = computedStyle
		.getPropertyValue("--app-background-color-hover")
		.trim();

	if (active && payload && payload.length && label) {
		const count = payload[0].value;
		const title = payload[0].payload.durationRange;

		return (
			<div
				style={{
					zIndex: 9999,
					padding: "5px",
					border: `${colorSubtle} solid 1px`,
					background: colorBackgroundHover,
				}}
			>
				<div style={{ marginTop: "3px" }}>
					{count} values from {title}
				</div>
			</div>
		);
	}
	return null;
};

export interface SpanLineChartProps {
	data: SpanLineChartData;
	title: string;
}

export const TransactionSpanLineChart = (props: SpanLineChartProps) => {
	const maxValue = Math.max(
		...(props.data.flatMap(_ => [_.thisHost, _.allHosts]).filter(Boolean) as number[])
	);
	return (
		<div className="line-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<MetaLabel>{props.title}</MetaLabel>
				<ResponsiveContainer width="100%" height={300} debounce={1}>
					<LineChart
						width={500}
						height={300}
						data={props.data}
						margin={{
							top: 5,
							right: 0,
							left: 0,
							bottom: 5,
						}}
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="endTimeMs"
							tick={{ fontSize: 12 }}
							tickFormatter={label =>
								new Date(label).toLocaleTimeString(undefined, {
									hour: "2-digit",
									minute: "2-digit",
								})
							}
						/>
						<YAxis tick={{ fontSize: 12 }} domain={[0, maxValue]} />
						<ReTooltip content={<CustomLineChartTooltip />} />
						<Legend />
						<Line
							type="monotone"
							dataKey="thisHost"
							stroke={COLOR_LINE_1}
							activeDot={{ r: 8 }}
							connectNulls={true}
							name="This host"
							dot={{ style: { fill: COLOR_LINE_1 } }}
						/>
						<Line
							type="monotone"
							dataKey="allHosts"
							stroke={COLOR_LINE_2}
							activeDot={{ r: 8 }}
							connectNulls={true}
							name="All hosts"
							dot={{ style: { fill: COLOR_LINE_2 } }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export interface SpanHistogramChartProps {
	data: SpanHistogramData;
	title: string;
}

export const TransactionSpanHistogramChart = (props: SpanHistogramChartProps) => {
	//const maxValue = Math.max(...props.data.map(_ => _.count));
	return (
		<div className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<MetaLabel>{props.title}</MetaLabel>
				<ResponsiveContainer width="100%" height={300} debounce={1}>
					<BarChart
						width={500}
						height={300}
						data={props.data}
						margin={{
							top: 5,
							right: 0,
							left: 0,
							bottom: 5,
						}}
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="durationRange" tick={{ fontSize: 12 }} />
						<YAxis tick={{ fontSize: 12 }} />
						<ReTooltip content={<CustomHistogramTooltip />} />
						<Bar dataKey="count" fill={COLOR_LINE_1} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export const TransactionSpanPanel = () => {
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentTransactionSpan: state.context.currentTransactionSpan as CurrentTransactionSpan,
		};
	});
	const dispatch = useDispatch();
	const [loading, setLoading] = useState(false);
	const [chartData, setChartData] = useState<GetSpanChartDataResponse | undefined>(undefined);
	const [fetchError, setFetchError] = useState<string | undefined>(undefined);

	const navigateToCode = async () => {
		if (
			derivedState.currentTransactionSpan.lineNumber &&
			derivedState.currentTransactionSpan.newRelicEntityGuid
		) {
			const metadataResponse = await HostApi.instance.send(
				GetObservabilityErrorGroupMetadataRequestType,
				{
					entityGuid: derivedState.currentTransactionSpan.newRelicEntityGuid,
				}
			);
			const relatedRepos = metadataResponse?.relatedRepos as RelatedRepository[];

			const repoUrls = (
				await Promise.all(
					relatedRepos.map(_ =>
						_.url ? HostApi.instance.send(NormalizeUrlRequestType, { url: _.url }) : undefined
					)
				)
			)
				.filter(Boolean)
				.map(_ => _!.normalizedUrl);

			const repoResponse = (await HostApi.instance.send(MatchReposRequestType, {
				repos: [
					{
						remotes: repoUrls,
						knownCommitHashes: derivedState.currentTransactionSpan.commitSha
							? [derivedState.currentTransactionSpan.commitSha]
							: [],
					},
				],
			})) as MatchReposResponse;

			let repo: CSRepository;
			if (repoResponse.repos.length === 1 && derivedState.currentTransactionSpan.filePath) {
				repo = repoResponse.repos[0];
				const { uri, error } = await HostApi.instance.send(GetRepoFileFromAbsolutePathRequestType, {
					repo,
					absoluteFilePath: derivedState.currentTransactionSpan.filePath,
				});
				if (error) {
					console.error(`Error finding repo file: ${error}`);
				}
				if (uri) {
					const range = Range.create(
						parseInt(derivedState.currentTransactionSpan.lineNumber || "1") - 1,
						0,
						parseInt(derivedState.currentTransactionSpan.lineNumber || "1") - 1,
						9999
					);
					HostApi.instance.send(EditorSelectRangeRequestType, {
						uri,
						selection: {
							start: range.start,
							end: range.end,
							cursor: range.start,
						},
						preserveFocus: true,
					});
					return;
				}
			}
		}
		if (derivedState.currentTransactionSpan.language) {
			HostApi.instance.send(EditorRevealSymbolRequestType, {
				codeFilepath: derivedState.currentTransactionSpan.filePath,
				codeNamespace: derivedState.currentTransactionSpan.codeNamespace,
				codeFunction: derivedState.currentTransactionSpan.functionName,
				language: derivedState.currentTransactionSpan.language,
			});
		}
	};

	useDidMount(() => {
		HostApi.instance.track("codestream/tracing/span displayed", {
			event_type: "modal_display",
			entity_guid: derivedState.currentTransactionSpan.newRelicEntityGuid,
			account_id: derivedState.currentTransactionSpan.newRelicAccountId,
			meta_data: `span_id: ${derivedState.currentTransactionSpan.spanId}`,
			meta_data_2: `trace_id: ${derivedState.currentTransactionSpan.traceId}`,
		});
		navigateToCode();
	});

	const loadChartData = async () => {
		if (
			derivedState.currentTransactionSpan.spanName &&
			derivedState.currentTransactionSpan.spanHost &&
			derivedState.currentTransactionSpan.newRelicEntityGuid &&
			derivedState.currentTransactionSpan.newRelicAccountId
		) {
			setLoading(true);
			try {
				const response = await HostApi.instance.send(GetSpanChartDataRequestType, {
					accountId: derivedState.currentTransactionSpan.newRelicAccountId,
					entityGuid: derivedState.currentTransactionSpan.newRelicEntityGuid,
					spanName: derivedState.currentTransactionSpan.spanName,
					spanHost: derivedState.currentTransactionSpan.spanHost,
					timeRange: "30 minutes",
				});
				setChartData(response);
				setFetchError(undefined);
			} catch (ex) {
				setFetchError(ex);
			} finally {
				setLoading(false);
			}
		}
	};

	useEffect(() => {
		loadChartData();
	}, [derivedState.currentTransactionSpan.spanName]);

	return (
		<div className="full-height-codemark-form">
			<CancelButton
				onClick={() => {
					dispatch(setCurrentTransactionSpan(undefined));
					dispatch(closePanel());
				}}
			/>
			<div
				style={{
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
				}}
			>
				<PanelHeader title={derivedState.currentTransactionSpan.spanName}></PanelHeader>
			</div>
			{loading ? (
				<DelayedRender>
					<div style={{ display: "flex", alignItems: "center" }}>
						<LoadingMessage>Loading span data...</LoadingMessage>
					</div>
				</DelayedRender>
			) : chartData ? (
				<div className="plane-container" style={{ padding: "5px 20px 0px 10px" }}>
					<div className="standard-form vscroll">
						{chartData.responseTime.length && (
							<TransactionSpanLineChart
								data={chartData.responseTime}
								title="Average response time (ms)"
							/>
						)}
						{chartData.throughput.length && (
							<TransactionSpanLineChart data={chartData.throughput} title="Throughput (rpm)" />
						)}
						{chartData.duration.length && (
							<TransactionSpanHistogramChart
								data={chartData.duration}
								title="Span duration histogram"
							/>
						)}
					</div>
				</div>
			) : fetchError ? (
				<div style={{ display: "flex", alignItems: "center" }}>Error fetching span data.</div>
			) : (
				<div style={{ display: "flex", alignItems: "center" }}>No span data found.</div>
			)}
		</div>
	);
};
