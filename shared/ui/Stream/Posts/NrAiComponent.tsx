import React from "react";
import { GrokLoading } from "@codestream/webview/Stream/CodeError/GrokLoading";
import { CSUser } from "@codestream/protocols/api";
import { PostPlus } from "@codestream/protocols/agent";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { MarkdownContent } from "@codestream/webview/Stream/Posts/Reply";

export type NrAiComponentProps = {
	post: PostPlus;
	author: Partial<CSUser>;
	postText: string;
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

	return (
		<>
			{showGrokLoader && <GrokLoading />}
			<Markdown text={props.post.parts?.intro ?? ""} />
			<p>{props.post.parts?.codeFix}</p>
			<Markdown text={props.post.parts?.description ?? ""} />
		</>
	);
}
