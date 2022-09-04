import { RepoScmStatus } from "@codestream/protocols/agent";
import { Attachment, CSRepoChange, CSReview, ShareTarget } from "@codestream/protocols/api";
import { ReviewCheckpoint } from "@codestream/protocols/webview";
import { action } from "../common";
import { ReviewsActionsTypes } from "./types";

export const reset = () => action("RESET");

export const _bootstrapReviews = (reviews: CSReview[]) =>
	action(ReviewsActionsTypes.Bootstrap, reviews);

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

export const _deleteReview = (id: string) => action(ReviewsActionsTypes.Delete, id);

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

export interface NewCodeErrorAttributes {
	title: string;
	stackTrace: string;
}
