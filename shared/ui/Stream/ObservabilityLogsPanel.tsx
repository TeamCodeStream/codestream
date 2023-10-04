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

interface SelectedOption {
	value: string;
	label: string;
}

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

export const LogRow = (props: {
	logResult: LogResult;
	fieldDefinitions: LogFieldDefinition[];
	evenRow: boolean;
}) => {
	return (
		<tr
			style={{
				backgroundColor: props.evenRow ? "transparent" : "lightgray",
				color: props.evenRow ? "lightgray" : "initial",
			}}
		>
			{props.logResult &&
				props.fieldDefinitions &&
				props.fieldDefinitions.length > 0 &&
				props.fieldDefinitions.map(fd => {
					return (
						<td style={{ wordWrap: "break-word", overflowX: "visible" }}>
							{props.logResult[fd.key!]}
						</td>
					);
				})}
		</tr>
	);
};

export default function ObservabilityLogsPanel() {
	const dispatch = useAppDispatch();
	const searchInput = useRef<HTMLInputElement>(null);

	const [fieldDefinitions, setFieldDefinitions] = useState<LogFieldDefinition[]>([]);
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
					}
				}
			}
		} finally {
			//
		}
	};

	const fetchLogs = async (entityGuid?: string) => {
		try {
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
			//setLoadingLogs(false);
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
					<LogRow logResult={r} fieldDefinitions={fieldDefinitions} evenRow={idx % 2 === 0} />
				))}
			</>
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
					>
						Query Logs
					</Button>
				</SearchBar>
			</PanelHeader>
			<div
				style={{
					height: maximized ? "calc(100vh - 100px)" : "calc(100vh - 200px)",
					overflow: "hidden",
				}}
			>
				<ScrollBox>
					<div className="vscroll" style={{ paddingTop: "10px", paddingLeft: "10px" }}>
						{totalItems > 0 && (
							<table style={{ width: "100%", borderCollapse: "collapse" }}>
								<thead>
									<tr style={{ borderBottom: "1px solid lightgray" }}>
										{fieldDefinitions &&
											fieldDefinitions.map((fd, idx) => {
												return <th>{fd.key}</th>;
											})}
									</tr>
								</thead>
								<tbody>{renderResults()}</tbody>
							</table>
						)}
						{!totalItems && <div className="no-matches">No results match your search.</div>}
					</div>
				</ScrollBox>
			</div>
		</Dialog>
	);
}
