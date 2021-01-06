import cx from "classnames";
import React from "react";
import { connect } from "react-redux";
import ContentEditable from "react-contenteditable";
import * as codemarkSelectors from "../store/codemarks/reducer";
import * as actions from "./actions";
const emojiData = require("../node_modules/markdown-it-emoji-mart/lib/data/full.json");
import { CSChannelStream, CSPost, CSUser, CSTeam, CSTag, CSMe } from "@codestream/protocols/api";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import {
	createRange,
	getCurrentCursorPosition,
	debounceAndCollectToAnimationFrame,
	emptyArray,
	replaceHtml,
	asPastedText,
	lightOrDark
} from "../utils";
import { AtMentionsPopup } from "./AtMentionsPopup";
import EmojiPicker from "./EmojiPicker";
import Menu from "./Menu";
import Button from "./Button";
import Icon from "./Icon";
import { confirmPopup } from "./Confirm";
import { CodemarkPlus } from "@codestream/protocols/agent";
import { CodeStreamState } from "../store";
import { getTeamTagsArray, getTeamMembers, getUsernames } from "../store/users/reducer";
// import { getChannelStreamsForTeam } from "../store/streams/reducer";
import { ServicesState } from "../store/services/types";
import { MarkdownText } from "./MarkdownText";

import { getProviderPullRequestCollaborators } from "../store/providerPullRequests/reducer";
import Tooltip from "./Tooltip";

type PopupType = "at-mentions" | "slash-commands" | "channels" | "emojis";

type QuotePost = CSPost & { author: { username: string } };

const tuple = <T extends string[]>(...args: T) => args;

const COLOR_OPTIONS = tuple("blue", "green", "yellow", "orange", "red", "purple", "aqua", "gray");

interface State {
	emojiOpen: boolean;
	codemarkOpen: boolean;
	tagsOpen: false | "select" | "edit" | "create";
	attachOpen: boolean;
	cursorPosition?: any;
	currentPopup?: PopupType;
	popupPrefix?: string;
	popupItems?: any[];
	popupIndex?: number;
	selectedPopupItem?: string;
	emojiMenuTarget?: any;
	codemarkMenuTarget?: any;
	tagsMenuTarget?: any;
	attachMenuTarget?: any;
	editingTag?: any;
	customColor?: string;
	q?: string;
	codemarkMenuStart?: number;
	formatCode: boolean;
	insertPrefix: string;
	isPreviewing: boolean;
	isDropTarget: boolean;
}

interface ConnectedProps {
	isInVscode: boolean;
	currentUser: CSMe;
	currentTeam: CSTeam;
	codemarks: CodemarkPlus[];
	teammates: CSUser[];
	currentUserId: string;
	teamTags: CSTag[];
	// channelStreams: CSChannelStream[];
	services: ServicesState;
	usernames: string[];
	attachFilesEnabled: boolean;
}

interface Props extends ConnectedProps {
	text: string;
	withTags?: boolean;
	teamProvider?: "codestream" | "slack" | "msteams" | string;
	isDirectMessage?: boolean;
	multiCompose?: boolean;
	submitOnEnter?: boolean;
	placeholder?: string;
	quotePost?: QuotePost;
	shouldShowRelatableCodemark?(codemark: CodemarkPlus): boolean;
	onChange?(text: string, formatCode: boolean): any;
	onKeypress?(event: React.KeyboardEvent): any;
	updateTeamTag?(team: any, tag: any): any;
	onChangeSelectedTags?(tag: any): any;
	onEmptyUpArrow?(event: React.KeyboardEvent): any;
	onDismiss?(): any;
	setIsPreviewing?(value: boolean): any;
	onSubmit?: any;
	onFocus?: any;
	selectedTags?: any;
	toggleTag?: Function;
	relatedCodemarkIds?: any;
	toggleCodemark?: Function;
	attachFiles?: Function;
	autoFocus?: boolean;
	className?: string;
	renderCodeBlock?(index: number, force: boolean): React.ReactNode | null;
	renderCodeBlocks?(): React.ReactNode | null;
	__onDidRender?(stuff: { [key: string]: any }): any; // HACKy: sneaking internals to parent
	onPaste?(e: ClipboardEvent): void;
}

export class MessageInput extends React.Component<Props, State> {
	_contentEditable?: { htmlEl: HTMLElement };
	disposables: { dispose(): any }[] = [];

	constructor(props: Props) {
		super(props);
		this.state = {
			emojiOpen: false,
			codemarkOpen: false,
			tagsOpen: false,
			attachOpen: false,
			customColor: "",
			codemarkMenuStart: 0,
			formatCode: false,
			insertPrefix: "",
			isPreviewing: false,
			isDropTarget: false
		};
	}

	componentDidMount() {
		if (this.props.quotePost) {
			this.quotePost();
		}
		// so that HTML doesn't get pasted into the input field. without this,
		// HTML would be rendered as HTML when pasted
		if (this._contentEditable) {
			this._contentEditable.htmlEl.addEventListener("paste", e => {
				e.preventDefault();
				let text = e.clipboardData!.getData("text/plain");
				text = asPastedText(text);
				document.execCommand("insertText", false, text);
				// const text = e.clipboardData!.getData("text/plain");
				// document.execCommand("insertHTML", false, text.replace(/\n/g, "<br>"));
				if (this.props.onPaste) {
					this.props.onPaste(e);
				}
			});
			this.disposables.push(
				KeystrokeDispatcher.onKeyDown(
					"Escape",
					event => {
						if (event.key === "Escape" && event.target.id !== "input-div") {
							this.handleKeyDown(event);
						}
					},
					{ source: "MessageInput.tsx", level: -1 }
				)
			);
		}

		const text = this.props.text;
		if (text !== "") {
			const position = this.setCurrentCursorPosition(text.length);
			if (position) {
				this.setState({
					cursorPosition: position
				});
			}
		}

		if (this.props.autoFocus && this._contentEditable) {
			this._contentEditable.htmlEl.focus();
		}
	}

	componentDidUpdate(prevProps: Props) {
		if (
			(this.props.quotePost && !prevProps.quotePost) ||
			(this.props.quotePost &&
				prevProps.quotePost &&
				this.props.quotePost.id !== prevProps.quotePost.id)
		) {
			this.quotePost();
		}
	}

	componentWillUnmount() {
		this.disposables.forEach(d => d.dispose());
	}

	quotePost() {
		if (this._contentEditable) {
			this._contentEditable.htmlEl.innerHTML = "";
			this.props.onChange && this.props.onChange("", false);
		}
		this.focus(() => {
			const post = this.props.quotePost!;
			this.insertTextAtCursor("@" + post.author.username + " said:");
			this.insertNewlineAtCursor();
			this.insertTextAtCursor(">" + post.text);
			this.insertNewlineAtCursor();
		});
	}

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

	hidePopup() {
		this.setState({ currentPopup: undefined, insertPrefix: "" });
		KeystrokeDispatcher.levelDown();
	}

	hideEmojiPicker = () => {
		this.setState({ emojiOpen: false });
		KeystrokeDispatcher.levelDown();
	};

	hideCodemarkPicker = () => {
		this.setState({ codemarkOpen: false });
		KeystrokeDispatcher.levelDown();
	};

	hideTagsPicker = () => {
		this.setState({ tagsOpen: false, q: "" });
		KeystrokeDispatcher.levelDown();
	};

	hideFilePicker = () => {
		this.setState({ attachOpen: false });
		KeystrokeDispatcher.levelDown();
	};

	addEmoji = (emoji: typeof emojiData[string]) => {
		this.setState({ emojiOpen: false });
		if (emoji && emoji.colons) {
			this.focus(() => {
				this.setCurrentCursorPosition(this.state.cursorPosition);
				this.insertTextAtCursor(emoji.colons); // + "\u00A0"); <= that's a space
			});
		}
	};

	// https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
	setCurrentCursorPosition = chars => {
		if (!this._contentEditable) return;

		if (this._contentEditable.htmlEl.innerHTML === "") {
			return;
		}
		if (chars < 0) chars = 0;

		const inputDiv = document.getElementById("input-div");
		if (inputDiv) {
			inputDiv.focus();
			const selection = window.getSelection()!;
			const range = createRange(inputDiv, { count: chars });

			if (range) {
				range.collapse(false);
				selection.removeAllRanges();
				selection.addRange(range);
				return (inputDiv.textContent && inputDiv.textContent.length) || 0;
			}
		}
		return 0;
	};

	// set up the parameters to pass to the at mention popup
	showPopupSelectors(prefix: string, type: PopupType) {
		const itemsToShow: {
			id?: string;
			headshot?: CSUser;
			identifier?: string;
			description?: string;
		}[] = [];
		KeystrokeDispatcher.levelUp();

		const normalizedPrefix = prefix ? prefix.toLowerCase() : prefix;

		if (type === "at-mentions") {
			const { teammates } = this.props; //.teammates.filter(({ id }) => id !== this.props.currentUserId);

			Object.values(teammates).forEach(person => {
				const toMatch = `${person.fullName}*${person.username}`.toLowerCase();
				if (toMatch.indexOf(normalizedPrefix) !== -1) {
					const you = person.id === this.props.currentUserId ? " (you)" : "";
					let description = person.fullName || person.email;
					if (description) {
						description += you;
					}
					itemsToShow.push({
						id: person.id,
						headshot: person,
						identifier: person.username || person.email,
						description: description
					});
				}
			});
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
					description: "Matching Emoji. Type 2 or more characters"
				});
			}
		}

		if (itemsToShow.length === 0) {
			this.hidePopup();
		} else {
			const selected = itemsToShow[0].id;

			this.setState({
				currentPopup: type,
				popupPrefix: prefix,
				popupItems: itemsToShow,
				popupIndex: 0,
				selectedPopupItem: selected
			});
		}
	}

	// when the input field loses focus, one thing we want to do is
	// to hide the at-mention popup
	handleBlur = (event: React.SyntheticEvent) => {
		// event.preventDefault();
		// turned off because of bad interaction with trying to control when the popup
		// opens/closes explicitly, for example with the @ icon in the messageinput
		// this.hidePopup();
	};

	handleClick = event => {
		this.setState({
			cursorPosition: getCurrentCursorPosition("input-div")
		});
	};

	// depending on the contents of the input field, if the user
	// types a "@" then open the at-mention popup
	handleChange = (event: React.SyntheticEvent) => {
		const newPostText = (event.target as any).value;

		const selection = window.getSelection()!;
		const range = selection.getRangeAt(0);
		const node = range.commonAncestorContainer;
		const nodeText = node.textContent || "";
		const upToCursor = nodeText.substring(0, range.startOffset);
		const peopleMatch = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_.+]*)$/);
		// const channelMatch = upToCursor.match(/(?:^|\s)#([a-zA-Z0-9_.+]*)$/);
		const emojiMatch = upToCursor.match(/(?:^|\s):([a-z+_]*)$/);
		const slashMatch = newPostText.match(/^\/([a-zA-Z0-9+]*)$/);
		if (this.state.currentPopup === "at-mentions") {
			if (peopleMatch) {
				this.showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			} else {
				// if the line doesn't end with @word, then hide the popup
				this.hidePopup();
			}
		} else if (this.state.currentPopup === "slash-commands") {
			if (slashMatch) {
				this.showPopupSelectors(slashMatch[0].replace(/\//, ""), "slash-commands");
			} else {
				// if the line doesn't start with /word, then hide the popup
				this.hidePopup();
			}
			// } else if (this.state.currentPopup === "channels") {
			// 	if (channelMatch) {
			// 		this.showPopupSelectors(channelMatch[1].replace(/#/, ""), "channels");
			// 	} else {
			// 		// if the line doesn't end with #word, then hide the popup
			// 		this.hidePopup();
			// 	}
		} else if (this.state.currentPopup === "emojis") {
			if (emojiMatch) {
				this.showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
			} else {
				// if the line doesn't look like :word, then hide the popup
				this.hidePopup();
			}
		} else {
			if (peopleMatch) this.showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			if (slashMatch && !this.props.multiCompose) {
				this.showPopupSelectors(slashMatch[0].replace(/\//, ""), "slash-commands");
			}
			// if (channelMatch) this.showPopupSelectors(channelMatch[1].replace(/#/, ""), "channels");
			if (emojiMatch) this.showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
		}

		// track newPostText as the user types
		this.props.onChange &&
			this.props.onChange(this._contentEditable!.htmlEl.innerHTML, this.state.formatCode);
		this.setState({
			// autoMentions: this.state.autoMentions.filter(mention => newPostText.includes(mention)), // TODO
			cursorPosition: getCurrentCursorPosition("input-div")
		});
	};

	handleSelectAtMention = (id?: string) => {
		// if no id is passed, we assume that we're selecting
		// the currently-selected at mention
		if (!id) id = this.state.selectedPopupItem;

		let toInsert;
		const toInsertPostfix = "";

		this.hidePopup();

		if (id === "__close") return;

		if (this.state.currentPopup === "slash-commands") {
			toInsert = id + "\u00A0";
			// } else if (this.state.currentPopup === "channels") {
			// 	toInsert = id + "\u00A0";
		} else if (this.state.currentPopup === "emojis") {
			toInsert = id + ":\u00A0";
		} else {
			const user = this.props.teammates.find(t => t.id === id);
			if (!user) return;
			toInsert = user.username + "\u00A0";
		}
		// setTimeout(() => {
		this.focus();
		// }, 20);
		// the reason for this unicode space is that chrome will
		// not render a space at the end of a contenteditable div
		// unless it is a &nbsp;, which is difficult to insert
		// so we insert this unicode character instead
		this.insertTextAtCursor(this.state.insertPrefix + toInsert, this.state.popupPrefix);
		this.setState({ insertPrefix: "" });
	};

	// insert the given text at the cursor of the input field
	// after first deleting the text in toDelete
	insertTextAtCursor = (text: string, toDelete: string = "") => {
		if (this.state.isPreviewing) return;

		if (!this._contentEditable) return;
		if (document.activeElement !== this._contentEditable.htmlEl)
			this._contentEditable.htmlEl.focus();

		let sel, range;
		sel = window.getSelection();

		// if for some crazy reason we can't find a selection, return
		// to avoid an error.
		// https://stackoverflow.com/questions/22935320/uncaught-indexsizeerror-failed-to-execute-getrangeat-on-selection-0-is-not
		if (sel.rangeCount == 0) return;

		range = sel.getRangeAt(0);

		// delete the X characters before the caret
		range.setStart(range.commonAncestorContainer, range.startOffset - toDelete.length);
		// range.moveEnd("character", toDelete.length);

		range.deleteContents();
		const textNode = document.createTextNode(text);
		range.insertNode(textNode);
		range.setStartAfter(textNode);
		sel.removeAllRanges();
		sel.addRange(range);
		if (this._contentEditable) {
			this._contentEditable.htmlEl.normalize();
			// sel.collapse(textNode);
			sel.modify("move", "backward", "character");
			sel.modify("move", "forward", "character");
			// window.getSelection().empty();
			// this.focus();

			this.props.onChange &&
				this.props.onChange(this._contentEditable!.htmlEl.innerHTML, this.state.formatCode);
			this.setState({
				cursorPosition: getCurrentCursorPosition("input-div")
			});
		}
	};

	insertNewlineAtCursor = () => {
		if (this.state.isPreviewing) return;

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
		if (this._contentEditable) {
			this._contentEditable.htmlEl.normalize();
			// sel.collapse(textNode);
			sel.modify("move", "backward", "character");
			sel.modify("move", "forward", "character");
			// window.getSelection().empty();
			// this.focus();

			this.props.onChange &&
				this.props.onChange(this._contentEditable.htmlEl.innerHTML, this.state.formatCode);
			this.setState({
				cursorPosition: getCurrentCursorPosition("input-div")
			});
		}
	};

	// this is asynchronous so callers should provide a callback for code that depends on the completion of this
	focus = debounceAndCollectToAnimationFrame((...cbs: Function[]) => {
		if (this._contentEditable) {
			this._contentEditable.htmlEl.focus();
			this._contentEditable.htmlEl.scrollIntoView({
				behavior: "smooth"
			});
		}
		cbs.forEach(cb => cb.apply(undefined));
	});

	handleKeyPress = (event: React.KeyboardEvent) => {
		const newPostText = this.props.text;
		const { currentPopup } = this.state;
		const multiCompose = this.props.multiCompose;

		// if we have the at-mentions popup open, then the keys
		// do something different than if we have the focus in
		// the textarea
		if (currentPopup) {
			if (event.key == "Escape") {
				this.hidePopup();
			} else if ((event.key == "Enter" || event.which === 13) && !event.shiftKey) {
				event.preventDefault();
				this.handleSelectAtMention();
			}
		} else if (event.key === "@") {
			this.showPopupSelectors("", "at-mentions");
		} else if (event.key === ":") {
			this.showPopupSelectors("", "emojis");
		} else if (!multiCompose && event.key === "/" && newPostText.length === 0) {
			this.showPopupSelectors("", "slash-commands");
			// } else if (event.key === "#") {
			// 	this.showPopupSelectors("", "channels");
		} else if (
			event.charCode === 13 &&
			!event.shiftKey &&
			(event.ctrlKey || event.metaKey || !multiCompose)
		) {
			event.preventDefault();
			this.setIsPreviewing(false);
			const { onSubmit } = this.props;
			onSubmit && onSubmit();
		} else if (event.key == "Escape" && multiCompose && this.props.onDismiss) {
			this.setIsPreviewing(false);
			this.props.onDismiss();
		}

		if (this.props.onKeypress) this.props.onKeypress(event);
	};

	// the keypress handler for tracking up and down arrow
	// and enter, while the at mention popup is open
	handleAtMentionKeyPress(event: React.KeyboardEvent, eventType: string) {
		event.preventDefault();
		if (eventType == "escape") {
			if (this.state.currentPopup) this.hidePopup();
			else if (this.state.emojiOpen) this.hideEmojiPicker();
			else if (this.state.codemarkOpen) this.hideCodemarkPicker();
			else if (this.state.tagsOpen) this.hideTagsPicker();
			else if (this.state.attachOpen) this.hideFilePicker();
			// else this.handleDismissThread();
		} else {
			let newIndex = 0;
			if (eventType == "down") {
				if (this.state.popupIndex! < this.state.popupItems!.length - 1) {
					newIndex = this.state.popupIndex! + 1;
				} else {
					newIndex = 0;
				}
			} else if (eventType == "up") {
				if (this.state.popupIndex == 0) {
					newIndex = this.state.popupItems!.length - 1;
				} else {
					newIndex = this.state.popupIndex! - 1;
				}
			} else if (eventType == "tab") {
				this.handleSelectAtMention();
			}
			this.setState({
				popupIndex: newIndex,
				selectedPopupItem: this.state.popupItems![newIndex].id
			});
		}
	}

	handleKeyDown = (event: React.KeyboardEvent) => {
		const multiCompose = this.props.multiCompose;

		if (this.state.currentPopup) {
			if (event.key === "ArrowUp" || event.which === 38) {
				event.stopPropagation();
				this.handleAtMentionKeyPress(event, "up");
			}
			if (event.key === "ArrowDown" || event.which === 40)
				this.handleAtMentionKeyPress(event, "down");
			if (event.key === "Tab") this.handleAtMentionKeyPress(event, "tab");
			if (event.key === "Escape") {
				this.hidePopup();
				event.stopPropagation();
			}
		} else if (this.state.emojiOpen) {
			if (event.key === "Escape") {
				this.hideEmojiPicker();
				event.stopPropagation();
			}
		} else if (this.state.codemarkOpen) {
			if (event.key === "Escape") {
				this.hideCodemarkPicker();
				event.stopPropagation();
			}
		} else if (this.state.tagsOpen) {
			if (event.key === "Escape") {
				this.hideTagsPicker();
				event.stopPropagation();
			}
		} else if (this.state.attachOpen) {
			if (event.key === "Escape") {
				this.hideFilePicker();
				event.stopPropagation();
			}
		} else {
			if (event.key == "Escape" && multiCompose && this.props.onDismiss) {
				this.props.onDismiss();
			} else if ((event.key === "Enter" || event.which === 13) && event.metaKey && multiCompose) {
				// command-enter should submit for multiCompose
				event.preventDefault();
				this.setIsPreviewing(false);
				const { onSubmit } = this.props;
				onSubmit && onSubmit();
			}
		}
	};

	handleHoverAtMention = id => {
		const index = this.state.popupItems!.findIndex(x => x.id == id);

		this.setState({
			popupIndex: index,
			selectedPopupItem: id
		});
	};

	handleClickEmojiButton = (event: React.SyntheticEvent) => {
		event.persist();
		this.setState(state => ({ emojiOpen: !state.emojiOpen, emojiMenuTarget: event.target }));
		// this.focus();
		// event.stopPropagation();
	};

	handleClickCodemarkButton = (event: React.SyntheticEvent) => {
		event.persist();
		this.setState(state => ({
			codemarkOpen: !state.codemarkOpen,
			codemarkMenuTarget: event.target
		}));
	};

	codemarkMenuAction = action => {
		if (!action) this.setState({ codemarkOpen: false });

		switch (action) {
			case "search":
				return;
			case "more":
				return; // FIXME load more codemarks
			default:
				if (action && this.props.toggleCodemark) {
					const codemark = this.props.codemarks.find(codemark => codemark.id === action);
					this.props.toggleCodemark(codemark);
				}
		}
	};

	handleChangeFiles = () => {
		if (!this.props.attachFiles) return;
		const attachElement = document.getElementById("attachment") as HTMLInputElement;
		if (!attachElement) return;
		console.warn("FILES ARE: ", attachElement.files);

		this.props.attachFiles(attachElement.files);
	};

	buildCodemarkMenu = () => {
		if (!this.state.codemarkOpen) return null;

		let menuItems: any = [
			{ type: "search", placeholder: "Search codemarks...", action: "search" },
			{ label: "-" }
		];

		const { codemarks = [] } = this.props;
		if (codemarks.length === 0) return null;

		menuItems = menuItems.concat(
			codemarks
				.sort((a, b) => b.createdAt - a.createdAt)
				.map(codemark => {
					if (codemark.deactivated) return null;
					if (
						this.props.shouldShowRelatableCodemark &&
						!this.props.shouldShowRelatableCodemark(codemark)
					)
						return null;

					const title = codemark.title || codemark.text;
					const icon = this.props.relatedCodemarkIds[codemark.id] ? (
						<Icon style={{ margin: "0 2px 0 2px" }} name="check" />
					) : (
						<Icon
							name={codemark.type || "comment"}
							className={`${codemark.color}-color type-icon`}
						/>
					);
					const file = codemark.markers && codemark.markers[0] && codemark.markers[0].file;
					return {
						icon: icon,
						label: (
							<span className={this.props.relatedCodemarkIds[codemark.id] ? "menu-selected" : ""}>
								&nbsp;{title}&nbsp;&nbsp;<span className="codemark-file">{file}</span>
							</span>
						),
						searchLabel: title || "",
						action: codemark.id
					};
				})
				.filter(Boolean)
		);
		// menuItems = menuItems.concat({ label: "-" }, { label: "Show More...", action: "more" });
		return (
			<Menu
				title="Add Codemark"
				items={menuItems}
				action={this.codemarkMenuAction}
				target={this.state.codemarkMenuTarget}
			/>
		);
	};

	handleClickTagButton = (event: React.SyntheticEvent) => {
		event.persist();
		this.setState(state => ({
			tagsOpen: "select",
			tagsMenuTarget: event.target
		}));
	};

	handleClickAttachButton = (event: React.SyntheticEvent) => {
		event.persist();
		this.setState(state => ({
			attachOpen: true,
			attachMenuTarget: event.target
		}));
	};

	tagsMenuAction = action => {
		switch (action) {
			case "search":
			case "noop":
				return;
			case "create":
				this.setState({ tagsOpen: "create", editingTag: { label: this.state.q, color: "blue" } });
				break;
			default:
				if (this.props.toggleTag) this.props.toggleTag(action);
		}
		if (!action) this.setState({ tagsOpen: false, editingTag: null });
	};

	buildTagMenu = () => {
		switch (this.state.tagsOpen) {
			case "select":
				return this.buildSelectTagMenu();
			case "edit":
				return this.buildEditTagMenu();
			case "create":
				// this.setState({ editingTag: null });
				return this.buildEditTagMenu();
			default:
				return null;
		}
	};

	saveTag = () => {
		const { updateTeamTag, currentTeam } = this.props;

		if (updateTeamTag) updateTeamTag(currentTeam, this.state.editingTag);

		// hide the tags picker and re-open the tags selection menu
		this.hideTagsPicker();
		// i have no idea why the following code needs to be done after a delay.
		// otherwise what ends up happening is you get a double-menu -Pez
		setTimeout(() => {
			this.setState({ tagsOpen: "select" });
		}, 1);
	};

	deleteTag = () => {
		if (!this.state.editingTag.id) {
			this.setState({ editingTag: null });
			this.hideTagsPicker();
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
						if (this.props.updateTeamTag)
							this.props.updateTeamTag(this.props.currentTeam, {
								...this.state.editingTag,
								deactivated: true
							});
						this.setState({ editingTag: null });
						this.hideTagsPicker();
					}
				},
				{ label: "Cancel" }
			]
		});
	};

	findTag = tagId => {
		return this.props.teamTags.find(tag => {
			return tag.id === tagId;
		});
	};

	setEditingTagColor = color => {
		let { editingTag } = this.state;
		editingTag.color = color;
		this.setState({ editingTag });
	};

	setEditingTagLabel = label => {
		let { editingTag } = this.state;
		editingTag.label = label;
		this.setState({ editingTag });
	};

	buildEditTagMenu = () => {
		let { editingTag } = this.state;
		if (!editingTag) editingTag = { label: "", color: "blue" };

		let body = (
			<div>
				<input
					type="text"
					value={editingTag.label || ""}
					placeholder="Tag Name"
					onChange={e => {
						this.setEditingTagLabel(e.target.value);
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
						whiteSpace: "normal"
					}}
				>
					{COLOR_OPTIONS.map(color => {
						return (
							<span
								className={`${color}-background tag-edit-block`}
								onClick={e => this.setEditingTagColor(color)}
							>
								{editingTag.color === color && <Icon name="check" className="check" />}
							</span>
						);
					})}
					<div className="tag-edit-block" style={{ backgroundColor: this.state.customColor }}>
						{editingTag.color === this.state.customColor ? (
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
								right: 0
							}}
							type="color"
							className={`custom-tag-edit-block`}
							value={this.state.customColor}
							onChange={e => {
								this.setState({ customColor: e.target.value });
								this.setEditingTagColor(e.target.value);
							}}
						/>
					</div>
				</div>
			</div>
		);
		let body2 = (
			<div className="button-row">
				<Button className="control-button" onClick={this.saveTag}>
					Save
				</Button>
				<Button className="control-button delete" onClick={this.deleteTag}>
					Delete
				</Button>
			</div>
		);

		const items = [
			{ label: body, noHover: true, action: "noop" },
			{ label: "-" },
			{ label: body2, noHover: true, action: "noop" }
		];

		return (
			<Menu
				title={editingTag.id ? "Edit Tag" : "Add Tag"}
				items={items}
				action={this.tagsMenuAction}
				target={this.state.tagsMenuTarget}
			/>
		);
	};

	buildSelectTagMenu = () => {
		const { teamTags } = this.props;
		if (!teamTags) return null;

		let menuItems: any = [
			{ type: "search", placeholder: "Search tags...", action: "search" },
			{ label: "-" }
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
								{this.props.selectedTags[tag.id!] && <span className="check">✔</span>}
							</span>
							<Icon
								name="pencil"
								className="edit"
								onClick={e => {
									this.setState({ tagsOpen: "edit", editingTag: { ...tag } });
									e.preventDefault();
									e.stopPropagation();
								}}
							/>
						</span>
					),
					customHover: true,
					searchLabel: tag.label || tag.color,
					action: tag.id
				};
			})
		);
		menuItems = menuItems.concat({ label: "-" }, { label: "Create a New Tag", action: "create" });
		return (
			<Menu
				title="Tags"
				items={menuItems}
				action={this.tagsMenuAction}
				target={this.state.tagsMenuTarget}
				onChangeSearch={q => this.setState({ q })}
			/>
		);
	};

	setIsPreviewing = value => {
		this.setState({ isPreviewing: value });
		if (this.props.setIsPreviewing) this.props.setIsPreviewing(value);
	};

	handleClickPreview = () => {
		this.setIsPreviewing(!this.state.isPreviewing);
		this.focus();
	};

	handleClickAtMentions = () => {
		if (this.state.currentPopup) {
			this.focus(() => {
				this.setState({ insertPrefix: "" });
				this.setCurrentCursorPosition(this.state.cursorPosition);
				// this.insertTextAtCursor("", "@");
				this.hidePopup();
			});
		} else
			this.focus(() => {
				this.setState({ insertPrefix: "@" });
				this.setCurrentCursorPosition(this.state.cursorPosition);
				// this.insertTextAtCursor("@");
				this.showPopupSelectors("", "at-mentions");
			});

		// this.insertTextAtCursor("@");
	};

	handleClickFormatCode = () => {
		const formatCode = !this.state.formatCode;
		this.focus(() => {
			this.setCurrentCursorPosition(this.state.cursorPosition);
			this.setState({ formatCode });
			this.props.onChange &&
				this.props.onChange(this._contentEditable!.htmlEl.innerHTML, formatCode);
		});
	};

	renderTextReplaceCodeBlocks = (text: string) => {
		if (!this.props.renderCodeBlock) return <MarkdownText text={text} inline={false} />;

		const blocks: any[] = [];
		const groups = text.split(/\[#(\d+)]/);
		let index = 0;
		while (index < groups.length) {
			blocks.push(<MarkdownText text={groups[index]} inline={false} />);
			if (index + 1 < groups.length) {
				const markerIndex = parseInt(groups[index + 1], 10);
				if (markerIndex > 0) {
					blocks.push(this.props.renderCodeBlock(markerIndex - 1, true));
				}
			}
			index += 2;
		}
		if (this.props.renderCodeBlocks) blocks.push(this.props.renderCodeBlocks());
		return <>{blocks}</>;
	};

	renderExitPreview = () => {
		return (
			<div className="button-group float-wrap">
				<Button
					type="submit"
					className="control-button"
					style={{ width: "100px" }}
					onClick={e => {
						this.setIsPreviewing(false);
						this.focus();
					}}
				>
					Exit Preview
				</Button>
			</div>
		);
	};

	handleDragEnter = () => this.setState({ isDropTarget: true });
	handleDragLeave = () => this.setState({ isDropTarget: false });
	handleDrop = e => {
		this.setState({ isDropTarget: false });
		// e.stopPropagation();
		e.preventDefault();

		if (this.props.attachFiles) this.props.attachFiles(e.dataTransfer.files);
	};

	render() {
		const { isPreviewing, formatCode, isDropTarget } = this.state;
		const { placeholder, text, __onDidRender } = this.props;

		__onDidRender &&
			__onDidRender({
				insertTextAtCursor: this.insertTextAtCursor,
				insertNewlineAtCursor: this.insertNewlineAtCursor,
				focus: this.focus
			});

		return (
			<>
				<div
					className="message-input-wrapper"
					onKeyPress={this.handleKeyPress}
					onKeyDown={this.handleKeyDown}
					style={{ position: "relative" }}
				>
					{!isPreviewing && !isDropTarget && (
						<div key="message-attach-icons" className="message-attach-icons">
							<Icon
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
								onClick={this.handleClickPreview}
							/>
							{this.props.teammates.length > 0 && (
								<Icon
									key="mention"
									name="mention"
									title="Mention a teammate"
									placement="topRight"
									align={{ offset: [18, 0] }}
									delay={1}
									className={cx("mention", { hover: this.state.currentPopup === "at-mentions" })}
									onClick={this.handleClickAtMentions}
								/>
							)}
							<Icon
								key="smiley"
								name="smiley"
								title="Add an emoji"
								placement="topRight"
								align={{ offset: [9, 0] }}
								delay={1}
								className={cx("smiley", {
									hover: this.state.emojiOpen
								})}
								onClick={this.handleClickEmojiButton}
							/>
							{this.state.emojiOpen && (
								<EmojiPicker
									addEmoji={this.addEmoji}
									target={this.state.emojiMenuTarget}
									autoFocus={true}
								/>
							)}
							{this.props.attachFilesEnabled && this.props.attachFiles && (
								<Tooltip
									title={
										<div>
											Attach file
											<div style={{ height: "10px" }} />
											or drag &amp; drop
										</div>
									}
									placement="top"
									align={{ offset: [5, 0] }}
									delay={1}
									trigger={["hover"]}
								>
									<span className="icon-wrapper">
										<input
											type="file"
											id="attachment"
											name="attachment"
											multiple
											title=""
											onChange={this.handleChangeFiles}
											style={{
												top: 0,
												left: 0,
												width: "16px",
												height: "16px",
												position: "absolute",
												opacity: 0,
												zIndex: 5,
												cursor: "pointer"
											}}
										/>
										<label htmlFor="attachment">
											<Icon
												key="paperclip"
												name="paperclip"
												className={cx("attach", { hover: this.state.attachOpen })}
											/>
										</label>
									</span>
								</Tooltip>
							)}
							{this.props.relatedCodemarkIds && this.props.codemarks.length > 0 && (
								<Icon
									key="codestream"
									name="codestream"
									title="Add a related codemark"
									placement="top"
									align={{ offset: [5, 0] }}
									delay={1}
									className={cx("codestream", { hover: this.state.codemarkOpen })}
									onClick={this.handleClickCodemarkButton}
								/>
							)}
							{this.buildCodemarkMenu()}
							{this.props.withTags && (
								<Icon
									key="tag"
									name="tag"
									title="Add tags"
									placement="top"
									align={{ offset: [5, 0] }}
									delay={1}
									className={cx("tags", { hover: this.state.tagsOpen })}
									onClick={this.handleClickTagButton}
								/>
							)}
							{this.buildTagMenu()}
						</div>
					)}
					{isPreviewing && (
						<div className={cx("message-input preview", { "format-code": formatCode })}>
							{this.renderTextReplaceCodeBlocks(
								replaceHtml(this._contentEditable!.htmlEl.innerHTML) || ""
							)}
						</div>
					)}
					{this.props.attachFilesEnabled && this.props.attachFiles && (
						<div className={cx("drop-target", { hover: this.state.isDropTarget })}>
							<span className="expand">Drop here</span>
						</div>
					)}
					<AtMentionsPopup
						on={this.state.currentPopup}
						items={this.state.popupItems || emptyArray}
						prefix={this.state.popupPrefix}
						selected={this.state.selectedPopupItem}
						handleHoverAtMention={this.handleHoverAtMention}
						handleSelectAtMention={this.handleSelectAtMention}
					>
						<ContentEditable
							className={cx(
								"message-input",
								"hide-on-drop",
								btoa(unescape(encodeURIComponent(placeholder || ""))),
								{
									"format-code": formatCode,
									invisible: this.state.isDropTarget,
									hide: isPreviewing
								}
							)}
							onDragEnter={this.handleDragEnter}
							onDrop={this.handleDrop}
							onDragLeave={this.handleDragLeave}
							id="input-div"
							onChange={this.handleChange}
							onBlur={this.handleBlur}
							onFocus={this.props.onFocus}
							onClick={this.handleClick}
							html={text}
							placeholder={placeholder}
							ref={ref => (this._contentEditable = ref)}
						/>
					</AtMentionsPopup>
				</div>
				{isPreviewing && this.renderExitPreview()}
			</>
		);
	}
}

const EMPTY_ARRAY = [];
const mapStateToProps = (
	state: CodeStreamState,
	props: Omit<Props, keyof ConnectedProps>
): ConnectedProps => {
	const currentTeam = state.teams[state.context.currentTeamId];

	const currentPullRequest = state.context.currentPullRequest;
	let teammates;
	if (currentPullRequest) {
		teammates = getProviderPullRequestCollaborators(state);
	} else {
		teammates = getTeamMembers(state);
	}

	return {
		currentTeam,
		currentUserId: state.session.userId!,
		teammates: teammates,
		codemarks: codemarkSelectors.getTypeFilteredCodemarks(state) || EMPTY_ARRAY,
		isInVscode: state.ide.name === "VSC",
		teamTags: Boolean(props.withTags) ? getTeamTagsArray(state) : emptyArray,
		// channelStreams: getChannelStreamsForTeam(state, state.context.currentTeamId),
		services: state.services,
		currentUser: state.users[state.session.userId!] as CSMe,
		usernames: getUsernames(state),
		attachFilesEnabled: true // isFeatureEnabled(state, "attachFiles")
	};
};

export default connect(mapStateToProps, { ...actions })(MessageInput);
