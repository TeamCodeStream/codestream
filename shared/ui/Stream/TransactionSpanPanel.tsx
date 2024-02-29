import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Range } from "vscode-languageserver-types";
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
import { MetaLabel } from "./Codemark/BaseCodemark";
import CancelButton from "./CancelButton";
import { DelayedRender } from "../Container/DelayedRender";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { PanelHeader } from "../src/components/PanelHeader";
import { CodeStreamState } from "@codestream/webview/store";
import { CurrentTransactionSpan } from "@codestream/webview/store/context/types";
import {
	closeAllPanels,
	setCurrentTransactionSpan,
} from "@codestream/webview/store/context/actions";
import { HostApi } from "@codestream/webview/webview-api";
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
import { useAppDispatch, useDidMount } from "@codestream/webview/utilities/hooks";
import { CSRepository } from "@codestream/protocols/api";
import { EnhancedRepoScm, RepositoryAssociator } from "./CodeError/RepositoryAssociator";
import { api } from "../store/codeErrors/thunks";
import { logError } from "../logger";

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

interface ErrorMessage {
	title: string;
	description?: string;
}

export const TransactionSpanPanel = () => {
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentTransactionSpan: state.context.currentTransactionSpan as CurrentTransactionSpan,
		};
	});
	const dispatch = useAppDispatch();
	const [chartLoading, setChartLoading] = useState(false);
	const [repoLoading, setRepoLoading] = useState(false);
	const [chartData, setChartData] = useState<GetSpanChartDataResponse | undefined>(undefined);
	const [selectedRepo, setSelectedRepo] = useState<string | undefined>(undefined);
	const [relatedRepos, setRelatedRepos] = useState<RelatedRepository[] | undefined>(undefined);
	const [fetchError, setFetchError] = useState<ErrorMessage | undefined>(undefined);
	const [repoError, setRepoError] = useState<ErrorMessage | undefined>(undefined);
	const [needsRepoAssociation, setNeedsRepoAssociation] = useState(false);
	const [needsRepoSelector, setNeedsRepoSelector] = useState(false);

	const entityName = derivedState.currentTransactionSpan.entityName || "";

	const fileNavigable = !!(
		derivedState.currentTransactionSpan.lineNumber && derivedState.currentTransactionSpan.filePath
	);
	const symbolNavigable = !!(
		derivedState.currentTransactionSpan.language &&
		derivedState.currentTransactionSpan.codeNamespace &&
		derivedState.currentTransactionSpan.functionName
	);

	const exit = () => {
		dispatch(setCurrentTransactionSpan(undefined));
		dispatch(closeAllPanels());
	};

	const navigateByFile = async () => {
		const metadataResponse = await HostApi.instance.send(
			GetObservabilityErrorGroupMetadataRequestType,
			{
				entityGuid: derivedState.currentTransactionSpan.newRelicEntityGuid,
			}
		);
		const fetchedRelatedRepos = metadataResponse?.relatedRepos as RelatedRepository[];

		if (fetchedRelatedRepos.length === 0) {
			return {
				success: false,
				needsRepoAssociation: true,
				needsRepoSelector: false,
			};
		}

		if (!fileNavigable) {
			return {
				success: false,
				needsRepoAssociation: false,
				needsRepoSelector: false,
			};
		}

		const repoUrls = (
			await Promise.all(
				fetchedRelatedRepos.map(_ =>
					_.url ? HostApi.instance.send(NormalizeUrlRequestType, { url: _.url }) : undefined
				)
			)
		)
			.filter(Boolean)
			.map(_ => _!.normalizedUrl);

		const repoResponse = (await HostApi.instance.send(MatchReposRequestType, {
			repos: repoUrls.map(u => ({
				remotes: [u],
				knownCommitHashes: derivedState.currentTransactionSpan.commitSha
					? [derivedState.currentTransactionSpan.commitSha]
					: [],
			})),
		})) as MatchReposResponse;

		if (repoResponse.repos.length === 0) {
			return {
				success: false,
				needsRepoAssociation: true,
				needsRepoSelector: false,
			};
		}

		let repo: CSRepository | undefined;
		if (repoResponse.repos.length === 1) {
			repo = repoResponse.repos[0];
		}
		if (repoResponse.repos.length > 1) {
			if (!selectedRepo) {
				setRelatedRepos(fetchedRelatedRepos);
				return {
					success: false,
					needsRepoAssociation: false,
					needsRepoSelector: true,
				};
			}
			repo = repoResponse.repos.find(r => r.id === selectedRepo);
			if (!repo) {
				setRepoError({
					title: "Open the appropriate repository in your IDE so we can take you to the code.",
				});
			}
		}
		if (repo && derivedState.currentTransactionSpan.filePath) {
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
				const selectResult = await HostApi.instance.send(EditorSelectRangeRequestType, {
					uri,
					selection: {
						start: range.start,
						end: range.end,
						cursor: range.start,
					},
					preserveFocus: true,
				});
				return {
					success: selectResult.success,
					needsRepoAssociation: false,
					needsRepoSelector: false,
				};
			}
		}

		return {
			success: false,
			needsRepoAssociation: false,
			needsRepoSelector: false,
		};
	};

	const navigateBySymbol = async () => {
		if (symbolNavigable) {
			HostApi.instance.send(EditorRevealSymbolRequestType, {
				codeFilepath: derivedState.currentTransactionSpan.filePath,
				codeNamespace: derivedState.currentTransactionSpan.codeNamespace,
				codeFunction: derivedState.currentTransactionSpan.functionName,
				language: derivedState.currentTransactionSpan.language!,
			});
			return {
				success: true,
			};
		}
		return {
			success: false,
		};
	};

	const navigateToCode = async () => {
		setRepoLoading(true);
		const fileResult = await navigateByFile();
		if (!fileResult.success && !fileResult.needsRepoAssociation && !fileResult.needsRepoSelector) {
			const symbolResult = await navigateBySymbol();
			if (symbolResult.success) {
				setRepoLoading(false);
				return;
			}
		}
		setNeedsRepoAssociation(fileResult.needsRepoAssociation);
		setNeedsRepoSelector(fileResult.needsRepoSelector);
		setRepoLoading(false);
	};

	useDidMount(() => {
		HostApi.instance.track("codestream/tracing/span displayed", {
			event_type: "modal_display",
			entity_guid: derivedState.currentTransactionSpan.newRelicEntityGuid,
			account_id: derivedState.currentTransactionSpan.newRelicAccountId,
			meta_data: `span_id: ${derivedState.currentTransactionSpan.spanId}`,
			meta_data_2: `trace_id: ${derivedState.currentTransactionSpan.traceId}`,
		});
	});

	useEffect(() => {
		if (!needsRepoAssociation && !needsRepoSelector) {
			navigateToCode();
		}
	}, [needsRepoAssociation, needsRepoSelector]);

	const loadChartData = async () => {
		if (
			derivedState.currentTransactionSpan.spanName &&
			derivedState.currentTransactionSpan.spanHost &&
			derivedState.currentTransactionSpan.newRelicEntityGuid &&
			derivedState.currentTransactionSpan.newRelicAccountId
		) {
			setChartLoading(true);
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
				setFetchError({
					title: "Error fetching span data.",
					description: ex,
				});
			} finally {
				setChartLoading(false);
			}
		}
	};

	useEffect(() => {
		loadChartData();
	}, [
		derivedState.currentTransactionSpan.spanName,
		derivedState.currentTransactionSpan.spanHost,
		derivedState.currentTransactionSpan.newRelicEntityGuid,
		derivedState.currentTransactionSpan.newRelicAccountId,
	]);

	const associateRepo = (r: EnhancedRepoScm) => {
		return new Promise(resolve => {
			const payload = {
				url: r.remote,
				name: r.name,
				entityId: derivedState.currentTransactionSpan.newRelicEntityGuid,
				parseableAccountId: derivedState.currentTransactionSpan.newRelicEntityGuid,
			};
			dispatch(api("assignRepository", payload)).then(_ => {
				if (_?.directives) {
					console.log("assignRepository", {
						directives: _?.directives,
					});
					HostApi.instance.track("codestream/repo_association succeeded", {
						event_type: "response",
						entity_guid: derivedState.currentTransactionSpan.newRelicEntityGuid,
						account_id: derivedState.currentTransactionSpan.newRelicAccountId,
						meta_data: "item_type: span",
						meta_data_2: `item_id: ${derivedState.currentTransactionSpan.spanId}`,
					});
					setNeedsRepoAssociation(false);
					resolve(true);
				} else {
					console.log("Could not find directive", {
						payload: payload,
					});
					resolve(true);
					const title = "Failed to associate repository";
					const description = _?.error;
					setRepoError({
						title,
						description,
					});
					logError(`${title}, description: ${description}`, payload);
				}
			});
		});
	};

	const selectRepo = (r: EnhancedRepoScm) => {
		return new Promise(resolve => {
			setNeedsRepoSelector(false);
			setSelectedRepo(r.id);
			HostApi.instance.track("codestream/repo_disambiguation succeeded", {
				event_type: "response",
				entity_guid: derivedState.currentTransactionSpan.newRelicEntityGuid,
				account_id: derivedState.currentTransactionSpan.newRelicAccountId,
				meta_data: "item_type: span",
				meta_data_2: `item_id: ${derivedState.currentTransactionSpan.spanId}`,
			});
			resolve(true);
		});
	};

	if (needsRepoAssociation) {
		return (
			<RepositoryAssociator
				error={{
					title: "Which Repository?",
					description: `Select the repository that the ${entityName} service is associated with so that we can take you to the code. If the repository doesn't appear in the list, open it in your IDE.`,
				}}
				buttonText="Select"
				onCancelled={exit}
				isLoadingCallback={setRepoLoading}
				isLoadingParent={chartLoading}
				noSingleItemDropdownSkip={true}
				onSubmit={associateRepo}
			/>
		);
	}

	if (needsRepoSelector) {
		return (
			<RepositoryAssociator
				error={{
					title: "Select a Repository",
					description: `The ${entityName} service is associated with multiple repositories. Please select one to continue.`,
				}}
				buttonText="Select"
				onCancelled={exit}
				isLoadingCallback={setRepoLoading}
				isLoadingParent={chartLoading}
				noSingleItemDropdownSkip={false}
				onSubmit={selectRepo}
				relatedRepos={relatedRepos}
			/>
		);
	}

	return (
		<div className="full-height-codemark-form">
			<CancelButton onClick={exit} />
			<div
				style={{
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
				}}
			>
				<PanelHeader title={derivedState.currentTransactionSpan.spanName}></PanelHeader>
			</div>
			{chartLoading || repoLoading ? (
				<DelayedRender>
					<div style={{ display: "flex", alignItems: "center" }}>
						<LoadingMessage>Loading span data...</LoadingMessage>
					</div>
				</DelayedRender>
			) : chartData ? (
				<div className="plane-container" style={{ padding: "5px 20px 0px 10px" }}>
					{repoError && (
						<div style={{ display: "flex", alignItems: "center" }}>{repoError.title}</div>
					)}
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
				<div style={{ display: "flex", alignItems: "center" }}>{fetchError.title}</div>
			) : (
				<div style={{ display: "flex", alignItems: "center" }}>No span data found.</div>
			)}
		</div>
	);
};
