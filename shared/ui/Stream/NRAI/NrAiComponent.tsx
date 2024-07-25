import React, { useCallback, useContext, useMemo } from "react";
import { NewRelicErrorGroup } from "@codestream/protocols/agent";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import styled, { ThemeContext } from "styled-components";
import { Button } from "@codestream/webview/src/components/Button";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { replaceSymbol } from "@codestream/webview/store/codeErrors/thunks";
import { FunctionToEdit } from "@codestream/webview/store/codeErrors/types";
import { NrAiCodeBlockLoading, NrAiLoading } from "./NrAiLoading";
import { DiffEditor, useMonaco } from "@monaco-editor/react";
import { isDarkTheme } from "@codestream/webview/src/themes";
import { HostApi } from "@codestream/webview/webview-api";
import { URI } from "vscode-uri";
import { AuthorInfo, CommentBody, MarkdownContent, Root } from "../Discussions/Comment";
import { normalizeCodeMarkdown } from "./patchHelper";
import {
	CSCollaborationComment,
	isNraiStreamLoading,
} from "@codestream/webview/store/discussions/discussionsSlice";
import { extractParts } from "@codestream/webview/store/discussions/recombinedStream";
import { Headshot } from "@codestream/webview/src/components/Headshot";

export const DiffSection = styled.div`
	margin: 10px 0 10px 27px;
`;

export const ButtonRow = styled.div`
	display: flex;
	justify-content: end;
	margin: 7px 0 -4px 0;
	column-gap: 10px;
`;

export type NrAiComponentProps = {
	comment: CSCollaborationComment;
	// postText: string;
	errorGroup: NewRelicErrorGroup;
	// codeErrorId?: string;
	functionToEdit?: FunctionToEdit;
	file?: string;
};

function Markdown(props: { text: string }) {
	return (
		<MarkdownContent className="error-content-container">
			<MarkdownText text={props.text} className="error-markdown-content" />
		</MarkdownContent>
	);
}

export function NrAiComponent(props: NrAiComponentProps) {
	const dispatch = useAppDispatch();
	const monaco = useMonaco();

	const derivedState = useAppSelector(state => {
		let commentParts = props.comment.parts;
		if (
			!commentParts ||
			(!commentParts.intro && !commentParts.description && !commentParts.codeFix)
		) {
			commentParts = extractParts(props.comment.body);
		}
		return {
			isStreamLoading: isNraiStreamLoading(state),
			demoMode: state.codeErrors.demoMode,
			commentParts,
		};
	});
	const { commentParts, isStreamLoading } = derivedState;

	const hasIntro = useMemo(
		() => commentParts?.intro && commentParts.intro.length > 0,
		[commentParts?.intro]
	);
	const hasDescription = useMemo(
		() => commentParts?.description && commentParts.description.length > 0,
		[commentParts?.description]
	);
	const showGrokLoader = useMemo(
		() => !hasIntro && !hasDescription && isStreamLoading,
		[isStreamLoading, hasIntro, hasDescription]
	);
	const showCodeBlockLoader = useMemo(
		() => !commentParts?.description && isStreamLoading,
		[isStreamLoading, commentParts?.description]
	);
	const showApplyFix = useMemo(
		() => !!commentParts?.codeFix && !isStreamLoading,
		[commentParts?.codeFix, isStreamLoading]
	);
	const themeContext = useContext(ThemeContext);
	const isTheThemeDark = useMemo(() => {
		return isDarkTheme(themeContext);
	}, [themeContext]);

	// const showFeedback = useMemo(() => {
	// 	return (
	// 		!isGrokLoading &&
	// 		!isPending(props.post) &&
	// 		props.codeErrorId &&
	// 		props.post.forGrok &&
	// 		props.post.parts?.description
	// 	);
	// }, [props.post.forGrok, isGrokLoading, props.codeErrorId, props.post.parts?.description]);

	const normalizedCodeFix = useMemo(() => {
		const result = normalizeCodeMarkdown(commentParts?.codeFix);
		return result;
	}, [commentParts?.codeFix]);

	const applyFix = useCallback(async () => {
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
	}, [normalizedCodeFix, props.errorGroup, props.file, props.functionToEdit]);

	// useMemo(() => {
	// 	if (demoMode.enabled) {
	// 		setApplyFixCallback(applyFix);
	// 	}
	// }, [applyFix]);

	const linesChanged = useMemo(() => {
		if (monaco && monaco.editor.getDiffEditors().length > 0) {
			const lineChanges = monaco.editor.getDiffEditors()[0].getLineChanges();
			return lineChanges?.length ?? 0;
		}
		return undefined;
	}, [monaco?.editor.getDiffEditors()]);

	return (
		<Root className="nrai-post">
			<CommentBody>
				<AuthorInfo style={{ fontWeight: 700 }}>
					{props.comment.creator && <Headshot size={20} person={props.comment.creator} />}
					<span className="reply-author">{props.comment.creator.name}</span>
				</AuthorInfo>

				{showGrokLoader && <NrAiLoading />}

				{hasIntro && <Markdown text={commentParts?.intro ?? ""} />}

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
				{linesChanged === 0 && <div style={{ marginTop: "10px" }}></div>}

				{hasDescription && <Markdown text={commentParts?.description ?? ""} />}
			</CommentBody>
		</Root>
	);
}
