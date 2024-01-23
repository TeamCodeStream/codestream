import React from "react";
import { Editor } from "@monaco-editor/react";

export function MonacoEditor(props: {
	onChange: (e: { value: string | undefined }) => void;
	className?: string;
	defaultLanguage?: string;
	defaultValue?: string;
	// TODO this this
	onMount: any;
	height?: string;
	theme?: "vs-dark" | "light";
}) {
	// const monacoRef = useRef<any>(null);

	// const handleEditorDidMount = async (editor: any, monaco: any) => {
	// 	editor.updateOptions({
	// 		find: false,
	// 		folding: false,
	// 		glyphMargin: false,
	// 		lineDecorationsWidth: 0,
	// 		lineNumbers: "off",
	// 		minimap: {
	// 			enabled: false,
	// 			renderOverviewRuler: false,
	// 		},
	// 		scrollBeyondLastLine: false,
	// 		wordwrap: "on",
	// 	});
	// 	monacoRef.current = monaco;

	// 	// Register your language with Monaco
	// 	monaco.languages.register({ id: "nrql" });

	// 	const response = await HostApi.instance.send(GetNRQLConstantsRequestType, {});

	// 	// Register the completion provider
	// 	monaco.languages.registerCompletionItemProvider("nrql", {
	// 		triggerCharacters: [" "],
	// 		provideCompletionItems: async (model, position) => {
	// 			const currentLine = model.getLineContent(position.lineNumber);
	// 			const currentWord = model.getWordUntilPosition(position).word;
	// 			let items: any[] = [];
	// 			if (
	// 				(currentLine && currentLine.toLowerCase().trim().endsWith("from")) ||
	// 				(currentWord && currentWord.toLowerCase() === "from")
	// 			) {
	// 				try {
	// 					const collectionsResponse = await HostApi.instance.send(
	// 						GetNRQLCollectionsRequestType,
	// 						{}
	// 					);
	// 					if (collectionsResponse?.list?.length) {
	// 						collectionsResponse.list.forEach(_ => {
	// 							items.push({
	// 								label: _,
	// 								kind: monaco.languages.CompletionItemKind.Module,
	// 								insertText: _,
	// 							});
	// 						});
	// 						return {
	// 							suggestions: items,
	// 						};
	// 					}
	// 				} catch (ex) {}
	// 			}
	// 			if (
	// 				(currentLine && currentLine.toLowerCase().trim().endsWith("where")) ||
	// 				(currentWord && currentWord.toLowerCase() === "where")
	// 			) {
	// 				try {
	// 					const columnsResponse = await HostApi.instance.send(GetNRQLColumnsRequestType, {
	// 						query: currentLine,
	// 					});
	// 					if (columnsResponse?.columns?.length) {
	// 						columnsResponse.columns.forEach(_ => {
	// 							items.push({
	// 								label: _,
	// 								kind: monaco.languages.CompletionItemKind.Module,
	// 								insertText: _,
	// 							});
	// 						});
	// 						return {
	// 							suggestions: items,
	// 						};
	// 					}
	// 				} catch (ex) {}
	// 			}
	// 			return {
	// 				suggestions: [
	// 					...response.functions.map(_ => {
	// 						return {
	// 							label: _,
	// 							kind: monaco.languages.CompletionItemKind.Function,
	// 							insertText: _,
	// 						};
	// 					}),
	// 					...response.keywords.map(_ => {
	// 						return {
	// 							label: _,
	// 							kind: monaco.languages.CompletionItemKind.Keyword,
	// 							insertText: _,
	// 						};
	// 					}),
	// 				],
	// 			};
	// 		},
	// 	});

	// 	monaco.languages.setMonarchTokensProvider("nrql", {
	// 		tokenizer: {
	// 			root: [
	// 				[new RegExp(response.keywords.join("|")), "keyword.nrql"],
	// 				[
	// 					new RegExp(
	// 						response.operators.map(_ => _.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&")).join("|")
	// 					),
	// 					"operator.nrql",
	// 				],
	// 				[new RegExp(response.functions.join("|")), "function.nrql"],
	// 			],
	// 		},
	// 	});

	// 	editor.focus();
	// };

	return (
		<>
			<Editor
				height="10vh"
				className={props.className}
				defaultLanguage={props.defaultLanguage}
				defaultValue={props.defaultValue}
				theme={props.theme || "vs-dark"}
				onMount={props.onMount}
				onChange={e => {
					props.onChange({ value: e });
				}}
			/>
		</>
	);
}
