import React, { useState } from "react";
import styled from "styled-components";
import Button from "../Button";
import { HostApi } from "../../webview-api";
import {
	EntityAccount,
	GetNRQLRequestType,
	NRQLResult,
	isNRErrorResponse,
} from "@codestream/protocols/agent";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { NRQLResultsTable } from "./NRQLResultsTable";
import { NRQLResultsBillboard } from "./NRQLResultsBillboard";
import { NRQLResultsJSON } from "./NRQLResultsJSON";
import { NRQLResultsLine } from "./NRQLResultsLine";
import { NRQLResultsBar } from "./NRQLResultsBar";
import { NRQLEditor } from "./NRQLEditor";
import Icon from "../Icon";

const LayoutWrapper = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
`;

const HeaderRow = styled.div`
	width: 100%;
	height: 40px;
	background-color: #3a444b;
	display: flex;
	align-items: center;
	padding: 10px;
`;

const QueryWrapper = styled.div`
	width: 100%;
	max-height: 200px;
	padding: 0px;
	border: 1px solid #3a444c;
`;

const ActionRow = styled.div`
	width: 100%;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid #3a444c;
	padding: 10px 0;
`;

const DropdownContainer = styled.div`
	display: flex;
`;

const ButtonContainer = styled.div`
	display: flex;
`;

const ResultsRow = styled.div`
	flex: 1;
	width: 100%;
`;

export const NRQLPanel = (props: {
	entityAccounts: EntityAccount[];
	entryPoint: string;
	entityGuid?: string;
	suppliedQuery?: string;
}) => {
	const [query, setQuery] = useState<string>("");
	const [results, setResults] = useState<NRQLResult[]>([]);
	const [resultsTypeGuess, setResultsTypeGuess] = useState<string>("table");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [totalItems, setTotalItems] = useState<number>(0);
	const [nrqlError, setNRQLError] = useState<string | undefined>("");

	const handleError = (message: string) => {
		setNRQLError(message);
		console.error(message);
	};

	useDidMount(() => {
		if (props.suppliedQuery) {
			setQuery(props.suppliedQuery);
			executeNRQL(props.entityGuid!, props.suppliedQuery);
		}
	});

	const checkKeyPress = e => {
		if (e.key === "Enter" || e.which === 13 || e.keyCode === 13) {
			if (e.metaKey || e.ctrlKey) {
				executeNRQL(props.entityGuid!);
			}
		}
	};

	const executeNRQL = async (entityGuid: string, suppliedQuery?: string) => {
		try {
			const nrqlQuery = suppliedQuery || query;

			if (!nrqlQuery) {
				handleError("Please provide a query to execute");
				return;
			}

			setIsLoading(true);
			setNRQLError(undefined);
			setResults([]);
			setTotalItems(0);

			const response = await HostApi.instance.send(GetNRQLRequestType, {
				query: nrqlQuery,
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

			if (response.results && response.results.length > 0) {
				setResults(response.results);
				setTotalItems(response.results.length);
				setResultsTypeGuess(response.resultsTypeGuess);
			}
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<LayoutWrapper>
			<HeaderRow>
				<Icon
					name="terminal"
					title="Query your data"
					placement="bottom"
					delay={1}
					trigger={["hover"]}
					style={{ "margin-right": "5px" }}
				/>
				Query your data
			</HeaderRow>
			<QueryWrapper>
				<div className="search-input" style={{ width: "100%" }}>
					<NRQLEditor
						className="input-text control"
						defaultQuery={props.suppliedQuery}
						onChange={e => {
							setQuery(e.value || "");
						}}
					/>
				</div>
			</QueryWrapper>
			<ActionRow>
				<DropdownContainer>
					{/* <Dropdown></Dropdown>
					<Dropdown></Dropdown> */}
				</DropdownContainer>
				<ButtonContainer>
					{/* <Button>Clear</Button> */}
					<Button
						style={{ padding: "0 10px" }}
						onClick={() => executeNRQL(props.entityGuid!)}
						loading={isLoading}
					>
						Run
					</Button>
				</ButtonContainer>
			</ActionRow>
			<ResultsRow>
				<div>
					{!nrqlError &&
						!isLoading &&
						results &&
						totalItems > 0 &&
						resultsTypeGuess === "table" && <NRQLResultsTable results={results} />}
					{!nrqlError &&
						!isLoading &&
						results &&
						totalItems > 0 &&
						resultsTypeGuess === "billboard" && <NRQLResultsBillboard results={results} />}
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsTypeGuess === "line" && (
						<NRQLResultsLine results={results} />
					)}
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsTypeGuess === "json" && (
						<NRQLResultsJSON results={results} />
					)}
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsTypeGuess === "bar" && (
						<NRQLResultsBar results={results} />
					)}

					{nrqlError && (
						<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
							{nrqlError}
						</div>
					)}
				</div>
			</ResultsRow>
		</LayoutWrapper>
	);
};
