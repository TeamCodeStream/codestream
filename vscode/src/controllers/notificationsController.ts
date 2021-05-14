"use strict";
import { PullRequestsChangedEvent } from "api/sessionEvents";
import { Disposable, MessageItem, window } from "vscode";
import { Post, PostsChangedEvent } from "../api/session";
import { Container } from "../container";
import {
	CodemarkPlus,
	CreateReviewsForUnreviewedCommitsRequestType,
	DidDetectUnreviewedCommitsNotification,
	FollowReviewRequestType,
	ReviewPlus
} from "../protocols/agent/agent.protocol";
import { Functions } from "../system";

type ToastType = "PR" | "Review" | "Codemark";

export class NotificationsController implements Disposable {
	private _disposable: Disposable;

	constructor() {
		this._disposable = Disposable.from(
			Container.session.onDidChangePosts(this.onSessionPostsReceived, this),
			Container.session.onDidChangePullRequests(this.onSessionPullRequestsReceived, this),
			Container.agent.onDidDetectUnreviewedCommits(this.onUnreviewedCommitsDetected, this)
		);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	private async onSessionPullRequestsReceived(e: PullRequestsChangedEvent) {
		const { user } = Container.session;

		if (!user.wantsToastNotifications()) return;

		for (const pullRequestNotification of e.pullRequestNotifications()) {
			const actions: MessageItem[] = [{ title: "Open" }];

			Container.agent.telemetry.track("Toast Notification", { Content: "PR" });
			const verb =
				pullRequestNotification.pullRequest.providerId.indexOf("gitlab") > -1 ? "Merge" : "Pull";
			const result = await window.showInformationMessage(
				`${verb} Request "${pullRequestNotification.pullRequest.title}" ${pullRequestNotification.queryName}`,
				...actions
			);

			if (result === actions[0]) {
				Container.webview.openPullRequest(
					pullRequestNotification.pullRequest.providerId,
					pullRequestNotification.pullRequest.id
				);
				Container.agent.telemetry.track("Toast Clicked", { Content: "PR" });
			}

			return;
		}
	}

	private async onSessionPostsReceived(e: PostsChangedEvent) {
		const { user } = Container.session;
		const { activeStreamThread: activeStream, visible: streamVisible } = Container.webview;

		if (!user.wantsToastNotifications()) return;

		// Don't show notifications for deleted, edited (if edited it isn't the first time its been seen),
		// has replies (same as edited), has reactions, or was posted by the current user
		const items = Functions.uniqueBy(e.items(), (_: Post) => _.id).filter(
			_ => _.senderId !== user.id && _.isNew()
		);
		for (const post of items) {
			let codemark;
			let review;
			const parentPost = await post.parentPost();
			if (parentPost) {
				codemark = parentPost.codemark;
				review = parentPost.review;
				if (!codemark && !review) {
					const grandparentPost = await parentPost.parentPost();
					if (grandparentPost) {
						review = grandparentPost.review;
					}
				}
			} else {
				codemark = post.codemark;
				review = post.review;
			}

			const mentioned = post.mentioned(user.id);
			// If we are muted and not mentioned, skip it
			if (user.hasMutedChannel(post.streamId) && !mentioned) continue;

			const isPostStreamVisible =
				streamVisible && !(activeStream === undefined || activeStream.streamId !== post.streamId);

			const followerIds = codemark ? codemark.followerIds : review!.followerIds;
			const isUserFollowing = (followerIds || []).includes(user.id);
			if (isUserFollowing && (!isPostStreamVisible || mentioned)) {
				this.showNotification(post, codemark, review);
			}
		}
	}

	private async onUnreviewedCommitsDetected(notification: DidDetectUnreviewedCommitsNotification) {
		const actions: MessageItem[] = [
			{ title: "Review" },
			{ title: "Ignore", isCloseAffordance: true }
		];

		Container.agent.telemetry.track("Toast Notification", { Content: "Unreviewed Commit" });
		const result = await window.showInformationMessage(`${notification.message}`, ...actions);

		if (result === actions[0]) {
			Container.agent.telemetry.track("Toast Clicked", { Content: "Unreviewed Commit" });
			if (notification.openReviewId !== undefined) {
				await Container.agent.sendRequest(FollowReviewRequestType, {
					id: notification.openReviewId,
					value: true
				});
				Container.webview.openReview(notification.openReviewId, { openFirstDiff: true });
			} else {
				const result = await Container.agent.sendRequest(
					CreateReviewsForUnreviewedCommitsRequestType,
					{ sequence: notification.sequence }
				);
				const reviewId = result.reviewIds[0];
				if (reviewId) {
					Container.webview.openReview(reviewId, { openFirstDiff: true });
				}
			}
		}
	}

	async showNotification(
		post: Post,
		codemark?: CodemarkPlus,
		review?: ReviewPlus
	) {
		const sender = await post.sender();

		const emote = post.text.startsWith("/me ");
		const colon = emote ? "" : ":";
		let text = post.text.replace(/^\/me /, "");
		text = review ? text.replace(/(approved|rejected) this/i, `$1 ${review.title}`) : text;

		// TODO: Need to better deal with formatted text for notifications
		const actions: MessageItem[] = [{ title: "Open" }];

		const toastContentType: ToastType = codemark ? "Codemark" : "Review";

		Container.agent.telemetry.track("Toast Notification", { Content: toastContentType });

		const result = await window.showInformationMessage(
			`${sender !== undefined ? sender.name : "Someone"}${colon} ${text}`,
			...actions
		);

		if (result === actions[0]) {
			if (codemark) {
				Container.webview.openCodemark(codemark.id);
			} else if (review) {
				Container.webview.openReview(review.id);
			}
			Container.agent.telemetry.track("Toast Clicked", { Content: toastContentType });
		}
	}
}
