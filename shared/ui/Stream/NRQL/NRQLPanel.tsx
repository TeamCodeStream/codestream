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
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
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
				setColumnHeaders(Object.keys(response.results[0]));
			}
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const renderHeaderRow = () => {
		return (
			<tr>
				{columnHeaders &&
					columnHeaders.map(ch => {
						return (
							<th
								style={{
									border: "1px solid darkgray",
									padding: "3px 8px 3px 8px",
								}}
							>
								{ch}
							</th>
						);
					})}
			</tr>
		);
	};

	const NRQLResultRow = (props: { result: NRQLResult }) => {
		return (
			<tr
				style={{
					color: "lightgray",
					borderBottom: "1px solid lightgray",
				}}
			>
				{props.result &&
					columnHeaders &&
					columnHeaders.map(ch => {
						return <td>{props.result[ch]}</td>;
					})}
			</tr>
		);
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
							{totalItems.toLocaleString()} Records
						</span>{" "}
					</div>
				)}

				<div>
					{!nrqlError && !isLoading && results && totalItems > 0 && (
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>{renderHeaderRow()}</thead>
							<tbody>
								{results.map(r => (
									<NRQLResultRow result={r} />
								))}
							</tbody>
						</table>
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
