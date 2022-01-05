"use strict";
import { Emitter, Event } from "vscode-languageserver";
import { SessionContainer } from "../../container";
import { Logger } from "../../logger";
import { Unreads } from "../../protocol/agent.protocol";
import {
	CSLastReadItems,
	CSLastReads,
	CSPost,
	CSStream,
	RepoSetting,
	StreamType
} from "../../protocol/api.protocol";
import { Arrays, Functions, log } from "../../system";
import { ApiProvider } from "../apiProvider";

export class CodeStreamUnreads {
	private _onDidChange = new Emitter<Unreads>();
	get onDidChange(): Event<Unreads> {
		return this._onDidChange.event;
	}

	private _lastReads: CSLastReads = Object.create(null);
	private _lastReadItems: CSLastReadItems = Object.create(null);
	private _mentions: { [streamId: string]: number } = Object.create(null);
	private _unreads: { [streamId: string]: number } = Object.create(null);

	constructor(private readonly _api: ApiProvider) {}

	private _computePromise: Promise<void> | undefined;
	@log()
	async compute(lastReads: CSLastReads | undefined, lastReadItems: CSLastReadItems | undefined) {
		if (this._computePromise !== undefined) {
			await this._computePromise;
		}

		this._computePromise = this.computeCore(lastReads, lastReadItems);
		return this._computePromise;
	}

	async get(): Promise<Unreads> {
		if (this._computePromise !== undefined) {
			await this._computePromise;
		}
		return this.values();
	}

	async update(posts: CSPost[], oldPosts: (CSPost | undefined)[]) {
		// Don't increment unreads for deleted, edited (if edited it isn't the first time its been seen), has replies (same as edited), or was posted by the current user
		posts = posts.filter(
			p =>
				!p.deactivated &&
				!p.hasBeenEdited &&
				p.numReplies === 0 &&
				p.creatorId !== this._api.userId &&
				(p.reactions == null || Object.keys(p.reactions).length === 0)
		);
		if (posts.length === 0) return;

		if (this._computePromise !== undefined) {
			await this._computePromise;
		}

		Logger.debug(`Unreads.update:`, `Updating unreads for ${posts.length} posts...`);

		const repoSettings: RepoSetting[] = await this.getRepoPreferences();
		if (repoSettings.length) {
			// get all the streams from posts that have a codemark or review
			const streamIds = Object.keys(
				Arrays.groupBy(
					posts.filter(_ => _.codemarkId || _.reviewId),
					p => p.streamId!
				)
			);
			posts = await this.filterPostsByPreferences(posts, repoSettings, streamIds);
		}
		const grouped = Arrays.groupBy(posts, p => p.streamId);
		const streams = (
			await SessionContainer.instance().streams.get({
				streamIds: Object.keys(grouped)
			})
		).streams;

		const { preferences } = await this._api.getPreferences();
		for (const [streamId, posts] of Object.entries(grouped)) {
			const oldPostsByStream = oldPosts.filter(oldPost => oldPost && oldPost.streamId === streamId);

			if (preferences.mutedStreams && preferences.mutedStreams[streamId]) continue;

			const stream = streams.find(s => s.id === streamId);
			if (stream == null) continue;

			this._mentions[streamId] = this._mentions[streamId] || 0;
			this._unreads[streamId] = this._unreads[streamId] || 0;

			Logger.debug(
				`Unreads.update(${streamId}):`,
				`Before: mentions=${this._mentions[streamId]}, unreads=${this._unreads[streamId]}`
			);

			this.computeForPosts(posts, this._api.userId, stream, oldPostsByStream as CSPost[]);

			if (this._lastReads[streamId] === undefined) {
				this._lastReads[streamId] = Number(posts[0].seqNum) - 1;
			}

			Logger.debug(
				`Unreads.update(${streamId}):`,
				`After: mentions=${this._mentions[streamId]}, unreads=${this._unreads[streamId]}`
			);
		}

		const values = this.values();
		Logger.debug(`Unreads.update:`, `Completed; values=${JSON.stringify(values)}`);

		this._onDidChange.fire(values);
	}

	private async getRepoPreferences(): Promise<RepoSetting[]> {
		try {
			const { preferences } = await this._api.getPreferences();
			const { scm } = SessionContainer.instance();

			let repoSettings: RepoSetting[] = [];
			const activityFilterByTeam =
				preferences && preferences[this._api.teamId] && preferences[this._api.teamId].activityFilter
					? preferences[this._api.teamId].activityFilter
					: undefined;
			if (activityFilterByTeam) {
				if (activityFilterByTeam.mode === "openInIde") {
					repoSettings =
						(await scm.getRepos({ inEditorOnly: true }))?.repositories
							?.filter(_ => _.id)
							.map(_ => {
								return { id: _.id!, paths: [] };
							}) || [];
				} else if (activityFilterByTeam.mode === "selectedRepos") {
					repoSettings = activityFilterByTeam?.settings?.repos || [];
				}
			}
			return repoSettings;
		} catch (ex) {
			Logger.error(ex);
			return [];
		}
	}

	private async filterPostsByPreferences(
		posts: CSPost[],
		repoSettings: RepoSetting[],
		streamIds: string[]
	) {
		if (!repoSettings || !repoSettings.length) return posts;

		try {
			const codemarks = (
				await SessionContainer.instance().codemarks.get({
					streamIds: streamIds
				})
			).codemarks;

			const reviews = (
				await SessionContainer.instance().reviews.get({
					streamIds: streamIds
				})
			).reviews;

			const codeErrors = (
				await SessionContainer.instance().codeErrors.get({
					streamIds: streamIds
				})
			).codeErrors;

			posts = posts
				.filter(_ => {
					if (_.mentionedUserIds && _.mentionedUserIds.includes(this._api.userId)) {
						return _;
					}
					if (_.codemarkId) {
						const codemark = codemarks.find(c => c.id === _.codemarkId);
						if (codemark) {
							if (codemark.assignees && codemark.assignees.includes(this._api.userId)) {
								return _;
							}

							let found: any = undefined;
							for (const repoSetting of repoSettings) {
								const match = codemark.markers?.find(m => {
									// there is a match if there is a path set and the file starts with the repoSetting path AND the repoIds match
									let isPathMatch = true;
									if (repoSetting.paths && repoSetting.paths[0] != null) {
										isPathMatch =
											(m.file || "").replace(/\\/g, "/").indexOf(repoSetting.paths![0]) === 0;
									}
									return isPathMatch && repoSetting.id === m.repoId;
								});
								found = match ? _ : undefined;
								if (found) {
									return found;
								}
							}
							return found;
						}
					}
					if (_.reviewId) {
						const review = reviews.find(c => c.id === _.reviewId);
						if (review) {
							if (review.reviewers && review.reviewers.includes(this._api.userId)) {
								return _;
							}
							let found: any = undefined;
							for (const repoSetting of repoSettings) {
								const match = review.reviewChangesets?.find(m => {
									// there is a match if there is a path set and the file starts with the repoSetting path AND the repoIds match
									let isPathMatch = true;
									if (repoSetting.paths && repoSetting.paths[0] != null) {
										isPathMatch = !!m.modifiedFiles.find(
											_ => (_.file || "").replace(/\\/g, "/").indexOf(repoSetting.paths![0]) === 0
										);
									}
									return isPathMatch && repoSetting.id === m.repoId;
								});
								found = match ? _ : undefined;
								if (found) {
									return found;
								}
							}
							return found;
						}
					}
					if (_.codeErrorId) {
						const codeError = codeErrors.find(c => c.id === _.reviewId);
						if (codeError) {
							let found: any = undefined;
							for (const repoSetting of repoSettings) {
								const match = codeError.stackTraces?.find(m => {
									return repoSetting.id === m.repoId;
								});
								found = match ? _ : undefined;
								if (found) {
									return found;
								}
							}
							return found;
						}
					}
					return undefined;
				})
				.filter(Boolean);
		} catch (ex) {
			debugger;
			Logger.error(ex);
		}

		return posts;
	}

	private async computeCore(
		lastReads: CSLastReads | undefined,
		lastReadItems: CSLastReadItems | undefined
	) {
		if (lastReads === undefined) {
			lastReads = Object.create(null) as CSLastReads;
		}

		if (lastReadItems === undefined) {
			lastReadItems = Object.create(null) as CSLastReadItems;
		}

		// Reset the counters
		this._unreads = Object.create(null);
		this._mentions = Object.create(null);

		Logger.debug(`Unreads.compute:`, "Computing...");

		const repoSettings: RepoSetting[] | undefined = await this.getRepoPreferences();

		const unreadStreams = (await SessionContainer.instance().streams.getUnread()).streams;
		if (unreadStreams.length !== 0) {
			const entries = Object.entries(lastReads);

			const { posts } = SessionContainer.instance();

			const { preferences } = await this._api.getPreferences();
			await Promise.all(
				entries.map(async ([streamId, lastReadSeqNum]) => {
					if (Functions.safe(() => preferences.mutedStreams[streamId] === true)) return;

					const stream = unreadStreams.find(stream => stream.id === streamId);
					if (stream == null) return;

					let latestPost;
					let unreadPosts;
					try {
						latestPost = (
							await posts.get({
								streamId: streamId,
								limit: 1
							})
						).posts[0];
						unreadPosts = (
							await posts.get({
								streamId: streamId,
								before: latestPost.seqNum,
								after: Number(lastReadSeqNum) + 1,
								inclusive: true
							})
						).posts;
						unreadPosts = unreadPosts.filter(
							p => !p.deactivated && p.creatorId !== this._api.userId
						);

						unreadPosts = await this.filterPostsByPreferences(unreadPosts, repoSettings, [
							streamId
						]);
					} catch (ex) {
						// likely an access error because user is no longer in this channel
						debugger;
						Logger.error(ex);
						return;
					}

					if (unreadPosts != null && unreadPosts.length !== 0) {
						this._mentions[streamId] = this._mentions[streamId] || 0;
						this._unreads[streamId] = this._unreads[streamId] || 0;

						this.computeForPosts(unreadPosts, this._api.userId, stream);

						Logger.debug(
							`Unreads.compute(${streamId}):`,
							`mentions=${this._mentions[streamId]}, unreads=${this._unreads[streamId]}`
						);
					}
				})
			);
		}

		this._lastReads = lastReads;
		this._lastReadItems = lastReadItems;
		this._computePromise = undefined;

		const values = this.values();
		Logger.debug(`Unreads.compute:`, `Completed; values=${JSON.stringify(values)}`);

		this._onDidChange.fire(values);
	}

	private computeForPosts(posts: CSPost[], userId: string, stream?: CSStream, oldPosts?: CSPost[]) {
		for (const post of posts) {
			const oldPost = oldPosts ? oldPosts.find(oldPost => oldPost.id === post.id) : null;
			const oldMention = ((oldPost && oldPost.mentionedUserIds) || []).includes(userId);
			const newMention = (post.mentionedUserIds || []).includes(userId);
			const isDirect = stream && stream.type === StreamType.Direct;
			if (!oldPost || isDirect) {
				if (isDirect || newMention) {
					this._mentions[post.streamId]++;
				}
				this._unreads[post.streamId]++;
			} else {
				if (!oldMention && newMention) {
					this._mentions[post.streamId]++;
				} else if (oldMention && !newMention && this._mentions[post.streamId] > 0) {
					this._mentions[post.streamId]--;
				}
			}
		}
	}

	private values(): Unreads {
		return {
			lastReads: this._lastReads,
			lastReadItems: this._lastReadItems,
			mentions: this._mentions,
			unreads: this._unreads,
			totalMentions: Object.values(this._mentions).reduce((total, count) => total + count, 0),
			totalUnreads: Object.values(this._unreads).reduce((total, count) => total + count, 0)
		};
	}
}
