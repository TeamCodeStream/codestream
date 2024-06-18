import { CollaborationComment } from "@codestream/protocols/agent";
import { mapFilter } from "@codestream/webview/utils";
import React from "react";
import { Comment } from "./Comment";
import { FunctionToEdit } from "@codestream/webview/store/codeErrors/types";
import { Discussion } from "@codestream/webview/store/types";

export interface DiscussionThreadProps {
	discussion: Discussion;

	file?: string;
	functionToEdit?: FunctionToEdit;
	isLoading?: boolean;

	reloadDiscussion?: Function;
}

export const DiscussionThread = (props: DiscussionThreadProps) => {
	return (
		<React.Fragment key={props.discussion.threadId}>
			{mapFilter(props.discussion.comments, (comment: CollaborationComment) => {
				return (
					<React.Fragment key={comment.id}>
						<Comment
							comment={comment}
							functionToEdit={props.functionToEdit}
							file={props.file}
							isLoading={props.isLoading}
							reloadDiscussion={props.reloadDiscussion}
						/>
					</React.Fragment>
				);
			})}
		</React.Fragment>
	);
};
