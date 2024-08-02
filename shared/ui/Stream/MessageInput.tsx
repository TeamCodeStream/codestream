import cx from "classnames";
import React, { useCallback, useEffect, SyntheticEvent, useRef, useState } from "react";
import { shallowEqual } from "react-redux";
import { Attachment, CSMe } from "@codestream/protocols/api";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import {
	asPastedText,
	debounceAndCollectToAnimationFrame,
	Disposable,
	replaceHtml,
	emptyArray,
} from "../utils";
import { AtMentionsPopup, Mention } from "./AtMentionsPopup";
import EmojiPicker from "./EmojiPicker";
import Icon from "./Icon";
import {
	UploadFileRequest,
	UploadFileRequestType,
	UserSearchRequestType,
} from "@codestream/protocols/agent";
import { currentNrUserIdSelector } from "../store/users/reducer";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import Tooltip from "./Tooltip";
import { HostApi } from "../webview-api";
import { useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { AutoHeightTextArea } from "@codestream/webview/src/components/AutoHeightTextArea";
import { isEmpty as _isEmpty, debounce as _debounce } from "lodash-es";

const emojiData = require("../node_modules/markdown-it-emoji-mart/lib/data/full.json");

type FileAttachmentPair = {
	file: File;
	attachment: AttachmentField;
};

type PopupType = "at-mentions" | "emojis";

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
	multiCompose?: boolean;
	submitOnEnter?: boolean;
	placeholder?: string;
	suggestGrok?: boolean;
	onChange?(text: string, formatCode: boolean): void;
	onKeypress?(event: React.KeyboardEvent): void;
	onEmptyUpArrow?(event: React.KeyboardEvent): void;
	onDismiss?(): void;
	setIsPreviewing?(value: boolean): void;
	onSubmit?: (e: SyntheticEvent) => Promise<void>;
	onFocus?(): void;
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
		return {
			currentCsUserId: state.session.userId!,
			currentNrUserId: useAppSelector(currentNrUserIdSelector),
			isInVscode: state.ide.name === "VSC",
			currentUser: state.users[state.session.userId!] as CSMe,
			attachFilesEnabled: isFeatureEnabled(state, "fileUploads"),
		};
	}, shallowEqual);

	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	const disposables: Disposable[] = [];
	const [emojiOpen, setEmojiOpen] = useState(false);
	const [attachOpen, setAttachOpen] = useState(false);
	const [formatCode, setFormatCode] = useState(false);
	const [insertPrefix, setInsertPrefix] = useState("");
	const [isDropTarget, setIsDropTarget] = useState(false);
	const [isPasteEvent, setIsPasteEvent] = useState(false);
	const [currentPopup, setCurrentPopup] = useState<PopupType>();
	const [popupIndex, setPopupIndex] = useState<number>();
	const [popupItems, setPopupItems] = useState<Mention[]>();
	const [selectedPopupItem, setSelectedPopupItem] = useState<string>();
	const [popupPrefix, setPopupPrefix] = useState<string>();
	const [emojiMenuTarget, setEmojiMenuTarget] = useState<EventTarget>();

	function onChangeWrapper(text: string, formatCode: boolean) {
		if (!props.onChange) return;
		if (isPasteEvent) {
			text = text.replace(/```\s*?```/g, "```");
			text = text.replace(/```(\s*?(<div>|<\/div>)+\s*?)*?```/g, "```");
		}

		text = text.replace(/@([^|]+)\|(\d+|\w+)\|/g, "@$1");
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
		let sel, range;
		sel = window.getSelection();

		// if for some crazy reason we can't find a selection, return
		// to avoid an error.
		// https://stackoverflow.com/questions/22935320/uncaught-indexsizeerror-failed-to-execute-getrangeat-on-selection-0-is-not
		if (sel.rangeCount == 0) return;

		range = sel.getRangeAt(0);

		// delete the X characters before the caret
		range.setStart(range.commonAncestorContainer, range.startOffset);

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
			sel.modify("move", "backward", "character");
			sel.modify("move", "forward", "character");

			onChangeWrapper(textAreaRef.current.value, formatCode);
		}
	};

	const replaceAttachment = (attachment, index) => {
		attachment = { ...attachment, mimetype: attachment.type || attachment.mimetype };
		const { attachments = [] } = props;
		let newAttachments = [...attachments];
		newAttachments.splice(index, 1, attachment);
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
				attachment.status = "error";
				attachment.error = e;
				replaceAttachment(file, index);
			}
			index++;
		}
	};

	function hidePopup() {
		setCurrentPopup(undefined);
		setInsertPrefix("");
		KeystrokeDispatcher.levelDown();
	}

	const hideEmojiPicker = () => {
		setEmojiOpen(false);
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

		hidePopup();

		if (id === "__close") return;

		if (currentPopup === "emojis") {
			toInsert = id + ":\u00A0";
		} else {
			const user = popupItems?.find(t => t.id === id);
			if (!user) return;
			if (user.id && user?.id?.toLowerCase() === "ai") {
				toInsert = user.description + "\u00A0";
			} else {
				toInsert = user.description + `|${id}|` + "\u00A0";
			}
		}

		focus();

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
			else if (attachOpen) hideFilePicker();
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
				const { onSubmit } = props;
				onSubmit && onSubmit(event);
			}
		}
	};

	// set up the parameters to pass to the at mention popup
	async function showPopupSelectors(prefix: string, type: PopupType) {
		const itemsToShow: Mention[] = [];
		KeystrokeDispatcher.levelUp();

		const normalizedPrefix = prefix ? prefix.toLowerCase() : prefix;

		if (type === "at-mentions") {
			if (normalizedPrefix.length > 2 || normalizedPrefix === "ai") {
				setPopupPrefix(prefix);
			}
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
	}

	const fetchTeammates = async (prefix: string) => {
		HostApi.instance.send(UserSearchRequestType, { query: prefix }).then(response => {
			const users: Mention[] = response.users.map(user => {
				return {
					id: user.id?.toString(),
					headshot: { email: user.email, name: user.name },
					description: user.name,
					identifier: user.email,
				};
			});

			setCurrentPopup("at-mentions");
			setPopupPrefix(prefix);
			setPopupItems(users);
			setPopupIndex(0);
			if (!_isEmpty(users) && users[0].id) {
				setSelectedPopupItem(users[0].id);
			}
		});
	};

	const debouncedFetchTeammates = useCallback(
		_debounce(prefix => {
			fetchTeammates(prefix);
		}, 250),
		[]
	);

	useEffect(() => {
		if (!_isEmpty(popupPrefix)) {
			if (popupPrefix === "ai") {
				setCurrentPopup("at-mentions");
				setPopupPrefix(popupPrefix);
				setPopupItems([
					{
						id: "AI",
						headshot: { name: "AI" },
						description: "AI",
						identifier: "AI",
					},
				]);
				setPopupIndex(0);
				setSelectedPopupItem("AI");
			} else {
				debouncedFetchTeammates(popupPrefix);
			}
		}
	}, [popupPrefix, debouncedFetchTeammates]);

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
		} else if (
			event.charCode === 13 &&
			!event.shiftKey &&
			(event.ctrlKey || event.metaKey || !multiCompose)
		) {
			event.preventDefault();
			const { onSubmit } = props;
			onSubmit && onSubmit(event);
		} else if (event.key == "Escape" && multiCompose && props.onDismiss) {
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

	const handleDragEnter = () => setIsDropTarget(true);
	const handleDragLeave = () => setIsDropTarget(false);
	const handleDrop = e => {
		setIsDropTarget(false);
		e.preventDefault();

		attachFiles(e.dataTransfer.files);
	};

	// depending on the contents of the input field, if the user
	// types a "@" then open the at-mention popup
	const handleChange = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
		if (!(event.target instanceof HTMLTextAreaElement)) return;
		const newPostText = event.target.value;

		const upToCursor = newPostText.substring(0, event.target.selectionStart);
		const peopleMatch = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_.+]*)$/);
		const emojiMatch = upToCursor.match(/(?:^|\s):([a-z+_]*)$/);
		if (currentPopup === "at-mentions") {
			if (peopleMatch) {
				showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			} else {
				// if the line doesn't end with @word, then hide the popup
				hidePopup();
			}
		} else if (currentPopup === "emojis") {
			if (emojiMatch) {
				showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
			} else {
				// if the line doesn't look like :word, then hide the popup
				hidePopup();
			}
		} else {
			if (peopleMatch) showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			if (emojiMatch) showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
		}

		// track newPostText as the user types
		if (textAreaRef?.current) {
			onChangeWrapper(textAreaRef?.current?.value, formatCode);
		}
	};

	useDidMount(() => {
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
	});

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
				insertTextAtCursor(emoji.colons);
			});
		}
	};

	const handleClickEmojiButton = (event: React.SyntheticEvent) => {
		event.persist();
		setEmojiOpen(!emojiOpen);
		setEmojiMenuTarget(event.target);
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
				{!isDropTarget && (
					<div key="message-attach-icons" className="message-attach-icons">
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
					prefix={popupPrefix}
					items={popupItems || emptyArray}
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
							}
						)}
						onDragEnter={handleDragEnter}
						onDrop={handleDrop}
						onDragLeave={handleDragLeave}
						id="input-div"
						onChange={handleChange}
						onFocus={props.onFocus}
						value={text}
						placeholder={placeholder}
						ref={textAreaRef}
					/>
				</AtMentionsPopup>
			</div>
			{renderAttachedFiles()}
		</>
	);
};
