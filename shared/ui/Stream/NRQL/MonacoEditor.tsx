import React from "react";
import { Editor } from "@monaco-editor/react";

export function MonacoEditor(props: {
	onChange: (e: { value: string | undefined }) => void;
	className?: string;
	defaultLanguage?: string;
	defaultValue?: string;
	// TODO this any
	onMount: any;
	height?: string;
	onValidate?: (markers: any[]) => {};
	theme?: "vs-dark" | "light";
}) {
	return (
		<>
			<Editor
				height={props.height}
				className={props.className}
				defaultLanguage={props.defaultLanguage}
				defaultValue={props.defaultValue}
				theme={props.theme || "vs-dark"}
				onMount={props.onMount}
				onValidate={props.onValidate}
				onChange={e => {
					props.onChange({ value: e });
				}}
			/>
		</>
	);
}
