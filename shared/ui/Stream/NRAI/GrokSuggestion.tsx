import React from "react";
import { Button } from "@codestream/webview/src/components/Button";

export const GrokSuggestion = (props: { query: string; onSelect: (text: string) => void }) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: "10px",
			}}
		>
			<div>{props.query}</div>
			<Button onClick={() => props.onSelect(`@AI ${props.query}`)}>Select</Button>
		</div>
	);
};
