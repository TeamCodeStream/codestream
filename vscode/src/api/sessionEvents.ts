"use strict";
import {
	DidChangeDataNotification,
	PostsChangedNotification,
	ReviewsChangedNotification,
	PullRequestsChangedNotification,
	PullRequestsChangedData,
	PreferencesChangedNotification
} from "@codestream/protocols/agent";
import { CSMePreferences } from "@codestream/protocols/api";
import { Uri } from "vscode";
import { memoize } from "../system";
import { CodeStreamSession, Post, SessionSignedOutReason, SessionStatus } from "./session";

export interface SessionStatusChangedEvent {
	getStatus(): SessionStatus;
	session: CodeStreamSession;
	reason?: SessionSignedOutReason;
}

export class TextDocumentMarkersChangedEvent {
	constructor(
		public readonly session: CodeStreamSession,
		public readonly uri: Uri
	) {}
}

export class PullRequestCommentsChangedEvent {
	constructor(public readonly session: CodeStreamSession) {}
}

export enum SessionChangedEventType {
	Codemarks = "codemarks",
	Posts = "posts",
	Preferences = "preferences",
	PullRequests = "pullRequests",
	Repositories = "repos",
	Streams = "streams",
	StreamsMembership = "streamsMembership",
	Teams = "teams",
	Unreads = "unreads",
	Users = "users",
	Reviews = "reviews"
}

export interface SessionChangedEvent {
	readonly type: SessionChangedEventType;
}

export interface MergeableEvent<T> extends SessionChangedEvent {
	merge(e: T): void;
}

export function isMergeableEvent<T>(e: SessionChangedEvent): e is MergeableEvent<T> {
	return typeof (e as any).merge === "function";
}

abstract class SessionChangedEventBase<T extends DidChangeDataNotification>
	implements SessionChangedEvent
{
	abstract readonly type: SessionChangedEventType;

	constructor(
		public readonly session: CodeStreamSession,
		protected readonly _event: T
	) {}
}

export class PostsChangedEvent
	extends SessionChangedEventBase<PostsChangedNotification>
	implements MergeableEvent<PostsChangedEvent>
{
	readonly type = SessionChangedEventType.Posts;

	get count() {
		return this._event.data.length;
	}

	affects(id: string, type: "entity" | "stream" | "team") {
		return affects(this._event.data, id, type);
	}

	@memoize
	items() {
		return this._event.data.map(p => new Post(this.session, p));
	}

	merge(e: PostsChangedEvent) {
		this._event.data.push(...e._event.data);
	}
}

export class ReviewsChangedEvent
	extends SessionChangedEventBase<ReviewsChangedNotification>
	implements MergeableEvent<ReviewsChangedEvent>
{
	readonly type = SessionChangedEventType.Reviews;

	get count() {
		return this._event.data.length;
	}

	merge(e: ReviewsChangedEvent) {
		this._event.data.push(...e._event.data);
	}
}

export class PreferencesChangedEvent extends SessionChangedEventBase<PreferencesChangedNotification> {
	readonly type = SessionChangedEventType.Preferences;

	@memoize
	preferences(): CSMePreferences {
		return this._event.data;
	}
}

export class PullRequestsChangedEvent
	extends SessionChangedEventBase<PullRequestsChangedNotification>
	implements MergeableEvent<PullRequestsChangedEvent>
{
	readonly type = SessionChangedEventType.PullRequests;

	merge(e: PullRequestsChangedEvent) {
		this._event.data.push(...e._event.data);
	}

	@memoize
	pullRequestNotifications(): PullRequestsChangedData[] {
		return this._event.data;
	}
}

function affects(
	data: { [key: string]: any }[],
	id: string,
	type: "entity" | "stream" | "repo" | "team"
) {
	let key: string;
	switch (type) {
		case "repo":
			key = "repoId";
			break;
		case "stream":
			key = "streamId";
			break;
		case "team":
			key = "teamId";
			break;
		default:
			key = "id";
	}
	return data.some(i => (i as { [key: string]: any })[key] === id);
}
