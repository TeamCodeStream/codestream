import {
	EntityAccount,
	GetLogFieldDefinitionsRequestType,
	GetLoggingEntitiesRequestType,
	GetLogsRequestType,
	GetObservabilityEntityByGuidRequestType,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	GetSurroundingLogsRequestType,
	isNRErrorResponse,
	LogFieldDefinition,
	LogResult,
	LogResultSpecialColumns,
	TelemetryData,
} from "@codestream/protocols/agent";
import { IdeNames, OpenEditorViewNotificationType } from "@codestream/protocols/webview";
import { parseId } from "@codestream/webview/utilities/newRelic";
import React, { useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import Select, { components, OptionProps } from "react-select";
import { AsyncPaginate } from "react-select-async-paginate";
import styled from "styled-components";
import { PanelHeader } from "../../src/components/PanelHeader";
import { useDidMount } from "../../utilities/hooks";
import { HostApi } from "../../webview-api";
import Button from "../Button";
import Icon from "../Icon";
import { Link } from "../Link";
import { APMLogRow } from "./APMLogRow";
import { PanelHeaderTitleWithLink } from "../PanelHeaderTitleWithLink";
import { Disposable } from "@codestream/webview/utils";
import { isEmpty as _isEmpty } from "lodash";
import { APMLogTableLoading } from "./APMLogTableLoading";
import { TableWindow } from "../TableWindow";

interface SelectedOption {
	value: string;
	label: string;
}

const LogFilterBarContainer = styled.div`
	padding-bottom: 10px;

	.log-filter-bar-row {
		display: flex;

		.log-filter-bar-service {
			flex: 8;
		}

		.log-filter-bar-since {
			padding-left: 10px;
			flex: 2;
			justify-content: flex-end;
		}

		.log-filter-bar-query {
			flex: 9;

			.icon.search {
				top: 24px;
				left: 8px;
			}

			input.control {
				width: 100%;
				padding-left: 30px !important;
				border: 1px solid var(--base-border-color);
			}
		}

		.log-filter-bar-search {
			padding-left: 10px;
			flex: 1;
			justify-content: flex-end;

			button.query {
				width: 100%;
				height: 28px;
				margin-top: 18px;
			}
		}
	}
`;

type AdditionalType = { nextCursor?: string };

interface EntityAccountOption {
	label: string;
	value: string;
	accountName: string;
	entityTypeDescription: string;
	entityAccount: EntityAccount;
}

const OptionName = styled.div`
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
`;

const OptionType = styled.span`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const OptionAccount = styled.div`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const HeaderContainer = styled.div`
	display: flex;
	overflow: hidden;
	// overflow-y: scroll;
`;

const TimestampHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 40px;
	background: var(--base-background-color);
	width: 20%;
	border-left: 1px solid var(--base-border-color);
	border-top: 1px solid var(--base-border-color);
	border-bottom: 1px solid var(--base-border-color);
`;

const MessageHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 40px;
	background: var(--base-background-color);
	width: 80%;
	border: 1px solid var(--base-border-color);
`;

const Option = (props: OptionProps) => {
	let subtleLabel = `${props.data?.entityTypeDescription} | `;
	subtleLabel += props.data?.entityAccount.type ? `${props.data?.entityAccount.type} | ` : "";
	subtleLabel += props.data?.entityAccount.entityGuid;
	subtleLabel = ` (${subtleLabel})`;

	const children = (
		<>
			<OptionName>
				{props.data?.label}
				<OptionType>{subtleLabel}</OptionType>
			</OptionName>
			<OptionAccount>
				{props.data?.accountName} ({props.data?.entityAccount.accountId})
			</OptionAccount>
		</>
	);
	return <components.Option {...props} children={children} />;
};

export const APMLogSearchPanel = (props: {
	entryPoint: string;
	entityGuid?: string;
	traceId?: string;
	suppliedQuery?: string;
	ide?: { name?: IdeNames };
}) => {
	const [fieldDefinitions, setFieldDefinitions] = useState<LogFieldDefinition[]>([]);
	const [isInitializing, setIsInitializing] = useState<boolean>();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [query, setQuery] = useState<string>("");
	const [hasSearched, setHasSearched] = useState<boolean>(false);
	const [selectedSinceOption, setSelectedSinceOption] = useState<SelectedOption | undefined>(
		undefined
	);
	const [selectSinceOptions, setSelectSinceOptions] = useState<SelectedOption[]>([]);
	const [selectedEntityAccount, setSelectedEntityAccount] = useState<OptionProps | undefined>(
		undefined
	);

	const [originalSearchResults, setOriginalSearchResults] = useState<LogResult[]>([]);
	const [searchResults, setSearchResults] = useState<LogResult[]>([]);

	const [currentShowSurroundingIndex, setCurrentShowSurroundingIndex] = useState<
		number | undefined
	>(undefined);
	const [queriedWithNonEmptyString, setQueriedWithNonEmptyString] = useState<boolean>(false);
	const [totalItems, setTotalItems] = useState<number>(0);
	const [logError, setLogError] = useState<string | undefined>("");
	const { height, ref } = useResizeDetector();
	const trimmedListHeight: number = (height ?? 0) - (height ?? 0) * 0.08;
	const disposables: Disposable[] = [];
	const [currentTraceId, setTraceId] = useState<string | undefined>(props.traceId);

	useDidMount(() => {
		setIsInitializing(true);

		disposables.push(
			// only utilized for code searches so we can re-use search windows
			HostApi.instance.on(OpenEditorViewNotificationType, e => {
				setSelectSinceOptions(sinceOptions);
				setSelectedSinceOption(defaultOption);
				if (e.traceId) {
					setTraceId(e.traceId);
					fetchLogs(selectedEntityAccount.entityAccount, undefined, e.traceId);
				}
				if (e.query && e.query !== query) {
					setQuery(e.query!);
					fetchLogs(selectedEntityAccount.entityAccount, e.query);
				}
			})
		);

		const defaultOption: SelectedOption = {
			value: props.traceId || currentTraceId ? "7 DAYS AGO" : "30 MINUTES AGO",
			label: props.traceId || currentTraceId ? "7 Days Ago" : "30 Minutes Ago",
		};

		const sinceOptions: SelectedOption[] = [
			{ value: "30 MINUTES AGO", label: "30 Minutes Ago" },
			{ value: "60 MINUTES AGO", label: "60 Minutes Ago" },
			{ value: "3 HOURS AGO", label: "3 Hours Ago" },
			{ value: "8 HOURS AGO", label: "8 Hours Ago" },
			{ value: "1 DAY AGO", label: "1 Day Ago" },
			{ value: "3 DAYS AGO", label: "3 Days Ago" },
			{ value: "7 DAYS AGO", label: "7 Days Ago" },
		];

		if (props.traceId) {
			setTraceId(props.traceId);
		}

		setSelectSinceOptions(sinceOptions);
		setSelectedSinceOption(defaultOption);

		// possible there is no searchTerm
		if (props.suppliedQuery) {
			setQuery(props.suppliedQuery);
		}

		const finishHandlingEntityAccount = (entityAccount: EntityAccount) => {
			handleDefaultEntitySelection(entityAccount);

			fetchFieldDefinitions(entityAccount, props.traceId);
			fetchLogs(entityAccount, props.suppliedQuery, props.traceId);
		};

		let entityAccounts: EntityAccount[] = [];

		HostApi.instance
			.send(GetObservabilityReposRequestType, { force: true })
			.then((_: GetObservabilityReposResponse) => {
				entityAccounts = _.repos?.flatMap(r => r.entityAccounts) ?? [];

				let entityAccount = entityAccounts.find(ea => ea.entityGuid === props.entityGuid);

				if (entityAccount) {
					trackOpenTelemetry(props.entryPoint, entityAccount.entityGuid, entityAccount.accountId);
					finishHandlingEntityAccount(entityAccount);
				} else if (props.entityGuid) {
					HostApi.instance
						.send(GetObservabilityEntityByGuidRequestType, { id: props.entityGuid })
						.then(({ entity }) => {
							trackOpenTelemetry(props.entryPoint, entity.entityGuid, entity.accountId);
							finishHandlingEntityAccount(entity);
						})
						.catch(ex => {
							handleError(
								"We ran into an error fetching a default service. Please select a service from the list above."
							);
							trackOpenTelemetry(props.entryPoint);
						});
				} else {
					// its possible a race condition could get us here and the entity guid passed in doesn't match any in the list
					// allow it, so the user can still use the panel - it just won't have a default selection/query/execution.
					trackOpenTelemetry(props.entryPoint);
				}
			})
			.catch(ex => {
				handleError(
					"We ran into an error fetching a default service. Please select a service from the list above."
				);
			})
			.finally(() => {
				setIsInitializing(false);
			});

		return () => {
			disposables && disposables.forEach(_ => _.dispose());
		};
	});

	const handleDefaultEntitySelection = (entityAccount: EntityAccount) => {
		if (!entityAccount) {
			setSelectedEntityAccount(null);
			return;
		}

		let subtleLabel = `${entityAccount.entityTypeDescription} | `;
		subtleLabel += entityAccount.type ? `${entityAccount.type} | ` : "";
		subtleLabel += entityAccount.entityGuid;
		subtleLabel = ` (${subtleLabel})`;

		const customLabel = (
			<>
				<span>Service: {entityAccount.entityName}</span>
				<span className="subtle">{subtleLabel}</span>
			</>
		);

		setSelectedEntityAccount({
			value: entityAccount.entityGuid,
			label: customLabel,
			accountName: entityAccount.accountName,
			entityTypeDescription: entityAccount.entityTypeDescription,
			entityAccount: entityAccount,
		});
	};

	const handleSelectDropdownOption = (optionProps: OptionProps) => {
		if (!optionProps) {
			setSelectedEntityAccount(null);
			return;
		}

		let subtleLabel = `${optionProps.entityTypeDescription} | `;
		subtleLabel += optionProps.entityAccount.type ? `${optionProps.entityAccount.type} | ` : "";
		subtleLabel += optionProps.entityAccount.entityGuid;
		subtleLabel = ` (${subtleLabel})`;

		const customLabel = (
			<>
				<span>Service: {optionProps.entityAccount.entityName}</span>
				<span className="subtle">{subtleLabel}</span>
			</>
		);

		setSelectedEntityAccount({
			value: optionProps.entityGuid,
			label: customLabel,
			accountName: optionProps.accountName,
			entityTypeDescription: optionProps.entityTypeDescription,
			entityAccount: optionProps.entityAccount,
		});
	};

	const handleError = (message: string) => {
		setLogError(message);
		console.error(message);
	};

	const fetchFieldDefinitions = async (entityAccount: EntityAccount, traceId?: string) => {
		try {
			const response = await HostApi.instance.send(GetLogFieldDefinitionsRequestType, {
				entity: entityAccount,
				traceId,
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
			fetchLogs(selectedEntityAccount.entityAccount);
		}
	};

	/**
	 * Given properties of a specific log entry, querys for logs that occurred BEFORE it
	 * and logs that occured AFTER it
	 */
	const fetchSurroundingLogs = async (
		entityAccount: EntityAccount,
		messageId: string,
		since: number
	) => {
		try {
			setSearchResults([]);
			setIsLoading(true);
			const response = await HostApi.instance.send(GetSurroundingLogsRequestType, {
				entity: entityAccount,
				messageId,
				since,
			});

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching surrounding log information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			const surroundingLogs: LogResult[] = [];

			if (response.beforeLogs && response.beforeLogs.length > 0) {
				surroundingLogs.push(...response.beforeLogs);
			}

			const originalLog = searchResults.find(r => {
				return r.messageId === messageId;
			});

			//this should ALWAYS be true, if not, bigger issue
			surroundingLogs.push(originalLog!);

			if (response.afterLogs && response.afterLogs.length > 0) {
				surroundingLogs.push(...response.afterLogs);
			}

			const logToPinIndex = surroundingLogs.findIndex(r => {
				return r.messageId === messageId;
			});
			surroundingLogs[logToPinIndex] = {
				...surroundingLogs[logToPinIndex],
				isShowSurrounding: "true",
			};
			setCurrentShowSurroundingIndex(logToPinIndex);
			setSearchResults(surroundingLogs);

			HostApi.instance.track("codestream/logs/show_surrounding_button clicked", {
				entity_guid: `${entityAccount.entityGuid}`,
				account_id: entityAccount.accountId,
				event_type: "click",
			});
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchLogs = async (
		entityAccount: EntityAccount,
		suppliedQuery?: string,
		traceId?: string
	) => {
		try {
			setLogError(undefined);
			setHasSearched(true);
			setIsLoading(true);
			setSearchResults([]);
			setOriginalSearchResults([]);
			setTotalItems(0);
			setCurrentShowSurroundingIndex(undefined);
			setTraceId(traceId);

			const filterText = suppliedQuery || query;

			if (!entityAccount) {
				handleError("Please select a service from the drop down before searching.");
				return;
			}

			const response = await HostApi.instance.send(
				GetLogsRequestType,
				{
					entity: entityAccount,
					traceId,
					filterText,
					limit: "MAX",
					since: selectedSinceOption?.value
						? selectedSinceOption.value
						: traceId
						? "7 DAYS AGO"
						: "30 MINUTES AGO",
					order: {
						field: "timestamp",
						direction: "DESC",
					},
				},
				{
					timeoutMs: 660000, // 11 minutes. NR1/GraphQL should timeout at 10 minutes, but we'll give it a little extra
				}
			);

			setQueriedWithNonEmptyString(!_isEmpty(filterText));

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching log information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				if (response?.error?.error?.message?.startsWith("NRQL Syntax Error")) {
					handleError(
						"Please check your syntax and try again. Note that you do not have to escape special characters. We'll do that for you!"
					);
				} else if (response?.error?.error?.message?.includes("NRDB:1101002")) {
					handleError(
						"Unfortunately, this query has timed out. Please try a shorter time range, more specific search criteria, or navigate to New Relic One to run this query."
					);
				} else {
					handleError(response.error?.error?.message ?? response.error?.error?.type);
				}
				return;
			}

			if (response.logs && response.logs.length > 0) {
				setSearchResults(response.logs);
				setOriginalSearchResults(response.logs);
				setTotalItems(response.logs.length);
			}

			trackSearchTelemetry(
				entityAccount.entityGuid,
				entityAccount.accountId,
				(response?.logs?.length ?? 0) > 0
			);
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const trackSearchTelemetry = (
		entityGuid: string,
		accountId: number,
		resultsReturned: boolean
	) => {
		HostApi.instance.track("codestream/logs/search succeeded", {
			entity_guid: `${entityGuid}`,
			account_id: accountId,
			event_type: "response",
			meta_data: `results_returned: ${resultsReturned}`,
		});
	};

	const trackOpenTelemetry = (entryPoint: string, entityGuid?: string, accountId?: number) => {
		const payload = {
			event_type: "modal_display",
			meta_data: `entry_point: ${entryPoint}`,
		} as TelemetryData;

		if (entityGuid) {
			payload["entity_guid"] = entityGuid;
		}

		if (accountId) {
			payload["account_id"] = accountId;
		}

		HostApi.instance.track("codestream/logs/webview displayed", payload);
	};

	async function loadEntities(search: string, _loadedOptions, additional?: AdditionalType) {
		const result = await HostApi.instance.send(GetLoggingEntitiesRequestType, {
			searchCharacters: search,
			nextCursor: additional?.nextCursor,
		});

		const options = result.entities.map(e => {
			return {
				label: e.entityName,
				value: e.entityGuid,
				accountName: e.accountName,
				entityTypeDescription: e.entityTypeDescription,
				entityAccount: e,
			};
		}) as EntityAccountOption[];

		return {
			options,
			hasMore: !!result.nextCursor,
			additional: {
				nextCursor: result.nextCursor,
			},
		};
	}

	const ListHeader = () => {
		return (
			<HeaderContainer>
				<TimestampHeader>
					<p>timestamp</p>
				</TimestampHeader>
				<MessageHeader>
					<p>message</p>
				</MessageHeader>
			</HeaderContainer>
		);
	};

	const updateExpandedContent = (index, updatedJsx) => {
		const newResults = [...searchResults];
		newResults[index] = { ...newResults[index], expandedContent: updatedJsx };
		setSearchResults(newResults);
	};

	const updateShowSurrounding = async (index: number, task: string) => {
		if (task === "reset") {
			const modifiedSearchResults = originalSearchResults.map(
				({ isShowSurrounding, ...keepAttrs }) => keepAttrs
			);

			setSearchResults(modifiedSearchResults);
			setOriginalSearchResults(modifiedSearchResults);
			setCurrentShowSurroundingIndex(undefined);
		} else {
			const pinnedLog = searchResults[index];
			await fetchSurroundingLogs(
				selectedEntityAccount.entityAccount,
				pinnedLog.messageId,
				parseInt(pinnedLog.timestamp)
			);
		}
	};

	const formatRowResults = () => {
		if (searchResults) {
			let _results: LogResult[] = searchResults;
			// @TODO: eventually hook up "Show More"
			// if (_results[_results.length - 1]?.showMore !== "true") {
			// 	_results.push({ showMore: "true" });
			// }
			return _results.map((r, index) => {
				const messageField = r[LogResultSpecialColumns.message];
				const severityField = r[LogResultSpecialColumns.severity];

				const timestamp = r?.timestamp;
				const message = r[messageField] ?? "";
				const severity = r[severityField] ?? "";
				const showMore = r?.showMore ? true : false;
				const expandedContent = r?.expandedContent ?? undefined;
				const isShowSurrounding = r?.isShowSurrounding ?? false;
				const entityGuid = selectedEntityAccount?.value;
				const accountId = parseId(entityGuid);
				const enableShowSurrounding = queriedWithNonEmptyString && !currentShowSurroundingIndex;

				return (
					<APMLogRow
						index={index}
						timestamp={timestamp}
						message={message}
						severity={severity}
						accountId={accountId?.accountId}
						entityGuid={entityGuid}
						logRowData={r}
						showMore={showMore}
						isShowSurrounding={isShowSurrounding}
						updateExpandedContent={updateExpandedContent}
						updateShowSurrounding={updateShowSurrounding}
						expandedContent={expandedContent}
						enableShowSurrounding={enableShowSurrounding}
					/>
				);
			});
		} else return;
	};

	return (
		<>
			<PanelHeader
				title={
					<PanelHeaderTitleWithLink
						text="Learn how to search for specific log lines in your code"
						href={`https://docs.newrelic.com/docs/codestream/observability/log-search/#context-menu`}
						title="Logs"
					/>
				}
			>
				<LogFilterBarContainer>
					<div className="log-filter-bar-row">
						<div className="log-filter-bar-service">
							<AsyncPaginate
								id="input-entity-log-autocomplete"
								name="entity-log-autocomplete"
								classNamePrefix="react-select"
								loadOptions={loadEntities}
								value={selectedEntityAccount}
								isClearable
								debounceTimeout={750}
								placeholder={`Type to search for services...`}
								onChange={newValue => {
									handleSelectDropdownOption(newValue);
								}}
								components={{ Option }}
								tabIndex={1}
							/>
						</div>

						<div className="log-filter-bar-since">
							<Select
								id="input-since"
								name="since"
								classNamePrefix="react-select"
								value={selectedSinceOption}
								placeholder="Since"
								options={selectSinceOptions}
								onChange={value => setSelectedSinceOption(value)}
								tabIndex={2}
							/>
						</div>
					</div>

					<div className="log-filter-bar-row">
						<div className="log-filter-bar-query">
							<Icon name="search" className="search" />
							<input
								data-testid="query-text"
								name="q"
								value={query}
								className="input-text control"
								type="text"
								onChange={e => {
									setQuery(e.target.value);
								}}
								onKeyDown={checkKeyPress}
								placeholder="Query logs in the selected service"
								tabIndex={3}
								autoFocus
							/>
						</div>

						<div className="log-filter-bar-search">
							<Button
								data-testid="query-btn"
								className="query"
								onClick={() =>
									fetchLogs(selectedEntityAccount.entityAccount, undefined, currentTraceId)
								}
								loading={isLoading}
								tabIndex={4}
							>
								Query Logs
							</Button>
						</div>
					</div>
				</LogFilterBarContainer>
			</PanelHeader>
			<div
				ref={ref}
				style={{
					padding: "0px 20px 0px 20px",
					marginBottom: "20px",
					width: "100%",
					height: "100%",
				}}
			>
				{/* {!isLoading && totalItems > 0 && (
					<div style={{ paddingBottom: "10px" }}>
						<span style={{ fontSize: "14px", fontWeight: "bold" }}>
							{totalItems.toLocaleString()} Logs
						</span>{" "}
						<a
							style={{ float: "right", cursor: "pointer" }}
							href="#"
							onClick={e => {
								e.preventDefault();
								HostApi.instance
									.send(ShellPromptFolderRequestType, { message: "Choose a location" })
									.then(_ => {
										if (_.path) {
											// undefined can also mean cancel, but there isn't any other flag to indicate that, so
											// no error if path is undefined
											HostApi.instance.send(SaveFileRequestType, {
												path: _.path,
												data: results,
											});
										}
									});
							}}
						>
							<Icon name="download" title="Download as JSON" />
						</a>
					</div>
				)} */}

				<div>
					{isLoading && <APMLogTableLoading height={height} />}

					{!logError &&
						!isLoading &&
						searchResults &&
						totalItems > 0 &&
						fieldDefinitions &&
						!isInitializing && (
							<>
								{ListHeader()}
								<TableWindow
									itemData={formatRowResults()}
									itemCount={searchResults.length}
									height={trimmedListHeight}
									width={"100%"}
									currentShowSurroundingIndex={currentShowSurroundingIndex}
								/>
							</>
						)}

					{!logError && !totalItems && !isLoading && !hasSearched && !isInitializing && (
						<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
							<span data-testid="default-message">
								Enter search criteria above, or just click Query to see recent logs.
							</span>
						</div>
					)}

					{!logError && !totalItems && !isLoading && hasSearched && !isInitializing && (
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
			</div>
		</>
	);
};
