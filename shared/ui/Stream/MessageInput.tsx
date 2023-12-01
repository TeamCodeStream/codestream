import cx from "classnames";
import React, { ReactNode, SyntheticEvent, useEffect, useRef, useState } from "react";
import { shallowEqual } from "react-redux";
import * as codemarkSelectors from "../store/codemarks/reducer";
import { Attachment, CSMe, CSPost, CSTag, CSUser } from "@codestream/protocols/api";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import {
	asPastedText,
	debounceAndCollectToAnimationFrame,
	Disposable,
	emptyArray,
	lightOrDark,
	replaceHtml,
} from "../utils";
import { AtMentionsPopup, Mention } from "./AtMentionsPopup";
import EmojiPicker from "./EmojiPicker";
import Menu from "./Menu";
import Button from "./Button";
import Icon from "./Icon";
import { confirmPopup } from "./Confirm";
import {
	CodemarkPlus,
	UploadFileRequest,
	UploadFileRequestType,
} from "@codestream/protocols/agent";
import { getTeamMembers, getTeamTagsArray, getUsernames } from "../store/users/reducer";
import { MarkdownText } from "./MarkdownText";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { getProviderPullRequestCollaborators } from "../store/providerPullRequests/slice";
import Tooltip from "./Tooltip";
import { HostApi } from "../webview-api";
import {
	useAppDispatch,
	useAppSelector,
	useDidMount,
	usePrevious,
} from "@codestream/webview/utilities/hooks";
import { Collaborator } from "@codestream/protocols/webview";
import { AutoHeightTextArea } from "@codestream/webview/src/components/AutoHeightTextArea";
import { MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";
import { updateTeamTag } from "@codestream/webview/Stream/actions";

const emojiData = require("../node_modules/markdown-it-emoji-mart/lib/data/full.json");

type FileAttachmentPair = {
	file: File;
	attachment: AttachmentField;
};

type PopupType = "at-mentions" | "slash-commands" | "channels" | "emojis";

type QuotePost = CSPost & { author: { username: string } };

const tuple = <T extends string[]>(...args: T) => args;

const COLOR_OPTIONS = tuple("blue", "green", "yellow", "orange", "red", "purple", "aqua", "gray");

export interface AttachmentField extends Attachment {
	status?: "uploading" | "error" | "uploaded";
	error?: string;
}

export type HackyDidRender = {
	insertTextAtCursor: (text: string, toDelete: string) => void;
	insertNewlineAtCursor: () => void;
	focus: Function;
};

interface MessageInputProps {
	text: string;
	withTags?: boolean;
	teamProvider?: "codestream" | "slack" | "msteams" | string;
	isDirectMessage?: boolean;
	multiCompose?: boolean;
	submitOnEnter?: boolean;
	placeholder?: string;
	quotePost?: QuotePost;
	suggestGrok?: boolean;
	shouldShowRelatableCodemark?(codemark: CodemarkPlus): boolean;
	onChange?(text: string, formatCode: boolean): void;
	onKeypress?(event: React.KeyboardEvent): void;
	onEmptyUpArrow?(event: React.KeyboardEvent): void;
	onDismiss?(): void;
	setIsPreviewing?(value: boolean): void;
	onSubmit?: (e: SyntheticEvent) => Promise<void>;
	onFocus?(): void;
	selectedTags?: { [key: string]: boolean };
	toggleTag?: Function;
	relatedCodemarkIds?: { [id: string]: CodemarkPlus | undefined };
	toggleCodemark?: Function;
	autoFocus?: boolean;
	className?: string;
	attachments?: AttachmentField[];
	attachmentContainerType?: "codemark" | "reply" | "review";
	setAttachments?(attachments: AttachmentField[]): void;
	renderCodeBlock?(index: number, force: boolean): React.ReactNode | null;
	renderCodeBlocks?(): React.ReactNode | null;
	__onDidRender?(stuff: HackyDidRender): void; // HACKy: sneaking internals to parent
}

export const MessageInput = (props: MessageInputProps) => {
	const derivedState = useAppSelector(state => {
		const currentTeam = state.teams[state.context.currentTeamId];

		const currentPullRequest = state.context.currentPullRequest;
		let teammates: CSUser[] = [];
		let collaborators: Collaborator[] = [];
		if (currentPullRequest) {
			// TODO complete different type with id, username, avatar - why was it assigned to teammates?
			collaborators = getProviderPullRequestCollaborators(state) ?? [];
		} else {
			teammates = getTeamMembers(state);
		}

		return {
			currentTeam,
			currentUserId: state.session.userId!,
			teammates,
			collaborators,
			codemarks: codemarkSelectors.getTypeFilteredCodemarks(state) || [],
			isInVscode: state.ide.name === "VSC",
			teamTags: props.withTags ? getTeamTagsArray(state) : emptyArray,
			// channelStreams: getChannelStreamsForTeam(state, state.context.currentTeamId),
			services: state.services,
			currentUser: state.users[state.session.userId!] as CSMe,
			usernames: getUsernames(state),
			attachFilesEnabled: isFeatureEnabled(state, "fileUploads"),
		};
	}, shallowEqual);

	const dispatch = useAppDispatch();

	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	const disposables: Disposable[] = [];
	const [emojiOpen, setEmojiOpen] = useState(false);
	const [codemarkOpen, setCodemarkOpen] = useState(false);
	const [tagsOpen, setTagsOpen] = useState<false | "select" | "edit" | "create">(false);
	const [attachOpen, setAttachOpen] = useState(false);
	const [customColor, setCustomColor] = useState("");
	const [formatCode, setFormatCode] = useState(false);
	const [insertPrefix, setInsertPrefix] = useState("");
	const [isPreviewing, _setIsPreviewing] = useState(false);
	const [isDropTarget, setIsDropTarget] = useState(false);
	const [isPasteEvent, setIsPasteEvent] = useState(false);
	const [currentPopup, setCurrentPopup] = useState<PopupType>();
	const [popupIndex, setPopupIndex] = useState<number>();
	const [popupItems, setPopupItems] = useState<Mention[]>();
	const [selectedPopupItem, setSelectedPopupItem] = useState<string>();
	const [q, setQ] = useState<string>();
	const [popupPrefix, setPopupPrefix] = useState<string>();
	const [emojiMenuTarget, setEmojiMenuTarget] = useState<EventTarget>();
	const [codemarkMenuTarget, setCodemarkMenuTarget] = useState<EventTarget>();
	const [tagsMenuTarget, setTagsMenuTarget] = useState<EventTarget>();
	const [editingTag, setEditingTag] = useState<CSTag>();

	function onChangeWrapper(text: string, formatCode: boolean) {
		if (!props.onChange) return;
		if (isPasteEvent) {
			text = text.replace(/```\s*?```/g, "```");
			text = text.replace(/```(\s*?(<div>|<\/div>)+\s*?)*?```/g, "```");
		}
		props.onChange(text, formatCode);
	}

	// this is asynchronous so callers should provide a callback for code that depends on the completion of this
	const focus = debounceAndCollectToAnimationFrame((...cbs: Function[]) => {
		if (textAreaRef.current) {
			textAreaRef.current.focus();
			textAreaRef.current.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}
		cbs.forEach(cb => cb.apply(undefined));
	});

	// insert the given text at the cursor of the input field
	// after first deleting the text in toDelete
	const insertTextAtCursor = (text: string, toDelete = "") => {
		if (isPreviewing) return;
		if (!textAreaRef.current) return;
		if (document.activeElement !== textAreaRef.current) {
			textAreaRef.current.focus();
		}

		const target = textAreaRef.current;

		// https://stackoverflow.com/questions/11076975/how-to-insert-text-into-the-textarea-at-the-current-cursor-position
		if (target.selectionStart || target.selectionStart === 0) {
			const startPos = target.selectionStart;
			const endPos = target.selectionEnd;
			if (toDelete.length > 0) {
				target.value =
					target.value.slice(0, startPos - toDelete.length) + target.value.slice(endPos);
			}
			target.value =
				target.value.substring(0, startPos) +
				text +
				target.value.substring(endPos, target.value.length);
		} else {
			target.value += text;
		}

		onChangeWrapper(target.value, formatCode);
	};

	const insertNewlineAtCursor = () => {
		if (isPreviewing) return;

		let sel, range;
		sel = window.getSelection();

		// if for some crazy reason we can't find a selection, return
		// to avoid an error.
		// https://stackoverflow.com/questions/22935320/uncaught-indexsizeerror-failed-to-execute-getrangeat-on-selection-0-is-not
		if (sel.rangeCount == 0) return;

		range = sel.getRangeAt(0);

		// delete the X characters before the caret
		range.setStart(range.commonAncestorContainer, range.startOffset);
		// range.moveEnd("character", toDelete.length);

		range.deleteContents();
		const br1 = document.createElement("BR");
		const br2 = document.createElement("BR");
		range.insertNode(br1);
		range.insertNode(br2);
		range.setStartAfter(br2);
		sel.removeAllRanges();
		sel.addRange(range);
		if (textAreaRef.current) {
			textAreaRef.current.normalize();
			// sel.collapse(textNode);
			sel.modify("move", "backward", "character");
			sel.modify("move", "forward", "character");
			// window.getSelection().empty();
			// this.focus();

			onChangeWrapper(textAreaRef.current.value, formatCode);
			// setCursorPosition(getCurrentCursorPosition("input-div"));
		}
	};

	function quotePost() {
		if (textAreaRef.current) {
			textAreaRef.current.value = ""; // TODO maybe not
			onChangeWrapper("", false);
		}
		focus(() => {
			const post = props.quotePost!;
			insertTextAtCursor("@" + post.author.username + " said:");
			insertNewlineAtCursor();
			insertTextAtCursor(">" + post.text);
			insertNewlineAtCursor();
		});
	}

	const replaceAttachment = (attachment, index) => {
		attachment = { ...attachment, mimetype: attachment.type || attachment.mimetype };
		const { attachments = [] } = props;
		let newAttachments = [...attachments];
		newAttachments.splice(index, 1, attachment);
		// this.setState({ attachments: newAttachments });
		if (props.setAttachments) props.setAttachments(newAttachments);
	};

	const attachFiles = async (files: FileList) => {
		if (!files || files.length === 0) return;

		const { attachments = [] } = props;
		let index = attachments.length;

		const fileAttachmentPairs: Array<FileAttachmentPair> = [];

		for (const file of files) {
			const attachment: AttachmentField = {
				name: file.name,
				title: file.name,
				type: file.type,
				size: file.size,
				mimetype: file.type,
				status: "uploading",
			};
			fileAttachmentPairs.push({ file, attachment });
		}

		const newAttachments = fileAttachmentPairs.map(({ attachment }) => attachment);

		// add the dropped files to the list of attachments, with uploading state
		// this.setState({ attachments: [...attachments, ...files] });
		if (props.setAttachments) props.setAttachments([...attachments, ...newAttachments]);

		for (const fileAttachmentPair of fileAttachmentPairs) {
			const { file, attachment } = fileAttachmentPair;
			try {
				const request: UploadFileRequest = {
					name: file.name,
					size: file.size,
					mimetype: file.type,
				};
				// encode as base64 to send to the agent
				const toBase64 = (file): Promise<string | ArrayBuffer | null> =>
					new Promise((resolve, reject) => {
						const reader = new FileReader();
						reader.readAsDataURL(file);
						reader.onload = () => resolve(reader.result);
						reader.onerror = error => reject(error);
					});
				request.buffer = await toBase64(file);
				const response = await HostApi.instance.send(UploadFileRequestType, request);
				if (response && response.url) {
					replaceAttachment(response, index);
				} else {
					attachment.status = "error";
					replaceAttachment(file, index);
				}
			} catch (e) {
				console.warn("Error uploading file: ", e);
				attachment.status = "error";
				attachment.error = e;
				replaceAttachment(file, index);
			}
			index++;
		}
	};

	// for keypresses that we can't capture with standard
	// javascript events
	// handleNonCapturedKeyPress(event, eventType) {
	// 	if (eventType == "up") {
	// 		if (this.state.postTextByStream[this.props.streamId] === "") {
	// 			this.props.onEmptyUpArrow(event);
	// 		}
	// 	}
	// 	event.abortKeyBinding();
	// }

	function hidePopup() {
		setCurrentPopup(undefined);
		setInsertPrefix("");
		KeystrokeDispatcher.levelDown();
	}

	const hideEmojiPicker = () => {
		setEmojiOpen(false);
		KeystrokeDispatcher.levelDown();
	};

	const hideCodemarkPicker = () => {
		setCodemarkOpen(false);
		KeystrokeDispatcher.levelDown();
	};

	const hideTagsPicker = () => {
		setTagsOpen(false);
		setQ("");
		KeystrokeDispatcher.levelDown();
	};

	const hideFilePicker = () => {
		setAttachOpen(false);
		KeystrokeDispatcher.levelDown();
	};

	const handleHoverAtMention = id => {
		const index = popupItems?.findIndex(x => x.id == id);

		setPopupIndex(index);
		setSelectedPopupItem(id);
	};

	const handleSelectAtMention = (id?: string) => {
		// if no id is passed, we assume that we're selecting
		// the currently-selected at mention
		if (!id) id = selectedPopupItem;

		let toInsert;
		const toInsertPostfix = "";

		hidePopup();

		if (id === "__close") return;

		if (currentPopup === "slash-commands") {
			toInsert = id + "\u00A0";
			// } else if (this.state.currentPopup === "channels") {
			// 	toInsert = id + "\u00A0";
		} else if (currentPopup === "emojis") {
			toInsert = id + ":\u00A0";
		} else {
			const user =
				derivedState.teammates.find(t => t.id === id) ??
				derivedState.collaborators.find(t => t.id === id);
			if (!user) return;
			toInsert = user.username + "\u00A0";
		}
		// setTimeout(() => {
		focus();
		// }, 20);
		// the reason for this unicode space is that chrome will
		// not render a space at the end of a contenteditable div
		// unless it is a &nbsp;, which is difficult to insert
		// so we insert this unicode character instead
		insertTextAtCursor(insertPrefix + toInsert, popupPrefix);
		setInsertPrefix("");
	};

	// the keypress handler for tracking up and down arrow
	// and enter, while the at mention popup is open
	function handleAtMentionKeyPress(event: React.KeyboardEvent, eventType: string) {
		event.preventDefault();
		if (eventType == "escape") {
			if (currentPopup) hidePopup();
			else if (emojiOpen) hideEmojiPicker();
			else if (codemarkOpen) hideCodemarkPicker();
			else if (tagsOpen) hideTagsPicker();
			else if (attachOpen) hideFilePicker();
			// else this.handleDismissThread();
		} else {
			let newIndex = 0;
			if (eventType == "down") {
				if (popupIndex! < popupItems!.length - 1) {
					newIndex = popupIndex! + 1;
				} else {
					newIndex = 0;
				}
			} else if (eventType == "up") {
				if (popupIndex == 0) {
					newIndex = popupItems!.length - 1;
				} else {
					newIndex = popupIndex! - 1;
				}
			} else if (eventType == "tab") {
				handleSelectAtMention();
			}
			setPopupIndex(newIndex);
			setSelectedPopupItem(popupItems![newIndex].id);
		}
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		const multiCompose = props.multiCompose;

		if (currentPopup) {
			if (event.key === "ArrowUp" || event.which === 38) {
				event.stopPropagation();
				handleAtMentionKeyPress(event, "up");
			}
			if (event.key === "ArrowDown" || event.which === 40) handleAtMentionKeyPress(event, "down");
			if (event.key === "Tab") handleAtMentionKeyPress(event, "tab");
			if (event.key === "Escape") {
				hidePopup();
				event.stopPropagation();
			}
		} else if (emojiOpen) {
			if (event.key === "Escape") {
				hideEmojiPicker();
				event.stopPropagation();
			}
		} else if (codemarkOpen) {
			if (event.key === "Escape") {
				hideCodemarkPicker();
				event.stopPropagation();
			}
		} else if (tagsOpen) {
			if (event.key === "Escape") {
				hideTagsPicker();
				event.stopPropagation();
			}
		} else if (attachOpen) {
			if (event.key === "Escape") {
				hideFilePicker();
				event.stopPropagation();
			}
		} else {
			if (event.key == "Escape" && multiCompose && props.onDismiss) {
				props.onDismiss();
			} else if ((event.key === "Enter" || event.which === 13) && event.metaKey && multiCompose) {
				// command-enter should submit for multiCompose
				event.preventDefault();
				setIsPreviewing(false);
				const { onSubmit } = props;
				onSubmit && onSubmit(event);
			}
		}
	};

	// set up the parameters to pass to the at mention popup
	function showPopupSelectors(prefix: string, type: PopupType) {
		const itemsToShow: Mention[] = [];
		KeystrokeDispatcher.levelUp();

		const normalizedPrefix = prefix ? prefix.toLowerCase() : prefix;

		if (type === "at-mentions") {
			const { teammates } = derivedState; //.teammates.filter(({ id }) => id !== this.props.currentUserId);
			// TODO not handling collaborators here - is it necessary?

			for (const person of teammates) {
				const toMatch = `${person.fullName}*${person.username}`.toLowerCase();
				if (toMatch.includes(normalizedPrefix)) {
					const you = person.id === derivedState.currentUserId ? " (you)" : "";
					let description = person.fullName || person.email;
					if (description) {
						description += you;
					}
					if (person.username.toLowerCase() === "grok") {
						if (props.suggestGrok) {
							itemsToShow.unshift({
								id: person.id,
								headshot: person,
								identifier: person.username || person.email,
								description: description,
							});
						}
					} else {
						itemsToShow.push({
							id: person.id,
							headshot: person,
							identifier: person.username || person.email,
							description: description,
						});
					}
				}
			}
			// } else if (type === "channels") {
			// 	Object.values(this.props.channelStreams || []).forEach(channel => {
			// 		const toMatch = channel.name.toLowerCase();
			// 		if (toMatch.indexOf(normalizedPrefix) !== -1) {
			// 			itemsToShow.push({
			// 				id: channel.name,
			// 				identifier: "#" + channel.name,
			// 				description: channel.purpose || ""
			// 			});
			// 		}
			// 	});
		} else if (type === "emojis") {
			if (normalizedPrefix && normalizedPrefix.length > 1) {
				Object.keys(emojiData).map(emojiId => {
					if (emojiId.indexOf(normalizedPrefix) === 0) {
						itemsToShow.push({ id: emojiId, identifier: emojiData[emojiId] + " " + emojiId });
					}
				});
			} else {
				itemsToShow.push({
					description: "Matching Emoji. Type 2 or more characters",
				});
			}
		}

		if (itemsToShow.length === 0) {
			hidePopup();
		} else {
			const selected = itemsToShow[0].id;

			setCurrentPopup(type);
			setPopupPrefix(prefix);
			setPopupItems(itemsToShow);
			setPopupIndex(0);
			setSelectedPopupItem(selected);
		}
	}

	const handleKeyPress = (event: React.KeyboardEvent) => {
		const newPostText = props.text;
		const multiCompose = props.multiCompose;

		// if we have the at-mentions popup open, then the keys
		// do something different than if we have the focus in
		// the textarea
		if (currentPopup) {
			if (event.key == "Escape") {
				hidePopup();
			} else if ((event.key == "Enter" || event.which === 13) && !event.shiftKey) {
				event.preventDefault();
				handleSelectAtMention();
			}
		} else if (event.key === "@") {
			showPopupSelectors("", "at-mentions");
		} else if (event.key === ":") {
			showPopupSelectors("", "emojis");
		} else if (!multiCompose && event.key === "/" && newPostText.length === 0) {
			showPopupSelectors("", "slash-commands");
			// } else if (event.key === "#") {
			// 	this.showPopupSelectors("", "channels");
		} else if (
			event.charCode === 13 &&
			!event.shiftKey &&
			(event.ctrlKey || event.metaKey || !multiCompose)
		) {
			event.preventDefault();
			setIsPreviewing(false);
			const { onSubmit } = props;
			onSubmit && onSubmit(event);
		} else if (event.key == "Escape" && multiCompose && props.onDismiss) {
			setIsPreviewing(false);
			props.onDismiss();
		}

		if (props.onKeypress) props.onKeypress(event);
	};

	const pinImage = (filename: string, url: string) => {
		insertTextAtCursor(`![${filename}](${imageEncodedUrl(url)})`);
	};

	const imageEncodedUrl = (url: string) => {
		return url.replace(/ /g, "%20").replace(/\?/g, "%3F");
	};

	const renderAttachedFiles = () => {
		const { attachments = [] } = props;

		if (!attachments || attachments.length === 0) return;
		return (
			<div className="related" key="attached-files">
				<div className="related-label">Attachments</div>
				{attachments.map((file, index) => {
					const icon =
						file.status === "uploading" ? (
							<Icon name="sync" className="spin" style={{ verticalAlign: "3px" }} />
						) : file.status === "error" ? (
							<Icon name="alert" className="spinnable" />
						) : (
							<Icon name="paperclip" className="spinnable" />
						);
					const isImage = (file.mimetype || "").startsWith("image");
					const text = replaceHtml(textAreaRef?.current?.value ?? "") ?? "";
					const imageInjected =
						isImage && file.url
							? text.includes(`![${file.name}](${imageEncodedUrl(file.url)})`)
							: false;
					return (
						<Tooltip title={file.error} placement="top" delay={1}>
							<div key={index} className="attachment">
								<span>{icon}</span>
								<span data-testid={`file-item-${file.name}`}>{file.name}</span>
								<span>
									{isImage && file.url && (
										<Icon
											title={
												imageInjected
													? `This image is in the markdown above`
													: `Insert this image in markdown`
											}
											placement="bottomRight"
											align={{ offset: [20, 0] }}
											name="pin"
											className={imageInjected ? "clickable selected" : "clickable"}
											onMouseDown={e => !imageInjected && pinImage(file.name, file.url!)}
										/>
									)}
									<Icon
										name="x"
										className="clickable"
										onClick={() => {
											const { attachments = [] } = props;
											const newAttachments = [...attachments];
											newAttachments.splice(index, 1);
											if (props.setAttachments) props.setAttachments(newAttachments);
										}}
									/>
								</span>
							</div>
						</Tooltip>
					);
				})}
			</div>
		);
	};

	const renderTextReplaceCodeBlocks = () => {
		const text = replaceHtml(textAreaRef?.current?.value ?? "") ?? "";

		if (!props.renderCodeBlock) return <MarkdownText text={text} inline={false} />;

		const blocks: ReactNode[] = [];
		const groups = text.split(/\[#(\d+)]/);
		let index = 0;
		while (index < groups.length) {
			blocks.push(<MarkdownText text={groups[index]} inline={false} />);
			if (index + 1 < groups.length) {
				const markerIndex = parseInt(groups[index + 1], 10);
				if (markerIndex > 0) {
					blocks.push(props.renderCodeBlock(markerIndex - 1, true));
				}
			}
			index += 2;
		}
		if (props.renderCodeBlocks) blocks.push(props.renderCodeBlocks());
		return <>{blocks}</>;
	};

	const handleDragEnter = () => setIsDropTarget(true);
	const handleDragLeave = () => setIsDropTarget(false);
	const handleDrop = e => {
		setIsDropTarget(false);
		// e.stopPropagation();
		e.preventDefault();

		attachFiles(e.dataTransfer.files);
	};

	// when the input field loses focus, one thing we want to do is
	// to hide the at-mention popup
	const handleBlur = (event: React.SyntheticEvent) => {
		// event.preventDefault();
		// turned off because of bad interaction with trying to control when the popup
		// opens/closes explicitly, for example with the @ icon in the messageinput
		// this.hidePopup();
	};

	// depending on the contents of the input field, if the user
	// types a "@" then open the at-mention popup
	const handleChange = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
		if (!(event.target instanceof HTMLTextAreaElement)) return;
		const newPostText = event.target.value;

		const upToCursor = newPostText.substring(0, event.target.selectionStart);
		// console.info("===--- handleChange upToCursor", upToCursor);
		const peopleMatch = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_.+]*)$/);
		// const channelMatch = upToCursor.match(/(?:^|\s)#([a-zA-Z0-9_.+]*)$/);
		const emojiMatch = upToCursor.match(/(?:^|\s):([a-z+_]*)$/);
		const slashMatch = newPostText.match(/^\/([a-zA-Z0-9+]*)$/);
		if (currentPopup === "at-mentions") {
			if (peopleMatch) {
				showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			} else {
				// if the line doesn't end with @word, then hide the popup
				hidePopup();
			}
		} else if (currentPopup === "slash-commands") {
			if (slashMatch) {
				showPopupSelectors(slashMatch[0].replace(/\//, ""), "slash-commands");
			} else {
				// if the line doesn't start with /word, then hide the popup
				hidePopup();
			}
			// } else if (this.state.currentPopup === "channels") {
			// 	if (channelMatch) {
			// 		this.showPopupSelectors(channelMatch[1].replace(/#/, ""), "channels");
			// 	} else {
			// 		// if the line doesn't end with #word, then hide the popup
			// 		this.hidePopup();
			// 	}
		} else if (currentPopup === "emojis") {
			if (emojiMatch) {
				showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
			} else {
				// if the line doesn't look like :word, then hide the popup
				hidePopup();
			}
		} else {
			if (peopleMatch) showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			if (slashMatch && !props.multiCompose) {
				showPopupSelectors(slashMatch[0].replace(/\//, ""), "slash-commands");
			}
			// if (channelMatch) showPopupSelectors(channelMatch[1].replace(/#/, ""), "channels");
			if (emojiMatch) showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
		}

		// track newPostText as the user types
		if (textAreaRef?.current) {
			onChangeWrapper(textAreaRef?.current?.value, formatCode);
		}
		// autoMentions: this.state.autoMentions.filter(mention => newPostText.includes(mention)), // TODO
	};

	const renderExitPreview = () => {
		return (
			<div className="button-group float-wrap">
				<Button
					data-testid="exit-preview-button"
					type="submit"
					className="control-button"
					style={{ width: "100px" }}
					onClick={e => {
						setIsPreviewing(false);
						focus();
					}}
				>
					Exit Preview
				</Button>
			</div>
		);
	};

	useDidMount(() => {
		if (props.quotePost) {
			quotePost();
		}
		// so that HTML doesn't get pasted into the input field. without this,
		// HTML would be rendered as HTML when pasted
		if (textAreaRef.current) {
			textAreaRef.current.addEventListener("paste", async (e: ClipboardEvent) => {
				e.preventDefault();
				setIsPasteEvent(true);
				let text = e.clipboardData!.getData("text/plain");
				text = asPastedText(text);
				// cache the files as they will be lost with our insertText hack below
				const files = e.clipboardData?.files;
				// HACK. workaround for issue here: https://github.com/microsoft/vscode/issues/122438
				await new Promise(resolve => {
					setTimeout(() => {
						document.execCommand("insertText", false, text);
						resolve(true);
					}, 1);
				});

				setIsPasteEvent(false);
				if (files?.length) {
					attachFiles(files);
				}
			});
			disposables.push(
				KeystrokeDispatcher.onKeyDown(
					"Escape",
					event => {
						if (event.key === "Escape" && event.target.id !== "input-div") {
							handleKeyDown(event);
						}
					},
					{ source: "MessageInput.tsx", level: -1 }
				)
			);
		}

		if (props.autoFocus && textAreaRef.current) {
			textAreaRef.current.focus();
		}
		return () => {
			disposables.forEach(d => d.dispose());
		};
	}); // End of useDidMount

	const previousQuotePost = usePrevious(props.quotePost);

	useEffect(() => {
		if (
			(props.quotePost && !previousQuotePost) ||
			(props.quotePost && previousQuotePost && props.quotePost.id !== previousQuotePost.id)
		) {
			quotePost();
		}
	}, [props.quotePost]);

	const setIsPreviewing = value => {
		_setIsPreviewing(value);
		if (props.setIsPreviewing) props.setIsPreviewing(value);
	};

	const handleClickPreview = () => {
		setIsPreviewing(!isPreviewing);
		focus();
	};

	const tagsMenuAction = action => {
		// the close button returns an event object, everything else returns a string or null
		if (!action || typeof action === "object") {
			setTagsOpen(false);
			setEditingTag(undefined);
			return;
		}
		switch (action) {
			case "search":
			case "noop":
				return;
			case "create":
				setTagsOpen("create");
				setEditingTag({ label: q, color: "blue" });
				break;
			default:
				if (props.toggleTag) props.toggleTag(action);
		}
	};

	const buildSelectTagMenu = () => {
		const { teamTags } = derivedState;
		if (!teamTags) return null;

		let menuItems: MenuItem[] = [
			{ type: "search", placeholder: "Search tags...", action: "search" },
			{ label: "-" },
		];

		menuItems = menuItems.concat(
			teamTags.map(tag => {
				let className = "tag-menu-block";
				if (!tag.color.startsWith("#")) className += " " + tag.color + "-background";
				else if (lightOrDark(tag.color) === "light") className += " light";
				if (tag.color === "yellow") className += " light";
				return {
					label: (
						<span className="tag-menu-selector">
							<span
								className={className}
								style={tag.color.startsWith("#") ? { background: tag.color } : {}}
							>
								{tag.label}&nbsp;
								{props?.selectedTags?.[tag.id!] && <span className="check">✔</span>}
							</span>
							<Icon
								name="pencil"
								className="edit"
								onClick={e => {
									setTagsOpen("edit");
									setEditingTag({ ...tag });
									e.preventDefault();
									e.stopPropagation();
								}}
							/>
						</span>
					),
					customHover: true,
					searchLabel: tag.label || tag.color,
					action: tag.id,
				};
			})
		);
		menuItems = menuItems.concat({ label: "-" }, { label: "Create a New Tag", action: "create" });
		return (
			<Menu
				title="Tags"
				items={menuItems}
				action={tagsMenuAction}
				target={tagsMenuTarget}
				onChangeSearch={q => setQ(q)}
			/>
		);
	};

	const setEditingTagColor = color => {
		setEditingTag({ ...editingTag, color: color });
	};

	const setEditingTagLabel = label => {
		if (editingTag) {
			setEditingTag({ ...editingTag, label: label });
		}
	};

	const saveTag = () => {
		const { currentTeam } = derivedState;

		if (editingTag) {
			dispatch(updateTeamTag(currentTeam, editingTag));
		}

		// hide the tags picker and re-open the tags selection menu
		hideTagsPicker();
		// i have no idea why the following code needs to be done after a delay.
		// otherwise what ends up happening is you get a double-menu -Pez
		setTimeout(() => {
			setTagsOpen("select");
		}, 1);
	};

	const deleteTag = () => {
		if (!editingTag?.id) {
			setEditingTag(undefined);
			hideTagsPicker();
			return;
		}

		confirmPopup({
			title: "Are you sure?",
			message:
				"Deleting a tag cannot be undone, and will remove it from any codemarks that contain this tag.",
			centered: true,
			buttons: [
				{
					label: "Delete Tag",
					wait: true,
					action: () => {
						dispatch(
							updateTeamTag(derivedState.currentTeam, {
								...editingTag,
								deactivated: true,
							})
						);
						setEditingTag(undefined);
						hideTagsPicker();
					},
				},
				{ label: "Cancel" },
			],
		});
	};

	const buildEditTagMenu = () => {
		if (!editingTag) setEditingTag({ label: "", color: "blue" });

		const body = (
			<div>
				<input
					type="text"
					value={editingTag?.label || ""}
					placeholder="Tag Name"
					onChange={e => {
						setEditingTagLabel(e.target.value);
					}}
				/>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr 1fr",
						gridColumnGap: "10px",
						gridRowGap: "10px",
						margin: "20px 0 10px 0",
						maxWidth: "160px",
						whiteSpace: "normal",
					}}
				>
					{COLOR_OPTIONS.map(color => {
						return (
							<span
								className={`${color}-background tag-edit-block`}
								onClick={e => setEditingTagColor(color)}
							>
								{editingTag?.color === color && <Icon name="check" className="check" />}
							</span>
						);
					})}
					<div className="tag-edit-block" style={{ backgroundColor: customColor }}>
						{editingTag?.color === customColor ? (
							<Icon name="check" className="check" />
						) : (
							<div>custom</div>
						)}
						<input
							style={{
								// make it transparent because the default styling
								// is ugly, and we just make the whole block the color
								// that is selected via the magic of React -Pez
								opacity: 0,
								display: "block",
								width: "100%",
								height: "100%",
								position: "absolute",
								top: 0,
								left: 0,
								bottom: 0,
								right: 0,
							}}
							type="color"
							className={`custom-tag-edit-block`}
							value={customColor}
							onChange={e => {
								setCustomColor(e.target.value);
								setEditingTagColor(e.target.value);
							}}
						/>
					</div>
				</div>
			</div>
		);
		const body2 = (
			<div className="button-row">
				<Button className="control-button" onClick={saveTag}>
					Save
				</Button>
				<Button className="control-button delete" onClick={deleteTag}>
					Delete
				</Button>
			</div>
		);

		const items = [
			{ label: body, noHover: true, action: "noop" },
			{ label: "-" },
			{ label: body2, noHover: true, action: "noop" },
		];

		return (
			<Menu
				title={editingTag?.id ? "Edit Tag" : "Add Tag"}
				items={items}
				action={tagsMenuAction}
				target={tagsMenuTarget}
			/>
		);
	};

	const buildTagMenu = () => {
		switch (tagsOpen) {
			case "select":
				return buildSelectTagMenu();
			case "edit":
				return buildEditTagMenu();
			case "create":
				// setState({ editingTag: null });
				return buildEditTagMenu();
			default:
				return null;
		}
	};

	const handleClickTagButton = (event: React.SyntheticEvent) => {
		event.persist();
		setTagsOpen("select");
		setTagsMenuTarget(event.target);
	};

	const codemarkMenuAction = action => {
		// the close button returns an event object, everything else returns a string or null
		if (!action || typeof action === "object") setCodemarkOpen(false);

		switch (action) {
			case "search":
				return;
			case "more":
				return; // FIXME load more codemarks
			default:
				if (action && props.toggleCodemark) {
					const codemark = derivedState.codemarks.find(codemark => codemark.id === action);
					props.toggleCodemark(codemark);
				}
		}
	};

	const buildCodemarkMenu = () => {
		if (!codemarkOpen) return null;

		let menuItems: MenuItem[] = [
			{ type: "search", placeholder: "Search codemarks...", action: "search" },
			{ label: "-" },
		];

		const { codemarks = [] } = derivedState;
		if (codemarks.length === 0) return null;

		const toContact = codemarks
			.sort((a, b) => b.createdAt - a.createdAt)
			.map(codemark => {
				if (codemark.deactivated) return null;
				if (props.shouldShowRelatableCodemark && !props.shouldShowRelatableCodemark(codemark))
					return null;

				const title = codemark.title || codemark.text;
				const icon = props?.relatedCodemarkIds?.[codemark.id] ? (
					<Icon style={{ margin: "0 2px 0 2px" }} name="check" />
				) : (
					<Icon name={codemark.type || "comment"} className={`${codemark.color}-color type-icon`} />
				);
				const file = codemark.markers && codemark.markers[0] && codemark.markers[0].file;
				return {
					icon: icon,
					label: (
						<span className={props?.relatedCodemarkIds?.[codemark.id] ? "menu-selected" : ""}>
							&nbsp;{title}&nbsp;&nbsp;<span className="codemark-file">{file}</span>
						</span>
					),
					searchLabel: title || "",
					action: codemark.id,
				};
			})
			// flatMap makes the type checker happy as it filters out null / undefined
			.flatMap(i => (i ? [i] : []));

		menuItems = menuItems.concat(toContact);
		// menuItems = menuItems.concat({ label: "-" }, { label: "Show More...", action: "more" });
		return (
			<Menu
				title="Add Codemark"
				items={menuItems}
				action={codemarkMenuAction}
				target={codemarkMenuTarget}
			/>
		);
	};

	const handleClickCodemarkButton = (event: React.SyntheticEvent) => {
		event.persist();
		setCodemarkOpen(!codemarkOpen);
		setCodemarkMenuTarget(event.target);
	};

	const handleChangeFiles = () => {
		const attachElement = document.getElementById("attachment") as HTMLInputElement;
		if (!attachElement) return;
		console.warn("FILES ARE: ", attachElement.files);

		if (attachElement.files) {
			attachFiles(attachElement.files);
		}
	};

	const addEmoji = (emoji: (typeof emojiData)[string]) => {
		setEmojiOpen(false);
		if (emoji && emoji.colons) {
			focus(() => {
				insertTextAtCursor(emoji.colons); // + "\u00A0"); <= that's a space
			});
		}
	};

	const handleClickEmojiButton = (event: React.SyntheticEvent) => {
		event.persist();
		setEmojiOpen(!emojiOpen);
		setEmojiMenuTarget(event.target);
		// this.focus();
		// event.stopPropagation();
	};

	const handleClickAtMentions = () => {
		if (currentPopup) {
			focus(() => {
				setInsertPrefix("");
				// insertTextAtCursor("", "@");
				hidePopup();
			});
		} else
			focus(() => {
				setInsertPrefix("@");
				// insertTextAtCursor("@");
				showPopupSelectors("", "at-mentions");
			});

		// this.insertTextAtCursor("@");
	};

	const { placeholder, text, __onDidRender } = props;

	__onDidRender &&
		__onDidRender({
			insertTextAtCursor: insertTextAtCursor,
			insertNewlineAtCursor: insertNewlineAtCursor,
			focus: focus,
		});

	return (
		<>
			<div
				className="message-input-wrapper"
				onKeyPress={handleKeyPress}
				onKeyDown={handleKeyDown}
				style={{ position: "relative" }}
			>
				{!isPreviewing && !isDropTarget && (
					<div key="message-attach-icons" className="message-attach-icons">
						<Icon
							data-testid="markdown-preview-icon"
							key="preview"
							name="markdown"
							title={
								<div style={{ textAlign: "center" }}>
									Click to Preview
									<div style={{ paddingTop: "5px" }}>
										<a href="https://www.markdownguide.org/cheat-sheet/">Markdown help</a>
									</div>
								</div>
							}
							placement="top"
							align={{ offset: [5, 0] }}
							delay={1}
							className={cx("preview", { hover: isPreviewing })}
							onClick={handleClickPreview}
						/>
						{derivedState.teammates?.length > 0 && (
							<Icon
								key="mention"
								name="mention"
								data-testid="mention-icon"
								title="Mention a teammate"
								placement="topRight"
								align={{ offset: [18, 0] }}
								delay={1}
								className={cx("mention", { hover: currentPopup === "at-mentions" })}
								onClick={handleClickAtMentions}
							/>
						)}
						<Icon
							key="smiley"
							name="smiley"
							data-testid="emoji-icon"
							title="Add an emoji"
							placement="topRight"
							align={{ offset: [9, 0] }}
							delay={1}
							className={cx("smiley", {
								hover: emojiOpen,
							})}
							onClick={handleClickEmojiButton}
						/>
						{emojiOpen && (
							<EmojiPicker addEmoji={addEmoji} target={emojiMenuTarget} autoFocus={true} />
						)}
						{derivedState.attachFilesEnabled && props.setAttachments && (
							<Tooltip
								title={
									<div style={{ maxWidth: "150px" }}>
										Attach files by dragging &amp; dropping, selecting, or pasting them.
									</div>
								}
								placement="topRight"
								align={{ offset: [20, 0] }}
								delay={1}
								trigger={["hover"]}
							>
								<span className="icon-wrapper">
									<input
										type="file"
										id="attachment"
										name="attachment"
										data-testid="file-attach-icon"
										multiple
										title=""
										onChange={handleChangeFiles}
										style={{
											top: 0,
											left: 0,
											width: "16px",
											height: "16px",
											position: "absolute",
											opacity: 0,
											zIndex: 5,
										}}
									/>
									<label htmlFor="attachment">
										<Icon
											key="paperclip"
											name="paperclip"
											className={cx("attach", { hover: attachOpen })}
										/>
									</label>
								</span>
							</Tooltip>
						)}
						{props.relatedCodemarkIds && derivedState.codemarks.length > 0 && (
							<Icon
								key="codestream"
								name="codestream"
								title="Add a related codemark"
								placement="top"
								align={{ offset: [5, 0] }}
								delay={1}
								className={cx("codestream", { hover: codemarkOpen })}
								onClick={handleClickCodemarkButton}
							/>
						)}
						{buildCodemarkMenu()}
						{props.withTags && (
							<Icon
								key="tag"
								name="tag"
								title="Add tags"
								placement="top"
								align={{ offset: [5, 0] }}
								delay={1}
								className={cx("tags", { hover: tagsOpen })}
								onClick={handleClickTagButton}
							/>
						)}
						{buildTagMenu()}
					</div>
				)}
				{isPreviewing && (
					<div
						data-testid="markdown-preview-text"
						className={cx("message-input preview", { "format-code": formatCode })}
					>
						{renderTextReplaceCodeBlocks()}
					</div>
				)}
				{derivedState.attachFilesEnabled && props.setAttachments && (
					<div className={cx("drop-target", { hover: isDropTarget })}>
						<span className="expand">Drop here</span>
					</div>
				)}
				<AtMentionsPopup
					on={currentPopup}
					childRef={textAreaRef}
					items={popupItems || emptyArray}
					prefix={popupPrefix}
					selected={selectedPopupItem}
					handleHoverAtMention={handleHoverAtMention}
					handleSelectAtMention={handleSelectAtMention}
				>
					<AutoHeightTextArea
						className={cx(
							"message-input",
							"hide-on-drop",
							btoa(unescape(encodeURIComponent(placeholder || ""))),
							{
								"format-code": formatCode,
								invisible: isDropTarget,
								hide: isPreviewing,
							}
						)}
						onDragEnter={handleDragEnter}
						onDrop={handleDrop}
						onDragLeave={handleDragLeave}
						id="input-div"
						onChange={handleChange}
						onBlur={handleBlur}
						onFocus={props.onFocus}
						value={text}
						placeholder={placeholder}
						ref={textAreaRef}
					/>
				</AtMentionsPopup>
			</div>
			{renderAttachedFiles()}
			{isPreviewing && renderExitPreview()}
		</>
	);
};
