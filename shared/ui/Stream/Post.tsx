import {
	CodemarkPlus,
	GetDocumentFromMarkerRequestType,
	PinReplyToCodemarkRequestType,
} from "@codestream/protocols/agent";
import createClassString from "classnames";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import ContentEditable from "react-contenteditable";
import { useIntl } from "react-intl";
import { shallowEqual } from "react-redux";
import { EditorSelectRangeRequestType } from "../ipc/webview.protocol";
import { ProfileLink } from "../src/components/ProfileLink";
import { getCodemark } from "../store/codemarks/reducer";
import { getPost } from "../store/posts/reducer";
import { getById } from "../store/repos/reducer";
import {
	findMentionedUserIds,
	getNormalizedUsernames,
	getTeamMembers,
	getUserByCsId,
	getUsernamesById,
} from "../store/users/reducer";
import { escapeHtml, replaceHtml, safe } from "../utils";
import { HostApi } from "../webview-api";
import { cancelPost, deletePost, editPost, retryPost, setCodemarkStatus } from "./actions";
import { Attachments } from "./Attachments";
import Button from "./Button";
import CodemarkActions from "./CodemarkActions";
import { confirmPopup } from "./Confirm";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import Headshot from "./Headshot";
import { Icon } from "./Icon";
import { LocateRepoButton } from "./LocateRepoButton";
import { MarkdownText } from "./MarkdownText";
import { Marker } from "./Marker";
import Menu from "./Menu";
import { AddReactionIcon, Reactions } from "./Reactions";
import RetrySpinner from "./RetrySpinner";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import {
	useAppDispatch,
	useAppSelector,
	useDidMount,
	usePrevious,
} from "@codestream/webview/utilities/hooks";
import { CSUser } from "@codestream/protocols/api";
import { isPending } from "@codestream/webview/store/posts/types";
import { MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";

export type PostProps = {
	id: string;
	teammates: CSUser[];
	currentUserId?: string;
	currentUserName: string;
	newMessageIndicator?: boolean;
	editing: boolean;
	action?: Function;
	showDetails: boolean;
	streamId: string;
	onDidResize: (string) => void;
	disableEdits?: string | boolean;
	onCancelEdit?: () => void;
	onDidSaveEdit?: () => void;
};

export interface CSUserView extends CSUser {
	color: number;
}

export interface UsersStateView {
	[id: string]: CSUserView;
}

export function Post(props: PostProps) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector(state => {
		const { capabilities, context, users } = state;

		// TODO: figure out a way to do this elsewhere

		let index = 1;

		const usersView: UsersStateView = Object.fromEntries(
			Object.entries(users).map(([userId, user]) => {
				const userView: CSUserView = { ...user, color: index++ % 10 };
				return [userId, userView];
			})
		);

		const post = getPost(state.posts, props.streamId, props.id);
		if (!post) return { deactivated: true };

		// TODO codemark always undefined since there is no codemark on a Post (reply to a codemark) - potentially lots of dead code
		const codemark: CodemarkPlus | undefined = isPending(post)
			? post.pending && post.codemark
			: getCodemark(state.codemarks, post.codemarkId);

		const parentPost = post.parentPostId
			? getPost(state.posts, post.streamId, post.parentPostId)
			: undefined;

		let parentPostContent: string | undefined;
		let parentPostCodemark: CodemarkPlus | undefined;
		if (parentPost && !isPending(parentPost)) {
			if (parentPost.codemarkId) {
				parentPostCodemark = getCodemark(state.codemarks, parentPost.codemarkId);
				if (parentPostCodemark) {
					parentPostContent =
						parentPostCodemark.title || parentPostCodemark.text || parentPost.text;
				} else {
					parentPostContent = parentPost.text.trim() !== "" ? parentPost.text : "a codemark";
				}
			} else parentPostContent = parentPost.text;
		}

		const codemarkRepoId = codemark?.markers?.[0]?.repoId;
		const repo = codemarkRepoId ? getById(state.repos, codemarkRepoId) : undefined;
		const repoName = repo?.name ?? ""; // TODO repoName always empty since there is no codemark on a Post (reply to a codemark) - potentially lots of dead code

		let author = usersView[post.creatorId];
		if (!author) {
			author = { email: "", fullName: "" } as any;
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
			disableEdits: props.disableEdits || !capabilities.postEdit,
			disableDeletes: !capabilities.postDelete,
		};
	}, shallowEqual);

	const intl = useIntl();
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuTarget, setMenuTarget] = useState(null);
	const [warning, setWarning] = useState("");
	const previousEditing = usePrevious(props.editing);
	const previousThreadId = usePrevious(derivedState.threadId);
	const previousCodemark = usePrevious(derivedState.codemark);
	const contentEditableRef = useRef<ContentEditable>(null);

	async function showCode(preserveFocus = false) {
		const { hasMarkers, codemark } = derivedState;
		const marker = hasMarkers && codemark?.markers?.[0];
		if (marker) {
			if (marker.repoId) {
				const response = await HostApi.instance.send(GetDocumentFromMarkerRequestType, {
					markerId: marker.id,
				});

				if (response) {
					const { success } = await HostApi.instance.send(EditorSelectRangeRequestType, {
						uri: response.textDocument.uri,
						// Ensure we put the cursor at the right line (don't actually select the whole range)
						selection: {
							start: response.range.start,
							end: response.range.start,
							cursor: response.range.start,
						},
						preserveFocus: preserveFocus,
					});
					setWarning(success ? "" : "FILE_NOT_FOUND");
				} else {
					// assumption based on GetDocumentFromMarkerRequestType api requiring the workspace to be available
					setWarning("REPO_NOT_IN_WORKSPACE");
				}
			} else setWarning("NO_REMOTE");
		}
	}

	useDidMount(() => {
		if (derivedState.threadId === props.id) {
			showCode(true);
		}
	});

	const getEditInputId = () => {
		let id = `input-div-${derivedState.post?.id}`;
		if (props.showDetails) id = `thread-${id}`;
		return id;
	};

	useEffect(() => {
		if (previousThreadId !== derivedState.threadId && derivedState.threadId === props.id) {
			showCode(true);
		}

		if (!previousCodemark && derivedState.codemark) props.onDidResize(props.id);
	}, [derivedState.threadId, derivedState.codemark]);

	useEffect(() => {
		if (props.editing && !previousEditing) {
			const el = document.getElementById(getEditInputId());
			if (el) {
				el.focus();
			}
		}
	}, [props.editing]);

	const handleClickCodeBlock = event => {
		event.stopPropagation();
		showCode();
	};

	const resubmit = () => {
		if (derivedState?.post?.id) dispatch(retryPost(derivedState.post?.id));
	};

	const cancel = () => {
		if (derivedState?.post?.id) dispatch(cancelPost(derivedState.post?.id));
	};

	function getWarningMessage() {
		switch (warning) {
			case "NO_REMOTE": {
				const message = intl.formatMessage({
					id: "codeBlock.noRemote",
					defaultMessage: "This code does not have a remote URL associated with it.",
				});
				const learnMore = intl.formatMessage({ id: "learnMore" });
				return (
					<span>
						{message}{" "}
						<a href="https://docs.newrelic.com/docs/codestream/troubleshooting/git-issues/#repo-doesnt-have-a-remote-url">
							{learnMore}
						</a>
					</span>
				);
			}
			case "FILE_NOT_FOUND": {
				return (
					<span>
						{intl.formatMessage({
							id: "codeBlock.fileNotFound",
							defaultMessage: "You don’t currently have this file in your repo.",
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
									defaultMessage: "You don’t currently have the {repoName} repo open.",
								},
								{ repoName: derivedState.repoName }
							)}
							<LocateRepoButton
								repoId={
									derivedState.hasMarkers && derivedState.codemark?.markers?.[0]
										? derivedState.codemark?.markers[0].repoId
										: undefined
								}
								repoName={derivedState.repoName!}
								callback={async success => {
									if (success) {
										await showCode(true);
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
							defaultMessage: "Unknown code block location.",
						})}
					</span>
				);
			}
		}
	}

	const renderAssigneeHeadshots = () => {
		const { codemark } = derivedState;
		const assignees = codemark ? codemark.assignees || [] : [];

		if (assignees.length == 0) return null;
		if (!props.teammates) return null;

		return (
			<div className="align-far-right">
				{assignees.map(userId => {
					const person = props.teammates.find(user => user.id === userId);
					return (
						<Tooltip key={userId} title={"hi"} placement="top">
							<Headshot size={18} person={person} />
						</Tooltip>
					);
				})}
			</div>
		);
	};

	const renderIcons = () => {
		if (!derivedState.post) return null;

		return (
			<div className="align-right">
				<AddReactionIcon post={derivedState.post} />
				<Icon name="kebab-vertical" className="gear clickable" onClick={handleMenuClick} />
			</div>
		);
	};

	const renderEmote = post => {
		const { codemark } = derivedState;
		const type = codemark && codemark.type;
		const matches = (post.text || "").match(/^\/me\s+(.*)/);
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

	const renderText = post => {
		const { codemark } = derivedState;
		if (props.editing) return renderTextEditing(post);
		else if ((post.text || "").match(/^\/me\s/)) return null;
		else {
			// unfortunately need to account for legacy slack codemarks that don't have text
			return [<MarkdownText text={(codemark && codemark.text) || post.text} />, <br />];
		}
	};

	const onSaveEdit = async event => {
		if (props.onDidSaveEdit) {
			event.preventDefault();
			const { id } = props;
			const { post, teamMembers } = derivedState;

			const rawText: string =
				contentEditableRef?.current?.innerHTML ?? contentEditableRef?.current?.lastHtml ?? "";

			const text = replaceHtml(rawText) ?? "";
			if (post?.streamId) {
				await dispatch(
					editPost(
						post.streamId,
						id,
						text,
						findMentionedUserIds(teamMembers ?? [], text == null ? "" : text)
					)
				);
				props.onDidSaveEdit();
			}
		}
	};

	const renderTextEditing = post => {
		const id = getEditInputId();

		return (
			<div className="edit-post">
				<ContentEditable
					className="message-input"
					id={id}
					rows="1"
					tabIndex="-1"
					html={escapeHtml(post.text)}
					ref={contentEditableRef}
				/>
				<div className="button-group">
					<Button
						id="cancel-button"
						className="control-button cancel"
						tabIndex={2}
						type="submit"
						onClick={props.onCancelEdit}
					>
						Cancel
					</Button>
					<Button
						id="save-button"
						className="control-button"
						tabIndex={2}
						type="submit"
						onClick={onSaveEdit}
					>
						Save
					</Button>
				</div>
			</div>
		);
	};

	const handleMenuClick = event => {
		event.stopPropagation();
		setMenuOpen(!menuOpen);
		setMenuTarget(event.target);
	};

	const handleSelectMenu = action => {
		if (!derivedState.post) return;
		if (action === "pin-reply") {
			if (
				derivedState.parentPostCodemark?.pinnedReplies &&
				derivedState.parentPostCodemark.pinnedReplies.includes(derivedState.post.id)
			)
				return;
			if (derivedState.parentPostCodemark) {
				HostApi.instance.send(PinReplyToCodemarkRequestType, {
					codemarkId: derivedState.parentPostCodemark.id,
					postId: derivedState.post.id,
					value: true,
				});
			}
		} else if (action === "unpin-reply") {
			if (
				!derivedState.parentPostCodemark?.pinnedReplies ||
				!derivedState.parentPostCodemark?.pinnedReplies.includes(derivedState.post.id)
			)
				return;

			HostApi.instance.send(PinReplyToCodemarkRequestType, {
				codemarkId: derivedState.parentPostCodemark.id,
				postId: derivedState.post.id,
				value: false,
			});
		} else {
			props.action?.(action, {
				...derivedState.post,
				author: derivedState.author,
				codemark: derivedState.codemark,
				parentPostCodemark: derivedState.parentPostCodemark,
			});
		}

		setMenuOpen(false);
	};

	const renderTitle = post => {
		const { codemark } = derivedState;
		const icon = renderTypeIcon();
		const title = codemark && codemark.title;
		if (title)
			return (
				<div className="title">
					{icon} <MarkdownText text={title} inline={true} />
					{renderCodeBlockFile()}
				</div>
			);
		else return null;
	};

	const renderCodeBlockFile = () => {
		const { hasMarkers, codemark } = derivedState;

		const marker = hasMarkers ? codemark?.markers?.[0] : undefined;

		if (!marker?.file) return null;
		return <span className="file-name">{marker.file}</span>;
	};

	const handleClickStatusToggle = event => {
		event.stopPropagation();
		const { codemark } = derivedState;
		if (codemark?.status === "closed") openIssue();
		else closeIssue();
	};

	const closeIssue = () => {
		const { codemark } = derivedState;
		if (codemark) {
			dispatch(setCodemarkStatus(codemark.id, "closed"));
			submitReply("/me closed this issue");
		}
	};

	const openIssue = () => {
		const { codemark } = derivedState;
		if (codemark) {
			dispatch(setCodemarkStatus(codemark.id, "open"));
			submitReply("/me reopened this issue");
		}
	};

	const submitReply = text => {
		const { codemark } = derivedState;
		const { action } = props;
		if (codemark) {
			const forceThreadId = codemark.parentPostId || codemark.postId;
			action?.("submit-post", null, { forceStreamId: codemark.streamId, forceThreadId, text });
		}
	};

	const renderExternalLink = () => {
		const { codemark } = derivedState;
		if (codemark && codemark.externalProviderUrl && codemark.externalProvider) {
			const providerDisplay = PROVIDER_MAPPINGS[codemark.externalProvider];
			if (!providerDisplay) {
				return null;
			}
			return [
				<br />,
				<a href={codemark.externalProviderUrl}>Open on {providerDisplay.displayName}</a>,
			];
		}
		return null;
	};

	const renderTypeIcon = () => {
		const { codemark } = derivedState;
		let icon: ReactElement;
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

	const renderAssignees = () => {
		const assignees = ((codemark && codemark.assignees) || []).map(id =>
			props.teammates.find(t => t.id === id)
		);
		const externalAssignees = ((codemark && codemark.externalAssignees) || []).filter(
			user => !assignees.find((a: any) => a.email === user.email)
		);

		const assigneeNames = [...assignees, ...externalAssignees].map(
			(a: any) => a.username || a.displayName
		);

		if (assigneeNames.length == 0) return null;
		if (!props.teammates) return null;

		return [
			<br />,
			<div className="assignees">
				<div>
					<b>Assignees</b>
				</div>
				{assigneeNames.filter(Boolean).join(", ")}
			</div>,
		];
	};

	const renderStatus = () => {
		const { codemark } = derivedState;

		if (!codemark) return null;

		const status = (codemark && codemark.status) || "open";
		// const status = this.props.post.status || "open";
		if (codemark.type !== "issue") return null;

		const statusClass = createClassString({
			"status-button": true,
			checked: status === "closed",
		});

		return [
			<br />,
			<div className="status">
				<div>
					<b>Status</b>
				</div>
				<div className="align-far-left" onClick={handleClickStatusToggle}>
					<div className={statusClass}>
						<Icon name="check" className="check" />
					</div>{" "}
					<span className="status-label">{status}</span>
				</div>
			</div>,
		];
	};

	if (derivedState.deactivated) return null;

	const { author, post, hasMarkers, codemark, parentPostCodemark } = derivedState;

	if (!post || !author) return null;

	const showAssigneeHeadshots = { props };

	const headshotSize = 36;

	const mine = post?.creatorId === props.currentUserId;
	const systemPost = post?.creatorId === "codestream";
	const color = codemark && codemark.color;
	const type = codemark && codemark.type;
	let typeString = type || "post";
	typeString = typeString.charAt(0).toUpperCase() + typeString.slice(1);
	const title = codemark && codemark.title;

	const theClasses = {
		post: true,
		mine: mine,
		hover: menuOpen,
		editing: props.editing,
		"system-post": systemPost,
		// unread: props.unread,
		"new-separator": props.newMessageIndicator,
		question: type === "question",
		issue: type === "issue",
		trap: type === "trap",
		bookmark: type === "bookmark",
		reply: post?.parentPostId && post?.parentPostId !== post?.id,
	};
	if (color) {
		theClasses[color] = !!color;
	}
	const postClass = createClassString(theClasses);

	let codeBlock: ReactElement | undefined = undefined;
	if (hasMarkers) {
		const noRepo = !codemark?.markers?.[0].repoId;
		codeBlock = (
			<div
				className="code-reference"
				onClick={e => {
					if (props.showDetails) handleClickCodeBlock(e);
				}}
			>
				<div className={createClassString("header", { "no-repo": noRepo })}>
					{warning && (
						<div className="repo-warning">
							<Icon name="alert" /> {getWarningMessage()}
						</div>
					)}
				</div>
				{props.showDetails && codemark && !warning ? (
					<CodemarkActions
						codemark={codemark}
						capabilities={derivedState.capabilities}
						isAuthor={
							safe(() => derivedState.author.id === derivedState.codemarkAuthor?.id) || false
						}
						alwaysRenderCode={true}
					/>
				) : (
					codemark?.markers?.map((marker, index) => <Marker marker={marker} key={index} />)
				)}
			</div>
		);
	}

	const menuItems: MenuItem[] = [];

	if (!props.showDetails) {
		const threadLabel =
			(post.parentPostId && post?.parentPostId !== post.id) ||
			(post.numReplies && post?.numReplies > 0)
				? "View Thread"
				: "Start a Thread";
		menuItems.push({ label: threadLabel, action: "make-thread" });
	}

	let isPinnedReply = false;
	if (parentPostCodemark) {
		if ((parentPostCodemark.pinnedReplies || []).includes(post?.id)) {
			isPinnedReply = true;
			menuItems.push({ label: "Un-Star Reply", action: "unpin-reply" });
		} else {
			menuItems.push({ label: "Star Reply", action: "pin-reply" });
		}
	} else {
		menuItems.push({ label: "Mark Unread", action: "mark-unread" });
	}

	if (codemark || (mine && (!derivedState.disableEdits || !derivedState.disableDeletes))) {
		menuItems.push({ label: "-" });
	}

	if (codemark) {
		if (codemark.pinned)
			menuItems.push({ label: `Archive ${typeString}`, action: "toggle-pinned" });
		else menuItems.push({ label: `Unarchive ${typeString}`, action: "toggle-pinned" });
	}
	if (mine) {
		if (!derivedState.disableEdits) {
			menuItems.push({ label: `Edit ${typeString}`, action: "edit-post" });
		}
		if (!derivedState.disableDeletes) {
			menuItems.push({
				label: `Delete ${typeString}`,
				action: () => {
					if (post.parentPostId) {
						dispatch(deletePost(post.streamId, post.id, post.sharedTo));
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
										if (!post) {
											return;
										}
										dispatch(deletePost(post.streamId, post.id));
									},
								},
								{ label: "Cancel" },
							],
						});
					}
				},
			});
		}
	}

	const showIcons = !systemPost && isPending(post) ? !post.error : true;
	const customAttrs = { thread: post.parentPostId || post.id };
	return (
		<div className={postClass} id={post.id} data-seq-num={post.seqNum} {...customAttrs}>
			{showAssigneeHeadshots && renderAssigneeHeadshots()}
			{showIcons && renderIcons()}
			{menuOpen && (
				<Menu items={menuItems} target={menuTarget} action={handleSelectMenu} align="bottomRight" />
			)}

			<div className="author">
				<ProfileLink id={author.id}>
					<Headshot size={headshotSize} person={author} mine={mine} />
				</ProfileLink>
				{author?.username}
				{renderEmote(post)}
				{isPending(post) && post.error ? (
					<RetrySpinner callback={resubmit} cancel={cancel} />
				) : (
					<Timestamp relative time={post.createdAt} edited={post.hasBeenEdited} />
				)}
				{codemark && codemark.color && <div className={`label-indicator ${color}-background`} />}
			</div>
			{derivedState.post?.parentPostId &&
				derivedState.post?.parentPostId !== derivedState.post.id &&
				!props.showDetails && (
					<div className="replying-to">
						<span>reply to</span>{" "}
						<b>
							{derivedState.parentPostContent
								? derivedState.parentPostContent.substr(0, 80)
								: "a post"}
						</b>
					</div>
				)}
			{post?.creatorId === "codestream" && (
				<div className="replying-to">
					<span>only visible to you</span>
				</div>
			)}
			<div className="body">
				{renderTitle(post)}
				<div className="text">
					{title && renderTypeIcon()}
					{isPinnedReply && <Icon className="pinned-reply-star" name="star" />}
					{renderText(post)}
					{renderAssignees()}
					{renderStatus()}
					{renderExternalLink()}
					{renderCodeBlockFile()}
				</div>
				{/*!props.showDetails &&*/ codeBlock}
				{derivedState.post && <Attachments post={derivedState.post} />}
			</div>
			{derivedState.post && <Reactions post={derivedState.post} />}
		</div>
	);
}
