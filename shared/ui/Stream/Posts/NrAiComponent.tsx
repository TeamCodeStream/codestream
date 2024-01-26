import React, { useMemo } from "react";
import { CSUser } from "@codestream/protocols/api";
import { PostPlus } from "@codestream/protocols/agent";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { MarkdownContent } from "@codestream/webview/Stream/Posts/Reply";
import { PullRequestPatch } from "@codestream/webview/Stream/PullRequestPatch";
import styled from "styled-components";
import { Button } from "@codestream/webview/src/components/Button";
import {
	createDiffFromSnippets,
	normalizeCodeMarkdown,
} from "@codestream/webview/Stream/Posts/patchHelper";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { isGrokStreamLoading } from "@codestream/webview/store/posts/reducer";
import { isPending } from "@codestream/webview/store/posts/types";
import { NrAiFeedback } from "./NrAiFeedback";
import { replaceSymbol } from "@codestream/webview/store/codeErrors/thunks";
import { FunctionToEdit } from "@codestream/webview/store/codeErrors/types";
import { NrAiCodeBlockLoading, NrAiLoading } from "./NrAiLoading";

/* TODOS
- [X] don't call copySymbol if there is already a nrai response (actually needed currently)
- [X] move feedback component to this file
- [ ] move everything to this file?
- [X] choose between codeBlock and functionToEdit selector
- [ ] store when fix is applied
- [X] progress indicator when diff is loading (even on non-streaming posts)
- [-] restore and expand tests
*/

export const DiffSection = styled.div`
	margin: 10px 0;
`;

export const ButtonRow = styled.div`
	display: flex;
	justify-content: end;
	margin: 7px 0 -7px 0;
`;

export type NrAiComponentProps = {
	post: PostPlus;
	author: Partial<CSUser>;
	postText: string;
	codeErrorId?: string;
	functionToEdit?: FunctionToEdit;
	file?: string;
};

// TODO handle opening current version of code instead of repo specific version
function Markdown(props: { text: string }) {
	// TODO do i need attachments and tags in a Grok component? proly not.
	return (
		<MarkdownContent className="reply-content-container">
			<MarkdownText text={props.text} className="reply-markdown-content" />
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
	const showGrokLoader = useMemo(() => !hasIntro && isGrokLoading, [isGrokLoading, hasIntro]);
	const showCodeBlockLoader = useMemo(
		() => !props.post.parts?.description && isGrokLoading,
		[isGrokLoading, props.post.parts?.description]
	);
	const showApplyFix = useMemo(
		() => !!props.post.parts?.codeFix && !isGrokLoading,
		[props.post.parts?.codeFix, isGrokLoading]
	);

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
		return normalizeCodeMarkdown(props.post.parts?.codeFix);
	}, [props.post.parts?.codeFix]);

	const patch = useMemo(() => {
		if (!normalizedCodeFix || !props.functionToEdit?.codeBlock) return undefined;
		// Make sure codeFix is fully streamed - we know this if description is present
		if (!props.post.parts?.description) return undefined;
		const patch = createDiffFromSnippets(props.functionToEdit.codeBlock, normalizedCodeFix);
		// console.log("===--- Patch", patch);
		return patch;
	}, [normalizedCodeFix, props.functionToEdit?.codeBlock, props.post.parts?.description]);

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
			console.error("===--- Error applying fix", e);
		}
	};

	return (
		<>
			{showGrokLoader && <NrAiLoading />}
			{hasIntro && <Markdown text={parts?.intro ?? ""} />}
			{showCodeBlockLoader && <NrAiCodeBlockLoading />}
			{props.file && patch && (
				<DiffSection>
					<PullRequestPatch
						patch={patch}
						filename={props.file}
						noHeader={true}
						canComment={false}
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
