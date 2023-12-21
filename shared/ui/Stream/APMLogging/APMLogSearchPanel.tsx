import React, { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { Dialog } from "../../src/components/Dialog";
import { PanelHeader } from "../../src/components/PanelHeader";
import styled from "styled-components";
import ScrollBox from "../ScrollBox";
import { HostApi } from "../../webview-api";
import { CodeStreamState } from "../../store";
import { closePanel } from "../actions";
import { useAppDispatch, useAppSelector, useDidMount } from "../../utilities/hooks";
import Button from "../Button";
import Select from "react-select";
import Timestamp from "../Timestamp";
import { Link } from "../Link";
import {
	GetLogFieldDefinitionsRequestType,
	GetLogsRequestType,
	LogFieldDefinition,
	LogResult,
	isNRErrorResponse,
} from "@codestream/protocols/agent";

interface SelectedOption {
	value: string;
	label: string;
}

const LogSeverity = styled.span`
	border-radius: 1px;
	box-sizing: border-box;
	display: flex;
	height: 8px;
	position: relative;
	width: 8px;
	overflow: hidden;
	margin: 3.5px auto;
`;

const SearchBar = styled.div`
	display: flex;
	flex-direction: row;
	button {
		z-index: 2;
	}
	.search-input {
		position: relative;
		flex-grow: 10;
		width: 100%;
		input.control {
			// make space for the search icon
			padding-left: 32px !important;
			// the bookmark icon is narrower so requires less space
			padding-right: 32px !important;
			height: 100%;
			border: 1px solid var(--base-border-color);
			border-left: none;
			margin-left: -1px;
		}
		.icon.search {
			position: absolute;
			left: 8px;
			top: 6px;
			opacity: 0.5;
		}
		.icon.clear {
			position: absolute;
			right: 18px;
			top: 6px;
			opacity: 0.5;
		}
		.save {
			position: absolute;
			right: 6px;
			top: 6px;
			opacity: 0.5;
			&:hover {
				opacity: 1;
			}
		}
		.clear {
			position: absolute;
			right: 28px;
			top: 6px;
			opacity: 0.5;
			&:hover {
				opacity: 1;
			}
		}
	}
`;

const logSeverityToColor = {
	fatal: "#df2d24",
	error: "#df2d24",
	warn: "#ffd23d",
	info: "#0c74df",
	trace: "",
	debug: "",
};

const columnSpanMapping = {
	level: 2,
};

export const APMLogSearchPanel = () => {
	const dispatch = useAppDispatch();
	const searchInput = useRef<HTMLInputElement>(null);

	const [fieldDefinitions, setFieldDefinitions] = useState<LogFieldDefinition[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const [query, setQuery] = useState<string>("");
	const [hasSearched, setHasSearched] = useState<boolean>(false);

	const [selectedSinceOption, setSelectedSinceOption] = useState<SelectedOption | undefined>(
		undefined
	);
	const [selectSinceOptions, setSelectSinceOptions] = useState<SelectedOption[]>([]);
	const [maximized, setMaximized] = useState<boolean>(false);
	const [results, setResults] = useState<LogResult[]>([]);

	const [totalItems, setTotalItems] = useState<number>(0);
	const [logError, setLogError] = useState<string | undefined>("");
	const [isUIDisabled, setIsUIDisabled] = useState<boolean>(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			entityGuid: state.context.currentAPMLoggingEntityGuid,
			searchTerm: state.context.currentAPMLoggingSearchTerm,
		};
	});

	useEffect(() => {
		if (derivedState.searchTerm && derivedState.entityGuid) {
			setQuery(derivedState.searchTerm);
			fetchLogs(derivedState.entityGuid, derivedState.searchTerm);
		}
	}, [derivedState.searchTerm]);

	useDidMount(() => {
		const defaultOption: SelectedOption = {
			value: "30 MINUTES AGO",
			label: "30 Minutes Ago",
		};

		// TODO: Sliding time window selector?
		const sinceOptions: SelectedOption[] = [
			defaultOption,
			{ value: "60 MINUTES AGO", label: "60 Minutes Ago" },
			{ value: "3 HOURS AGO", label: "3 Hours Ago" },
			{ value: "8 HOURS AGO", label: "8 Hours Ago" },
			{ value: "1 DAY AGO", label: "1 Day Ago" },
			{ value: "3 DAYS AGO", label: "3 Days Ago" },
			{ value: "7 DAYS AGO", label: "7 Days Ago" },
		];

		setSelectSinceOptions(sinceOptions);
		setSelectedSinceOption(defaultOption);

		if (!derivedState.entityGuid) {
			handleError(
				"We were unable to locate the Entity GUID for the selected service; please contact support."
			);
			setIsUIDisabled(true);
			return;
		}

		fetchFieldDefinitions(derivedState.entityGuid);

		if (derivedState.searchTerm) {
			setQuery(derivedState.searchTerm);
			fetchLogs(derivedState.entityGuid, derivedState.searchTerm);
		}
	});

	const handleError = (message: string) => {
		setLogError(message);
		console.error(message);
	};

	const fetchFieldDefinitions = async (entityGuid: string) => {
		try {
			const response = await HostApi.instance.send(GetLogFieldDefinitionsRequestType, {
				entityGuid,
			});

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching log field information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			if (response.logDefinitions) {
				setFieldDefinitions(response.logDefinitions);
			}
		} catch (ex) {
			handleError(ex);
		}
	};

	const checkKeyPress = (e: { keyCode: Number }) => {
		const { keyCode } = e;
		if (keyCode === 13) {
			fetchLogs(derivedState.entityGuid!);
		}
	};

	const fetchLogs = async (entityGuid: string, searchTerm?: string) => {
		try {
			setLogError(undefined);
			setHasSearched(true);
			setIsLoading(true);
			setResults([]);
			setTotalItems(0);

			const filterText = searchTerm || query;

			const response = await HostApi.instance.send(GetLogsRequestType, {
				entityGuid,
				filterText,
				limit: "MAX",
				since: selectedSinceOption?.value || "30 MINUTES AGO",
				order: {
					field: "timestamp",
					direction: "DESC",
				},
			});

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching log information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			if (response.logs && response.logs.length > 0) {
				setResults(response.logs);
				setTotalItems(response.logs.length);
			}

			trackTelemetry(entityGuid, (response?.logs?.length ?? 0) > 0);
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const trackTelemetry = (entityGuid: string, resultsReturned: boolean) => {
		HostApi.instance.track("codestream/logs searched", {
			meta_data: `entity_guid: ${entityGuid}`,
			meta_data_2: `results_returned: ${resultsReturned}`,
		});
	};

	const renderHeaderRow = () => {
		return (
			<tr>
				{
					// TODO: Instead of using the full list of field definitions for display,
					//       Use a preference that includes which columns to show.fieldDefinitions &&
					fieldDefinitions.length > 0 &&
						fieldDefinitions.map(fd => {
							return (
								<th
									colSpan={columnSpanMapping[fd.key!] || 1}
									style={{
										border: "1px solid darkgray",
										padding: "3px 8px 3px 8px",
									}}
								>
									{fd.key}
								</th>
							);
						})
				}
			</tr>
		);
	};

	const formatRowValue = (fieldName: string, fieldValue: string) => {
		if (fieldName === "timestamp") {
			return (
				<td>
					<Timestamp time={fieldValue} expandedTime={true}></Timestamp>
				</td>
			);
		}

		if (fieldName === "level") {
			return (
				<>
					<td>
						<LogSeverity style={{ backgroundColor: logSeverityToColor[fieldValue] }} />
					</td>
					<td>{fieldValue}</td>
				</>
			);
		}

		return <td>{fieldValue}</td>;
	};

	const expandDetailsView = (messageId: string) => {
		const details = results.find(lr => {
			return lr["messageId"] === messageId;
		});

		// TODO: Design drop-down / split view to display detail data inline
	};

	const LogRow = (props: { logResult: LogResult }) => {
		return (
			<tr
				style={{
					color: "lightgray",
					borderBottom: "1px solid lightgray",
				}}
				onClick={e => {
					// TODO: Move to icon in front of row?
					//       Add Hover indicators?
					e.preventDefault();
					e.stopPropagation();

					expandDetailsView(props.logResult["messageId"]);
				}}
			>
				{props.logResult &&
					// TODO: Instead of using the full list of field definitions for display,
					//       Use a preference that includes which columns to show.
					fieldDefinitions &&
					fieldDefinitions.map(fd => {
						return formatRowValue(fd.key!, props.logResult[fd.key!]);
					})}
			</tr>
		);
	};

	return (
		<Dialog
			maximizable
			wide
			noPadding
			onMaximize={() => setMaximized(true)}
			onMinimize={() => setMaximized(false)}
			onClose={() => dispatch(closePanel())}
		>
			<PanelHeader title="Logs">
				<SearchBar className="search-bar">
					<div className="search-input" style={{ width: "70%", paddingRight: "10px" }}>
						<Icon name="search" className="search" />
						<input
							name="q"
							ref={searchInput}
							value={query}
							className="input-text control"
							type="text"
							onChange={e => {
								setQuery(e.target.value);
							}}
							onKeyDown={checkKeyPress}
							placeholder="Query logs in the selected entity"
							autoFocus
							disabled={isUIDisabled}
						/>
						<Icon name="x" className="clear" onClick={e => setQuery("")} />
					</div>
					<div style={{ width: "25%", paddingRight: "10px" }}>
						<Select
							id="input-since"
							name="since"
							classNamePrefix="react-select"
							value={selectedSinceOption}
							placeholder="Since"
							options={selectSinceOptions}
							onChange={value => setSelectedSinceOption(value)}
							isDisabled={isUIDisabled}
						/>
					</div>
					<Button
						style={{ paddingLeft: "8px", paddingRight: "8px" }}
						onClick={() => fetchLogs(derivedState.entityGuid!)}
						loading={isLoading}
						disabled={isUIDisabled}
					>
						Query Logs
					</Button>
				</SearchBar>
			</PanelHeader>
			<div
				style={{
					height: maximized ? "calc(100vh - 100px)" : "calc(100vh - 200px)",
					overflow: "hidden",
					padding: "0px 20px 0px 20px",
					marginBottom: "20px",
				}}
			>
				{!isLoading && totalItems > 0 && (
					<div style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>
						{totalItems.toLocaleString()} Logs
					</div>
				)}

				<ScrollBox>
					<div className="vscroll">
						{/* {isLoading && (
							TODO: Skeleton loader? Couldn't get it to work when I tried
						)} */}

						{!logError && !isLoading && results && totalItems > 0 && fieldDefinitions && (
							// TODO: Using a table is pretty terrible here...
							<table style={{ width: "100%", borderCollapse: "collapse" }}>
								<thead>{renderHeaderRow()}</thead>
								<tbody>
									{results.map((r, idx) => (
										<LogRow logResult={r} />
									))}
								</tbody>
							</table>
						)}

						{!logError && !totalItems && !isLoading && !hasSearched && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								<span>Enter search criteria above, or just click Query to see recent logs.</span>
							</div>
						)}

						{!logError && !totalItems && !isLoading && hasSearched && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								<h4>No logs found during this time range</h4>
								<span>
									Try adjusting your time range or{" "}
									<Link href="https://docs.newrelic.com/docs/logs/logs-context/annotate-logs-logs-context-using-apm-agent-apis/">
										set up log management
									</Link>
								</span>
							</div>
						)}

						{logError && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								<h4>Uh oh, we've encounted an error!</h4>
								<span>{logError}</span>
							</div>
						)}
					</div>
				</ScrollBox>
			</div>
		</Dialog>
	);
};
