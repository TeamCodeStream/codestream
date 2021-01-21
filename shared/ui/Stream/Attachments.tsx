import { CSPost } from "@codestream/protocols/api";
import React from "react";
import { HostApi } from "..";
import { OpenUrlRequestType } from "../ipc/host.protocol";
import Icon from "./Icon";

interface Props {
	post: CSPost;
}

export const Attachments = (props: Props) => {
	const { post } = props;
	if (!post || !post.files || post.files.length === 0) return null;

	return (
		<div className="related">
			<div className="related-label">Attachments</div>

			{post.files.map((file, index) => {
				// console.log(file);
				//<img src={preview.url} width={preview.width} height={preview.height} />
				const { mimetype = "", url = "", name } = file;
				const isImage = mimetype.startsWith("image");
				return (
					<div
						key={index}
						className="attachment clickable"
						onClick={e => {
							e.preventDefault();
							HostApi.instance.send(OpenUrlRequestType, { url });
						}}
					>
						<span>
							<Icon name="paperclip" />
						</span>
						<span>{name}</span>
						<span>
							<Icon name="download" className="clickable" />
						</span>
					</div>
				);
			})}
		</div>
	);
};
