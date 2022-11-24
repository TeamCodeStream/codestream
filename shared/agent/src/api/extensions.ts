"use strict";
import {
	CSCodeError,
	CSCodemark,
	CSLocationArray,
	CSMarker,
	CSMarkerLocation,
	CSMarkerLocations,
	CSMe,
	CSMSTeamsProviderInfo,
	CSProviderInfos,
	CSReview,
	CSSlackProviderInfo,
	CSTeam,
	CSTeamProviderInfos,
} from "@codestream/protocols/api";
import { Range } from "vscode-languageserver";

import { Logger } from "../logger";

export interface MarkerLocationArraysById {
	[id: string]: CSLocationArray;
}

export interface MarkerLocationsById {
	[id: string]: CSMarkerLocation;
}

export namespace MarkerLocation {
	export function empty(): CSMarkerLocation {
		return {
			id: "$transientLocation",
			lineStart: 1,
			colStart: 1,
			lineEnd: 1,
			colEnd: 1,
			meta: {
				startWasDeleted: true,
				endWasDeleted: true,
				entirelyDeleted: true,
			},
		};
	}

	export function fromArray(array: CSLocationArray, id: string): CSMarkerLocation {
		return {
			id,
			lineStart: array[0],
			colStart: array[1],
			lineEnd: array[2],
			colEnd: array[3],
			meta: array[4],
		};
	}

	export function fromRange(range: Range): CSMarkerLocation {
		return {
			id: "$transientLocation",
			lineStart: range.start.line + 1,
			colStart: range.start.character + 1,
			lineEnd: range.end.line + 1,
			colEnd: range.end.character + 1,
		};
	}

	export function toArray(location: CSMarkerLocation): CSLocationArray {
		return [
			location.lineStart,
			location.colStart,
			location.lineEnd,
			location.colEnd,
			location.meta,
		];
	}

	export function toArrayFromRange(range: Range): CSLocationArray {
		return [
			range.start.line + 1,
			range.start.character + 1,
			range.end.line + 1,
			range.end.character + 1,
			undefined,
		];
	}

	export function toArraysById(locations: MarkerLocationsById): MarkerLocationArraysById {
		return Object.entries(locations).reduce((m, [id, location]) => {
			m[id] = toArray(location);
			return m;
		}, Object.create(null));
	}

	export function toLocationById(location: CSMarkerLocation): MarkerLocationsById {
		return { [location.id]: location };
	}

	export function toLocationsById(
		markerLocations: CSMarkerLocations | undefined
	): MarkerLocationsById {
		if (markerLocations == null || markerLocations.locations == null) return {};

		return Object.entries(markerLocations.locations).reduce((m, [id, array]) => {
			m[id] = fromArray(array, id);
			return m;
		}, Object.create(null));
	}

	export function toRange(location: CSMarkerLocation): Range {
		return Range.create(
			Math.max(location.lineStart - 1, 0),
			Math.max(location.colStart - 1, 0),
			Math.max(location.lineEnd - 1, 0),
			Math.max(location.colEnd - 1, 0)
		);
	}

	export function toRangeFromArray(locationLike: CSLocationArray): Range {
		return Range.create(
			Math.max(locationLike[0] - 1, 0),
			Math.max(locationLike[1] - 1, 0),
			Math.max(locationLike[2] - 1, 0),
			Math.max(locationLike[3] - 1, 0)
		);
	}
}

const remoteProviders: [
	string,
	string,
	RegExp,
	(remote: string, ref: string, file: string, start: number, end: number) => string
][] = [
	[
		"github",
		"GitHub",
		/(?:^|\.)github\.com/i,
		(remote: string, ref: string, file: string, start: number, end: number) =>
			`https://${remote}/blob/${ref}/${file}#L${start}${start !== end ? `-L${end}` : ""}`,
	],
	[
		"gitlab",
		"GitLab",
		/(?:^|\.)gitlab\.com/i,
		(remote: string, ref: string, file: string, start: number, end: number) =>
			`https://${remote}/blob/${ref}/${file}#L${start}${start !== end ? `-${end}` : ""}`,
	],
	[
		"bitBucket",
		"Bitbucket",
		/(?:^|\.)bitbucket\.org/i,
		(remote: string, ref: string, file: string, start: number, end: number) =>
			`https://${remote}/src/${ref}/${file}#${file}-${start}${start !== end ? `:${end}` : ""}`,
	],
	[
		"azure-devops",
		"Azure DevOps",
		/(?:^|\.)dev\.azure\.com/i,
		(remote: string, ref: string, file: string, start: number, end: number) =>
			`https://${remote}/commit/${ref}/?_a=contents&path=%2F${file}&line=${start}${
				start !== end ? `&lineEnd=${end}` : ""
			}`,
	],
	[
		"vsts",
		"Azure DevOps",
		/(?:^|\.)?visualstudio\.com$/i,
		(remote: string, ref: string, file: string, start: number, end: number) =>
			`https://${remote}/commit/${ref}/?_a=contents&path=%2F${file}&line=${start}${
				start !== end ? `&lineEnd=${end}` : ""
			}`,
	],
];

export namespace Marker {
	export function getProviderDisplayName(name: string): string | undefined {
		const provider = remoteProviders.find(_ => _[0] === name);
		return provider && provider[1];
	}

	export function getRemoteCodeUrl(
		remote: string,
		ref: string,
		file: string,
		startLine: number,
		endLine: number
	): { displayName: string; name: string; url: string } | undefined {
		let url;
		for (const [name, displayName, regex, fn] of remoteProviders) {
			if (!regex.test(remote)) continue;

			url = fn(remote, ref, file, startLine, endLine);
			if (url !== undefined) {
				return { displayName: displayName, name: name, url: url };
			}
		}

		return undefined;
	}

	export function getMissingMarkerIds(
		markers: CSMarker[],
		locations: MarkerLocationsById
	): Set<string> {
		const missingMarkerIds = new Set<string>();
		for (const m of markers) {
			if (!locations[m.id]) {
				missingMarkerIds.add(m.id);
			}
		}
		return missingMarkerIds;
	}

	export function getMissingMarkersByCommit(markers: CSMarker[], locations: MarkerLocationsById) {
		const missingMarkerIds = Marker.getMissingMarkerIds(markers, locations);

		const missingMarkersByCommitHashWhenCreated = new Map<string, CSMarker[]>();
		for (const m of markers) {
			if (!missingMarkerIds.has(m.id)) {
				continue;
			}

			let markersForCommitHash = missingMarkersByCommitHashWhenCreated.get(m.commitHashWhenCreated);
			if (!markersForCommitHash) {
				markersForCommitHash = [];
				missingMarkersByCommitHashWhenCreated.set(m.commitHashWhenCreated, markersForCommitHash);
			}
			Logger.log(`Missing location for marker ${m.id} - will calculate`);
			markersForCommitHash.push(m);
		}
		return missingMarkersByCommitHashWhenCreated;
	}
}

export namespace Ranges {
	export function ensureStartBeforeEnd(range: Range) {
		if (
			range.start.line > range.end.line ||
			(range.start.line === range.end.line && range.start.character > range.end.character)
		) {
			return Range.create(range.end, range.start);
		}

		return range;
	}
}
export namespace Team {
	export function isProvider(team: CSTeam, provider: string) {
		if (provider === "codestream") return isCodeStream(team);

		return (
			team.providerInfo != null &&
			(team.providerInfo as { [key: string]: CSTeamProviderInfos })[provider] != null
		);
	}

	export function isCodeStream(team: CSTeam) {
		return team.providerInfo == null || Object.keys(team.providerInfo).length === 0;
	}

	export function isMSTeams(
		team: CSTeam
	): team is CSTeam & { providerInfo: { msteams: CSMSTeamsProviderInfo } } {
		return team.providerInfo != null && team.providerInfo.msteams != null;
	}

	export function isSlack(
		team: CSTeam
	): team is CSTeam & { providerInfo: { slack: CSSlackProviderInfo } } {
		return team.providerInfo != null && team.providerInfo.slack != null;
	}
}

export namespace User {
	export function isMSTeams(
		me: CSMe
	): me is CSMe & { providerInfo: { msteams: CSMSTeamsProviderInfo } } {
		return (
			me.providerInfo != null &&
			(me.providerInfo.msteams != null ||
				Object.values(me.providerInfo).some(provider => provider.msteams != null))
		);
	}

	export function isSlack(me: CSMe): me is CSMe & { providerInfo: { slack: CSSlackProviderInfo } } {
		return (
			me.providerInfo != null &&
			(me.providerInfo.slack != null ||
				Object.values(me.providerInfo).some(provider => provider.slack != null))
		);
	}

	export function getProviderInfo<T extends CSProviderInfos>(
		me: CSMe,
		teamId: string,
		name: string,
		host?: string
	) {
		if (me.providerInfo == null) {
			return undefined;
		}

		const userProviderInfo = me.providerInfo[name];
		const teamProviderInfo = me.providerInfo[teamId] && me.providerInfo[teamId][name];

		// sometimes we end up with me.providerInfo.slack.multiple being an empty object
		const isProviderInfoValid = (p: any) => {
			if (!p) return false;
			if (p.accessToken) return true;
			if (p.multiple && Object.keys(p.multiple).length > 0) return true;
			return false;
		};

		const namedProvider = isProviderInfoValid(userProviderInfo)
			? userProviderInfo
			: teamProviderInfo;
		if (!namedProvider) {
			return undefined;
		}
		const typedProvider = namedProvider as any as T;
		if (!host) {
			return typedProvider;
		}
		const starredHost = host.replace(/\./g, "*");
		if (typedProvider.hosts && typedProvider.hosts[starredHost]) {
			return typedProvider.hosts[starredHost] as T;
		}

		return undefined;
	}
}

export interface ActionId {
	id: number;
	linkType: "web" | "ide" | "external" | "reply";
	externalType?: "issue" | "code";
	externalProvider?: string;
	teamId: string;
	codemarkId: string;
	markerId?: string;
	streamId?: string;
	creatorId?: string;
	parentPostId?: string;
}

export interface ReviewActionId {
	id: number;
	linkType: "web" | "ide" | "review-reply";
	externalProvider?: string;
	teamId: string;
	reviewId: string;
	streamId?: string;
	creatorId?: string;
	parentPostId?: string;
}

export interface CodeErrorActionId {
	id: number;
	linkType: "web" | "ide" | "code-error-reply";
	externalProvider?: string;
	codeErrorId: string;
	streamId?: string;
	creatorId?: string;
	parentPostId?: string;
}

export interface ReplyActionId {
	id: number;
	linkType: "web" | "ide" | "external" | "reply" | "reply-disabled";
	externalType?: "issue" | "code";
	// codemarkId
	cId: string;
	// provider creator user id, a slack userId, for example
	pcuId?: string;
}

export interface CodeErrorReplyActionId {
	id: number;
	linkType: "web" | "ide" | "review-reply" | "review-reply-disabled" | "code-error-reply";
	// codeErrorId
	ceId: string;
	// provider creator user id, a slack userId, for example
	pcuId?: string;
}

export interface ReviewReplyActionId {
	id: number;
	linkType: "web" | "ide" | "review-reply" | "review-reply-disabled";
	// reviewId
	rId: string;
	// provider creator user id, a slack userId, for example
	pcuId?: string;
}

export function toReviewActionId(
	id: number,
	linkType: "web" | "ide" | "review-reply",
	review: CSReview
): string {
	const actionId: ReviewActionId = {
		id: id,
		linkType: linkType,
		teamId: review.teamId,
		reviewId: review.id,
	};

	return JSON.stringify(actionId);
}

export function toActionId(
	id: number,
	linkType: "web" | "ide" | "reply",
	codemark: CSCodemark,
	marker?: CSMarker
): string {
	const actionId: ActionId = {
		id: id,
		linkType: linkType,
		teamId: codemark.teamId,
		codemarkId: codemark.id,
		markerId: marker && marker.id,
	};

	return JSON.stringify(actionId);
}

export function toCodeErrorActionId(
	id: number,
	linkType: "web" | "ide" | "code-error-reply",
	codeError: CSCodeError
): string {
	const actionId: CodeErrorActionId = {
		id: id,
		codeErrorId: codeError.id,
		linkType: linkType,
	};

	return JSON.stringify(actionId);
}

export function toExternalActionId(
	id: number,
	providerType: "issue" | "code",
	provider: string,
	codemark: CSCodemark,
	marker?: CSMarker
): string {
	const actionId: ActionId = {
		id: id,
		linkType: "external",
		externalType: providerType,
		externalProvider: provider,
		teamId: codemark.teamId,
		codemarkId: codemark.id,
		markerId: marker && marker.id,
	};

	return JSON.stringify(actionId);
}

export function toCodeErrorReplyActionId(
	id: number,
	codeError: CSCodeError,
	providerCreatorUserId?: string
): string {
	const actionId: CodeErrorReplyActionId = {
		id: id,
		linkType: "code-error-reply",
		ceId: codeError.id,
		pcuId: providerCreatorUserId,
	};

	return JSON.stringify(actionId);
}

export function toReviewReplyActionId(
	id: number,
	review: CSReview,
	providerCreatorUserId?: string
): string {
	const actionId: ReviewReplyActionId = {
		id: id,
		linkType: "review-reply",
		rId: review.id,
		pcuId: providerCreatorUserId,
	};

	return JSON.stringify(actionId);
}

export function toReplyActionId(
	id: number,
	codemark: CSCodemark,
	providerCreatorUserId: string
): string {
	const actionId: ReplyActionId = {
		id: id,
		linkType: "reply",
		cId: codemark.id,
		pcuId: providerCreatorUserId,
	};

	return JSON.stringify(actionId);
}

export function toReplyDisabledActionId(
	id: number,
	codemark: CSCodemark,
	providerCreatorUserId: string
): string {
	const actionId: ReplyActionId = {
		id: id,
		linkType: "reply-disabled",
		cId: codemark.id,
		pcuId: providerCreatorUserId,
	};

	return JSON.stringify(actionId);
}
