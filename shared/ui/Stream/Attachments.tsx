import React from "react";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "../ipc/host.protocol";
import Icon from "./Icon";
import { CollaborationAttachment } from "@codestream/protocols/agent";

interface Props {
	attachments?: CollaborationAttachment[];
}

export const Attachments = (props: Props) => {
	if (!props.attachments || props.attachments.length === 0) {
		return null;
	}

	return (
		<div className="related">
			<div className="related-label">Attachments</div>

			{props.attachments.map((attachment, index) => {
				return (
					<div
						key={index}
						className="attachment clickable"
						onClick={e => {
							e.preventDefault();
							HostApi.instance.send(OpenUrlRequestType, { url: attachment.filePath });
						}}
					>
						<span>
							<Icon name="paperclip" />
						</span>
						<span>{attachment.fileName}</span>
						<span>
							{
								// this is necessary for consistent formatting
							}
						</span>
					</div>
				);
			})}
		</div>
	);
};
