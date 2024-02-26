import {
	AddMarkersRequest,
	AddMarkersRequestType,
	CodemarkPlus,
	CreatePassthroughCodemarkResponse,
	CreateShareableCodemarkRequestType,
	CreateThirdPartyPostRequestType,
	DeleteCodemarkRequestType,
	DeleteMarkerRequestType,
	DeleteThirdPartyPostRequestType,
	GetRangeScmInfoResponse,
	MoveMarkerRequest,
	MoveMarkerRequestType,
	SharePostViaServerRequestType,
	UpdateCodemarkRequestType,
	UpdatePostSharingDataRequestType,
} from "@codestream/protocols/agent";
import { CSCodemark, ShareTarget } from "@codestream/protocols/api";
import { logError } from "@codestream/webview/logger";
import { CodeStreamState } from "@codestream/webview/store";
import {
	addCodemarks,
	CreateCodemarkError,
	isCreateCodemarkError,
	SharingNewCodemarkAttributes,
	updateCodemarks,
	_deleteCodemark,
} from "@codestream/webview/store/codemarks/actions";
import { getConnectedProviders } from "@codestream/webview/store/providers/reducer";
import { addStreams } from "@codestream/webview/store/streams/actions";
import { findMentionedUserIds, getTeamMembers } from "@codestream/webview/store/users/reducer";
import { HostApi } from "@codestream/webview/webview-api";
import { handleDirectives } from "../providerPullRequests/slice";

type EditableAttributes = Partial<
	Pick<CSCodemark, "tags" | "text" | "title" | "assignees" | "relatedCodemarkIds">
> & {
	deleteMarkerLocations?: {
		[index: number]: boolean;
	};
	codeBlocks?: GetRangeScmInfoResponse[];
	sharedTo?: ShareTarget[];
};

export const createCodemark =
	(attributes: SharingNewCodemarkAttributes) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const { accessMemberIds, ...rest } = attributes;
		const state = getState();

		try {
			const response = await HostApi.instance.send(CreateShareableCodemarkRequestType, {
				attributes: rest,
				memberIds: accessMemberIds,
				textDocuments: attributes.textDocuments,
				entryPoint: attributes.entryPoint,
				mentionedUserIds: attributes.mentionedUserIds,
				addedUsers: attributes.addedUsers,
				parentPostId: attributes.parentPostId,
				isPseudoCodemark: attributes.isPseudoCodemark,
				isProviderReview: attributes.isProviderReview,
				files: attributes.files,
				ideName: state.ide.name,
			});
			if (response) {
				let result;
				let responseAsPassthrough = response as any as CreatePassthroughCodemarkResponse;
				if (responseAsPassthrough?.isPassThrough) {
					if (responseAsPassthrough && responseAsPassthrough.directives) {
						dispatch(
							handleDirectives({
								providerId: responseAsPassthrough.pullRequest.providerId,
								id: responseAsPassthrough.pullRequest.id,
								data: responseAsPassthrough.directives.directives,
							})
						);
						return {
							handled: true,
						};
					} else {
						console.error("missing directives", response);
					}
				} else {
					result = dispatch(addCodemarks([response.codemark]));
					dispatch(addStreams([response.stream]));

					if (attributes.sharingAttributes) {
						const { sharingAttributes } = attributes;
						try {
							const { post, ts, permalink, channelId } = await HostApi.instance.send(
								CreateThirdPartyPostRequestType,
								{
									providerId: sharingAttributes.providerId,
									channelId:
										sharingAttributes.type === "channel" ? sharingAttributes.channelId : undefined,
									memberIds:
										sharingAttributes.type === "direct" ? sharingAttributes.userIds : undefined,
									providerTeamId: sharingAttributes.providerTeamId,
									providerServerTokenUserId: sharingAttributes.botUserId,
									text: rest.text,
									codemark: response.codemark,
									remotes: attributes.remotes,
									mentionedUserIds: attributes.mentionedUserIds,
									files: attributes.files,
								}
							);
							if (ts) {
								await HostApi.instance.send(UpdatePostSharingDataRequestType, {
									postId: response.codemark.postId,
									sharedTo: [
										{
											createdAt: post.createdAt,
											providerId: sharingAttributes.providerId,
											teamId: sharingAttributes.providerTeamId,
											teamName: sharingAttributes.providerTeamName || "",
											channelId:
												channelId ||
												(sharingAttributes.type === "channel" ? sharingAttributes.channelId : ""),
											channelName: sharingAttributes.channelName || "",
											postId: ts,
											url: permalink || "",
										},
									],
								});
							}
							HostApi.instance.track("codestream/codemarks/share succeeded", {
								meta_data: `destination: ${
									getConnectedProviders(getState()).find(
										config => config.id === attributes.sharingAttributes!.providerId
									)!.name === "msteams"
										? "teams"
										: "slack"
										? "slack"
										: ""
								}`,
								meta_data_2: `codemark_status: new`,
								meta_data_3: `conversation_type": ${
									sharingAttributes.type === "channel" ? "channel" : "group_dm"
								}`,
								event_type: "response",
							});
						} catch (error) {
							logError("Error sharing a codemark", { message: error.toString() });
							throw { reason: "share" } as CreateCodemarkError;
						}
					} else if (
						attributes.parentPostId &&
						state.posts.byStream[response.post.streamId] &&
						state.posts.byStream[response.post.streamId][attributes.parentPostId] &&
						state.posts.byStream[response.post.streamId][attributes.parentPostId].sharedTo
					) {
						const sharedTo =
							state.posts.byStream[response.post.streamId][attributes.parentPostId].sharedTo!;
						for (const target of sharedTo) {
							if (target.providerId !== "slack*com") continue;
							try {
								const { post, ts, permalink } = await HostApi.instance.send(
									CreateThirdPartyPostRequestType,
									{
										providerId: target.providerId,
										channelId: target.channelId,
										providerTeamId: target.teamId,
										parentPostId: target.postId,
										text: rest.text,
										codemark: response.codemark,
										remotes: attributes.remotes,
										mentionedUserIds: attributes.mentionedUserIds,
									}
								);
								if (ts) {
									await HostApi.instance.send(UpdatePostSharingDataRequestType, {
										postId: response.codemark.postId,
										sharedTo: [
											{
												createdAt: post.createdAt,
												providerId: target.providerId,
												teamId: target.teamId,
												teamName: target.teamName,
												channelId: target.channelId,
												channelName: target.channelName,
												postId: ts,
												url: permalink || "",
											},
										],
									});
								}
							} catch (error) {
								try {
									await HostApi.instance.send(SharePostViaServerRequestType, {
										postId: response.post.id,
										providerId: target.providerId,
									});
								} catch (error2) {
									logError("Error sharing a post", { message: error2.toString() });
								}
							}
						}
					}
				}
				return result;
			}
		} catch (error) {
			// if this is a sharing error just throw it
			if (isCreateCodemarkError(error)) throw error;

			logError(
				attributes &&
					attributes.codeBlocks &&
					attributes.codeBlocks.length &&
					attributes.codeBlocks[0].context &&
					attributes.codeBlocks[0].context.pullRequest
					? "Error creating PR comment"
					: "Error creating a codemark",
				{ message: error.toString() }
			);

			let regex = /(?<=\:)(.*?)(?=\:)/;
			let userFriendlyMessage = regex.exec(error?.message);
			throw {
				reason: "create",
				message: userFriendlyMessage ? userFriendlyMessage[0] : "",
			} as CreateCodemarkError;
		}
	};

export const deleteCodemark = (codemarkId: string, sharedTo?: ShareTarget[]) => async dispatch => {
	try {
		void (await HostApi.instance.send(DeleteCodemarkRequestType, {
			codemarkId,
		}));
		try {
			if (sharedTo) {
				for (const shareTarget of sharedTo) {
					await HostApi.instance.send(DeleteThirdPartyPostRequestType, {
						providerId: shareTarget.providerId,
						channelId: shareTarget.channelId,
						providerPostId: shareTarget.postId,
						providerTeamId: shareTarget.teamId,
					});
				}
			}
		} catch (error) {
			logError(`There was an error deleting a third party shared post: ${error}`);
		}
		dispatch(_deleteCodemark(codemarkId));
	} catch (error) {
		logError(error, { detail: `failed to delete codemark`, codemarkId });
	}
};

export const editCodemark =
	(codemark: CodemarkPlus, attributes: EditableAttributes) => async (dispatch, getState) => {
		try {
			const { markers = [] } = codemark;
			const { deleteMarkerLocations = {}, codeBlocks } = attributes;

			if (Object.keys(deleteMarkerLocations).length > 0) {
				const toDelete: { markerId: string }[] = [];

				Object.keys(deleteMarkerLocations).forEach(index => {
					if (markers[index]) toDelete.push({ markerId: markers[index].id });
				});

				await Promise.all(
					toDelete.map(args => HostApi.instance.send(DeleteMarkerRequestType, args))
				);
			}

			let remotes: string[] = [];
			if (codeBlocks) {
				const toAdd: AddMarkersRequest = { codemarkId: codemark.id, newMarkers: [] };
				const toMove: MoveMarkerRequest[] = [];

				codeBlocks.forEach((codeBlock, index) => {
					if (!codeBlock || deleteMarkerLocations[index]) return;

					if (index >= markers.length && codeBlock.scm) {
						toAdd.newMarkers.push({
							code: codeBlock.contents,
							documentId: { uri: codeBlock.uri },
							range: codeBlock.range,
							source: codeBlock.scm,
						});
					} else if (markers[index] && codeBlock.scm) {
						toMove.push({
							markerId: markers[index].id,
							code: codeBlock.contents,
							range: codeBlock.range,
							documentId: { uri: codeBlock.uri },
							source: codeBlock.scm,
						});
					}
				});

				if (toAdd.newMarkers.length > 0) {
					await HostApi.instance.send(AddMarkersRequestType, toAdd);
				}
				if (toMove.length > 0) {
					await Promise.all(toMove.map(args => HostApi.instance.send(MoveMarkerRequestType, args)));
				}
			}

			const response = await HostApi.instance.send(UpdateCodemarkRequestType, {
				codemarkId: codemark.id,
				...attributes,
			});
			if (attributes.sharedTo) {
				const { sharedTo } = attributes;
				for (const shareTarget of sharedTo) {
					try {
						const { post, ts, permalink } = await HostApi.instance.send(
							CreateThirdPartyPostRequestType,
							{
								providerId: shareTarget.providerId,
								channelId: shareTarget.channelId,
								providerTeamId: shareTarget.teamId,
								existingPostId: shareTarget.postId,
								text: attributes.text || "",
								codemark: response.codemark,
								remotes: [],
								mentionedUserIds: findMentionedUserIds(
									getTeamMembers(getState()),
									attributes.text || ""
								).concat(attributes.assignees || []),
							}
						);
						if (ts) {
							await HostApi.instance.send(UpdatePostSharingDataRequestType, {
								postId: response.codemark.postId,
								sharedTo: [
									{
										createdAt: post.createdAt,
										providerId: shareTarget.providerId,
										teamId: shareTarget.teamId,
										teamName: shareTarget.teamName || "",
										channelId: shareTarget.channelId,
										channelName: shareTarget.channelName || "",
										postId: ts,
										url: permalink || "",
									},
								],
							});
						}
						HostApi.instance.track("codestream/codemarks/share succeeded", {
							meta_data: `destination: ${
								getConnectedProviders(getState()).find(
									config => config.id === shareTarget.providerId
								)!.name === "msteams"
									? "teams"
									: "slack"
									? "slack"
									: ""
							}`,
							meta_data_2: `codemark_status: existing`,
							meta_data_3: `conversation_type": ${
								shareTarget.channelId === "channel" ? "channel" : "group_dm"
							}`,
							event_type: "response",
						});
					} catch (error) {
						logError("Error sharing a codemark", { message: error.toString() });
						throw { reason: "share" } as CreateCodemarkError;
					}
				}
			}

			dispatch(updateCodemarks([response.codemark]));
		} catch (error) {
			logError(error, {
				detail: `failed to update codemark`,
				codemarkId: codemark.id,
			});
		}
	};
