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
	const showGrokLoader = props.post.forGrok && !props.postText;
	console.log("NrAiComponent file", props.file);

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
			<Markdown text={parts?.intro ?? ""} />
			{props.file && patch && (
				<DiffSection>
					<PullRequestPatch
						patch={patch}
						filename={props.file}
						noHeader={true}
						canComment={false}
					/>
					<ButtonRow>
						<Button onClick={() => applyFix()}>Apply Fix</Button>
					</ButtonRow>
				</DiffSection>
			)}
			<Markdown text={parts?.description ?? ""} />
		</>
	);
}
