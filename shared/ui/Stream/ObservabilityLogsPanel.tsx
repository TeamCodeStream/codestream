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
			padding-right: 45px !important;
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
		fetchFieldDefinitions(derivedState.entityGuid);
		fetchLogs(derivedState.entityGuid);
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
					since: "3 HOURS AGO",
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

		// if (text.match(/\b(is|status):approved\b/)) {
		// 	filters.status = "approved";
		// 	text = text.replace(/\s*(is|status):approved\s*/, " ");
		// }
		// if (text.match(/\b(is|type):issue\b/)) {
		// 	filters.type = "issue";
		// 	text = text.replace(/\s*(is|type):issue\s*/, " ");
		// }
		// if (text.match(/\b(is|type):comment\b/)) {
		// 	filters.type = "comment";
		// 	text = text.replace(/\s*(is|type):comment\s*/, " ");
		// }
		// if (text.match(/\b(is|type):fr\b/)) {
		// 	filters.type = "review";
		// 	text = text.replace(/\s*(is|type):fr\s*/, " ");
		// }
		// if (text.match(/\b(is|type):cr\b/)) {
		// 	filters.type = "review";
		// 	text = text.replace(/\s*(is|type):cr\s*/, " ");
		// }

		// while ((match = text.match(/\btag:(\S+)(\s|$)/))) {
		// 	if (!filters.tags) filters.tags = [];
		// 	filters.tags.push(match[1]);
		// 	text = text.replace(/\s*tag:(\S+)\s*/, " ");
		// }
		// if (text.match(/\bno:tag\b/)) {
		// 	filters.noTag = true;
		// 	text = text.replace(/\s*no:tag\s*/, " ");
		// }

		// match = text.match(/\bbranch:\"(.*?)\"(\s|$)/);
		// if (match) {
		// 	filters.branch = match[1];
		// 	text = text.replace(/\s*branch:\"(.*?)\"\s*/, " ");
		// }
		// match = text.match(/\bbranch:(\S+)(\s|$)/);
		// if (match) {
		// 	filters.branch = match[1];
		// 	text = text.replace(/\s*branch:(\S+)\s*/, " ");
		// }

		// match = text.match(/\bcommit:\"(.*?)\"(\s|$)/);
		// if (match) {
		// 	filters.commit = match[1];
		// 	text = text.replace(/\s*commit:\"(.*?)\"\s*/, " ");
		// }
		// match = text.match(/\bcommit:(\S+)(\s|$)/);
		// if (match) {
		// 	filters.commit = match[1];
		// 	text = text.replace(/\s*commit:(\S+)\s*/, " ");
		// }

		// match = text.match(/\brepo:\"(.*?)\"(\s|$)/);
		// if (match) {
		// 	filters.repo = match[1];
		// 	text = text.replace(/\s*repo:\"(.*?)\"\s*/, " ");
		// }
		// match = text.match(/\brepo:(\S+)(\s|$)/);
		// if (match) {
		// 	filters.repo = match[1];
		// 	text = text.replace(/\s*repo:(\S+)\s*/, " ");
		// }

		// match = text.match(/\bupdated:([<>]?)(\d\d\d\d)-(\d+)-(\d+)(\s|$)/);
		// if (match) {
		// 	const date = new Date(match[2], match[3] - 1, match[4]);
		// 	if (match[1] === "<") filters.updatedBefore = date.getTime();
		// 	if (match[1] === ">") filters.updatedAfter = date.getTime();
		// 	if (!match[1]) filters.updatedOn = date;
		// 	text = text.replace(/\s*updated:[<>]?(\S+)\s*/, " ");
		// }
		// match = text.match(/\bcreated:([<>]?)(\d\d\d\d)-(\d+)-(\d+)(\s|$)/);
		// if (match) {
		// 	const date = new Date(match[2], match[3] - 1, match[4]);
		// 	if (match[1] === "<") filters.createdBefore = date.getTime();
		// 	if (match[1] === ">") filters.createdAfter = date.getTime();
		// 	if (!match[1]) filters.createdOn = date;
		// 	text = text.replace(/\s*created:[<>]?(\S+)\s*/, " ");
		// }
		// match = text.match(/\bupdated:([<>]?)(\d\d\d\d)-(\d+)-(\d+)(\s|$)/);
		// if (match) {
		// 	const date = new Date();
		// 	date.setHours(0, 0, 0, 0);
		// 	if (match[2] === "yesterday") date.setDate(date.getDate() - 1);
		// 	if (match[1] === "<") filters.updatedBefore = date.getTime();
		// 	if (match[1] === ">") filters.updatedAfter = date.getTime();
		// 	if (!match[1]) filters.updatedOn = date;
		// 	text = text.replace(/\s*updated:[<>]?(\S+)\s*/, " ");
		// }
		// match = text.match(/\bcreated:([<>]?)(yesterday|today)(\s|$)/);
		// if (match) {
		// 	const date = new Date();
		// 	date.setHours(0, 0, 0, 0);
		// 	if (match[2] === "yesterday") date.setDate(date.getDate() - 1);
		// 	if (match[1] === "<") filters.createdBefore = date.getTime();
		// 	if (match[1] === ">") filters.createdAfter = date.getTime();
		// 	if (!match[1]) filters.createdOn = date;
		// 	text = text.replace(/\s*created:[<>]?(\S+)\s*/, " ");
		// }

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
					<div className="search-input">
						<Icon
							name="search"
							className="search"
							onClick={() => fetchLogs(derivedState.entityGuid)}
						/>
						<input
							name="q"
							ref={searchInput}
							value={query}
							className="input-text control"
							type="text"
							onChange={e => {
								setQuery(e.target.value);
							}}
							placeholder="Search entity logs"
							autoFocus
						/>
					</div>
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
