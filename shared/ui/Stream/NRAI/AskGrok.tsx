import React from "react";
import { Dialog } from "@codestream/webview/src/components/Dialog";
import { MetaLabel } from "../Codemark/BaseCodemark";
import { Modal } from "../Modal";
import { GrokSuggestion } from "./GrokSuggestion";

export const AskGrok = (props: { setText: (text: string) => void; onClose: () => void }) => {
	const onSelect = text => {
		props.setText(text);
		props.onClose();
	};
	return (
		<Modal translucent>
			<Dialog wide onClose={props.onClose} title="New Relic AI - Your GenAI Assistant">
				<p>
					By default the AI assistant will automatically provide an analysis of the error, and even
					a potential code fix, so that you can save time and reduce MTTR.
				</p>
				<p>
					But the conversation doesn't have to stop there! Mention AI in any reply to ask followup
					questions or have the AI assistant do some work for you.
				</p>
				<MetaLabel data-testid="grok-examples">Examples</MetaLabel>
				<GrokSuggestion query={"Write a test case for the suggested fix."} onSelect={onSelect} />
				<GrokSuggestion
					query={"Write a commit message for the suggested fix."}
					onSelect={onSelect}
				/>
			</Dialog>
		</Modal>
	);
};
