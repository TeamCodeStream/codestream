import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";

export const NRQLResultsJSON = (props: { results: NRQLResult[] }) => {
	return (
		<>
			<textarea
				style={{ width: "95%", height: "500px" }}
				value={JSON.stringify(props.results, null, 4)}
			></textarea>
		</>
	);
};
