import { CrossPostIssueValues, GetRangeScmInfoResponse } from "@codestream/protocols/agent";
import { Attachment, CodemarkType, CSCodemark } from "@codestream/protocols/api";
import { isObject } from "lodash-es";
import { TextDocumentIdentifier } from "vscode-languageserver-types";
import { action } from "../common";
import { CodemarksActionsTypes } from "./types";

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

export const _deleteCodemark = (codemarkId: string) =>
	action(CodemarksActionsTypes.Delete, codemarkId);

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
