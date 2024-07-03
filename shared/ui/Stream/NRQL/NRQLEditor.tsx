import { isDarkTheme } from "@codestream/webview/src/themes";
import { HostApi } from "@codestream/webview/webview-api";
import { Monaco } from "@monaco-editor/react";
import type monaco from "monaco-editor";
import React, { useContext, useRef, useState } from "react";
import { ThemeContext } from "styled-components";
import {
	GetNRQLCompletionItemsType,
	GetNRQLConstantsRequestType,
} from "../../../util/src/protocol/agent/agent.protocol.providers";
import { MonacoEditor } from "./MonacoEditor";

export interface NRQLEditorApi {
	setValue: (value: string) => void;
}

export const NRQLEditor = React.forwardRef(
	(
		props: {
			className?: string;
			defaultValue?: string;
			height?: string | undefined;
			onChange?: (e: { value: string | undefined }) => void;
			onSubmit?: (e: { value: string | undefined }) => void;
			setValue?: (e: { value: string | undefined }) => void;
			isReadonly?: boolean;
			// if true, editor will fallback to a simple <textarea>
			useSimpleEditor?: boolean;
			accountId?: number;
		},
		ref
	) => {
		let monacoRef = useRef<any>(null);
		let editorRef = useRef<any>(null);
		const [textAreaValue, setTextAreaValue] = useState<string>(props.defaultValue || "");
		// Expose the ref and various functions to the parent component
		React.useImperativeHandle(
			ref,
			() =>
				({
					setValue: value => {
						if (editorRef.current) {
							editorRef.current.setValue(value);
						} else {
							setTextAreaValue(value);
						}
					},
				}) as NRQLEditorApi
		);

		if (props.useSimpleEditor) {
			return (
				<textarea
					style={{ height: "120px", width: "100%" }}
					disabled={props.isReadonly}
					className={props.className}
					value={textAreaValue}
					onKeyDown={
						props.onSubmit
							? event => {
									if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
										props.onSubmit && props.onSubmit({ value: textAreaValue });
									}
							  }
							: undefined
					}
					onChange={e => {
						const value = e.target.value;
						setTextAreaValue(value);
						if (props.onChange) {
							props.onChange({ value: value });
						}
					}}
				></textarea>
			);
		}

		const themeContext = useContext(ThemeContext);
		const theme = isDarkTheme(themeContext) ? "vs-dark" : "vs";

		const handleEditorDidMount = async (
			editor: monaco.editor.IStandaloneCodeEditor,
			monaco: Monaco
		) => {
			monacoRef.current = monaco;
			editorRef.current = editor;
			editor.updateOptions({ wordWrap: "on" });

			if (props.onSubmit) {
				const handleKeySubmit = e => {
					try {
						if (props.onSubmit) {
							const val = editorRef.current.getValue();
							props.onSubmit({ value: val });
						}
					} catch (ex) {
						console.error("handleKeySubmit NRQLEditor error", ex);
					}
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

			monaco.editor.defineTheme("nrql", {
				base: theme,
				inherit: true,
				rules: [
					{
						token: "keyword.nrql",
						foreground: "#da66ed",
					},
					{
						token: "keyword.operator.nrql",
						foreground: "#52a7f7",
					},
					{
						token: "support.function.nrql",
						foreground: "#52a7f7",
					},
					{
						token: "comment",
						foreground: "#8a939a",
					},
					{
						token: "string",
						foreground: "#6cb505",
					},
					{ token: "string.escape.invalid", foreground: "#ff0000" },
					{ token: "comment.nrql", foreground: "#8a939a" },
				],
				colors: {},
			});
			monaco.editor.setTheme("nrql");

			monaco.languages.setLanguageConfiguration("nrql", {
				autoClosingPairs: [
					{ open: "{", close: "}" },
					{ open: "[", close: "]" },
					{ open: "(", close: ")" },
					{ open: '"', close: '"' },
				],
				surroundingPairs: [
					{ open: "(", close: ")" },
					{ open: "[", close: "]" },
					{ open: "{", close: "}" },
					{ open: '"', close: '"' },
				],
				comments: {
					lineComment: "--",
					blockComment: ["/*", "*/"],
				},
			});

			monaco.languages.setMonarchTokensProvider("nrql", {
				ignoreCase: true,
				tokenizer: {
					root: [
						// Single-line comment rule
						[/(\/\/).*$/, "comment"],

						// Multiline comment rules
						[/\/\*/, "comment", "@comment"],
						[/\*\//, "comment", "@pop"],
						[/.*\*\//, "comment"],
						[
							new RegExp(`\\b(${response.keywords.map(_ => _.label).join("|")})\\b`, "i"),
							"keyword.nrql",
						],
						[
							new RegExp(
								`\\b(${response.operators
									.map(_ => _.label.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"))
									.join("|")})\\b`,
								"i"
							),
							"keyword.operator.nrql",
						],
						[
							new RegExp(`\\b(${response.functions.map(_ => _.label).join("|")})\\b`, "i"),
							"support.function.nrql",
						],
						[/'.*?'/, "string"],
						// Double-quoted string
						[/"([^"\\]|\\.)*$/, "string.invalid"], // Non-terminated string
						[/"/, { token: "string.quote", next: "@string" }],
					],
					comment: [
						[/[^*/]+/, "comment"],
						[/\/\*/, "comment", "@push"],
						[/\*\//, "comment", "@pop"],
						[/./, "comment"],
					],
					string: [
						[/[^\\"]+/, "string"],
						[/\\./, "string.escape.invalid"],
						[/"/, { token: "string.quote", next: "@pop" }],
					],
				},
			});
			const handleEnterKeyPress = e => {
				try {
					if (props.onSubmit) {
						const val = editorRef.current.getValue();
						props.onSubmit({ value: val });
					}
				} catch (ex) {
					console.error("handleKeySubmit NRQLEditor error", ex);
				}
			};

			editor.addCommand(monaco.KeyCode.Enter, handleEnterKeyPress);

			editor.focus();
		};

		return (
			<>
				<MonacoEditor
					height={props.height || "10vh"}
					className={props.className}
					defaultLanguage="nrql"
					defaultValue={props.defaultValue}
					theme={theme}
					onMount={handleEditorDidMount}
					onChange={e => {
						if (props.onChange) {
							props.onChange(e);
						}
					}}
					options={{ readonly: props.isReadonly }}
				/>
			</>
		);
	}
);
