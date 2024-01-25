import { HostApi } from "@codestream/webview/webview-api";
import { Monaco } from "@monaco-editor/react";
import React, { useContext, useRef } from "react";
import {
	GetNRQLCompletionItemsType,
	GetNRQLConstantsRequestType,
} from "../../../util/src/protocol/agent/agent.protocol.providers";
import { isDarkTheme } from "@codestream/webview/src/themes";
import type monaco from "monaco-editor";
import { ThemeContext } from "styled-components";
// transient dependency
import { MonacoEditor } from "./MonacoEditor";

export function NRQLEditor(props: {
	onChange: (e: { value: string | undefined }) => void;
	onSubmit?: (e: { value: string | undefined }) => void;
	className?: string;
	defaultQuery?: string;
}) {
	const themeContext = useContext(ThemeContext);
	const theme = isDarkTheme(themeContext) ? "vs-dark" : "light";
	let monacoRef = useRef<any>(null);
	let editorRef = useRef<any>(null);

	const handleEditorDidMount = async (
		editor: monaco.editor.IStandaloneCodeEditor,
		monaco: Monaco
	) => {
		monacoRef.current = monaco;
		editorRef.current = editor;

		if (props.onSubmit) {
			const handleKeySubmit = e => {
				try {
					if (props.onSubmit) {
						const val = editorRef.current.getValue();
						props.onSubmit({ value: val });
					}
				} catch (ex) {}
			};

			editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.Enter, handleKeySubmit);
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleKeySubmit);
		}

		monaco.languages.register({ id: "nrql" });

		const response = await HostApi.instance.send(GetNRQLConstantsRequestType, {});

		// Register the completion provider
		monaco.languages.registerCompletionItemProvider("nrql", {
			triggerCharacters: [" "],
			provideCompletionItems: async (model, position) => {
				const currentLine = model.getLineContent(position.lineNumber);
				try {
					const response = await HostApi.instance.send(GetNRQLCompletionItemsType, {
						query: currentLine,
					});
					return {
						suggestions: response?.items?.length
							? response.items.map(_ => {
									// TODO these won't render correctly without a <Link /> component
									// hide them for now
									return {
										..._,
										documentation: null,
									};
							  })
							: [],
					};
				} catch (ex) {
					return { suggestions: [] as any };
				}
			},
		});

		// const customTheme = {
		// 	base: theme,
		// 	inherit: true,
		// 	rules: [{ token: "support.function.nrql", foreground: "#52a7f7" }],
		// };

		// monaco.editor.setTheme("nrql-theme", customTheme);

		monaco.languages.setLanguageConfiguration("nrql", {
			autoClosingPairs: [
				{ open: "{", close: "}" },
				{ open: "[", close: "]" },
				{ open: "(", close: ")" },
			],
		});

		monaco.languages.setMonarchTokensProvider("nrql", {
			tokenizer: {
				root: [
					[new RegExp(response.keywords.map(_ => _.label).join("|"), "i"), "keyword.nrql"],
					[
						new RegExp(
							response.operators
								.map(_ => _.label.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"))
								.join("|"),
							"i"
						),
						"keyword.operator.nrql",
					],
					[
						new RegExp(response.functions.map(_ => _.label).join("|"), "i"),
						"support.function.nrql",
					],
				],
			},
		});

		editor.focus();
	};

	return (
		<>
			<MonacoEditor
				height="10vh"
				className={props.className}
				defaultLanguage="nrql"
				defaultValue={props.defaultQuery || "FROM "}
				theme={theme}
				onMount={handleEditorDidMount}
				onChange={e => {
					props.onChange(e);
				}}
			/>
		</>
	);
}
