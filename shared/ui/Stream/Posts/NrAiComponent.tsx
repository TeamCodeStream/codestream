import React from "react";
import { GrokLoading } from "@codestream/webview/Stream/CodeError/GrokLoading";
import { CSUser } from "@codestream/protocols/api";
import { PostPlus } from "@codestream/protocols/agent";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { MarkdownContent } from "@codestream/webview/Stream/Posts/Reply";
import { PRCodeCommentPatch } from "@codestream/webview/Stream/PullRequestComponents";
import { PullRequestPatch } from "@codestream/webview/Stream/PullRequestPatch";

export type NrAiComponentProps = {
	post: PostPlus;
	author: Partial<CSUser>;
	postText: string;
	file?: string;
};

/*
--- a/src/main/java/org/springframework/samples/petclinic/vet/VetController.java
+++ b/src/main/java/org/springframework/samples/petclinic/vet/VetController.java
 */

const testingHardcodedPatch = `
@@ -83,8 +83,12 @@ class VetController {
                Vets vets = new Vets();
                Collection<Vet> vetList = this.vetRepository.findAll();
                for (Vet vet : vetList) {
-                       String speciality = vet.getSpecialties().get(0).getName();
-                       logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);
+                       if (!vet.getSpecialties().isEmpty()) {
+                               String speciality = vet.getSpecialties().get(0).getName();
+                               logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);
+                       } else {
+                               logger.info("Vet {} has no specialities", vet.getFirstName());
+                       }
                }
                vets.getVetList().addAll(vetList);
                return vets;
`;

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

	return (
		<>
			{showGrokLoader && <GrokLoading />}
			<Markdown text={props.post.parts?.intro ?? ""} />
			{props.file && (
				<PRCodeCommentPatch>
					<PullRequestPatch patch={testingHardcodedPatch} filename={props.file} />
				</PRCodeCommentPatch>
			)}
			<Markdown text={props.post.parts?.description ?? ""} />
		</>
	);
}
