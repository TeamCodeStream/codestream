import React, { useMemo } from "react";
import { GrokLoading } from "@codestream/webview/Stream/CodeError/GrokLoading";
import { CSUser } from "@codestream/protocols/api";
import { PostPlus } from "@codestream/protocols/agent";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { MarkdownContent } from "@codestream/webview/Stream/Posts/Reply";
import { PullRequestPatch } from "@codestream/webview/Stream/PullRequestPatch";
import styled from "styled-components";
import { Button } from "@codestream/webview/src/components/Button";
import { createDiffFromSnippets } from "@codestream/webview/Stream/Posts/patchHelper";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { isGrokStreamLoading } from "@codestream/webview/store/posts/reducer";
import { isPending } from "@codestream/webview/store/posts/types";
import { NrAiFeedback } from "./NrAiFeedback";
import { replaceSymbol } from "@codestream/webview/store/codeErrors/thunks";

/* TODOS
- [X] don't call copySymbol if there is already a nrai response (actually needed currently)
- [X] move feedback component to this file
- [ ] move everything to this file?
- [ ] choose between codeBlock and functionToEdit selector
- [ ] store when fix is applied
- [ ] progress indicator when diff is loading (even on non-streaming posts)
- [ ] restore and expand tests
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
	codeBlock?: string;
	codeBlockStartLine?: number;
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
	const functionToEdit = useAppSelector(state => state.codeErrors.functionToEdit);
	const hasIntro = useMemo(
		() => props.post.parts?.intro && props.post.parts.intro.length > 0,
		[props.post.parts?.intro]
	);
	const showGrokLoader = useMemo(() => !hasIntro && isGrokLoading, [isGrokLoading, hasIntro]);
	const showApplyFix = useMemo(
		() => !!props.post.parts?.codeFix && !isGrokLoading,
		[props.post.parts?.codeFix, isGrokLoading]
	);

	const showFeedback = useMemo(() => {
		return !isGrokLoading && !isPending(props.post) && props.codeErrorId && props.post.forGrok;
	}, [props.post, isGrokLoading, props.codeErrorId]);

	const parts = props.post.parts;

	const normalizedCodeFix = useMemo(() => {
		if (!props.post.parts?.codeFix) return undefined;
		// Strip out leading markdown ```
		let codeFix = props.post.parts.codeFix.replace('```\n"', "");
		// Strip out end markdown
		codeFix = codeFix.replace(/"\n*```\n+/, "\n");
		// add 4 spaces to beginning of each line in codeFix since chatgpt strips out first indent
		codeFix = codeFix.replace(/^(?!\s*$)/gm, "    ");
		return codeFix;
	}, [props.post.parts?.codeFix]);

	const patch = useMemo(() => {
		if (!normalizedCodeFix || !functionToEdit?.codeBlock) return undefined;
		// Make sure codeFix is fully streamed - we know this if description is present
		if (!props.post.parts?.description) return undefined;
		// Strip out leading markdown ```
		const patch = createDiffFromSnippets(functionToEdit.codeBlock, normalizedCodeFix);
		// console.log("===--- Patch", patch);
		return patch;
	}, [normalizedCodeFix, functionToEdit, props.post.parts?.description]);

	const applyFix = async () => {
		if (!textEditorUri || !functionToEdit?.symbol || !normalizedCodeFix) {
			console.error("No textEditorUri symbol or codeBlock");
			return;
		}
		try {
			// remove trailing linefeed on normalizedCodeFix
			const normalizedCodeFixWithoutTrailingLinefeed = normalizedCodeFix.replace(/\r?\n$/, "");
			await dispatch(
				replaceSymbol(
					textEditorUri,
					functionToEdit.symbol,
					normalizedCodeFixWithoutTrailingLinefeed,
					functionToEdit.namespace
				)
			);
		} catch (e) {
			console.error("===--- Error applying fix", e);
		}
	};

	return (
		<>
			{showGrokLoader && <GrokLoading />}
			{hasIntro && <Markdown text={parts?.intro ?? ""} />}
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
