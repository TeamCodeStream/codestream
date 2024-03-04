import { FetchPostRepliesResponse } from "@codestream/protocols/agent";
import {
	createdAt,
	modifiedAt,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";

export function getFetchPostRepliesResponse(
	streamId: string,
	postId: string,
	parentPostId: string,
	codeErrorId: string,
	nraiUserId: string
): FetchPostRepliesResponse {
	return {
		posts: [
			{
				version: 2,
				deactivated: false,
				numReplies: 0,
				reactions: {},
				createdAt: createdAt,
				modifiedAt: modifiedAt,
				text: "",
				streamId: streamId,
				language: "java",
				analyze: true,
				teamId: "651ed16ac2f7dee11c938922",
				creatorId: "652db11a7c271413e88b4ae3",
				id: parentPostId,
				codeErrorId: codeErrorId,
				seqNum: 1,
			},
			{
				version: 2,
				deactivated: false,
				numReplies: 0,
				reactions: {},
				createdAt: createdAt,
				modifiedAt: modifiedAt,
				forGrok: true,
				streamId: streamId,
				teamId: "651ed16ac2f7dee11c938922",
				text: "",
				parentPostId: parentPostId,
				creatorId: nraiUserId,
				seqNum: 35,
				id: postId,
			},
		],
		codemarks: [],
	};
}
