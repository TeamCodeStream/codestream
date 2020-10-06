import * as vscode from "vscode";
import { Disposable } from "vscode";
import { CSReview } from "@codestream/protocols/api";
import {
	DidChangeConnectionStatusNotification,
	ConnectionStatus
} from "@codestream/protocols/agent";
import { Container } from "../container";
import { SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { Strings } from "../system";

/**
 * There are 2 root node types -- reviews assigned to me, or created by me
 * They aren't mutually exclusive
 */
type ReviewTreeNodeType = "AssignedToMe" | "CreatedByMe";

interface ReviewTreeNode {
	/**
	 * id, usually a reviewId, but it's prefixed with the ReviewTreeNodeType
	 * as the same review might be on both groups
	 */
	id: string;
	/**
	 *  Review Title
	 */
	label: string;
	/**
	 * Review type nodes have this set
	 */
	type?: ReviewTreeNodeType;
	/**
	 * Reviews have this set
	 */
	parent?: ReviewTreeNodeType;
	description?: string;
	tooltip?: string;
	iconUri?: string;
	/**
	 * Where this ReviewTreeNodeType has reviews (used to expand or collapse)
	 */
	hasReviews?: boolean;
}

export class ScmTreeDataProvider implements vscode.TreeDataProvider<ReviewTreeNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		ReviewTreeNode | undefined
	> = new vscode.EventEmitter<ReviewTreeNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<ReviewTreeNode | undefined> = this._onDidChangeTreeData
		.event;

	_disposable: any;
	status: SessionStatus | undefined = undefined;

	constructor() {
		this._disposable = Disposable.from(
			Container.session.onDidChangeReviews(this.onDidChangeReviews, this),
			Container.session.onDidChangeSessionStatus(this.onDidChangeSessionStatus, this),
			Container.agent.onDidChangeConnectionStatus(this.onDidChangeConnectionStatus, this),
			this._onDidChangeTreeData
		);
	}

	private async onDidChangeConnectionStatus(e: DidChangeConnectionStatusNotification) {
		if (e.status === ConnectionStatus.Reconnected) {
			this.refresh();
		}
	}

	private async onDidChangeReviews() {
		// reload the data if any review data changes
		this.refresh();
	}

	private async onDidChangeSessionStatus(e: SessionStatusChangedEvent) {
		const status = e.getStatus();
		switch (status) {
			case SessionStatus.SigningOut:
			case SessionStatus.SignedIn: {
				this.status = status;
				this.refresh();
				break;
			}
			case SessionStatus.SignedOut: {
				// only refresh if we're actively signing out...
				// a bad signin will go from signingIn => signingOut
				if (this.status === SessionStatus.SigningOut) {
					this.refresh();
				}
				this.status = status;
				break;
			}
			default: {
				break;
			}
		}
	}

	private refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: ReviewTreeNode): vscode.TreeItem {
		let state = vscode.TreeItemCollapsibleState.None;
		if (element && element.type) {
			// if this is a parent element...
			state = element.hasReviews
				? vscode.TreeItemCollapsibleState.Expanded
				: vscode.TreeItemCollapsibleState.Collapsed;
		}

		const treeItem = new vscode.TreeItem(element.label, state);
		if (element && element.parent) {
			// if this is a child element...
			treeItem.command = {
				command: "codestream.openReview",
				title: "Open Review",
				arguments: [{ reviewId: this.fromId(element.id) }]
			};
			treeItem.tooltip = element.tooltip;
			treeItem.description = element.description;
			treeItem.contextValue = "review";
			treeItem.iconPath = element.iconUri ? vscode.Uri.parse(element.iconUri) : undefined;
		}
		treeItem.id = element.id;

		return treeItem;
	}

	async getChildren(element?: ReviewTreeNode): Promise<ReviewTreeNode[]> {
		if (this.status !== SessionStatus.SignedIn) {
			// show the welcomeView
			return Promise.resolve([]);
		}
		if (!element && this.status === SessionStatus.SignedIn) {
			// don't have a root and we're signed in... see if we have any
			// reviews... if not, the welcomeView will show
			const data = await Container.agent.reviews.fetch();
			if (!data || !data.reviews.length) {
				// first user experience would hit this
				return Promise.resolve([]);
			}
			const assignedToMe = this.filterAssignedToMeReviews(data.reviews, Container.session.userId);
			const createdByMe = this.filterMyReviews(data.reviews, Container.session.userId);
			if (assignedToMe.length + createdByMe.length === 0) {
				// show the welcomeView (Create review button)
				return Promise.resolve([]);
			}
			return Promise.resolve([
				{
					id: "AssignedToMe",
					type: "AssignedToMe",
					label: "Open & Assigned to Me",
					hasReviews: assignedToMe.length > 0
				},
				{
					id: "CreatedByMe",
					type: "CreatedByMe",
					label: "My Feedback Requests",
					hasReviews: createdByMe.length > 0
				}
			]);
		}

		if (element && this.status === SessionStatus.SignedIn) {
			const data = await Container.agent.reviews.fetch();
			const users = await Container.agent.users.fetch();
			const userId = Container.session.userId;
			// local md5 hash cache
			const hashes: { [id: string]: string } = {};

			let reviews: CSReview[];
			let idPrefix: ReviewTreeNodeType;
			let parent: ReviewTreeNodeType;
			if (element.type === "AssignedToMe") {
				idPrefix = parent = "AssignedToMe";
				reviews = this.filterAssignedToMeReviews(data.reviews, userId);
			} else {
				idPrefix = parent = "CreatedByMe";
				reviews = this.filterMyReviews(data.reviews, userId);
			}

			const results = reviews.map(_ => {
				// find this user in order to get some additional metadata
				const user = users.users.find(u => u.id === _.creatorId) || {
					email: "",
					avatar: { image: "" }
				};
				let icon: string | undefined = undefined;
				if (user.avatar && user.avatar.image) {
					icon = user.avatar.image;
				} else {
					let hash = hashes[user.email];
					if (!hash) {
						hash = hashes[user.email] = Strings.md5(user.email, "hex");
					}
					icon = `https://www.gravatar.com/avatar/${hash}`;
				}
				// can't use "X ago" since this panel only updates on review changes
				const createdAtDate = new Date(_.createdAt);
				let toolTip = `${
					_.title
				}\nOpened ${createdAtDate.toLocaleDateString()} ${createdAtDate.toLocaleTimeString()}`;
				if (_.text) {
					toolTip += `\n\n${_.text}`;
				}
				return {
					id: this.toId(_.id, idPrefix),
					parent: parent,
					label: _.title,
					tooltip: toolTip,
					description: _.text,
					iconUri: icon
				};
			});
			return results;
		}

		// show the welcomeView
		return Promise.resolve([]);
	}

	private toId(id: string, prefix: ReviewTreeNodeType) {
		return `${prefix}|${id}`;
	}

	private fromId(idString: string) {
		return idString ? idString.split("|")[1] : undefined;
	}

	private filterMyReviews(reviews: CSReview[], userId: string) {
		return reviews
			.filter(_ => !_.deactivated && _.status === "open" && _.creatorId === userId)
			.sort((a, b) => b.createdAt - a.createdAt);
	}

	private filterAssignedToMeReviews(reviews: CSReview[], userId: string) {
		return reviews
			.filter(
				_ => !_.deactivated && _.status === "open" && _.reviewers && _.reviewers.includes(userId)
			)
			.sort((a, b) => b.createdAt - a.createdAt);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}
}
