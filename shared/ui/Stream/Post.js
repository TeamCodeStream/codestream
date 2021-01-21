import createClassString from "classnames";
import React from "react";
import ContentEditable from "react-contenteditable";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { retryPost, cancelPost, editPost, deletePost } from "./actions";
import Button from "./Button";
import { confirmPopup } from "./Confirm";
import Headshot from "./Headshot";
import Icon from "./Icon";
import Timestamp from "./Timestamp";
import CodemarkActions from "./CodemarkActions";
import RetrySpinner from "./RetrySpinner";
import { LocateRepoButton } from "./LocateRepoButton";
import { Marker } from "./Marker";
import Menu from "./Menu";
import Tooltip from "./Tooltip";
import { getById } from "../store/repos/reducer";
import { getPost } from "../store/posts/reducer";
import { getUserByCsId } from "../store/users/reducer";
import { getCodemark } from "../store/codemarks/reducer";
import { markdownify, emojify } from "./Markdowner";
import { reactToPost, setCodemarkStatus } from "./actions";
import { escapeHtml, safe, replaceHtml } from "../utils";
import {
	getUsernamesById,
	getNormalizedUsernames,
	getTeamMembers,
	findMentionedUserIds
} from "../store/users/reducer";
import {
	GetDocumentFromMarkerRequestType,
	PinReplyToCodemarkRequestType
} from "@codestream/protocols/agent";
import { EditorSelectRangeRequestType } from "../ipc/webview.protocol";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { HostApi } from "../webview-api";
import { includes as _includes } from "lodash-es";
import { ProfileLink } from "../src/components/ProfileLink";
import EmojiPicker from "./EmojiPicker";
import { AddReactionIcon, Reactions } from "./Reactions";
import { MarkdownText } from "./MarkdownText";
import { Attachments } from "./Attachments";

class Post extends React.Component {
	state = {
		emojiOpen: false,
		emojiTarget: null,
		menuOpen: false,
		menuTarget: null,
		authorMenuOpen: false,
		warning: ""
	};

	componentDidMount() {
		// this is an assumption that most of the time, a thread will be opened via the parent post
		// if the thread was invoked on a child post that has code,
		// the user will have to click on the code block they want to focus on
		if (this.props.threadId === this.props.id) {
			this.showCode(true);
		}
	}

	componentDidUpdate(prevProps, _prevState) {
		const editStateToggledOn = this.props.editing && !prevProps.editing;
		if (editStateToggledOn) {
			const el = document.getElementById(this.getEditInputId());
			if (el) {
				el.focus();
			}
		}

		if (prevProps.threadId !== this.props.threadId && this.props.threadId === this.props.id) {
			this.showCode(true);
		}

		if (!prevProps.codemark && this.props.codemark) this.props.onDidResize(this.props.id);
	}

	handleClickCodeBlock = event => {
		event.stopPropagation();
		this.showCode();
	};

	async showCode(preserveFocus = false) {
		const { hasMarkers, codemark } = this.props;
		const marker = hasMarkers && codemark.markers[0];
		if (marker) {
			if (marker.repoId) {
				const response = await HostApi.instance.send(GetDocumentFromMarkerRequestType, {
					markerId: marker.id
				});

				if (response) {
					const { success } = await HostApi.instance.send(EditorSelectRangeRequestType, {
						uri: response.textDocument.uri,
						// Ensure we put the cursor at the right line (don't actually select the whole range)
						selection: {
							start: response.range.start,
							end: response.range.start,
							cursor: response.range.start
						},
						preserveFocus: preserveFocus
					});
					this.setState({ warning: success ? null : "FILE_NOT_FOUND" });
				} else {
					// assumption based on GetDocumentFromMarkerRequestType api requiring the workspace to be available
					this.setState({ warning: "REPO_NOT_IN_WORKSPACE" });
				}
			} else this.setState({ warning: "NO_REMOTE" });
		}
	}

	resubmit = () => this.props.retryPost(this.props.post.id);

	cancel = () => this.props.cancelPost(this.props.post.id);

	getWarningMessage() {
		const { intl } = this.props;
		switch (this.state.warning) {
			case "NO_REMOTE": {
				const message = intl.formatMessage({
					id: "codeBlock.noRemote",
					defaultMessage: "This code does not have a remote URL associated with it."
				});
				const learnMore = intl.formatMessage({ id: "learnMore" });
				return (
					<span>
						{message}{" "}
						<a href="https://help.codestream.com/hc/en-us/articles/360013410551">{learnMore}</a>
					</span>
				);
			}
			case "FILE_NOT_FOUND": {
				return (
					<span>
						{intl.formatMessage({
							id: "codeBlock.fileNotFound",
							defaultMessage: "You don’t currently have this file in your repo."
						})}
					</span>
				);
			}
			case "REPO_NOT_IN_WORKSPACE": {
				return (
					<span>
						<span>
							{intl.formatMessage(
								{
									id: "codeBlock.repoMissing",
									defaultMessage: "You don’t currently have the {repoName} repo open."
								},
								{ repoName: this.props.repoName }
							)}
							<LocateRepoButton
								repoId={
									this.props.hasMarkers && this.props.codemark.markers[0]
										? this.props.codemark.markers[0].repoId
										: undefined
								}
								repoName={this.props.repoName}
								callback={async success => {
									if (success) {
										await this.showCode(true);
									}
								}}
							></LocateRepoButton>
						</span>
					</span>
				);
			}
			case "UNKNOWN_LOCATION":
			default: {
				return (
					<span>
						{intl.formatMessage({
							id: "codeBlock.locationUnknown",
							defaultMessage: "Unknown code block location."
						})}
					</span>
				);
			}
		}
	}

	render() {
		if (this.props.deactivated) return null;

		// console.log(renderCount++);
		const {
			author,
			post,
			showAssigneeHeadshots,
			hasMarkers,
			codemark,
			parentPostCodemark
		} = this.props;
		const { menuOpen, authorMenuOpen, menuTarget } = this.state;

		const headshotSize = this.props.headshotSize || 36;

		const mine = post.creatorId === this.props.currentUserId;
		const systemPost = post.creatorId === "codestream";
		const color = codemark && codemark.color;
		const type = codemark && codemark.type;
		let typeString = type || "post";
		typeString = typeString.charAt(0).toUpperCase() + typeString.slice(1);
		const title = codemark && codemark.title;

		// if (post.title && post.title.match(/assigned/)) console.log(post);

		const postClass = createClassString({
			post: true,
			mine: mine,
			hover: menuOpen || authorMenuOpen,
			editing: this.props.editing,
			"system-post": systemPost,
			unread: this.props.unread,
			"new-separator": this.props.newMessageIndicator,
			[color]: color ? true : false,
			collapsed: this.props.collapsed,
			question: type === "question",
			issue: type === "issue",
			trap: type === "trap",
			bookmark: type === "bookmark",
			reply: post.parentPostId && post.parentPostId !== post.id
		});

		let codeBlock = null;
		if (hasMarkers) {
			const noRepo = !codemark.markers[0].repoId;
			// let fileLabel = codemark.markers[0].file || "-";
			// if (codemark.Markers[0].range)
			codeBlock = (
				<div
					className="code-reference"
					onClick={this.props.showDetails && this.handleClickCodeBlock}
				>
					<div className={createClassString("header", { "no-repo": noRepo })}>
						{/*<span className="file">{fileLabel}</span>*/}
						{this.state.warning && (
							<div className="repo-warning">
								<Icon name="alert" /> {this.getWarningMessage()}
							</div>
						)}
					</div>
					{this.props.showDetails && !this.state.warning ? (
						<CodemarkActions
							codemark={codemark}
							capabilities={this.props.capabilities}
							isAuthor={safe(() => this.props.author.id === this.props.codemarkAuthor.id) || false}
							alwaysRenderCode={true}
						/>
					) : (
						codemark.markers.map((marker, index) => <Marker marker={marker} key={index} />)
						// this.renderCode(codemark.markers[0])
					)}
				</div>
			);
		}

		let menuItems = [];

		if (!this.props.showDetails) {
			const threadLabel =
				(post.parentPostId && post.parentPostId !== post.id) || post.numReplies > 0
					? "View Thread"
					: "Start a Thread";
			menuItems.push({ label: threadLabel, action: "make-thread" });
		}

		let isPinnedReply = false;
		if (parentPostCodemark) {
			if ((parentPostCodemark.pinnedReplies || []).includes(post.id)) {
				isPinnedReply = true;
				menuItems.push({ label: "Un-Star Reply", action: "unpin-reply" });
			} else {
				menuItems.push({ label: "Star Reply", action: "pin-reply" });
			}
		} else {
			menuItems.push({ label: "Mark Unread", action: "mark-unread" });
		}

		if (codemark || (mine && (!this.props.disableEdits || !this.props.disableDeletes))) {
			menuItems.push({ label: "-" });
		}

		if (codemark) {
			if (codemark.pinned)
				menuItems.push({ label: `Archive ${typeString}`, action: "toggle-pinned" });
			else menuItems.push({ label: `Unarchive ${typeString}`, action: "toggle-pinned" });
		}
		if (mine) {
			if (!this.props.disableEdits) {
				menuItems.push({ label: `Edit ${typeString}`, action: "edit-post" });
			}
			if (!this.props.disableDeletes) {
				menuItems.push({
					label: `Delete ${typeString}`,
					action: () => {
						const { post, deletePost } = this.props;
						if (post.parentPostId) {
							deletePost(post.streamId, post.id);
						} else {
							confirmPopup({
								title: "Are you sure?",
								message: "Deleting a post cannot be undone.",
								centered: true,
								buttons: [
									{
										label: "Delete Post",
										wait: true,
										action: () => {
											deletePost(post.streamId, post.id);
											// if this was a parent post, exit thread view
											if (this.props.threadId === post.id) {
												this.props.setCurrentStream(post.streamId);
											}
										}
									},
									{ label: "Cancel" }
								]
							});
						}
					}
				});
			}
		}

		let authorMenuItems = [];
		// if (this.state.authorMenuOpen) {
		authorMenuItems.push({
			fragment: (
				<div className="headshot-popup">
					<Headshot size={144} person={author} />
					<div className="author-details">
						<div className="author-username">@{author.username}</div>
						<div className="author-fullname">{author.fullName}</div>
					</div>
				</div>
			)
		});
		if (mine) {
			authorMenuItems.push({ label: "Edit Headshot", action: "edit-headshot" });
		} else {
			if (this.props.canLiveshare)
				authorMenuItems.push({ label: "Invite to Live Share", action: "live-share" });
			authorMenuItems.push({ label: "Direct Message", action: "direct-message" });
		}

		const showIcons = !systemPost && !post.error;
		const customAttrs = { thread: post.parentPostId || post.id };
		return (
			<div
				className={postClass}
				id={post.id}
				data-seq-num={post.seqNum}
				{...customAttrs}
				ref={ref => (this._div = ref)}
			>
				{showAssigneeHeadshots && this.renderAssigneeHeadshots()}
				{showIcons && this.renderIcons()}
				{menuOpen && (
					<Menu
						items={menuItems}
						target={menuTarget}
						action={this.handleSelectMenu}
						align="bottomRight"
					/>
				)}
				{authorMenuOpen && (
					<Menu
						items={authorMenuItems}
						target={menuTarget}
						action={this.handleSelectMenu}
						align="left"
					/>
				)}

				<div className="author" ref={ref => (this._authorDiv = ref)}>
					<ProfileLink id={author.id}>
						<Headshot size={headshotSize} person={author} mine={mine} />
					</ProfileLink>
					{author.username}
					{this.renderEmote(post)}
					{post.error ? (
						<RetrySpinner callback={this.resubmit} cancel={this.cancel} />
					) : (
						<Timestamp relative time={post.createdAt} edited={post.hasBeenEdited} />
					)}
					{codemark && codemark.color && <div className={`label-indicator ${color}-background`} />}
				</div>
				{this.props.post.parentPostId &&
					this.props.post.parentPostId !== this.props.post.id &&
					!this.props.showDetails && (
						<div className="replying-to">
							<span>reply to</span>{" "}
							<b>
								{this.props.parentPostContent
									? this.props.parentPostContent.substr(0, 80)
									: "a post"}
							</b>
						</div>
					)}
				{post.creatorId === "codestream" && (
					<div className="replying-to">
						<span>only visible to you</span>
					</div>
				)}
				<div className="body">
					{this.renderTitle(post)}
					<div className="text">
						{this.props.collapsed && !title && this.renderTypeIcon(post)}
						{isPinnedReply && <Icon className="pinned-reply-star" name="star" />}
						{this.renderText(post)}
						{this.renderAssignees(post)}
						{this.renderStatus()}
						{this.renderExternalLink()}
						{this.renderCodeBlockFile()}
					</div>
					{/*!this.props.showDetails &&*/ codeBlock}
					{this.props.post && <Attachments post={this.props.post} />}
				</div>
				<Reactions post={post} />
				{/*this.renderReactions(post)*/}
				{/*this.renderReplyCount(post)*/}
			</div>
		);
	}

	renderExternalLink = () => {
		const { codemark } = this.props;
		if (codemark && codemark.externalProviderUrl) {
			const providerDisplay = PROVIDER_MAPPINGS[codemark.externalProvider];
			if (!providerDisplay) {
				return null;
			}
			return [
				<br />,
				<a href={codemark.externalProviderUrl}>Open on {providerDisplay.displayName}</a>
			];
		}
		return null;
	};

	renderReplyCount = post => {
		let message = null;
		const { codemark } = this.props;

		if (!codemark || (!this.props.alwaysShowReplyCount && this.props.showDetails)) return null;

		const numReplies = codemark.numreplies || "0";
		switch (codemark.type) {
			case "question":
				message = numReplies === 1 ? "1 Answer" : `${numReplies} Answers`;
				break;
			default:
				message = numReplies === 1 ? "1 Reply" : `${numReplies} Replies`;
				break;
		}
		return (
			<a className="num-replies" onClick={this.goToThread}>
				{message}
			</a>
		);
	};

	goToThread = () => {
		this.props.action("goto-thread", this.props.post);
	};

	renderTypeIcon = post => {
		const { codemark } = this.props;
		let icon = null;
		const type = codemark && codemark.type;
		switch (type) {
			case "question":
				icon = <Icon name="question" className="type-icon" />;
				break;
			case "bookmark":
				icon = <Icon name="bookmark" className="type-icon" />;
				break;
			case "trap":
				icon = <Icon name="trap" className="type-icon" />;
				break;
			case "issue":
				icon = <Icon name="issue" className="type-icon" />;
				break;
			default:
				icon = <Icon name="comment" className="type-icon" />;
		}
		return icon;
	};

	renderTitle = post => {
		const { codemark } = this.props;
		const icon = this.renderTypeIcon(post);
		const title = codemark && codemark.title;
		if (title)
			return (
				<div className="title">
					{icon} <MarkdownText text={title} inline={true} />
					{this.renderCodeBlockFile()}
				</div>
			);
		else return null;
	};

	renderAssignees = post => {
		const { collapsed, codemark } = this.props;

		if (collapsed) return null;

		const assignees = ((codemark && codemark.assignees) || []).map(id =>
			this.props.teammates.find(t => t.id === id)
		);
		const externalAssignees = ((codemark && codemark.externalAssignees) || []).filter(
			user => !assignees.find(a => a.email === user.email)
		);

		const assigneeNames = [...assignees, ...externalAssignees].map(
			a => a.username || a.displayName
		);

		if (assigneeNames.length == 0) return null;
		if (!this.props.teammates) return null;

		return [
			<br />,
			<div className="assignees">
				<div>
					<b>Assignees</b>
				</div>
				{assigneeNames.filter(Boolean).join(", ")}
			</div>
		];
	};

	renderCodeBlockFile = () => {
		const { collapsed, showFileAfterTitle, hasMarkers, codemark } = this.props;

		const marker = hasMarkers ? codemark.markers[0] || {} : {};

		if (!collapsed || !showFileAfterTitle || !marker.file) return null;
		return <span className="file-name">{marker.file}</span>;
	};

	handleClickStatusToggle = event => {
		event.stopPropagation();
		const { codemark } = this.props;
		if (codemark.status === "closed") this.openIssue();
		else this.closeIssue();
	};

	closeIssue = () => {
		const { codemark, setCodemarkStatus } = this.props;
		setCodemarkStatus(codemark.id, "closed");
		this.submitReply("/me closed this issue");
	};

	openIssue = () => {
		const { codemark, setCodemarkStatus } = this.props;
		setCodemarkStatus(codemark.id, "open");
		this.submitReply("/me reopened this issue");
	};

	submitReply = text => {
		const { action, codemark } = this.props;
		const forceThreadId = codemark.parentPostId || codemark.postId;
		action("submit-post", null, { forceStreamId: codemark.streamId, forceThreadId, text });
	};

	renderStatus = () => {
		const { collapsed, codemark } = this.props;

		if (collapsed || !codemark) return null;

		const status = (codemark && codemark.status) || "open";
		// const status = this.props.post.status || "open";
		if (codemark.type !== "issue") return null;

		const statusClass = createClassString({
			"status-button": true,
			checked: status === "closed"
		});

		return [
			<br />,
			<div className="status">
				<div>
					<b>Status</b>
				</div>
				<div className="align-far-left" onClick={this.handleClickStatusToggle}>
					<div className={statusClass}>
						<Icon name="check" className="check" />
					</div>{" "}
					<span className="status-label">{status}</span>
				</div>
			</div>
		];

		// return (
		// 	<div className="align-far-left">
		// 		<div className={statusClass}>
		// 			<Icon name="check" className="check" />
		// 		</div>
		// 	</div>
		// );
	};

	renderAssigneeHeadshots = () => {
		const { codemark } = this.props;
		const assignees = codemark ? codemark.assignees || [] : [];

		if (assignees.length == 0) return null;
		if (!this.props.teammates) return null;

		return (
			<div className="align-far-right">
				{assignees.map(userId => {
					const person = this.props.teammates.find(user => user.id === userId);
					return (
						<Tooltip key={userId} title={"hi"} placement="top">
							<Headshot size={18} person={person} />
						</Tooltip>
					);
				})}
			</div>
		);
	};

	renderIcons = () => {
		if (this.props.collapsed) return null;

		return (
			<div className="align-right">
				<AddReactionIcon post={this.props.post} />
				<Icon name="kebab-vertical" className="gear clickable" onClick={this.handleMenuClick} />
			</div>
		);
	};

	renderEmote = post => {
		const { codemark } = this.props;
		const type = codemark && codemark.type;
		let matches = (post.text || "").match(/^\/me\s+(.*)/);
		if (matches)
			return (
				<span className="emote">
					<MarkdownText text={matches[1]} inline={true} />{" "}
				</span>
			);
		if (type === "question") return <span className="emote">has a question</span>;
		if (type === "bookmark") return <span className="emote">set a bookmark</span>;
		if (type === "issue") return <span className="emote">posted an issue</span>;
		if (type === "trap") return <span className="emote">created a trap</span>;
		else return null;
	};

	renderText = post => {
		const { codemark, editing } = this.props;
		if (editing) return this.renderTextEditing(post);
		else if ((post.text || "").match(/^\/me\s/)) return null;
		else {
			// unfortunately need to account for legacy slack codemarks that don't have text
			return [<MarkdownText text={(codemark && codemark.text) || post.text} />, <br />];
		}
	};

	getEditInputId = () => {
		let id = `input-div-${this.props.post.id}`;
		if (this.props.showDetails) id = `thread-${id}`;
		return id;
	};

	onSaveEdit = async event => {
		if (this.props.onDidSaveEdit) {
			event.preventDefault();
			const { post, id, teamMembers } = this.props;

			const text = replaceHtml(this._contentEditable.htmlEl.innerHTML);
			await this.props.editPost(
				post.streamId,
				id,
				text,
				findMentionedUserIds(teamMembers, text == null ? "" : text)
			);
			this.props.onDidSaveEdit();
		}
	};
	onCancelEdit = event => {
		if (this.props.onCancelEdit) {
			event.preventDefault();
			this.props.onCancelEdit();
		}
	};

	renderTextEditing = post => {
		const id = this.getEditInputId();

		return (
			<div className="edit-post">
				<ContentEditable
					className="message-input"
					id={id}
					rows="1"
					tabIndex="-1"
					html={escapeHtml(post.text)}
					ref={ref => (this._contentEditable = ref)}
				/>
				<div className="button-group">
					<Button
						id="cancel-button"
						className="control-button cancel"
						tabIndex="2"
						type="submit"
						onClick={this.props.onCancelEdit}
						loading={this.props.loading}
					>
						Cancel
					</Button>
					<Button
						id="save-button"
						className="control-button"
						tabIndex="2"
						type="submit"
						loading={this.props.loading}
						onClick={this.onSaveEdit}
					>
						Save
					</Button>
				</div>
			</div>
		);
	};

	renderReactions = post => {
		const { usernamesById, currentUserId } = this.props;
		const reactions = post.reactions || {};
		const keys = Object.keys(reactions);
		if (keys.length === 0) return null;
		let atLeastOneReaction = false;
		return (
			<div className="reactions">
				{keys.map(emojiId => {
					const reactors = reactions[emojiId] || [];
					if (reactors.length == 0) return null;
					const emoji = emojify(":" + emojiId + ":");
					const tooltipText =
						reactors.map(id => usernamesById[id]).join(", ") + " reacted with " + emojiId;
					const className = _includes(reactors, currentUserId) ? "reaction mine" : "reaction";
					atLeastOneReaction = true;
					return (
						<Tooltip title={tooltipText} key={emojiId} placement="top">
							<div className={className} onClick={event => this.toggleReaction(emojiId, event)}>
								<span dangerouslySetInnerHTML={{ __html: emoji }} />
								{reactors.length}
							</div>
						</Tooltip>
					);
				})}
				{atLeastOneReaction && (
					<Tooltip title="Add Reaction" key="add" placement="top">
						<div className="reaction add-reaction" onClick={this.handleReactionClick}>
							<Icon name="smiley" className="smiley" onClick={this.handleReactionClick} />
						</div>
					</Tooltip>
				)}
			</div>
		);
	};

	handleMenuClick = event => {
		event.stopPropagation();
		this.setState({ menuOpen: !this.state.menuOpen, menuTarget: event.target });
	};

	handleReactionClick = event => {
		event.stopPropagation();
		this.setState({ emojiOpen: !this.state.emojiOpen, emojiTarget: event.target });
	};

	handleHeadshotClick = event => {
		event.stopPropagation();
		this.setState({ authorMenuOpen: !this.state.authorMenuOpen, menuTarget: event.target });
	};

	handleSelectMenu = action => {
		if (action === "pin-reply") {
			if (
				this.props.parentPostCodemark.pinnedReplies &&
				this.props.parentPostCodemark.pinnedReplies.includes(this.props.post.id)
			)
				return;

			HostApi.instance.send(PinReplyToCodemarkRequestType, {
				codemarkId: this.props.parentPostCodemark.id,
				postId: this.props.post.id,
				value: true
			});
		} else if (action === "unpin-reply") {
			if (
				!this.props.parentPostCodemark.pinnedReplies ||
				!this.props.parentPostCodemark.pinnedReplies.includes(this.props.post.id)
			)
				return;

			HostApi.instance.send(PinReplyToCodemarkRequestType, {
				codemarkId: this.props.parentPostCodemark.id,
				postId: this.props.post.id,
				value: false
			});
		} else {
			this.props.action(action, {
				...this.props.post,
				author: this.props.author,
				codemark: this.props.codemark,
				parentPostCodemark: this.props.parentPostCodemark
			});
		}

		this.setState({ menuOpen: false, authorMenuOpen: false });
	};
}

const mapStateToProps = (state, props) => {
	const { capabilities, context, users } = state;

	// TODO: figure out a way to do this elsewhere

	let index = 1;

	for (const [userId, user] of Object.entries(users)) {
		user.color = index % 10;
		if (!user.username && user.email) {
			user.username = user.email.replace(/@.*/, "");
		}
	}

	const post = getPost(state.posts, props.streamId, props.id);
	if (!post) return { deactivated: true };

	const codemark = (post.pending && post.codemark) || getCodemark(state.codemarks, post.codemarkId);

	const parentPost = getPost(state.posts, post.streamId, post.parentPostId);

	let parentPostContent;
	let parentPostCodemark;
	if (parentPost) {
		if (parentPost.codemarkId) {
			parentPostCodemark = getCodemark(state.codemarks, parentPost.codemarkId);
			if (parentPostCodemark) {
				parentPostContent = parentPostCodemark.title || parentPostCodemark.text || parentPost.text;
			} else {
				parentPostContent = parentPost.text.trim() !== "" ? parentPost.text : "a codemark";
			}
		} else parentPostContent = parentPost.text;
	}

	const repoName =
		(codemark &&
			safe(() => {
				return getById(state.repos, codemark.markers[0].repoId).name;
			})) ||
		"";

	let author = users[post.creatorId];
	if (!author) {
		author = { email: "", fullName: "" };
		if (post.creatorId === "codestream") author.username = "CodeStream";
		else author.username = post.creatorId;
	}

	return {
		threadId: context.threadId,
		teamMembers: getTeamMembers(state),
		usernamesById: getUsernamesById(state),
		userNamesNormalized: getNormalizedUsernames(state),
		repoName,
		canLiveshare: state.services.vsls,
		post,
		author,
		hasMarkers: codemark && codemark.markers && codemark.markers.length > 0,
		codemark,
		codemarkAuthor: codemark && getUserByCsId(state.users, codemark.creatorId),
		parentPostContent,
		parentPostCodemark,
		capabilities,
		disableEdits: props.disableEdits || !Boolean(capabilities.postEdit),
		disableDeletes: !Boolean(capabilities.postDelete)
	};
};

export default connect(mapStateToProps, {
	cancelPost,
	retryPost,
	editPost,
	deletePost,
	reactToPost,
	setCodemarkStatus
})(injectIntl(Post));
