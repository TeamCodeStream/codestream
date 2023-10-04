import React, { useRef, useState } from "react";
import Icon from "./Icon";
import { Dialog } from "../src/components/Dialog";
import { PanelHeader } from "../src/components/PanelHeader";
import styled from "styled-components";
import ScrollBox from "./ScrollBox";
import { HostApi } from "../webview-api";
import {
	GetLogFieldDefinitionsRequestType,
	GetLogsRequestType,
	LogFieldDefinition,
	LogRequestFilter,
	LogResult,
	isNRErrorResponse,
} from "../../util/src/protocol/agent/agent.protocol.providers";
import { CodeStreamState } from "../store";
import { closePanel } from "./actions";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import Button from "./Button";
import Select from "react-select";
import { ObservabilityLoadingLogs } from "./ObservabilityLoading";
import Timestamp from "./Timestamp";
import Draggable from "react-draggable";

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

export default function ObservabilityLogsPanel() {
	const dispatch = useAppDispatch();
	const searchInput = useRef<HTMLInputElement>(null);

	const [fieldDefinitions, setFieldDefinitions] = useState<LogFieldDefinition[]>([]);
	const [sortedFieldDefinitions, setSortedFieldDefinitions] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [query, setQuery] = useState<string>("");

	const [selectedSinceOption, setSelectedSinceOption] = useState<SelectedOption | undefined>(
		undefined
	);
	const [selectSinceOptions, setSelectSinceOptions] = useState<SelectedOption[]>([]);
	const [maximized, setMaximized] = useState<boolean>(false);
	const [results, setResults] = useState<LogResult[]>([]);
	const [totalItems, setTotalItems] = useState<number>(0);
	const [logError, setLogError] = useState<string | undefined>("");

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			entityGuid: state.context.currentObservabilityLogEntityGuid,
		};
	});

	useDidMount(() => {
		const defaultOption: SelectedOption = {
			value: "30 MINUTES AGO",
			label: "30 Minutes Ago",
		};

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
		fetchFieldDefinitions(derivedState.entityGuid);
	});

	const fetchFieldDefinitions = async (entityGuid?: string) => {
		try {
			if (entityGuid) {
				const response = await HostApi.instance.send(GetLogFieldDefinitionsRequestType, {
					entityGuid,
				});

				if (response) {
					if (isNRErrorResponse(response?.error)) {
						setLogError(response.error?.error?.message ?? response.error?.error?.type);
					} else {
						setLogError(undefined);
					}

					if (response.logDefinitions) {
						setFieldDefinitions(response.logDefinitions);

						// TODO: Don't always do this when a preference is found instead.
						setSortedFieldDefinitions(["level", "timestamp", "message"]);
					}
				}
			}
		} finally {
			//
		}
	};

	const fetchLogs = async (entityGuid?: string) => {
		try {
			setIsLoading(true);

			if (entityGuid) {
				setResults([]);
				setTotalItems(0);

				const filters = parseFilters();
				const response = await HostApi.instance.send(GetLogsRequestType, {
					entityGuid,
					filters,
					limit: "MAX",
					since: selectedSinceOption?.value || "30 MINUTES AGO",
					order: {
						field: "timestamp",
						direction: "DESC",
					},
				});

				if (response) {
					if (isNRErrorResponse(response?.error)) {
						setLogError(response.error?.error?.message ?? response.error?.error?.type);
					} else {
						setLogError(undefined);
					}

					if (response.logs && response.logs.length > 0) {
						setResults(response.logs);
						setTotalItems(response.logs.length);
					}
				} else {
					console.debug(`o11y: no logs`);
					setResults([]);
					setTotalItems(0);
				}
			} else {
				console.debug(`o11y: no logs (no entityGuid)`);
				setResults([]);
				setTotalItems(0);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const parseFilters = () => {
		let text = query || "";
		const filters: LogRequestFilter = {};
		let match;

		while ((match = text.match(/\blevel:\"(.*?)\"(\s|$)/))) {
			if (!filters.levels) filters.levels = [];
			filters.levels.push(match[1]);
			text = text.replace(/\s*level:\"(.*?)\"\s*/, " ");
		}

		while ((match = text.match(/\bcode:\"(.*?)\"(\s|$)/))) {
			if (!filters.codes) filters.codes = [];
			filters.codes.push(match[1]);
			text = text.replace(/\s*code:\"(.*?)\"\s*/, " ");
		}

		while ((match = text.match(/\missing:\"(.*?)\"(\s|$)/))) {
			if (!filters.missing) filters.missing = [];
			filters.missing.push(match[1]);
			text = text.replace(/\s*missing:\"(.*?)\"\s*/, " ");
		}

		while ((match = text.match(/\has:\"(.*?)\"(\s|$)/))) {
			if (!filters.has) filters.has = [];
			filters.has.push(match[1]);
			text = text.replace(/\s*has:\"(.*?)\"\s*/, " ");
		}

		match = text.match(/\message:\"(.*?)\"(\s|$)/);
		if (match) {
			filters.message = match[1];
			text = text.replace(/\s*message:\"(.*?)\"\s*/, " ");
		}

		return filters;
	};

	const renderResults = () => {
		if (results.length === 0) {
			return null;
		}

		return (
			<>
				{results.map((r, idx) => (
					<LogRow logResult={r} evenRow={idx % 2 === 0} />
				))}
			</>
		);
	};

	const renderHeaderRow = () => {
		const handleStop = oldIndex => (e, data) => {
			const newIndex = Math.round(data.x / 100);
			if (newIndex === 0) return;

			const updatedColumns = [...sortedFieldDefinitions];
			const [removed] = updatedColumns.splice(oldIndex, 1);
			updatedColumns.splice(oldIndex + newIndex, 0, removed);
			setSortedFieldDefinitions(updatedColumns);
		};

		return (
			<tr>
				{sortedFieldDefinitions &&
					sortedFieldDefinitions.length > 0 &&
					sortedFieldDefinitions.map((fd, idx) => {
						return (
							<Draggable axis="x" key={idx} onStop={handleStop(idx)}>
								<th
									colSpan={columnSpanMapping[fd] || 1}
									style={{ border: "1px solid darkgray", padding: "3px 8px 3px 8px" }}
								>
									{fd}
								</th>
							</Draggable>
						);
					})}
			</tr>
		);
	};

	const LogRow = (props: { logResult: LogResult; evenRow: boolean }) => {
		const formatRowValue = (fieldName, fieldValue) => {
			if (fieldName === "timestamp") {
				return (
					<td>
						<Timestamp time={fieldValue}></Timestamp>
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

		return (
			<tr
				style={{
					color: "lightgray",
					borderBottom: "1px solid lightgray",
				}}
			>
				{props.logResult &&
					sortedFieldDefinitions &&
					sortedFieldDefinitions.map(fd => {
						return formatRowValue(fd, props.logResult[fd]);
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
							placeholder="Query logs in the selected entity"
							autoFocus
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
						/>
					</div>
					<Button
						style={{ paddingLeft: "8px", paddingRight: "8px" }}
						onClick={() => fetchLogs(derivedState.entityGuid)}
						loading={isLoading}
					>
						Query Logs
					</Button>
				</SearchBar>
			</PanelHeader>
			<div
				style={{
					height: maximized ? "calc(100vh - 100px)" : "calc(100vh - 200px)",
					overflow: "hidden",
					padding: "0px 20px 20px 20px",
				}}
			>
				{!isLoading && totalItems > 0 && (
					<div style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>
						{totalItems.toLocaleString()} Logs
					</div>
				)}

				<ScrollBox>
					<div className="vscroll">
						{totalItems > 0 && (
							<table style={{ width: "100%", borderCollapse: "collapse" }}>
								<thead>{renderHeaderRow()}</thead>
								<tbody>{renderResults()}</tbody>
							</table>
						)}
						{!totalItems && isLoading && <ObservabilityLoadingLogs />}
						{!totalItems && !isLoading && (
							<div className="no-matches" style={{ margin: "0" }}>
								No results match your search.
							</div>
						)}
					</div>
				</ScrollBox>
			</div>
		</Dialog>
	);
}
