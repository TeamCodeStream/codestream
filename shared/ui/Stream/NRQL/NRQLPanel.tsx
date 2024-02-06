import React, { useEffect, useRef, useState } from "react";
import { components, OptionProps } from "react-select";
import { PanelHeader } from "../../src/components/PanelHeader";
import {
	Account,
	EntityAccount,
	GetAllAccountsRequestType,
	GetNRQLRequestType,
	isNRErrorResponse,
	NRQLResult,
} from "@codestream/protocols/agent";
import {
	OpenEditorViewNotificationType,
	OpenInBufferRequestType,
} from "@codestream/protocols/webview";
import { Disposable } from "@codestream/webview/utils";
import { AsyncPaginate } from "react-select-async-paginate";
import styled from "styled-components";
import { HostApi } from "../../webview-api";
import Button from "../Button";
import { NRQLEditor } from "./NRQLEditor";
import { NRQLResultsBar } from "./NRQLResultsBar";
import { NRQLResultsBillboard } from "./NRQLResultsBillboard";
import { NRQLResultsJSON } from "./NRQLResultsJSON";
import { NRQLResultsLine } from "./NRQLResultsLine";
import { NRQLResultsTable } from "./NRQLResultsTable";
import { parseId } from "@codestream/webview/utilities/newRelic";
import Icon from "../Icon";
import { fuzzyTimeAgoinWords } from "../Timestamp";
import { useResizeDetector } from "react-resize-detector";
import { NRQLVisualizationDropdown } from "./NRQLVisualizationDropdown";

const QueryWrapper = styled.div`
	width: 100%;
	max-height: 200px;
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

const DropdownContainer = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-bottom: 8px;
`;

const ButtonContainer = styled.div`
	display: flex;
	margin-bottom: 8px;
	justify-content: space-between;
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

const Option = (props: OptionProps) => {
	const children = (
		<>
			<OptionName>{props.data?.label}</OptionName>
		</>
	);
	return <components.Option {...props} children={children} />;
};

const DEFAULT_QUERY = "FROM ";

export const NRQLPanel = (props: {
	accountId?: number;
	entityAccounts: EntityAccount[];
	entryPoint: string;
	entityGuid?: string;
	query?: string;
}) => {
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
	const [resultsTypeGuess, setResultsTypeGuess] = useState<string>("table");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [nrqlError, setNRQLError] = useState<string | undefined>("");
	const nrqlEditorRef = useRef<any>(null);
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
					executeNRQL(selectedAccount?.value || accountId, props.entityGuid!, e.query);
				}
			})
		);

		accountsPromise = HostApi.instance.send(GetAllAccountsRequestType, {}).then(result => {
			setAccounts(result.accounts);
			if (result?.accounts?.length) {
				if (accountId) {
					const foundAccount = result.accounts.find(_ => _.id === accountId);
					if (foundAccount) {
						setSelectedAccount(formatSelectedAccount(foundAccount));
					}
				} else if (result.accounts.length === 1) {
					setSelectedAccount(formatSelectedAccount(result.accounts[0]));
				}
			}

			if (props.query) {
				setUserQuery(props.query);
				executeNRQL(selectedAccount?.value || accountId, props.entityGuid!, props.query);
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
		accountId: number | undefined,
		entityGuid: string,
		suppliedQuery?: string
	) => {
		try {
			const nrqlQuery = suppliedQuery || userQuery;

			if (!nrqlQuery) {
				handleError("Please provide a query to execute");
				return;
			}

			setIsLoading(true);
			setNRQLError(undefined);
			setResults([]);
			setResultsTypeGuess("");
			setEventType("");
			setSince("");

			const response = await HostApi.instance.send(GetNRQLRequestType, {
				accountId,
				query: nrqlQuery.replace(/[\n\r]/g, " "),
				entityGuid,
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
					meta_data: `default_visualization: ${response.resultsTypeGuess}`,
					// TODO add recent queries
					meta_data_2: `recent_query: false`,
				});

				setResults(response.results);
				setResultsTypeGuess(response.resultsTypeGuess);
				setEventType(response.eventType);
				if (response.since) {
					if (/^[0-9]+$/.test(response.since)) {
						setSince(fuzzyTimeAgoinWords(Number(response.since)) + " ago");
					} else {
						setSince(response.since.toLowerCase());
					}
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
		setResultsTypeGuess("");
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
		setResultsTypeGuess(value);
	};

	return (
		<>
			<div id="modal-root"></div>
			<PanelHeader title="Query Your Data">
				<QueryWrapper>
					<div className="search-input">
						<div style={{ marginBottom: "10px" }}>
							<AsyncPaginate
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
								isClearable
							/>
						</div>

						<div style={{ border: "var(--base-border-color) solid 1px", padding: "8px" }}>
							<NRQLEditor
								className="input-text control"
								defaultQuery={props.query || DEFAULT_QUERY}
								onChange={e => {
									setUserQuery(e.value || "");
								}}
								onSubmit={e => {
									setUserQuery(e.value!);
									executeNRQL(selectedAccount?.value, props.entityGuid!, e.value!);
								}}
								ref={nrqlEditorRef}
							/>
						</div>
					</div>
				</QueryWrapper>
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
							style={{ padding: "0 10px" }}
							onClick={() => executeNRQL(selectedAccount?.value, props.entityGuid!)}
							loading={isLoading}
						>
							Run
						</Button>
					</ButtonContainer>
				</ActionRow>
				<DropdownContainer>
					<NRQLVisualizationDropdown
						onSelectCallback={handleVisualizationDropdownCallback}
						disabledFields={[]}
						selectedValue={resultsTypeGuess}
					/>
				</DropdownContainer>
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
				<ResultsRow>
					{since && (
						<ButtonContainer>
							<div>
								<small>Since {since}</small>
							</div>
							<div>
								<a
									style={{ cursor: "pointer" }}
									href="#"
									onClick={e => {
										e.preventDefault();

										HostApi.instance.track("codestream/nrql/export downloaded", {
											account_id: selectedAccount?.value || accountId,
											event_type: "submit",
											meta_data: `format: json`,
										});

										HostApi.instance.send(OpenInBufferRequestType, {
											contentType: "json",
											data: results,
										});
									}}
								>
									<Icon name="download" title="Open Results as JSON" />
								</a>
							</div>
						</ButtonContainer>
					)}
					<div>
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess === "table" && (
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
							resultsTypeGuess === "billboard" && (
								<NRQLResultsBillboard results={results} eventType={eventType} />
							)}
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess === "line" && <NRQLResultsLine results={results} />}
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess === "json" && <NRQLResultsJSON results={results} />}
						{!nrqlError &&
							!isLoading &&
							results &&
							results.length > 0 &&
							resultsTypeGuess === "bar" && <NRQLResultsBar results={results} />}
						{noResults && <div style={{ textAlign: "center" }}>No results found</div>}
						{nrqlError && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								{nrqlError}
							</div>
						)}
					</div>
				</ResultsRow>
			</div>
		</>
	);
};
