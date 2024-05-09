import { ShareTarget } from "@codestream/protocols/api";
import { HostApi } from "@codestream/webview/webview-api";
import {
	DeletePostRequestType,
	DeleteThirdPartyPostRequestType,
	SharePostViaServerRequestType,
} from "@codestream/protocols/agent";
import { throwIfError } from "@codestream/webview/store/common";
import { logError } from "@codestream/webview/logger";
import { createAppAsyncThunk } from "@codestream/webview/store/helper";
import { deletePost } from "@codestream/webview/store/posts/actions";

export type DeletePostArgs = {
	streamId: string;
	postId: string;
	sharedTo?: ShareTarget[];
};

export const deletePostApi = createAppAsyncThunk(
	"posts/deletePost",
	async ({ streamId, postId, sharedTo }: DeletePostArgs, { dispatch }): Promise<void> => {
		try {
			const response = await HostApi.instance.send(DeletePostRequestType, { streamId, postId });
			throwIfError(response);
			const { post } = response;
			try {
				if (sharedTo) {
					for (const shareTarget of sharedTo) {
						try {
							await HostApi.instance.send(DeleteThirdPartyPostRequestType, {
								providerId: shareTarget.providerId,
								channelId: shareTarget.channelId,
								providerPostId: shareTarget.postId,
								providerTeamId: shareTarget.teamId,
							});
						} catch (error) {
							try {
								await HostApi.instance.send(SharePostViaServerRequestType, {
									postId,
									providerId: shareTarget.providerId,
								});
							} catch (error2) {
								logError(`Error deleting a shared post: ${error2}`);
							}
						}
					}
				}
			} catch (error) {
				logError(`There was an error deleting a third party shared post: ${error}`);
			}
			dispatch(deletePost(post));
		} catch (error) {
			logError(error, { detail: `There was an error deleting a post`, streamId, postId });
		}
	}
);
