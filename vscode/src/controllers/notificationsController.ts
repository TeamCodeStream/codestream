"use strict";
import { Disposable, MessageItem, window } from "vscode";
import { Post, PostsChangedEvent } from "../api/session";
import { Container } from "../container";
import {
	CodemarkPlus,
	DidDetectObservabilityAnomaliesNotification,
	ReviewPlus
} from "@codestream/protocols/agent";
import { Functions } from "../system";

type ToastType = "PR" | "Review" | "Codemark";

export class NotificationsController implements Disposable {
	private _disposable: Disposable;

	constructor() {
		this._disposable = Disposable.from(
			Container.session.onDidChangePosts(this.onSessionPostsReceived, this),
			Container.agent.onDidDetectObservabilityAnomalies(this.onObservabilityAnomaliesDetected, this)
		);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	private async onSessionPostsReceived(e: PostsChangedEvent) {
		const { user } = Container.session;
		const { activeStreamThread: activeStream, visible: streamVisible } = Container.sidebar;

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

			if (!codemark && !review) continue;

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

	private async onObservabilityAnomaliesDetected(
		notification: DidDetectObservabilityAnomaliesNotification
	) {
		const actions: MessageItem[] = [
			{ title: "Details" },
			{ title: "Ignore", isCloseAffordance: true }
		];
		const { duration, errorRate } = notification;

		Container.agent.telemetry.track("Toast Notification", { Content: "CLM Anomaly" });
		const count = duration.length + errorRate.length;
		const title = count === 1 ? "Performance issue found" : `${count} performance issues found`;
		const allAnomalies = [...duration, ...errorRate].sort((a, b) => b.ratio - a.ratio);
		const firstAnomaly = allAnomalies[0];
		const message =
			count === 1
				? `${title} - ${firstAnomaly.notificationText} (${firstAnomaly.entityName})`
				: `${title} - #1: ${firstAnomaly.notificationText} (${firstAnomaly.entityName})`;
		const result = await window.showInformationMessage(message, ...actions);

		if (result === actions[0]) {
			Container.agent.telemetry.track("Toast Clicked", { Content: "CLM Anomaly" });
			Container.sidebar.viewAnomaly({
				anomaly: firstAnomaly,
				entityGuid: notification.entityGuid
			});
			Container.sidebar.goToClassMethodDefinition(
				firstAnomaly.codeFilepath,
				firstAnomaly.codeNamespace,
				firstAnomaly.codeFunction,
				firstAnomaly.language
			);
		}
	}

	async showNotification(post: Post, codemark?: CodemarkPlus, review?: ReviewPlus) {
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
				Container.sidebar.openCodemark(codemark.id);
			} else if (review) {
				Container.sidebar.openReview(review.id);
			}
			Container.agent.telemetry.track("Toast Clicked", { Content: toastContentType });
		}
	}
}
