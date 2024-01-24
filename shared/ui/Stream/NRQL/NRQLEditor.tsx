import React, { useContext, useRef } from "react";
import { HostApi } from "@codestream/webview/webview-api";
import {
	GetNRQLCompletionItemsType,
	GetNRQLConstantsRequestType,
} from "../../../util/src/protocol/agent/agent.protocol.providers";
import { MonacoEditor } from "./MonacoEditor";
import { isDarkTheme } from "@codestream/webview/src/themes";
import { ThemeContext } from "styled-components";

export function NRQLEditor(props: {
	onChange: (e: { value: string | undefined }) => void;
	className?: string;
	defaultQuery?: string;
}) {
	const themeContext = useContext(ThemeContext);
	const theme = isDarkTheme(themeContext) ? "vs-dark" : "light";
	const monacoRef = useRef<any>(null);

	const handleEditorDidMount = async (editor: any, monaco: any) => {
		monacoRef.current = monaco;
		monaco.languages.register({ id: "nrql" });

		const response = await HostApi.instance.send(GetNRQLConstantsRequestType, {});

		// Register the completion provider
		monaco.languages.registerCompletionItemProvider("nrql", {
			triggerCharacters: [" "],
			provideCompletionItems: async (model, position) => {
				const currentLine = model.getLineContent(position.lineNumber);
				const currentWord = model.getWordUntilPosition(position).word;
				try {
					const response = await HostApi.instance.send(GetNRQLCompletionItemsType, {
						text: currentLine,
						currentWord: currentWord,
					});
					return {
						suggestions: response?.items?.length
							? response.items.map(_ => {
									// these won't render correctly without a <Link /> component
									return {
										..._,
										documentation: null,
									};
							  })
							: [],
					};
				} catch (ex) {
					return { suggestions: [] };
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
				defaultValue={props.defaultQuery || "FROM"}
				theme={theme}
				onMount={handleEditorDidMount}
				onChange={e => {
					props.onChange(e);
				}}
			/>
		</>
	);
}
