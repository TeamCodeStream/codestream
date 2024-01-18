import React, { useMemo } from "react";
import { GrokLoading } from "@codestream/webview/Stream/CodeError/GrokLoading";
import { CSUser } from "@codestream/protocols/api";
import { PostPlus } from "@codestream/protocols/agent";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { MarkdownContent } from "@codestream/webview/Stream/Posts/Reply";
import { PullRequestPatch } from "@codestream/webview/Stream/PullRequestPatch";
import styled from "styled-components";
import { Button } from "@codestream/webview/src/components/Button";
import { reconstitutePatch } from "@codestream/webview/Stream/Posts/patchHelper";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { isGrokStreamLoading } from "@codestream/webview/store/posts/reducer";
import { isPending } from "@codestream/webview/store/posts/types";
import { NrAiFeedback } from "./NrAiFeedback";

/* TODOS
- [ ] don't call copySymbol if there is already a nrai response
- [X] move feedback component to this file
- [ ] move everything to this file?
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
	const isGrokLoading = useAppSelector(isGrokStreamLoading);
	const hasIntro = useMemo(
		() => props.post.parts?.intro && props.post.parts.intro.length > 0,
		[props.post.parts?.intro]
	);
	const showGrokLoader = useMemo(() => !hasIntro && isGrokLoading, [isGrokLoading, hasIntro]);
	const showApplyFix = useMemo(
		() => !!props.post.parts?.codeFix && isGrokLoading === false,
		[props.post.parts?.codeFix, isGrokLoading]
	);

	const showFeedback = useMemo(() => {
		return !isGrokLoading && !isPending(props.post) && props.codeErrorId && props.post.forGrok;
	}, [props.post, isGrokLoading, props.codeErrorId]);

	const applyFix = () => {
		console.log("Apply fix");
	};

	const parts = props.post.parts;

	const patch = useMemo(
		() => reconstitutePatch(parts?.codeFix, props.codeBlockStartLine),
		[props.post.parts, props.codeBlockStartLine]
	);

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
