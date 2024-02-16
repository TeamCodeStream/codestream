import React, { useContext, useMemo } from "react";
import { NewRelicErrorGroup, PostPlus } from "@codestream/protocols/agent";
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
import { HostApi } from "@codestream/webview/webview-api";
import { URI } from "vscode-uri";

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
	errorGroup: NewRelicErrorGroup;
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
		if (!props.file || !props.functionToEdit?.symbol || !normalizedCodeFix) {
			console.error("No file symbol or codeBlock");
			return;
		}
		const targetUri = URI.file(props.file).toString(true);
		HostApi.instance.track("codestream/errors/apply_fix_button clicked", {
			entity_guid: props.errorGroup.entityGuid,
			account_id: props.errorGroup.accountId,
			event_type: "click",
			target: "apply_fix",
			target_text: "Apply Text",
			meta_data: `error_group_id: ${props.errorGroup.guid}`,
		});
		try {
			// remove trailing linefeed on normalizedCodeFix
			const normalizedCodeFixWithoutTrailingLinefeed = normalizedCodeFix.replace(/\r?\n$/, "");
			await dispatch(
				replaceSymbol({
					uri: targetUri,
					symbol: props.functionToEdit.symbol,
					codeBlock: normalizedCodeFixWithoutTrailingLinefeed,
					namespace: props.functionToEdit.namespace,
				})
			);
		} catch (e) {
			console.error("Error applying fix", e);
		}
	};

	return (
		<section className="nrai-post">
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
							className="customDiffEditor"
							options={{
								renderSideBySide: false,
								renderOverviewRuler: false,
								folding: false,
								lineNumbers: "off",
								readOnly: true,
								scrollBeyondLastLine: false,
								automaticLayout: true,
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
		</section>
	);
}
