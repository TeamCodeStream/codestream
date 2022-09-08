import { CSCodemark, CodemarkType, Attachment } from "@codestream/protocols/api";
import { action } from "../common";
import { CodemarksActionsTypes } from "./types";
import { HostApi } from "@codestream/webview/webview-api";
import {
	AddMarkersRequest,
	AddMarkersRequestType,
	UpdateCodemarkRequestType,
	UpdatePostSharingDataRequestType,
	DeleteCodemarkRequestType,
	GetRangeScmInfoResponse,
	CrossPostIssueValues,
	CreateShareableCodemarkRequestType,
	CreateThirdPartyPostRequestType,
	CreatePassthroughCodemarkResponse,
	DeleteMarkerRequestType,
	CodemarkPlus,
	MoveMarkerRequest,
	MoveMarkerRequestType,
	DeleteThirdPartyPostRequestType,
	SharePostViaServerRequestType
} from "@codestream/protocols/agent";
import { ShareTarget } from "@codestream/protocols/api";
import { logError } from "@codestream/webview/logger";
import { addStreams } from "../streams/actions";
import { TextDocumentIdentifier } from "vscode-languageserver-types";
import { getConnectedProviders } from "../providers/reducer";
import { CodeStreamState } from "..";
import { capitalize } from "@codestream/webview/utils";
import { isObject } from "lodash-es";
import { handleDirectives } from "../providerPullRequests/actions";
import { findMentionedUserIds, getTeamMembers } from "../users/reducer";

export const reset = () => action("RESET");

export const addCodemarks = (codemarks: CSCodemark[]) =>
	action(CodemarksActionsTypes.AddCodemarks, codemarks);

export const saveCodemarks = (codemarks: CSCodemark[]) =>
	action(CodemarksActionsTypes.SaveCodemarks, codemarks);

export const updateCodemarks = (codemarks: CSCodemark[]) =>
	action(CodemarksActionsTypes.UpdateCodemarks, codemarks);

export interface BaseNewCodemarkAttributes {
	codeBlocks: GetRangeScmInfoResponse[];
	text: string;
	type: CodemarkType;
	assignees: string[];
	title?: string;
	crossPostIssueValues?: CrossPostIssueValues;
	tags: string[];
	relatedCodemarkIds: string[];
	/** for removing markers */
	deleteMarkerLocations?: {
		[index: number]: boolean;
	};
	files?: Attachment[];
}

interface BaseSharingAttributes {
	providerId: string;
	providerTeamId: string;
	providerTeamName?: string;
	channelName?: string;
	botUserId?: string;
}

type ChannelSharingAttributes = BaseSharingAttributes & {
	type: "channel";
	channelId: string;
};

type DirectSharingAttributes = BaseSharingAttributes & {
	type: "direct";
	userIds: string[];
};

type SharingAttributes = ChannelSharingAttributes | DirectSharingAttributes;

export interface SharingNewCodemarkAttributes extends BaseNewCodemarkAttributes {
	accessMemberIds: string[];
	remotes?: string[];
	sharingAttributes?: SharingAttributes;
	textDocuments?: TextDocumentIdentifier[];
	entryPoint?: string;
	mentionedUserIds?: string[];
	/** email addresses of users to notify and add to the team */
	addedUsers?: string[];
	/** codemarks can now be replies */
	parentPostId?: string;
	isChangeRequest?: boolean;
	isPseudoCodemark?: boolean;
	/** Signifies if this comment should be part of a code provider's PR review */
	isProviderReview?: boolean;
}

export interface LegacyNewCodemarkAttributes extends BaseNewCodemarkAttributes {
	streamId: string;
}

export type NewCodemarkAttributes = LegacyNewCodemarkAttributes | SharingNewCodemarkAttributes;

export function isLegacyNewCodemarkAttributes(
	object: NewCodemarkAttributes
): object is LegacyNewCodemarkAttributes {
	return (object as any).streamId != undefined;
}

export interface CreateCodemarkError {
	reason: "share" | "create";
	message?: string;
}

export function isCreateCodemarkError(object: any): object is CreateCodemarkError {
	return isObject(object) && "reason" in object;
}

export const createCodemark = (attributes: SharingNewCodemarkAttributes) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
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
			ideName: state.ide.name
		});
		if (response) {
			let result;
			let responseAsPassthrough = (response as any) as CreatePassthroughCodemarkResponse;
			if (responseAsPassthrough?.isPassThrough) {
				if (responseAsPassthrough && responseAsPassthrough.directives) {
					dispatch(
						handleDirectives(
							responseAsPassthrough.pullRequest.providerId,
							responseAsPassthrough.pullRequest.id,
							responseAsPassthrough.directives.directives
						)
					);
					return {
						handled: true
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
								files: attributes.files
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
										url: permalink || ""
									}
								]
							});
						}
						HostApi.instance.track("Shared Codemark", {
							Destination: capitalize(
								getConnectedProviders(getState()).find(
									config => config.id === attributes.sharingAttributes!.providerId
								)!.name
							),
							"Codemark Status": "New",
							"Conversation Type": sharingAttributes.type === "channel" ? "Channel" : "Group DM"
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
					const sharedTo = state.posts.byStream[response.post.streamId][attributes.parentPostId]
						.sharedTo!;
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
									mentionedUserIds: attributes.mentionedUserIds
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
											url: permalink || ""
										}
									]
								});
							}
						} catch (error) {
							try {
								await HostApi.instance.send(SharePostViaServerRequestType, {
									postId: response.post.id,
									providerId: target.providerId
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
			message: userFriendlyMessage ? userFriendlyMessage[0] : ""
		} as CreateCodemarkError;
	}
};

export const _deleteCodemark = (codemarkId: string) =>
	action(CodemarksActionsTypes.Delete, codemarkId);

export const deleteCodemark = (codemarkId: string, sharedTo?: ShareTarget[]) => async dispatch => {
	try {
		void (await HostApi.instance.send(DeleteCodemarkRequestType, {
			codemarkId
		}));
		try {
			if (sharedTo) {
				for (const shareTarget of sharedTo) {
					await HostApi.instance.send(DeleteThirdPartyPostRequestType, {
						providerId: shareTarget.providerId,
						channelId: shareTarget.channelId,
						providerPostId: shareTarget.postId,
						providerTeamId: shareTarget.teamId
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

type EditableAttributes = Partial<
	Pick<CSCodemark, "tags" | "text" | "title" | "assignees" | "relatedCodemarkIds">
> & {
	deleteMarkerLocations?: {
		[index: number]: boolean;
	};
	codeBlocks?: GetRangeScmInfoResponse[];
	sharedTo?: ShareTarget[];
};

export const editCodemark = (codemark: CodemarkPlus, attributes: EditableAttributes) => async (
	dispatch,
	getState
) => {
	try {
		const { markers = [] } = codemark;
		const { deleteMarkerLocations = {}, codeBlocks } = attributes;

		if (Object.keys(deleteMarkerLocations).length > 0) {
			const toDelete: { markerId: string }[] = [];

			Object.keys(deleteMarkerLocations).forEach(index => {
				if (markers[index]) toDelete.push({ markerId: markers[index].id });
			});

			await Promise.all(toDelete.map(args => HostApi.instance.send(DeleteMarkerRequestType, args)));
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
						source: codeBlock.scm
					});
				} else if (markers[index] && codeBlock.scm) {
					toMove.push({
						markerId: markers[index].id,
						code: codeBlock.contents,
						range: codeBlock.range,
						documentId: { uri: codeBlock.uri },
						source: codeBlock.scm
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
			...attributes
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
							).concat(attributes.assignees || [])
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
									url: permalink || ""
								}
							]
						});
					}
					HostApi.instance.track("Shared Codemark", {
						Destination: capitalize(
							getConnectedProviders(getState()).find(
								config => config.id === shareTarget.providerId
							)!.name
						),
						"Codemark Status": "Edited"
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
			codemarkId: codemark.id
		});
	}
};

export const canCreateCodemark = (textEditorUri: string | undefined) => {
	// you can create markerless codemarks / codemarks not attached to files
	if (!textEditorUri) return true;
	// currently only support file:// or the "right" side
	// of codemark-diff:// uris
	if (textEditorUri.startsWith("file://")) return true;
	const regex = /codestream-diff:\/\/(\w+)\/(\w+)\/(\w+)\/right\/(.+)/;
	const match = regex.exec(textEditorUri);
	if (match && match.length) return true;

	try {
		const parsed = parseCodeStreamDiffUri(textEditorUri);
		return parsed && parsed.side === "right";
	} catch {}

	return false;
};

export const parseCodeStreamDiffUri = (
	uri?: string
):
	| {
			path: string;
			side: string;
			context?: {
				pullRequest: {
					providerId: string;
					id: string;
				};
			};
	  }
	| undefined => {
	if (!uri) return undefined;

	const m = uri.match(/\/-\d\-\/(.*)\/\-\d\-/);
	if (m && m.length) {
		try {
			return JSON.parse(atob(decodeURIComponent(m[1]))) as any;
		} catch (ex) {
			console.error(ex);
		}
	}

	return undefined;
};
