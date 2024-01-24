import React from "react";
import { Editor } from "@monaco-editor/react";

export function MonacoEditor(props: {
	onChange?: (e: { value: string | undefined }) => void;
	className?: string;
	defaultLanguage?: string;
	defaultValue?: string;
	// TODO this any
	onMount?: any;
	height?: string;
	onValidate?: (markers: any[]) => {};
	theme?: "vs-dark" | "light";
	options?: any;
}) {
	const handleEditorDidMount = async (editor: any, monaco: any) => {
		editor.updateOptions({
			find: {
				seedSearchStringFromSelection: false,
				decorationsIgnoredDuringNavigation: [],
				autoFindInSelection: false,
				addExtraSpaceOnTop: false,
				jumpToNextFindMatch: false,
				jumpToPrevFindMatch: false,
			},
			folding: false,
			glyphMargin: false,
			lineDecorationsWidth: 0,
			lineNumbers: "off",
			minimap: {
				enabled: false,
				renderOverviewRuler: false,
			},
			overviewRulerLanes: 0,
			scrollBeyondLastLine: false,
			wordwrap: "on",
			...(props.options || {}),
		});

		editor.focus();
	};
	return (
		<>
			<Editor
				height={props.height}
				className={props.className}
				defaultLanguage={props.defaultLanguage}
				defaultValue={props.defaultValue}
				theme={props.theme || "vs-dark"}
				onMount={(editor: any, monaco: any) => {
					handleEditorDidMount(editor, monaco);

					if (props.onMount) {
						props.onMount(editor, monaco);
					}
				}}
				onValidate={props.onValidate}
				onChange={e => {
					if (props.onChange) {
						props.onChange({ value: e });
					}
				}}
			/>
		</>
	);
}
