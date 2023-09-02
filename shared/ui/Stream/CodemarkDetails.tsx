import {
	Capabilities,
	CodemarkPlus,
	CreateThirdPartyPostRequestType,
	PostPlus,
} from "@codestream/protocols/agent";
import { CodemarkType, CSMe, CSPost, CSUser } from "@codestream/protocols/api";
import cx from "classnames";
import React from "react";
import { connect } from "react-redux";
import { DelayedRender } from "../Container/DelayedRender";
import { Button } from "../src/components/Button";
import { ButtonRow } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { setCurrentCodemark } from "../store/context/actions";
import { getTeamProvider } from "../store/teams/reducer";
import { findMentionedUserIds, getTeamMembers } from "../store/users/reducer";
import { localStore } from "../utilities/storage";
import { replaceHtml } from "../utils";
import { HostApi } from "../webview-api";
import {
	createPost,
	markItemRead,
	setCodemarkPinned,
	setCodemarkStatus,
	setUserPreference,
} from "./actions";
import { SetUserPreferenceRequest } from "./actions.types";
import CodemarkActions from "./CodemarkActions";
import { DropdownButton } from "./DropdownButton";
import Icon from "./Icon";
import { MessageInput, AttachmentField } from "./MessageInput";
import PostList from "./PostList";
import Tooltip from "./Tooltip";

interface State {
	editingPostId?: string;
	text: string;
	formatCode: boolean;
	isLoadingReplies: boolean;
	attachments: AttachmentField[];
	isDragging: number;
	resolveMethod: "ARCHIVE" | "RESOLVE";
}

interface Props {
	author: CSUser;
	codemark: CodemarkPlus;
	post?: PostPlus;
	teammates: CSUser[];
	currentUserId: string;
	teamProvider: "codestream" | "slack" | "msteams" | string;
	height?: Number;
	capabilities: Capabilities;
	hasFocus: boolean;
	currentUserName: string;
	teamId: string;
	displayType?: "collapsed" | "default" | "activity";
	skipMarkers?: number[];
	defaultResolveAction: "resolve" | "archive";

	onSubmitPost?: any;
	createPost(...args: Parameters<typeof createPost>): ReturnType<ReturnType<typeof createPost>>;
	markItemRead(
		...args: Parameters<typeof markItemRead>
	): ReturnType<ReturnType<typeof markItemRead>>;
	setCodemarkStatus(
		...args: Parameters<typeof setCodemarkStatus>
	): ReturnType<ReturnType<typeof setCodemarkStatus>>;
	setCodemarkPinned(
		...args: Parameters<typeof setCodemarkPinned>
	): ReturnType<ReturnType<typeof setCodemarkPinned>>;
	setCurrentCodemark: Function;
	postAction?(...args: any[]): any;
	setUserPreference?: (request: SetUserPreferenceRequest) => void;
}

export class CodemarkDetails extends React.Component<Props, State> {
	private postList = React.createRef();

	constructor(props: Props) {
		super(props);
		this.state = {
			text: this.getCachedText(),
			formatCode: false,
			isLoadingReplies: true,
			attachments: [],
			isDragging: 0,
			resolveMethod: "RESOLVE",
		};
	}

	getCachedText() {
		const replyCache = localStore.get("replyCache");
		if (!replyCache) return "";

		return replyCache[this.props.codemark.id] || "";
	}

	cacheText(text: string) {
		let replyCache = localStore.get("replyCache");
		if (!replyCache) replyCache = {};

		if (text === "") {
			delete replyCache[this.props.codemark.id];
		} else {
			replyCache[this.props.codemark.id] = text;
		}

		localStore.set("replyCache", replyCache);
	}

	componentDidMount() {
		const input = document.getElementById("input-div");
		if (input) input.focus();
	}

	handleClickPost() {}

	submitReply = async () => {
		const { codemark, createPost, markItemRead } = this.props;
		const { text, formatCode, attachments } = this.state;
		const mentionedUserIds = findMentionedUserIds(this.props.teammates, text);
		const threadId = codemark ? codemark.postId : "";
		this.setState({ text: "", attachments: [] });
		this.cacheText("");

		// don't create empty replies
		if (!text.length) return;

		let replyText = formatCode ? "```" + text + "```" : text;
		await markItemRead(codemark.id, codemark.numReplies + 1);
		await createPost(codemark.streamId, threadId, replaceHtml(replyText)!, null, mentionedUserIds, {
			entryPoint: "Codemark",
			files: attachments,
		});
	};

	resolveCodemark = async (type: "resolve" | "archive") => {
		const { codemark, post } = this.props;
		const { text = "" } = this.state;
		await this.submitReply();
		await this.props.setCodemarkStatus(this.props.codemark.id, "closed");
		if (type === "archive") {
			await this.props.setCodemarkPinned(this.props.codemark, false);
		}
		if (this.props.setUserPreference) {
			this.props.setUserPreference({ prefPath: ["defaultResolveAction"], value: type });
		}
		HostApi.instance.track("Codemark Resolved", {
			"Codemark ID": this.props.codemark.id,
			"Codemark Type": this.props.codemark.type,
			Archived: type === "archive",
		});
		this.props.setCurrentCodemark();

		const thing = text ? "" : " this discussion";
		const action = type === "archive" ? "resolved & archived" : "resolved";
		const message = `_${action}${thing}_\n${text}`;
		if (post && post.sharedTo && post.sharedTo.length > 0) {
			for (const target of post.sharedTo) {
				if (target.providerId === "slack*com") continue;
				await HostApi.instance.send(CreateThirdPartyPostRequestType, {
					providerId: target.providerId,
					channelId: target.channelId,
					providerTeamId: target.teamId,
					parentPostId: target.postId,
					text: message,
				});
			}
		}
	};

	handleOnChange = (text: string, formatCode: boolean) => {
		this.cacheText(text);
		this.setState({ text, formatCode });
	};

	postAction = (name: string, post: CSPost) => {
		if (name === "edit-post") {
			this.setState({ editingPostId: post.id }, () => {
				if (this.postList.current) (this.postList.current as any).scrollTo(post.id);
			});
		} else {
			this.props.postAction && this.props.postAction(name, post);
		}
	};

	cancelEdit = () => {
		this.setState({ editingPostId: undefined });
	};

	onRepliesLoaded = () => {
		this.setState({ isLoadingReplies: false });
	};

	setAttachments = (attachments: AttachmentField[]) => this.setState({ attachments });
	handleDragEnter = () => this.setState({ isDragging: this.state.isDragging + 1 });
	handleDragLeave = () => this.setState({ isDragging: this.state.isDragging - 1 });
	handleDrop = () => this.setState({ isDragging: 0 });

	setResolveMethod = resolveMethod => this.setState({ resolveMethod });

	render() {
		const { codemark, capabilities, author, currentUserId } = this.props;

		const modifier = navigator.appVersion.includes("Macintosh") ? "⌘" : "Ctrl";

		const submitTip = (
			<span>
				Submit Reply<span className="keybinding extra-pad">{modifier} ENTER</span>
			</span>
		);

		const typeLabel = codemark.type === CodemarkType.Issue ? "Issue" : "Discussion";

		const threadId = codemark.postId || "";
		return (
			<div
				className={cx("codemark-details", { "active-drag": this.state.isDragging > 0 })}
				onDragEnter={this.handleDragEnter}
				onDrop={this.handleDrop}
				onDragOver={e => e.preventDefault()}
				onDragLeave={this.handleDragLeave}
			>
				{this.props.children}
				<CodemarkActions
					codemark={codemark}
					isAuthor={author.id === currentUserId}
					capabilities={capabilities}
					displayType={this.props.displayType}
					skipMarkers={this.props.skipMarkers}
				/>
				<div className="replies">
					{this.state.isLoadingReplies && (
						<DelayedRender>
							<div className="progress-container">
								<div className="progress-bar">
									<div className="progress-cursor" />
								</div>
							</div>
						</DelayedRender>
					)}
					<div className="postslist threadlist" onClick={this.handleClickPost}>
						<PostList
							onDidInitialize={this.onRepliesLoaded}
							ref={this.postList}
							isActive={true}
							hasFocus={this.props.hasFocus}
							teammates={this.props.teammates}
							currentUserId={this.props.currentUserId}
							currentUserName={this.props.currentUserName}
							editingPostId={this.state.editingPostId}
							postAction={this.postAction}
							streamId={this.props.codemark.streamId}
							isThread
							threadId={threadId}
							teamId={this.props.teamId}
							skipParentPost={true}
							skipReadPosts={this.props.displayType === "activity"}
							useCache={this.props.displayType === "activity"}
							onCancelEdit={this.cancelEdit}
							onDidSaveEdit={this.cancelEdit}
							disableEdits
							renderHeaderIfPostsExist="Activity"
						/>
					</div>
					{this.props.displayType !== "activity" && (
						<div className="compose codemark-compose">
							<div className="related-label">
								Add Reply
								{false && (
									<div className="add-location">
										<Tooltip
											placement="topRight"
											title="Codemarks can refer to one or more blocks of code, even across files."
											delay={1}
										>
											<span onClick={e => {}}>
												<Icon name="plus" />
												add range
											</span>
										</Tooltip>
									</div>
								)}
							</div>

							<MessageInput
								text={this.state.text}
								placeholder="Reply..."
								onChange={this.handleOnChange}
								onSubmit={this.submitReply}
								multiCompose={true}
								attachments={this.state.attachments}
								attachmentContainerType="reply"
								setAttachments={this.setAttachments}
							/>
							<ButtonRow>
								{codemark.status !== "closed" && (
									<Tooltip title={submitTip} placement="bottom" delay={1}>
										<DropdownButton
											items={[
												{
													key: "resolve",
													label: `Resolve ${this.state.text ? "with Comment" : typeLabel}`,
													subtext: "Save as documentation",
													onSelect: () => this.setResolveMethod("RESOLVE"),
													action: () => this.resolveCodemark("resolve"),
												},
												{ label: "-" },
												{
													key: "archive",
													label: `Resolve & Archive ${
														this.state.text ? "with Comment" : typeLabel
													}`,
													subtext: "Remove glyph from editor (still searchable)",
													onSelect: () => this.setResolveMethod("ARCHIVE"),
													action: () => this.resolveCodemark("archive"),
												},
											]}
											selectedKey={this.props.defaultResolveAction}
											variant="secondary"
											splitDropdown
											wrap
										/>
									</Tooltip>
								)}
								<Tooltip title={submitTip} placement="bottom" delay={1}>
									<Button
										key="submit"
										variant={this.state.text ? "primary" : "secondary"}
										onClick={this.submitReply}
									>
										Comment
									</Button>
								</Tooltip>
							</ButtonRow>
							<div style={{ height: "10px" }} />
						</div>
					)}
				</div>
			</div>
		);
	}

	handleSubmitPost = (...args) => {
		this.props.onSubmitPost(...args);
	};
}

const EMPTY_OBJECT = {};
const mapStateToProps = (state: CodeStreamState, props: { codemark: CodemarkPlus }) => {
	const { capabilities, connectivity, session, context, users, teams, preferences } = state;

	const team = teams[context.currentTeamId];
	const teamProvider = getTeamProvider(team);
	const teamMembers = getTeamMembers(state);

	const user: CSMe = users[session.userId!] as CSMe;

	const providerInfo =
		(user.providerInfo && user.providerInfo[context.currentTeamId]) || EMPTY_OBJECT;

	return {
		threadId: context.threadId,
		capabilities,
		isOffline: connectivity.offline,
		teammates: teamMembers,
		providerInfo,
		teamId: context.currentTeamId,
		teamName: team.name || "",
		hasFocus: context.hasFocus,
		currentUserId: user.id,
		currentUserName: user.username,
		teamProvider: teamProvider,
		defaultResolveAction: preferences.defaultResolveAction || "resolve",
	};
};

export default connect(mapStateToProps, {
	createPost,
	markItemRead,
	setCodemarkStatus,
	setCodemarkPinned,
	setUserPreference,
	setCurrentCodemark,
})(CodemarkDetails);
