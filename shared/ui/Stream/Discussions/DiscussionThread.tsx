import { CollaborationComment, NewRelicErrorGroup } from "@codestream/protocols/agent";
import React from "react";
import { Comment } from "./Comment";
import { FunctionToEdit } from "@codestream/webview/store/codeErrors/types";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { NrAiComponent } from "@codestream/webview/Stream/NRAI/NrAiComponent";

export interface DiscussionThreadProps {
	file?: string;
	functionToEdit?: FunctionToEdit;
	isLoading?: boolean;
	errorGroup: NewRelicErrorGroup;
	reloadDiscussion?: Function;
}

interface CommentItemProps extends DiscussionThreadProps {
	comment: CollaborationComment;
}

function CommentItem(props: CommentItemProps) {
	const { comment } = props;
	if (comment.creator.name === "NRAI") {
		return (
			<NrAiComponent
				post={comment}
				errorGroup={props.errorGroup}
				functionToEdit={props.functionToEdit}
				file={props.file}
			/>
		);
	} else {
		return (
			<Comment
				comment={comment}
				isLoading={props.isLoading}
				reloadDiscussion={props.reloadDiscussion}
			/>
		);
	}
}

export const DiscussionThread = (props: DiscussionThreadProps) => {
	const discussion = useAppSelector(state => state.discussions.activeDiscussion);

	return (
		<>
			{discussion?.threadId && (
				<React.Fragment key={discussion.threadId}>
					{discussion.comments.map((comment: CollaborationComment) => {
						return (
							<React.Fragment key={comment.id}>
								<CommentItem comment={comment} {...props} />
							</React.Fragment>
						);
					})}
				</React.Fragment>
			)}
		</>
	);
};
