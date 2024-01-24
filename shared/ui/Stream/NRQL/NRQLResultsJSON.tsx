import React, { useContext, useRef } from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { MonacoEditor } from "./MonacoEditor";
import { isDarkTheme } from "@codestream/webview/src/themes";
import { ThemeContext } from "styled-components";

export const NRQLResultsJSON = (props: { results: NRQLResult[] }) => {
	const themeContext = useContext(ThemeContext);
	const monacoRef = useRef<any>(null);

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
			readOnly: true,
			scrollBeyondLastLine: false,
			wordwrap: "on",
		});
		monacoRef.current = monaco;
	};

	return (
		<>
			<MonacoEditor
				height="500px"
				defaultLanguage="json"
				defaultValue={JSON.stringify(props.results, null, 4)}
				onMount={handleEditorDidMount}
				theme={isDarkTheme(themeContext) ? "vs-dark" : "light"}
			/>
		</>
	);
};
