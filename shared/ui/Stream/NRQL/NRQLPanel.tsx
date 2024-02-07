import {
	Account,
	GetAllAccountsRequestType,
	GetNRQLRequestType,
	NRQLResult,
	ResultsTypeGuess,
	isNRErrorResponse,
} from "@codestream/protocols/agent";
import { IdeNames, OpenEditorViewNotificationType } from "@codestream/protocols/webview";
import { parseId } from "@codestream/webview/utilities/newRelic";
import { Disposable } from "@codestream/webview/utils";
import React, { useEffect, useRef, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { OptionProps, components } from "react-select";
import { AsyncPaginate } from "react-select-async-paginate";
import styled from "styled-components";
import { PanelHeader } from "../../src/components/PanelHeader";
import { HostApi } from "../../webview-api";
import Button from "../Button";
import { fuzzyTimeAgoinWords } from "../Timestamp";
import ExportResults from "./ExportResults";
import { NRQLEditor } from "./NRQLEditor";
import { NRQLResultsBar } from "./NRQLResultsBar";
import { NRQLResultsBillboard } from "./NRQLResultsBillboard";
import { NRQLResultsJSON } from "./NRQLResultsJSON";
import { NRQLResultsLine } from "./NRQLResultsLine";
import { NRQLResultsTable } from "./NRQLResultsTable";
import { NRQLVisualizationDropdown } from "./NRQLVisualizationDropdown";
import { RecentQueries } from "./RecentQueries";

const QueryWrapper = styled.div`
	width: 100%;
	padding: 0px;
`;

const ActionRow = styled.div`
	width: 100%;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 0;
`;

const AccountRecentContainer = styled.div`
	display: flex;
	justify-content: space-between;
`;

const AccountContainer = styled.div`
	flex-grow: 1;
`;

const RecentContainer = styled.div`
	margin-left: auto;
`;

const DropdownContainer = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-bottom: 8px;
`;

const ButtonContainer = styled.div`
	display: flex;
	justify-content: space-between;
`;

const SinceContainer = styled.div`
	display: flex;
	justify-content: space-between;
	margin-bottom: 8px;
`;

const ResultsRow = styled.div`
	flex: 1;
	width: 100%;
`;

const OptionName = styled.div`
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
`;

const ResultsContainer = styled.div`
	padding: 0px 20px 13px 20px;
	width: 100%;
	overflow: hidden;
`;

const ResizeEditorContainer = styled.div`
	resize: vertical;
	overflow: auto;
	min-height: 120px;
	max-height: 40vh;
	border: var(--base-border-color) solid 1px;
	padding: 8px;
`;

const Option = (props: OptionProps) => {
	const children = (
		<>
			<OptionName>{props.data?.label}</OptionName>
		</>
	);
	return <components.Option {...props} children={children} />;
};

const DEFAULT_QUERY = "FROM ";

export const DEFAULT_VISUALIZATION_GUESS = {
	selected: "table",
	enabled: ["json", "billboard", "line", "bar", "table"],
};

export const NRQLPanel = (props: {
	accountId?: number;
	entryPoint: string;
	entityGuid?: string;
	query?: string;
	ide?: { name?: IdeNames };
}) => {
	const supports = { export: props.ide?.name === "VSC" };

	const accountId = props.accountId
		? props.accountId
		: props.entityGuid
		? parseId(props.entityGuid)?.accountId
		: undefined;

	const [userQuery, setUserQuery] = useState<string>("");
	const [results, setResults] = useState<NRQLResult[]>([]);
	const [noResults, setNoResults] = useState<boolean>(false);
	const [eventType, setEventType] = useState<string>();
	const [since, setSince] = useState<string>();
	const [selectedAccount, setSelectedAccount] = useState<
		{ label: string; value: number } | undefined
	>(undefined);
	const [accounts, setAccounts] = useState<{ name: string; id: number }[] | undefined>(undefined);
	const [resultsTypeGuess, setResultsTypeGuess] = useState<ResultsTypeGuess>(
		DEFAULT_VISUALIZATION_GUESS as ResultsTypeGuess
	);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [nrqlError, setNRQLError] = useState<string | undefined>("");
	const [shouldRefetchRecentQueriesTimestamp, setShouldRefetchRecentQueriesTimestamp] = useState<
		number | undefined
	>(undefined);
	const nrqlEditorRef = useRef<any>(null);
	const { height: editorHeight, ref: editorRef } = useResizeDetector();
	const { width, height, ref } = useResizeDetector();
	const trimmedHeight: number = (height ?? 0) - (height ?? 0) * 0.05;

	const disposables: Disposable[] = [];

	let accountsPromise;

	useEffect(() => {
		HostApi.instance.track("codestream/nrql/webview opened", {
			event_type: "click",
			meta_data: `entry_point: ${props.entryPoint}`,
		});

		disposables.push(
			HostApi.instance.on(OpenEditorViewNotificationType, e => {
				if (nrqlEditorRef?.current) {
					nrqlEditorRef.current!.setValue(e.query);
					setUserQuery(e.query!);
					executeNRQL((selectedAccount?.value || accountId)!, e.query!);
				}
			})
		);

		accountsPromise = HostApi.instance.send(GetAllAccountsRequestType, {}).then(result => {
			setAccounts(result.accounts);
			let foundAccount: Account | undefined = undefined;
			if (result?.accounts?.length) {
				if (accountId) {
					foundAccount = result.accounts.find(_ => _.id === accountId);
				}
				if (!foundAccount) {
					foundAccount = result.accounts[0];
				}
				if (foundAccount) {
					setSelectedAccount(formatSelectedAccount(foundAccount));
				}
			}
			if (!foundAccount) {
				handleError("Missing account");
			} else {
				if (props.query) {
					setUserQuery(props.query);
					executeNRQL(foundAccount.id, props.query);
				}
			}
		});
		return () => {
			disposables && disposables.forEach(_ => _.dispose());
		};
	}, []);

	const handleError = (message: string) => {
		setNRQLError(message);
		console.error(message);
	};

	const executeNRQL = async (
		accountId: number,
		nrqlQuery: string,
		options: { isRecent: boolean } = { isRecent: false }
	) => {
		try {
			if (!nrqlQuery) {
				handleError("Please provide a query to execute");
				return;
			}

			setIsLoading(true);
			setNRQLError(undefined);
			setResults([]);
			setResultsTypeGuess({});
			setEventType("");
			setSince("");

			const response = await HostApi.instance.send(GetNRQLRequestType, {
				accountId,
				query: nrqlQuery.replace(/[\n\r]/g, " "),
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

			setNoResults(!response.results || !response.results.length);
			if (response.results && response.results.length > 0) {
				HostApi.instance.track("codestream/nrql/query submitted", {
					account_id: response.accountId,
					event_type: "response",
					meta_data: `default_visualization: ${response.resultsTypeGuess?.selected}`,
					meta_data_2: `recent_query: ${options.isRecent}`,
				});

				setResults(response.results);
				setResultsTypeGuess(response.resultsTypeGuess || {});
				setEventType(response.eventType);
				if (response.since) {
					if (/^[0-9]+$/.test(response.since)) {
						setSince(fuzzyTimeAgoinWords(Number(response.since)) + " ago");
					} else {
						setSince(response.since.toLowerCase());
					}
				}
				if (shouldRefetchRecentQueriesTimestamp == null) {
					// first time, set to 0 (don't trigger an update)
					setShouldRefetchRecentQueriesTimestamp(0);
				} else if (!isNaN(shouldRefetchRecentQueriesTimestamp)) {
					setShouldRefetchRecentQueriesTimestamp(new Date().getTime());
				}
			}
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const resetQuery = () => {
		nrqlEditorRef.current!.setValue(DEFAULT_QUERY);
		setUserQuery(DEFAULT_QUERY);

		setNRQLError(undefined);
		setResults([]);
		setResultsTypeGuess({});
		setEventType("");
		setSince("");
		setNoResults(false);
	};

	const formatSelectedAccount = (account: Account) => {
		return {
			label: `Account: ${account.id} - ${account.name}`,
			value: account.id,
		};
	};

	const handleVisualizationDropdownCallback = value => {
		setResultsTypeGuess(prevState => ({
			...prevState,
			selected: value,
		}));
	};

	return (
		<>
			<div id="modal-root"></div>
			<PanelHeader title="Query Your Data">
				<QueryWrapper>
					<div className="search-input">
						<div style={{ marginBottom: "10px" }}>
							<AccountRecentContainer>
								<AccountContainer>
									<AsyncPaginate
										style={{ width: "300px" }}
										id="input-account-autocomplete"
										name="account-autocomplete"
										classNamePrefix="react-select"
										loadOptions={async (
											search: string,
											_loadedOptions,
											additional?: { nextCursor?: string }
										) => {
											await accountsPromise;

											return {
												options: accounts!
													.filter(_ =>
														search ? _.name.toLowerCase().indexOf(search.toLowerCase()) > -1 : true
													)
													.map(account => {
														return formatSelectedAccount(account);
													}),
												hasMore: false,
											};
										}}
										value={selectedAccount}
										debounceTimeout={750}
										placeholder={`Type to search for accounts...`}
										onChange={newValue => {
											setSelectedAccount(newValue);
										}}
										components={{ Option }}
										tabIndex={1}
										autoFocus
										isClearable={false}
									/>
								</AccountContainer>
								<RecentContainer>
									<RecentQueries
										lastRunTimestamp={shouldRefetchRecentQueriesTimestamp}
										onSelect={e => {
											if (!e) return;
											// a query may cross accounts -- get the account for it
											const newAccount = formatSelectedAccount(e.accounts[0]);
											setSelectedAccount(newAccount);

											let value = e.query;
											if (nrqlEditorRef?.current) {
												nrqlEditorRef.current!.setValue(value);
											}
											setUserQuery(value!);
											executeNRQL((newAccount?.value || selectedAccount?.value)!, value!, {
												isRecent: true,
											});
										}}
									/>
								</RecentContainer>
							</AccountRecentContainer>
						</div>
						<ResizeEditorContainer ref={editorRef}>
							<NRQLEditor
								className="input-text control"
								defaultValue={props.query || DEFAULT_QUERY}
								height={`${editorHeight}px`}
								onChange={e => {
									setUserQuery(e.value || "");
								}}
								onSubmit={e => {
									setUserQuery(e.value!);
									executeNRQL(selectedAccount?.value!, e.value!);
								}}
								ref={nrqlEditorRef}
							/>
						</ResizeEditorContainer>
						<ActionRow>
							<DropdownContainer></DropdownContainer>
							<ButtonContainer>
								<Button
									style={{ padding: "0 10px", marginRight: "5px" }}
									isSecondary={true}
									onClick={() => {
										resetQuery();
									}}
								>
									Clear
								</Button>
								<Button
									data-testid="run"
									style={{ padding: "0 10px" }}
									onClick={() => executeNRQL(selectedAccount?.value!, userQuery)}
									loading={isLoading}
								>
									Run
								</Button>
							</ButtonContainer>
						</ActionRow>
					</div>
				</QueryWrapper>
			</PanelHeader>
			<ResultsContainer ref={ref}>
				<ResultsRow>
					{since && (
						<SinceContainer>
							<div style={{ paddingTop: "2px" }}>
								<small>Since {since}</small>
							</div>

							<div style={{ marginLeft: "auto", marginRight: "8px", fontSize: "11px" }}>
								<NRQLVisualizationDropdown
									onSelectCallback={handleVisualizationDropdownCallback}
									resultsTypeGuess={resultsTypeGuess}
								/>
							</div>

							{supports.export && (
								<div style={{ paddingTop: "2px" }}>
									<ExportResults
										results={results}
										accountId={selectedAccount?.value || accountId}
									/>
								</div>
							)}
						</SinceContainer>
					)}
					<div>
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess.selected === "table" && (
								<NRQLResultsTable
									width={width || "100%"}
									height={trimmedHeight}
									results={results}
								/>
							)}
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess.selected === "billboard" && (
								<NRQLResultsBillboard results={results} eventType={eventType} />
							)}
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess.selected === "line" && <NRQLResultsLine results={results} />}
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess.selected === "json" && <NRQLResultsJSON results={results} />}
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess.selected === "bar" && <NRQLResultsBar results={results} />}
						{noResults && <div style={{ textAlign: "center" }}>No results found</div>}
						{nrqlError && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								{nrqlError}
							</div>
						)}
					</div>
				</ResultsRow>
			</ResultsContainer>
		</>
	);
};
