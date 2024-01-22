import React, { useState } from "react";
import { PanelHeader } from "../../src/components/PanelHeader";
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
		textarea.control {
			padding: 5px;
			height: 100%;
			width: 100%;
			border: 1px solid var(--base-border-color);
			border-left: none;
			margin-left: -1px;
		}
	}
`;

export const NRQLPanel = (props: {
	entityAccounts: EntityAccount[];
	entityGuid?: string;
	suppliedQuery?: string;
}) => {
	const [query, setQuery] = useState<string>("");
	const [results, setResults] = useState<NRQLResult[]>([]);
	const [resultsType, setResultsType] = useState<string>("table");
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
				setResultsType(response.resultsType);
			}
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<PanelHeader title="NRQL Query">
				<SearchBar className="search-bar">
					<div className="search-input" style={{ width: "100%", paddingRight: "10px" }}>
						<textarea
							name="q"
							value={query}
							className="input-text control"
							onKeyDown={checkKeyPress}
							onChange={e => {
								setQuery(e.target.value);
							}}
							autoFocus
						/>
					</div>
					<Button
						style={{ paddingLeft: "8px", paddingRight: "8px" }}
						onClick={() => executeNRQL(props.entityGuid!)}
						loading={isLoading}
					>
						Execute NRQL
					</Button>
				</SearchBar>
			</PanelHeader>
			<div
				style={{
					padding: "0px 20px 0px 20px",
					marginBottom: "20px",
				}}
			>
				{!isLoading && totalItems > 0 && (
					<div>
						<span style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>
							{totalItems.toLocaleString()} {totalItems === 1 ? "Record" : "Records"}
						</span>{" "}
					</div>
				)}

				<div>
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsType === "table" && (
						<NRQLResultsTable results={results} />
					)}
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsType === "billboard" && (
						<NRQLResultsBillboard results={results} />
					)}
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsType === "line" && (
						<NRQLResultsLine results={results} />
					)}
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsType === "json" && (
						<NRQLResultsJSON results={results} />
					)}
					{!nrqlError && !isLoading && results && totalItems > 0 && resultsType === "bar" && (
						<NRQLResultsBar results={results} />
					)}

					{nrqlError && (
						<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
							<h4>{nrqlError}</h4>
						</div>
					)}
				</div>
			</div>
		</>
	);
};
