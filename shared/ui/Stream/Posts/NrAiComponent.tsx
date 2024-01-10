import React from "react";
import { GrokLoading } from "@codestream/webview/Stream/CodeError/GrokLoading";
import { CSUser } from "@codestream/protocols/api";
import { PostPlus } from "@codestream/protocols/agent";

export type NrAiComponentProps = {
	post: PostPlus;
	author: Partial<CSUser>;
	postText: string;
};

export function NrAiComponent(props: NrAiComponentProps) {
	const showGrokLoader = props.post.forGrok && !props.postText;

	return (
		<>
			<div>NrAiComponent</div>
			{showGrokLoader && <GrokLoading />}
			<p>{props.post.parts?.intro}</p>
			<p>{props.post.parts?.codeFix}</p>
			<p>{props.post.parts?.description}</p>
		</>
	);
}
