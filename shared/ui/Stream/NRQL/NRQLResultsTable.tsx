import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";

const NRQLResultsTableRow = (props: { result: NRQLResult; columnHeaders: string[] }) => {
	return (
		<tr
			style={{
				color: "lightgray",
				borderBottom: "1px solid lightgray",
			}}
		>
			{props.result &&
				props.columnHeaders &&
				props.columnHeaders.map(ch => {
					return <td>{props.result[ch]}</td>;
				})}
		</tr>
	);
};

export const NRQLResultsTable = (props: { results: NRQLResult[] }) => {
	const columnHeaders = Object.keys(props.results[0]);

	const renderHeaderRow = () => {
		return (
			<tr>
				{columnHeaders &&
					columnHeaders.map(columnHeader => {
						return (
							<th
								style={{
									border: "1px solid darkgray",
									padding: "3px 8px 3px 8px",
								}}
							>
								{columnHeader}
							</th>
						);
					})}
			</tr>
		);
	};

	return (
		<>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead>{renderHeaderRow()}</thead>
				<tbody>
					{props.results.map(r => (
						<NRQLResultsTableRow result={r} columnHeaders={columnHeaders} />
					))}
				</tbody>
			</table>
		</>
	);
};
