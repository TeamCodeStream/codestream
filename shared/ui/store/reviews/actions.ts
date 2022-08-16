import {
	CSReview,
	CSReviewChangeset,
	CSRepoChange,
	Attachment,
	ShareTarget
} from "@codestream/protocols/api";
import { action } from "../common";
import { ReviewsActionsTypes } from "./types";
import { HostApi } from "@codestream/webview/webview-api";
import {
	UpdateReviewRequestType,
	DeleteReviewRequestType,
	CreateThirdPartyPostRequestType,
	CreateShareableReviewRequestType,
	RepoScmStatus,
	GetReviewRequestType,
	FetchReviewsRequestType,
	UpdateReviewResponse,
	UpdatePostSharingDataRequestType,
	DeleteThirdPartyPostRequestType
} from "@codestream/protocols/agent";
import { logError } from "@codestream/webview/logger";
import { addStreams } from "../streams/actions";
import { getConnectedProviders } from "../providers/reducer";
import { CodeStreamState } from "..";
import { capitalize, mapFilter } from "@codestream/webview/utils";
import { addPosts } from "../posts/actions";
import {
	ReviewCloseDiffRequestType,
	ReviewShowDiffRequestType,
	ReviewCheckpoint
} from "@codestream/protocols/webview";
import { createPost } from "@codestream/webview/Stream/actions";
import { findMentionedUserIds, getTeamMembers } from "../users/reducer";
import { phraseList } from "@codestream/webview/utilities/strings";

export const reset = () => action("RESET");

export const _bootstrapReviews = (reviews: CSReview[]) =>
	action(ReviewsActionsTypes.Bootstrap, reviews);

export const bootstrapReviews = () => async dispatch => {
	const { reviews } = await HostApi.instance.send(FetchReviewsRequestType, {});
	dispatch(_bootstrapReviews(reviews));
};

export const addReviews = (reviews: CSReview[]) => action(ReviewsActionsTypes.AddReviews, reviews);

export const saveReviews = (reviews: CSReview[]) =>
	action(ReviewsActionsTypes.SaveReviews, reviews);

export const updateReviews = (reviews: CSReview[]) =>
	action(ReviewsActionsTypes.UpdateReviews, reviews);

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

export interface NewReviewAttributes {
	title: string;
	text: string;
	reviewers: string[];
	allReviewersMustApprove?: boolean;
	authorsById: { [authorId: string]: { stomped: number; commits: number } };
	tags: string[];

	// these changes will be massaged into a changeSet
	repoChanges: {
		scm: RepoScmStatus;
		startCommit: string;
		excludeCommit: string;
		excludedFiles: string[];
		// we have to pass these separately because
		// git diff isn't smart enough to be able to
		// show diffs for untracked files
		newFiles: string[];
		includeSaved: boolean;
		includeStaged: boolean;
		remotes: { name: string; url: string }[];
		checkpoint: ReviewCheckpoint;
	}[];

	accessMemberIds: string[];
	sharingAttributes?: SharingAttributes;
	mentionedUserIds?: string[];
	addedUsers?: string[];
	entryPoint?: string;
	files?: Attachment[];
}

export interface CreateReviewError {
	reason: "share" | "create";
	message?: string;
}

export const createReview = (attributes: NewReviewAttributes) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	const { accessMemberIds, ...rest } = attributes;

	try {
		const response = await HostApi.instance.send(CreateShareableReviewRequestType, {
			attributes: rest,
			memberIds: accessMemberIds,
			entryPoint: attributes.entryPoint,
			mentionedUserIds: attributes.mentionedUserIds,
			addedUsers: attributes.addedUsers
		});
		if (response) {
			const result = dispatch(addReviews([response.review]));
			dispatch(addStreams([response.stream]));
			dispatch(addPosts([response.post]));

			if (attributes.sharingAttributes) {
				const { sharingAttributes } = attributes;
				try {
					const { post, ts, permalink, channelId } = await HostApi.instance.send(
						CreateThirdPartyPostRequestType,
						{
							providerId: attributes.sharingAttributes.providerId,
							channelId:
								sharingAttributes.type === "channel" ? sharingAttributes.channelId : undefined,
							memberIds:
								sharingAttributes.type === "direct" ? sharingAttributes.userIds : undefined,
							providerTeamId: attributes.sharingAttributes.providerTeamId,
							providerServerTokenUserId: sharingAttributes.botUserId,
							text: rest.text,
							review: response.review,
							mentionedUserIds: attributes.mentionedUserIds,
							files: attributes.files
						}
					);
					if (ts) {
						await HostApi.instance.send(UpdatePostSharingDataRequestType, {
							postId: response.post.id,
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
					HostApi.instance.track("Shared Review", {
						Destination: capitalize(
							getConnectedProviders(getState()).find(
								config => config.id === attributes.sharingAttributes!.providerId
							)!.name
						),
						"Review Status": "New",
						"Conversation Type": sharingAttributes.type === "channel" ? "Channel" : "Group DM"
					});
				} catch (error) {
					logError("Error sharing a review", { message: error.toString() });
					// TODO: communicate failure to users
					throw { reason: "share" } as CreateReviewError;
				}
			}
			return result;
		}
	} catch (error) {
		logError(error, {
			detail: "Error creating a review"
		});
		throw { reason: "create", ...error } as CreateReviewError;
	}
};

export const _deleteReview = (id: string) => action(ReviewsActionsTypes.Delete, id);

export const deleteReview = (id: string, sharedTo?: ShareTarget[]) => async dispatch => {
	try {
		await HostApi.instance.send(DeleteReviewRequestType, {
			id
		});
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
		dispatch(_deleteReview(id));
	} catch (error) {
		logError(error, { detail: `failed to delete review`, id });
	}
};

/**
 * "Advanced" properties that can come from the client (webview)
 */
interface AdvancedEditableReviewAttributes {
	repoChanges?: CSRepoChange[];
	sharedTo?: ShareTarget[];
	// array of userIds / tags to add
	$push: { reviewers?: string[]; tags?: string[] };
	// array of userIds / tags to remove
	$pull: { reviewers?: string[]; tags?: string[] };
}

export type EditableAttributes = Partial<
	Pick<CSReview, "tags" | "text" | "title" | "reviewers" | "allReviewersMustApprove"> &
		AdvancedEditableReviewAttributes
>;

export const editReview = (
	id: string,
	attributes: EditableAttributes,
	replyText?: string
) => async (dispatch, getState: () => CodeStreamState) => {
	let response: UpdateReviewResponse | undefined;
	try {
		response = await HostApi.instance.send(UpdateReviewRequestType, {
			id,
			...attributes
		});
		dispatch(updateReviews([response.review]));

		if (
			attributes.$push != null &&
			attributes.$push.reviewers != null &&
			attributes.$push.reviewers.length
		) {
			// if we have additional ids we're adding via $push, map them here
			const filteredUsers = mapFilter(getTeamMembers(getState()), teamMember => {
				const user = attributes.$push!.reviewers!.find(_ => _ === teamMember.id);
				return user ? teamMember : undefined;
			}).filter(Boolean);

			if (filteredUsers.length) {
				dispatch(
					createPost(
						response.review.streamId,
						response.review.postId,
						`/me added ${phraseList(filteredUsers.map(u => `@${u.username}`))} to this review`,
						null,
						filteredUsers.map(u => u.id)
					)
				);
			}
		}

		if (attributes.repoChanges) {
			// FIXME multiple-repo
			const checkpoint = attributes.repoChanges[0].checkpoint || 0;

			dispatch(
				createPost(
					response.review.streamId,
					response.review.postId,
					replyText || "",
					undefined,
					undefined,
					{ reviewCheckpoint: checkpoint }
				)
			);
		}

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
							review: response.review,
							mentionedUserIds: findMentionedUserIds(
								getTeamMembers(getState()),
								attributes.text || ""
							)
						}
					);
					if (ts) {
						await HostApi.instance.send(UpdatePostSharingDataRequestType, {
							postId: response.review.id,
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
					HostApi.instance.track("Shared Review", {
						Destination: capitalize(
							getConnectedProviders(getState()).find(
								config => config.id === shareTarget.providerId
							)!.name
						),
						"Review Status": "Edited"
					});
				} catch (error) {
					logError("Error sharing a review", { message: error.toString() });
					// TODO: communicate failure to users
					throw { reason: "share" } as CreateReviewError;
				}
			}
		}
	} catch (error) {
		logError(error, { detail: `failed to update review`, id });
	}
	return response;
};

export const fetchReview = (reviewId: string) => async dispatch => {
	const response = await HostApi.instance.send(GetReviewRequestType, { reviewId });

	if (response.review) return dispatch(saveReviews([response.review]));
};

export const showDiff = (
	reviewId: string,
	checkpoint: ReviewCheckpoint,
	repoId: string,
	path: string
) => async dispatch => {
	const response = HostApi.instance.send(ReviewShowDiffRequestType, {
		reviewId,
		checkpoint,
		repoId,
		path
	});
	// if (response.success)
	// return dispatch()
};

export const closeDiff = () => async dispatch => {
	const response = HostApi.instance.send(ReviewCloseDiffRequestType, {});
	// if (response.success)
	// return dispatch()
};

export interface NewCodeErrorAttributes {
	title: string;
	stackTrace: string;
}
