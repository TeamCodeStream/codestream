import React, { useContext, useMemo } from "react";
import { PostPlus } from "@codestream/protocols/agent";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { MarkdownContent } from "@codestream/webview/Stream/Posts/Reply";
import styled, { ThemeContext } from "styled-components";
import { Button } from "@codestream/webview/src/components/Button";
import { normalizeCodeMarkdown } from "@codestream/webview/Stream/Posts/patchHelper";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { isGrokStreamLoading } from "@codestream/webview/store/posts/reducer";
import { isPending } from "@codestream/webview/store/posts/types";
import { NrAiFeedback } from "./NrAiFeedback";
import { replaceSymbol } from "@codestream/webview/store/codeErrors/thunks";
import { FunctionToEdit } from "@codestream/webview/store/codeErrors/types";
import { NrAiCodeBlockLoading, NrAiLoading } from "./NrAiLoading";
import { DiffEditor } from "@monaco-editor/react";
import { isDarkTheme } from "@codestream/webview/src/themes";

/* TODOS
- [X] don't call copySymbol if there is already a nrai response (actually needed currently)
- [X] move feedback component to this file
- [X] choose between codeBlock and functionToEdit selector
- [X] progress indicator when diff is loading (even on non-streaming posts)
- [X] handle light theme in the diff editor
- [X] handle description only case - don't show progress indicator for code block if there is no intro (which indicates no code block)
- [X] send language hint from JB
- [ ] move everything to this file?
- [ ] store when fix is applied - maybe hide whole code section when fix applied?
- [ ] restore and expand tests
- [ ] update the prompt so that when we don't supply a function we don't get a code fix back
- [ ] fix styling for triple backticks which broke when i cleaned up the single backtick styling - openai suddenly started adding triple backticks in intro section
- [ ] handle case where code is already fixed before even opening the error
- [ ] educate user about how the code running in prod may be different than the code we grab in current editor
- [ ] whitespace formatting on apply fix - especially vscode java
- [ ] new telemetry events
- [ ] show comments from before apply-fix that don't have **DESCRIPTION** format
- [ ] handle apply fix with different file open - currently silent fail - but `success: false makes` it to web layer
*/

/*
  vscode nrAi edge case - super low priority
  1) open code error, let nrai complete
  2) leave code error open, do a "Reaload Webviews"
  3) wait for code error to load
  4) Do a Delete All Replies
  expected: code error is closed and posts are deleted
  actual: double submit of nrAi request and codeError not closed
  reloading window inststead of webviews works fine
*/

export const DiffSection = styled.div`
	margin: 10px 0;
`;

export const ButtonRow = styled.div`
	display: flex;
	justify-content: end;
	margin: 7px 0 -4px 0;
	column-gap: 10px;
`;

export type NrAiComponentProps = {
	post: PostPlus;
	postText: string;
	codeErrorId?: string;
	functionToEdit?: FunctionToEdit;
	file?: string;
};

function Markdown(props: { text: string }) {
	// TODO do i need attachments and tags in a Grok component? proly not.
	return (
		<MarkdownContent className="error-content-container">
			<MarkdownText text={props.text} className="error-markdown-content" />
		</MarkdownContent>
	);
}

export function NrAiComponent(props: NrAiComponentProps) {
	// console.debug("NrAiComponent", props);
	const dispatch = useAppDispatch();
	const textEditorUri = useAppSelector(state => state.editorContext.textEditorUri);
	const isGrokLoading = useAppSelector(isGrokStreamLoading);
	const hasIntro = useMemo(
		() => props.post.parts?.intro && props.post.parts.intro.length > 0,
		[props.post.parts?.intro]
	);
	const hasDescription = useMemo(
		() => props.post.parts?.description && props.post.parts.description.length > 0,
		[props.post.parts?.description]
	);
	const showGrokLoader = useMemo(
		() => !hasIntro && !hasDescription && isGrokLoading,
		[isGrokLoading, hasIntro, hasDescription]
	);
	const showCodeBlockLoader = useMemo(
		() => !props.post.parts?.description && isGrokLoading,
		[isGrokLoading, props.post.parts?.description]
	);
	const showApplyFix = useMemo(
		() => !!props.post.parts?.codeFix && !isGrokLoading,
		[props.post.parts?.codeFix, isGrokLoading]
	);
	const themeContext = useContext(ThemeContext);
	const isTheThemeDark = useMemo(() => {
		return isDarkTheme(themeContext);
	}, [themeContext]);

	const showFeedback = useMemo(() => {
		return (
			!isGrokLoading &&
			!isPending(props.post) &&
			props.codeErrorId &&
			props.post.forGrok &&
			props.post.parts?.description
		);
	}, [props.post.forGrok, isGrokLoading, props.codeErrorId, props.post.parts?.description]);

	const parts = props.post.parts;

	const normalizedCodeFix = useMemo(() => {
		const result = normalizeCodeMarkdown(props.post.parts?.codeFix);
		// console.debug("normalizedCodeFix", result);
		return result;
	}, [props.post.parts?.codeFix]);

	const applyFix = async () => {
		if (!textEditorUri || !props.functionToEdit?.symbol || !normalizedCodeFix) {
			console.error("No textEditorUri symbol or codeBlock");
			return;
		}
		try {
			// remove trailing linefeed on normalizedCodeFix
			const normalizedCodeFixWithoutTrailingLinefeed = normalizedCodeFix.replace(/\r?\n$/, "");
			await dispatch(
				replaceSymbol(
					textEditorUri,
					props.functionToEdit.symbol,
					normalizedCodeFixWithoutTrailingLinefeed,
					props.functionToEdit.namespace
				)
			);
		} catch (e) {
			console.error("Error applying fix", e);
		}
	};

	return (
		<>
			{showGrokLoader && <NrAiLoading />}
			{hasIntro && <Markdown text={parts?.intro ?? ""} />}
			{showCodeBlockLoader && <NrAiCodeBlockLoading />}
			{!showCodeBlockLoader &&
				props.file &&
				props.functionToEdit?.codeBlock &&
				normalizedCodeFix && (
					<DiffSection>
						<DiffEditor
							original={props.functionToEdit?.codeBlock}
							modified={normalizedCodeFix}
							height={300}
							options={{
								renderSideBySide: false,
								renderOverviewRuler: false,
								folding: false,
								lineNumbers: "off",
								readOnly: true,
							}}
							theme={isTheThemeDark ? "vs-dark" : "vs"}
						/>
						<ButtonRow>
							{showApplyFix && <Button onClick={() => applyFix()}>Apply Fix</Button>}
						</ButtonRow>
					</DiffSection>
				)}
			<Markdown text={parts?.description ?? ""} />
			{showFeedback && (
				<>
					<NrAiFeedback postId={props.post.id} errorId={props.codeErrorId!} />
				</>
			)}
		</>
	);
}
