import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";

export const NRQLResultsBillboard = (props: { results: NRQLResult[] }) => {
	let firstResult = props.results[0];
	let onlyKey = Object.keys(firstResult)[0];
	const value = firstResult[onlyKey];

	return (
		<>
			<h1>{value}</h1>
		</>
	);
};
