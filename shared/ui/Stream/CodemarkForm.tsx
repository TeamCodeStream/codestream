import { Range } from "vscode-languageserver-types";
import {
	CodemarkPlus,
	FetchAssignableUsersRequestType,
	GetRangeScmInfoRequestType,
	GetRangeScmInfoResponse,
	CreateDocumentMarkerPermalinkRequestType,
	ThirdPartyProviderBoard,
	ThirdPartyProviderConfig,
	CrossPostIssueValues,
	GetReviewRequestType,
	BlameAuthor,
	GetShaDiffsRangesRequestType,
	GetShaDiffsRangesResponse,
	GetReposScmRequestType
} from "@codestream/protocols/agent";
import {
	CodemarkType,
	CSChannelStream,
	CSCodemark,
	CSDirectStream,
	CSStream,
	CSUser,
	StreamType,
	CSMe
} from "@codestream/protocols/api";
import cx from "classnames";
import * as paths from "path-browserify";
import React from "react";
import { connect } from "react-redux";
import Select from "react-select";
import {
	getStreamForId,
	getStreamForTeam,
	getChannelStreamsForTeam
} from "../store/streams/reducer";
import {
	mapFilter,
	arrayToRange,
	forceAsLine,
	isRangeEmpty,
	replaceHtml,
	keyFilter,
	safe
} from "../utils";
import { HostApi, Server } from "../webview-api";
import Button from "./Button";
import CrossPostIssueControls from "./CrossPostIssueControls";
import Tag from "./Tag";
import Icon from "./Icon";
import Menu from "./Menu";
import Tooltip from "./Tooltip";
import { sortBy as _sortBy, sortBy } from "lodash-es";
import {
	EditorSelectRangeRequestType,
	EditorSelection,
	EditorHighlightRangeRequestType,
	WebviewPanels,
	WebviewModals
} from "@codestream/protocols/webview";
import { getCurrentSelection } from "../store/editorContext/reducer";
import Headshot from "./Headshot";
import { getTeamMembers, getTeamTagsArray, getTeamMates } from "../store/users/reducer";
import MessageInput from "./MessageInput";
import { getCurrentTeamProvider } from "../store/teams/reducer";
import { getCodemark } from "../store/codemarks/reducer";
import { CodemarksState } from "../store/codemarks/types";
import { setCurrentStream } from "../store/context/actions";
import ContainerAtEditorLine from "./SpatialView/ContainerAtEditorLine";
import ContainerAtEditorSelection from "./SpatialView/ContainerAtEditorSelection";
import { prettyPrintOne } from "code-prettify";
import { escapeHtml } from "../utils";
import { CodeStreamState } from "../store";
import { LabeledSwitch } from "../src/components/controls/LabeledSwitch";
import { CSText } from "../src/components/CSText";
import { NewCodemarkAttributes, parseCodeStreamDiffUri } from "../store/codemarks/actions";
import { SharingControls, SharingAttributes } from "./SharingControls";
import { SmartFormattedList } from "./SmartFormattedList";
import { Modal } from "./Modal";
import { Checkbox } from "../src/components/Checkbox";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { FormattedMessage } from "react-intl";
import { Link } from "./Link";
import { confirmPopup } from "./Confirm";
import { openPanel, openModal, setUserPreference } from "./actions";
import CancelButton from "./CancelButton";
import { VideoLink } from "./Flow";
import { PanelHeader } from "../src/components/PanelHeader";
import { ReposState } from "../store/repos/types";
import * as path from "path-browserify";
import { isOnPrem } from "../store/configs/reducer";
import { getDocumentFromMarker } from "./api-functions";

export interface ICrossPostIssueContext {
	setSelectedAssignees(any: any): void;
	setValues(values: any): void;
	selectedAssignees: any[];
	assigneesInputTarget?: HTMLElement;
	codeBlock?: GetRangeScmInfoResponse;
}
export const CrossPostIssueContext = React.createContext<ICrossPostIssueContext>({
	selectedAssignees: [],
	setSelectedAssignees: () => {},
	setValues: () => {}
});

export interface AttachedFile {
	name: string;
	type: string;
	size: number;
	url?: string;
	status: "uploading" | "error" | "uploaded" | undefined;
}

interface Props extends ConnectedProps {
	streamId: string;
	collapseForm?: Function;
	onSubmit: (attributes: NewCodemarkAttributes, event?: React.SyntheticEvent) => any;
	onClickClose(e?: Event): any;
	openCodemarkForm?(type: string): any;
	slackInfo?: {};
	codeBlock?: GetRangeScmInfoResponse;
	commentType?: string;
	collapsed: boolean;
	isEditing?: boolean;
	editingCodemark?: CodemarkPlus;
	placeholder?: string;
	onDidChangeSelection?(location: EditorSelection): void;
	positionAtLocation?: boolean;
	multiLocation?: boolean;
	setMultiLocation?: Function;
	dontAutoSelectLine?: boolean;
	error?: string;
	openPanel: Function;
	openModal: Function;
	setUserPreference: Function;
}

interface ConnectedProps {
	teamMates: CSUser[];
	teamMembers: CSUser[];
	removedMemberIds: string[];
	channelStreams: CSChannelStream[];
	channel: CSStream;
	issueProvider?: ThirdPartyProviderConfig;
	providerInfo: {
		[service: string]: {};
	};
	currentUser: CSUser;
	skipPostCreationModal?: boolean;
	skipEmailingAuthors?: boolean;
	selectedStreams: {};
	showChannels: string;
	textEditorUri?: string;
	textEditorSelection?: EditorSelection;
	teamProvider: "codestream" | "slack" | "msteams" | string;
	teamTagsArray: any;
	codemarkState: CodemarksState;
	multipleMarkersEnabled: boolean;
	shouldShare: boolean;
	currentTeamId: string;
	currentReviewId?: string;
	isCurrentUserAdmin?: boolean;
	blameMap?: { [email: string]: string };
	activePanel?: WebviewPanels;
	inviteUsersOnTheFly: boolean;
	currentPullRequestId?: string;
	textEditorUriContext: any;
	textEditorUriHasPullRequestContext: boolean;
	repos: ReposState;
}

interface State {
	text: string;
	touchedText: boolean;
	formatCode: boolean;
	type: string;
	codeBlocks: GetRangeScmInfoResponse[];
	scmError: string;
	assignees: { value: any; label: string }[] | { value: any; label: string };
	assigneesRequired: boolean;
	assigneesDisabled: boolean;
	singleAssignee: boolean;
	isPermalinkPublic: boolean;
	privacyMembers: { value: string; label: string }[];
	notify: boolean;
	isLoading: boolean;
	isReviewLoading: boolean;
	crossPostMessage: boolean;
	crossPostIssueValues: Partial<CrossPostIssueValues>;
	assignableUsers: { value: any; label: string }[];
	channelMenuOpen: boolean;
	channelMenuTarget: any;
	labelMenuOpen: boolean;
	labelMenuTarget: any;
	locationMenuOpen: number | "header" | "closed";
	locationMenuTarget: any;
	sharingDisabled?: boolean;
	selectedChannelName?: string;
	selectedChannelId?: string;
	title?: string;
	codeBlockInvalid?: boolean;
	titleInvalid?: boolean;
	textInvalid?: boolean;
	assigneesInvalid?: boolean;
	sharingAttributesInvalid?: boolean;
	showAllChannels?: boolean;
	linkURI?: string;
	copied: boolean;
	selectedTags?: any;
	deleteMarkerLocations: {
		[index: number]: boolean;
	};
	relatedCodemarkIds?: any;
	attachments: AttachedFile[];
	addingLocation?: boolean;
	editingLocation: number;
	liveLocation: number;
	isChangeRequest: boolean;
	unregisteredAuthors: BlameAuthor[];
	emailAuthors: { [email: string]: boolean };
	currentPullRequestId?: string;
	isProviderReview?: boolean;
	isInsidePrChangeSet: boolean;
	changedPrLines: GetShaDiffsRangesResponse[];
	isPreviewing?: boolean;
	isDragging: number;
}

function merge(defaults: Partial<State>, codemark: CSCodemark): State {
	return Object.entries(defaults).reduce((object, entry) => {
		const [key, value] = entry;
		object[key] = codemark[key] !== undefined ? codemark[key] : value;
		return object;
	}, Object.create(null));
}

class CodemarkForm extends React.Component<Props, State> {
	static defaultProps = {
		commentType: "comment",
		isEditing: false
	};
	_titleInput: HTMLElement | null = null;
	insertTextAtCursor?: Function;
	focusOnMessageInput?: Function;
	permalinkRef = React.createRef<HTMLTextAreaElement>();
	permalinkWithCodeRef = React.createRef<HTMLTextAreaElement>();
	private _assigneesContainerRef = React.createRef<HTMLDivElement>();
	private _sharingAttributes?: SharingAttributes;
	private renderedCodeBlocks = {};

	constructor(props: Props) {
		super(props);
		const defaultType = props.commentType;
		const defaultState: Partial<State> = {
			crossPostIssueValues: {},
			title: "",
			text: "",
			touchedText: false,
			formatCode: false,
			type: defaultType,
			codeBlocks: props.codeBlock ? [props.codeBlock] : [],
			assignees: [],
			assigneesDisabled: false,
			assigneesRequired: false,
			singleAssignee: false,
			selectedChannelName: (props.channel as any).name,
			selectedChannelId: props.channel.id,
			assignableUsers: this.getAssignableCSUsers(),
			isPermalinkPublic: false,
			privacyMembers: [],
			selectedTags: {},
			relatedCodemarkIds: {},
			locationMenuOpen: "closed",
			editingLocation: -1,
			addingLocation: false,
			liveLocation: -1,
			isChangeRequest: false,
			scmError: "",
			unregisteredAuthors: [],
			emailAuthors: {},
			isReviewLoading: false,
			isInsidePrChangeSet: false,
			changedPrLines: [],
			deleteMarkerLocations: {},
			attachments: [],
			isDragging: 0
		};

		const state = props.editingCodemark
			? merge(defaultState, props.editingCodemark)
			: ({
					isLoading: false,
					notify: false,
					...defaultState
			  } as State);

		let assignees: any;
		if (props.isEditing) {
			const externalAssignees = this.props.editingCodemark!.externalAssignees || [];
			assignees = externalAssignees
				.map(a => ({
					value: a.displayName,
					label: a.displayName
				}))
				.concat(
					mapFilter(this.props.editingCodemark!.assignees || [], a =>
						state.assignableUsers.find((au: any) => au.value === a)
					)
				);
		} else if (state.assignees === undefined) {
			assignees = undefined;
		} else if (Array.isArray(state.assignees)) {
			assignees = state.assignees.map(a => state.assignableUsers.find((au: any) => au.value === a));
		} else {
			assignees = state.assignableUsers.find((au: any) => au.value === state.assignees);
		}
		this.state = {
			...state,
			assignees
		};

		if (props.isEditing && props.editingCodemark) {
			const selectedTags = {};
			(props.editingCodemark.tags || []).forEach(tag => {
				selectedTags[tag] = true;
			});
			const relatedCodemarkIds = {};
			(props.editingCodemark.relatedCodemarkIds || []).forEach(id => {
				relatedCodemarkIds[id] = getCodemark(props.codemarkState, id);
			});
			this.state = {
				...this.state,
				selectedTags,
				relatedCodemarkIds
			};
		}
		if (props.isEditing && props.editingCodemark) {
			this.state = {
				...this.state,
				text: escapeHtml(this.state.text)
			};
		}
	}

	static getDerivedStateFromProps(props: Props, state: State) {
		// revisit this if the ability to change the type is added back to the form
		// TODO: this should call ComposeBox.repositionIfNecessary()
		if (props.commentType !== state.type) {
			return { type: props.commentType };
		}
		return null;
	}

	async componentDidMount() {
		const {
			multiLocation,
			dontAutoSelectLine,
			textEditorUriHasPullRequestContext,
			textEditorUriContext,
			isEditing
		} = this.props;
		const { codeBlocks } = this.state;

		if (codeBlocks.length === 1) {
			if (isRangeEmpty(codeBlocks[0].range)) {
				this.selectRangeInEditor(codeBlocks[0].uri, forceAsLine(codeBlocks[0].range));
			}
			this.handleScmChange();
		} else if (!isEditing) {
			const { textEditorSelection, textEditorUri } = this.props;
			if (textEditorSelection && textEditorUri) {
				// In case there isn't already a range selection by user, change the selection to be the line the cursor is on
				const isEmpty = isRangeEmpty(textEditorSelection);
				if (isEmpty && dontAutoSelectLine) {
					this.focus();
					this.setState({ liveLocation: 0 });
				} else {
					const range = isEmpty ? forceAsLine(textEditorSelection) : textEditorSelection;
					if (isEmpty) this.selectRangeInEditor(textEditorUri, range);
					this.getScmInfoForSelection(textEditorUri, range, () => {
						// if (multiLocation) this.setState({ addingLocation: true, liveLocation: 1 });
						this.focus();
					});
				}
			}
		}
		// if (!multiLocation) this.focus();

		if (textEditorUriHasPullRequestContext) {
			const changedPrLines = await HostApi.instance.send(GetShaDiffsRangesRequestType, {
				repoId: textEditorUriContext.repoId,
				filePath: textEditorUriContext.path,
				baseSha: textEditorUriContext.leftSha,
				headSha: textEditorUriContext.rightSha
			});

			this.setState({ changedPrLines });
		}
	}

	rangesAreEqual(range1?: Range, range2?: Range) {
		if ((range1 && !range2) || (!range1 && range2)) return false;
		if (range1 && range2) {
			if (
				range1.start.line !== range2.start.line ||
				range1.start.character !== range2.start.character ||
				range1.end.line !== range2.end.line ||
				range1.end.character !== range2.end.character
			)
				return false;
		}
		return true;
	}

	isNonzeroSelection(range?: Range) {
		if (!range) return false;
		if (range.start.line === range.end.line && range.start.character === range.end.character)
			return false;
		return true;
	}

	componentDidUpdate(prevProps: Props) {
		const { isEditing, textEditorSelection, textEditorUri } = this.props;

		const commentType = this.getCommentType();

		// this if statement, if true, will update the selection that the
		// compose form is pointing to
		if (
			// make sure there an actual selection, not just a cursor
			this.isNonzeroSelection(textEditorSelection) &&
			// if the range didn't change, don't do anything
			!this.rangesAreEqual(prevProps.textEditorSelection, textEditorSelection) &&
			// make sure the range didn't change because we switched editors(files)
			prevProps.textEditorUri == textEditorUri &&
			// if we're editing, do nothing
			// !isEditing &&
			// if we are doing a permalink, do nothing
			!this.state.linkURI &&
			commentType !== "link" &&
			// only update if we have a live location
			this.state.liveLocation >= 0
		) {
			this.getScmInfoForSelection(textEditorUri!, forceAsLine(textEditorSelection!));
			this.props.onDidChangeSelection && this.props.onDidChangeSelection(textEditorSelection!);
			// this.setState({ addingLocation: false });
		}

		if (prevProps.commentType !== this.props.commentType) {
			this.setState({});
		}

		// if you switch files while the compose form is open, make
		// it clear that you are not commenting in the new file by
		// switching to multi-location mode, which shows the codeblock
		// and exactly what you're commenting on
		if (prevProps.textEditorUri !== textEditorUri) {
			// if you're creating a permalink, just cancel it and move on
			// otherwise, go to multi-location mode
			if (commentType === "link") this.cancelCompose();
			else this.addLocation();
		}

		const prevProviderHost = prevProps.issueProvider ? prevProps.issueProvider.host : undefined;
		const providerHost = this.props.issueProvider ? this.props.issueProvider.host : undefined;
		if (prevProviderHost !== providerHost) {
			this.setState({ assignees: [], crossPostIssueValues: {} });
		}
	}

	private selectRangeInEditor(uri: string, range: Range) {
		HostApi.instance.send(EditorSelectRangeRequestType, {
			uri: uri,
			selection: { ...range, cursor: range.end },
			preserveFocus: true
		});
	}

	private async getScmInfoForSelection(uri: string, range: Range, callback?: Function) {
		const scmInfo = await HostApi.instance.send(GetRangeScmInfoRequestType, {
			uri: uri,
			range: range,
			dirty: true // should this be determined here? using true to be safe
		});
		let newCodeBlocks = [...this.state.codeBlocks];
		if (this.state.liveLocation >= 0) newCodeBlocks[this.state.liveLocation] = scmInfo;
		else newCodeBlocks.push(scmInfo);

		if (scmInfo.error) {
			this.setState({ scmError: scmInfo.error });
		} else {
			this.setState({ codeBlocks: newCodeBlocks, addingLocation: false }, () => {
				this.handleScmChange();
				this.handlePrIntersection();
				if (callback) callback();
			});
		}
	}

	getAssignableCSUsers() {
		return mapFilter(this.props.teamMembers, user => {
			if (!user.isRegistered) return;
			return {
				value: user.id,
				label: user.username
			};
		});
	}

	async loadAssignableUsers(providerId: string, board: ThirdPartyProviderBoard) {
		if (board.assigneesDisabled) return this.setState({ assigneesDisabled: true });
		if (board.assigneesRequired) {
			this.setState(state => (state.assigneesRequired ? null : { assigneesRequired: true }));
		}
		if (board.singleAssignee) {
			this.setState(state => (state.singleAssignee ? null : { singleAssignee: true }));
		}

		try {
			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId,
				boardId: board.apiIdentifier || board.id
			});

			this.setState({
				assignableUsers: users.map(u => ({
					value: u,
					label: u.displayName
				}))
			});
		} catch (error) {
			this.setState({ assignableUsers: [] });
		}
	}

	// this doesn't appear to be used anywhere -Pez
	handleSelectionChange = () => {
		const { textEditorSelection, textEditorUri } = this.props;
		if (textEditorSelection) {
			this.getScmInfoForSelection(textEditorUri!, forceAsLine(textEditorSelection));
		}
	};

	handlePrIntersection = () => {
		const { changedPrLines, codeBlocks } = this.state;
		const { textEditorUriHasPullRequestContext, textEditorUriContext } = this.props;

		if (textEditorUriHasPullRequestContext) {
			const isInsidePrChangeSet = changedPrLines.some(changedPrLine => {
				return codeBlocks.some(codeBlock => {
					const codeBlockStart = codeBlock.range.start.line + 1;
					const codeBlockEnd = codeBlock.range.end.line + 1;

					if (!codeBlock.scm) {
						return false;
					}

					let prRange;
					switch (codeBlock.scm.branch) {
						case textEditorUriContext.baseBranch:
							prRange = changedPrLine.baseLinesChanged;
							break;
						case textEditorUriContext.headBranch:
							prRange = changedPrLine.headLinesChanged;
							break;
						default:
							return false;
					}

					if (prRange.start > prRange.end) {
						return false;
					}

					return (
						(prRange.start <= codeBlockStart && codeBlockStart <= prRange.end) ||
						(prRange.start <= codeBlockEnd && codeBlockEnd <= prRange.end) ||
						(codeBlockStart <= prRange.start && prRange.end <= codeBlockEnd)
					);
				});
			});

			this.setState({ isInsidePrChangeSet });
		}
	};

	handleScmChange = () => {
		const { codeBlocks } = this.state;
		const { blameMap = {}, inviteUsersOnTheFly, removedMemberIds } = this.props;

		this.setState({ codeBlockInvalid: false });

		if (!codeBlocks.length) return;

		const codeBlock =
			this.state.liveLocation >= 0 ? codeBlocks[this.state.liveLocation] : codeBlocks[0];

		if (!codeBlock) return;

		let unregisteredAuthors: BlameAuthor[] = [];
		let emailAuthors: { [email: string]: boolean } = {};
		let mentionAuthors: BlameAuthor[] = [];
		if (codeBlock.scm && codeBlock.scm.authors) {
			codeBlock.scm.authors.forEach(author => {
				// don't mention yourself
				if (author.id && author.id === this.props.currentUser.id) return;

				// see if this email address' code has been assigned to someone else
				// @ts-ignore
				const mappedId = blameMap[author.email.replace(".", "*")];
				const mappedPerson = mappedId && this.props.teamMembers.find(t => t.id === mappedId);

				// found a mapped person, so mention them
				if (mappedPerson) {
					mentionAuthors.push({
						email: mappedPerson.email,
						id: mappedPerson.id,
						username: mappedPerson.username
					});
				} else if (author.id) {
					// if it's a registered teammate who has not been explicitly removed from the team, mention them
					if (!removedMemberIds.includes(author.id)) mentionAuthors.push(author);
				} else if (inviteUsersOnTheFly) {
					// else offer to send the person an email
					unregisteredAuthors.push(author);
					// @ts-ignore
					emailAuthors[author.email] = !this.props.skipEmailingAuthors;
				}
			});
		}

		this.setState({ unregisteredAuthors, emailAuthors });

		if (mentionAuthors.length > 0) {
			// TODO handle users with no username
			const usernames: string[] = mentionAuthors.map(u => `@${u.username}`);
			// if there's text in the compose area, return without
			// adding the suggestion
			if (this.state.text.length > 0) return;
			// the reason for this unicode space is that chrome will
			// not render a space at the end of a contenteditable div
			// unless it is a &nbsp;, which is difficult to insert
			// so we insert this unicode character instead
			this.focusOnMessageInput &&
				this.focusOnMessageInput(() => {
					this.insertTextAtCursor && this.insertTextAtCursor(usernames.join(", ") + ":\u00A0");
				});
		}
	};

	// TODO: remove this
	tabIndex = () => {
		return 0;
	};

	// TODO: work on this from initial mount
	focus = (forceMainInput = false) => {
		// if (forceMainInput && this._contentEditable) return this._contentEditable.htmlEl.focus();

		switch (this.state.type) {
			case "question":
			case "issue":
			case "bookmark":
				this._titleInput && this._titleInput.focus();
				break;
			case "snippet":
			case "comment":
			default:
				this.focusOnMessageInput && this.focusOnMessageInput();
		}
	};

	// onSelectCodemarkType = (type?: string) => {
	// 	this.setState({ menuOpen: false });
	// 	if (type) this.setCommentType(type);
	// }

	getCommentType = () => {
		const { editingCodemark } = this.props;
		return editingCodemark ? editingCodemark.type : this.props.commentType || "comment";
	};

	setCommentType = (type: string) => {
		if (this.props.editingCodemark) return;
		this.setState({
			type,
			codeBlockInvalid: false,
			titleInvalid: false,
			textInvalid: false
		});
		// setTimeout(() => {
		// 	// this.focus();
		// }, 20);
	};

	togglePermalinkPrivacy = (isPermalinkPublic: boolean) => {
		this.setState({
			isPermalinkPublic
		});
	};

	// toggleCodemarkPrivacy = (isCodemarkPublic: boolean) => {
	// 	this.setState(state => {
	// 		const sharingDisabled = !isCodemarkPublic;
	// 		const shouldShare = sharingDisabled ? false : state.shouldShare;
	// 		return { sharingDisabled, shouldShare };
	// 	});
	// };

	toggleNotify = () => {
		this.setState({ notify: !this.state.notify });
	};

	toggleCrossPostMessage = () => {
		this.setState(state => ({ crossPostMessage: !state.crossPostMessage }));
	};

	handleClickSubmit = async (event?: React.SyntheticEvent) => {
		event && event.preventDefault();
		if (this.state.isLoading || this.state.isReviewLoading) return;
		if (this.isFormInvalid()) return;

		const {
			codeBlocks,
			deleteMarkerLocations,
			isPermalinkPublic,
			type,
			title,
			text,
			selectedChannelId,
			selectedTags,
			relatedCodemarkIds
		} = this.state;

		// FIXME
		const codeBlock = codeBlocks[0];

		if (type === "link") {
			let request;
			const privacy = isPermalinkPublic ? "public" : "private";
			if (codeBlock) {
				request = {
					uri: codeBlock.uri,
					range: codeBlock.range,
					privacy: privacy
				};
			} else {
				request = {
					uri: this.props.textEditorUri,
					range: this.props.textEditorSelection,
					privacy: privacy
				};
			}

			this.setState({ isLoading: true });

			const response = await HostApi.instance.send(
				CreateDocumentMarkerPermalinkRequestType,
				request
			);
			this.setState({ linkURI: response.linkUrl, isLoading: false });

			return;
		}

		const crossPostIssueValues = { ...this.state.crossPostIssueValues };
		const crossPostIssueEnabled =
			type === CodemarkType.Issue && this.props.issueProvider != undefined;

		let csAssignees: string[] = [];
		if (crossPostIssueEnabled) {
			const assignees = Array.isArray(this.state.assignees)
				? this.state.assignees
				: [this.state.assignees];

			csAssignees = mapFilter(assignees, a => {
				const user = a.value;
				const codestreamUser = this.props.teamMembers.find(
					t => Boolean(user.email) && t.email === user.email
				);
				if (codestreamUser) return codestreamUser.id;
				return undefined;
			});
			crossPostIssueValues.assignees = assignees.map(a => a.value);
			crossPostIssueValues.issueProvider = this.props.issueProvider;
		} else
			csAssignees = this.props.isEditing
				? this.props.editingCodemark!.assignees
				: (this.state.assignees as any[]).map(a => a.value);

		if (this.props.currentPullRequestId && this.state.isProviderReview) {
			this.setState({ isReviewLoading: true });
		} else {
			this.setState({ isLoading: true });
		}

		if (this.props.currentPullRequestId) {
			const { textEditorUriContext } = this.props;
			const providerId =
				textEditorUriContext &&
				textEditorUriContext.context &&
				textEditorUriContext.context.pullRequest
					? textEditorUriContext.context.pullRequest.providerId
					: "";
			HostApi.instance.track("PR Comment Added", {
				Host: providerId,
				"Comment Type": this.state.isProviderReview ? "Review Comment" : "Single Comment"
			});
		}

		let parentPostId: string | undefined = undefined;
		// all codemarks created while in a review are attached to that review
		if (this.props.currentReviewId) {
			try {
				const response = await HostApi.instance.send(GetReviewRequestType, {
					reviewId: this.props.currentReviewId
				});
				parentPostId = response.review.postId;
			} catch (error) {
				// FIXME what do we do if we don't find the review?
			}
		}

		try {
			const baseAttributes = {
				codeBlocks,
				deleteMarkerLocations,
				text: replaceHtml(text)!,
				type: type as CodemarkType,
				assignees: csAssignees,
				title,
				crossPostIssueValues: crossPostIssueEnabled
					? (crossPostIssueValues as CrossPostIssueValues)
					: undefined,
				tags: keyFilter(selectedTags),
				relatedCodemarkIds: keyFilter(relatedCodemarkIds),
				parentPostId,
				isChangeRequest: this.state.isChangeRequest,
				addedUsers: keyFilter(this.state.emailAuthors),
				isProviderReview: this.state.isProviderReview
			};
			if (this.props.teamProvider === "codestream") {
				const retVal = await this.props.onSubmit({
					...baseAttributes,
					sharingAttributes: this.props.shouldShare ? this._sharingAttributes : undefined,
					accessMemberIds: this.state.privacyMembers.map(m => m.value)
				});
				// if you're making a markerless codemark it won't appear on spatial view, the form
				// will just kind of disappear.  similarly, if you prior panel was *not* spatial view
				// the form will just disappear. in these cases, we want to show the user where the
				// codemark ends up -- the actiivty feed and spatial view
				if (
					retVal &&
					((codeBlocks.length == 0 && this.props.activePanel !== WebviewPanels.Activity) ||
						this.props.activePanel !== WebviewPanels.CodemarksForFile)
				)
					this.showConfirmationForCodemarkLocation(type, codeBlocks.length);
			} else {
				await this.props.onSubmit({ ...baseAttributes, streamId: selectedChannelId! }, event);
				(this.props as any).dispatch(setCurrentStream(selectedChannelId));
			}
		} catch (error) {
			console.error(error);
		} finally {
			this.setState({ isLoading: false });
			this.setState({ isProviderReview: false });
			this.setState({ isReviewLoading: false });
		}
	};

	showConfirmationForCodemarkLocation = (type, numCodeblocks: number) => {
		// we're going to turn this off since we have a consistent place to see comments
		return;
		if (this.props.skipPostCreationModal) return;

		confirmPopup({
			title: `${type === CodemarkType.Issue ? "Issue" : "Comment"} Submitted`,
			closeOnClickA: true,
			message: (
				<div style={{ textAlign: "left" }}>
					You can see the {type === CodemarkType.Issue ? "issue" : "comment"} in your{" "}
					<a onClick={() => this.props.openPanel(WebviewPanels.Activity)}>activity feed</a>
					{numCodeblocks > 0 && (
						<>
							{" "}
							and next to the code on{" "}
							<a onClick={() => this.props.openPanel(WebviewPanels.CodemarksForFile)}>
								codemarks in current file
							</a>
						</>
					)}
					.
					<br />
					<br />
					<div style={{ textAlign: "center", margin: 0, padding: 0 }}>
						<div
							style={{
								textAlign: "left",
								fontSize: "12px",
								display: "inline-block",
								margin: "0 auto",
								padding: 0
							}}
						>
							<Checkbox
								name="skipPostCreationModal"
								onChange={() => {
									this.props.setUserPreference(
										["skipPostCreationModal"],
										!this.props.skipPostCreationModal
									);
								}}
							>
								Don't show this again
							</Checkbox>
						</div>
					</div>
				</div>
			),
			centered: true,
			buttons: [
				{
					label: "OK",
					action: () => {}
				}
			]
		});
	};

	isFormInvalid = () => {
		const { codeBlocks } = this.state;
		const { text, title, assignees, crossPostIssueValues, type } = this.state;

		if (this.props.error != null && this.props.error !== "") return true;
		if (type === CodemarkType.Link) return false;
		// FIXME
		const codeBlock = codeBlocks[0];

		const validationState: Partial<State> = {
			codeBlockInvalid: false,
			titleInvalid: false,
			textInvalid: false,
			assigneesInvalid: false,
			sharingAttributesInvalid: false
		};

		let invalid = false;
		if (type === "trap" || type === "bookmark") {
			if (!codeBlock) {
				validationState.codeBlockInvalid = true;
				invalid = true;
			}
		}
		if (type === "question" || type === "issue") {
			if (!title || title.length === 0) {
				validationState.titleInvalid = true;
				invalid = true;
			}
			if (
				crossPostIssueValues.assigneesRequired &&
				(!assignees || (Array.isArray(assignees) && assignees.length === 0))
			) {
				invalid = validationState.assigneesInvalid = true;
			}
		}
		if (type === "comment" || type === "trap") {
			if (text.length === 0) {
				validationState.textInvalid = true;
				invalid = true;
			}
		}

		if (this.props.textEditorUriHasPullRequestContext) {
			// do something cool?
		} else if (
			!this.props.isEditing &&
			this.props.shouldShare &&
			!this._sharingAttributes &&
			!this.props.currentReviewId
		) {
			invalid = true;
			validationState.sharingAttributesInvalid = true;
		}

		if (invalid) console.log("invalid form: ", validationState);

		this.setState(validationState as State);
		return invalid;
	};

	showAlertHelp = event => {
		event.stopPropagation();
	};

	renderTitleHelp = () => {
		const { titleInvalid } = this.state;

		if (titleInvalid) {
			return <small className="error-message">Required</small>;
		} else return null;
	};

	renderTextHelp = () => {
		const { textInvalid } = this.state;

		if (textInvalid) {
			return <small className="error-message">Required</small>;
		} else return null;
	};

	renderSharingHelp = () => {
		const { sharingAttributesInvalid } = this.state;

		if (sharingAttributesInvalid) {
			return <small className="error-message">Select channel, or deselect sharing</small>;
		} else return null;
	};

	switchChannel = (event: React.SyntheticEvent) => {
		if (this.props.isEditing) return;

		event.stopPropagation();
		if (!this.state.channelMenuOpen) {
			const target = event.target;
			this.setState(state => ({
				channelMenuOpen: !state.channelMenuOpen,
				channelMenuTarget: target,
				crossPostMessage: true
			}));
		}
	};

	selectChannel = (stream: CSStream | "show-all") => {
		if (stream === "show-all") {
			this.setState({ showAllChannels: true });
			return;
		} else if (stream && stream.id) {
			const channelName = (stream.type === StreamType.Direct ? "@" : "#") + (stream as any).name;
			this.setState({ selectedChannelName: channelName, selectedChannelId: stream.id });
		}
		this.setState({ channelMenuOpen: false });
		this.focus();
	};

	switchLocation = (event: React.SyntheticEvent, index: number | "header") => {
		if (this.props.isEditing) return;

		const target = event.target;
		this.setState({
			liveLocation: -1,
			locationMenuOpen: index,
			locationMenuTarget: target
		});
	};

	editLocation = (index: number, event?: React.SyntheticEvent) => {
		if (event) event.stopPropagation();
		this.setState({ locationMenuOpen: "closed", liveLocation: index, addingLocation: false });
	};

	deleteLocation = (index: number, event?: React.SyntheticEvent) => {
		const { editingCodemark } = this.props;
		if (event) event.stopPropagation();
		let newCodeBlocks = [...this.state.codeBlocks];
		newCodeBlocks.splice(index, 1);
		this.setState(
			{
				locationMenuOpen: "closed",
				codeBlocks: newCodeBlocks
			},
			() => {
				this.handlePrIntersection();
			}
		);
		if (editingCodemark) {
			this.setState({
				deleteMarkerLocations: { ...this.state.deleteMarkerLocations, [index]: true }
			});
		}
		this.addLocation();
		this.focus();
	};

	addLocation = () => {
		const { editingCodemark } = this.props;
		const markersLength = editingCodemark ? (editingCodemark.markers || []).length : 0;
		this.setState(state => ({
			locationMenuOpen: "closed",
			addingLocation: true,
			liveLocation: Math.max(state.codeBlocks.length, markersLength)
		}));
		if (this.props.setMultiLocation && !this.props.multiLocation) this.props.setMultiLocation(true);
	};

	cementLocation = (event: React.SyntheticEvent) => {
		const { codeBlocks, liveLocation } = this.state;
		event.stopPropagation();

		try {
			const { file: newFile, repoPath: newRepoPath } = codeBlocks[liveLocation].scm!;
			const { file, repoPath } = codeBlocks[0].scm!;
			let location = "Same File";
			if (repoPath !== newRepoPath) location = "Different Repo";
			else if (file !== newFile) location = "Different File";
		} catch (e) {}

		this.setState(state => ({
			locationMenuOpen: "closed",
			addingLocation: false,
			liveLocation: -1
		}));
		// this.addLocation();
		this.focus();
	};

	jumpToLocation = (index: number, event?: React.SyntheticEvent) => {
		if (event) event.stopPropagation();
		this.toggleCodeHighlightInTextEditor(true, index);
	};

	pinLocation = (index: number, event?: React.SyntheticEvent) => {
		this.insertTextAtCursor && this.insertTextAtCursor(`[#${index + 1}]`);
	};

	pinImage = (filename: string, url: string, event?: React.SyntheticEvent) => {
		this.insertTextAtCursor && this.insertTextAtCursor(`![${filename}](${url})`);
	};

	selectLocation = (action: "add" | "edit" | "delete") => {
		this.setState({ locationMenuOpen: "closed" });
	};

	switchLabel = (event: React.SyntheticEvent) => {
		event.stopPropagation();
		const target = event.target;
		this.setState(state => ({
			labelMenuOpen: !state.labelMenuOpen,
			labelMenuTarget: target
		}));
	};

	// selectLabel = (color: string) => {
	// 	this.setState({ color: color, labelMenuOpen: false });
	// };

	// handleClickConnectSlack = async event => {
	// 	event.preventDefault();
	// 	this.setState({ isLoading: true });
	// 	await HostApi.instance.send(GoToSlackSignin); // TODO: use the provider api
	// 	this.setState({ isLoading: false });
	// }

	renderTags = () => {
		const { selectedTags } = this.state;
		const keys = Object.keys(selectedTags);
		if (keys.length === 0) return null;

		return (
			<div className="related">
				<div className="related-label">Tags</div>
				<div style={{ marginBottom: "-5px" }}>
					{this.props.teamTagsArray.map(tag => {
						return selectedTags[tag.id] ? <Tag tag={tag} /> : null;
					})}
					<div style={{ clear: "both" }} />
				</div>
			</div>
		);
	};

	/*
	Sharing model v1 will only be public codemarks
	 see https://trello.com/c/M3KV7p4g/2728-make-all-codemarks-in-sharing-model-team-accessible
	*/
	/*
	renderPrivacyControls = () => {
		if (
			!this.props.isEditing &&
			this.props.teamProvider === "codestream" &&
			this.props.commentType !== CodemarkType.Link
		) {
			return (
				<>
					<Spacer />
					<div style={{ display: "flex", alignItems: "center", minHeight: "40px" }}>
						<div style={{ display: "inline-flex", width: "100%", alignItems: "center" }}>
							<span style={{ minWidth: "max-content" }}>
								<CSText muted as="div">
									Who can see this?
								</CSText>
							</span>
							<span style={{ marginLeft: "10px", width: "100%" }}>
								<Select
									id="input-assignees"
									classNamePrefix="react-select"
									isMulti
									defaultValue={this.state.privacyMembers}
									options={this.props.teamMates.map(u => ({
										label: u.username,
										value: u.id
									}))}
									closeMenuOnSelect={false}
									isClearable
									placeholder="Entire Team"
									onChange={(value: any, meta: any) => {
										this.setState({
											privacyMembers: value,
											sharingDisabled: meta.action === "select-option"
										});
									}}
								/>
							</span>
						</div>
					</div>
				</>
			);
		}
		return null;
	};
	 */

	renderRequireChange = () => {
		return (
			<div style={{ float: "left", paddingTop: "10px" }}>
				<Checkbox
					name="change-request"
					checked={this.state.isChangeRequest}
					onChange={value => this.setState({ isChangeRequest: value })}
				>
					Change Request (require for approval)
				</Checkbox>
			</div>
		);
	};

	renderSharingControls = () => {
		if (this.state.isPreviewing) return null;
		if (this.props.isEditing) return null;
		if (this.props.currentReviewId) return null;
		// don't show the sharing controls for these types of diffs
		if (this.props.textEditorUri && this.props.textEditorUri.match("codestream-diff://-[0-9]+-"))
			return null;

		const { codeBlocks } = this.state;
		// we only look at the first code range here because we're using it to default
		// the channel based on the selected repo -- so we look at the first one
		const repoId = codeBlocks[0] && codeBlocks[0].scm && codeBlocks[0].scm.repoId;

		return (
			<div className="checkbox-row" style={{ float: "left" }}>
				{this.renderSharingHelp()}

				{this.state.sharingDisabled ? (
					<CSText muted>
						<SmartFormattedList value={this.state.privacyMembers.map(m => m.label)} /> will be
						notified via email
					</CSText>
				) : (
					<SharingControls
						showToggle
						onChangeValues={values => {
							this._sharingAttributes = values;
						}}
						repoId={repoId}
					/>
				)}
			</div>
		);
	};

	renderRelatedCodemarks = () => {
		const { relatedCodemarkIds } = this.state;
		const keys = keyFilter(relatedCodemarkIds);
		if (keys.length === 0) return null;

		return (
			<div className="related" key="related-codemarks">
				<div className="related-label">Related</div>
				<div className="related-codemarks" key="related-codemarks" style={{ margin: "0 0 0 0" }}>
					{keys.map(key => {
						const codemark = relatedCodemarkIds[key];
						if (!codemark) return null;

						const title = codemark.title || codemark.text;
						const icon = (
							<Icon
								name={codemark.type || "comment"}
								className={`${codemark.color}-color type-icon`}
							/>
						);
						const file = codemark.markers && codemark.markers[0] && codemark.markers[0].file;

						return (
							<div key={key} className="related-codemark">
								{icon}&nbsp;{title}&nbsp;&nbsp;<span className="codemark-file">{file}</span>
								<span style={{ marginLeft: 5 }}>
									<Icon name="x" onClick={() => this.handleToggleCodemark(codemark)} />
								</span>
							</div>
						);
					})}
					<div style={{ clear: "both" }} />
				</div>
			</div>
		);
	};

	renderAttachedFiles = () => {
		const { attachments } = this.state;

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
							<Icon name="file" className="spinnable" />
						);
					const isImage = file.type.startsWith("image");
					const imageInjected =
						isImage && file.url ? this.state.text.includes(`![${file.name}](${file.url})`) : false;
					return (
						<div key={index} className="attachment">
							<span>{icon}</span>
							<span>{file.name}</span>
							<span>
								{isImage && file.url && (
									<Icon
										title={
											imageInjected
												? `This image is in the markdown above`
												: `Insert this image in markdown`
										}
										placement="bottomRight"
										name="pin"
										className={imageInjected ? "clickable selected" : "clickable"}
										onMouseDown={e => this.pinImage(file.name, file.url!, e)}
									/>
								)}
								<Icon
									name="x"
									className="clickable"
									onClick={() => {
										const attachments = [...this.state.attachments];
										attachments.splice(index, 1);
										this.setState({ attachments });
									}}
								/>
							</span>
						</div>
					);
				})}
			</div>
		);
	};

	handleKeyPress = (event: React.KeyboardEvent) => {
		if (event.key == "Enter") return this.switchChannel(event);
	};

	handleChange = (text, formatCode) => {
		// track newPostText as the user types
		this.setState({ text, formatCode });
	};

	handleChangeTag = newTag => {
		const newTagCopy = { ...newTag };
		if (newTag.id) {
			// TAGS.forEach((tag, index) => {
			// if (tag.id === newTag.id) TAGS[index] = newTagCopy;
			// });
		} else {
			// newTagCopy.id = TAGS.length + 1;
			// TAGS = TAGS.concat(newTagCopy);
		}
	};

	handleToggleTag = tagId => {
		if (!tagId) return;
		let selectedTags = this.state.selectedTags;
		selectedTags[tagId] = !selectedTags[tagId];
		this.setState({ selectedTags });
	};

	handleToggleCodemark = codemark => {
		if (!codemark || !codemark.id) return;
		let relatedCodemarkIds = this.state.relatedCodemarkIds;
		if (relatedCodemarkIds[codemark.id]) delete relatedCodemarkIds[codemark.id];
		else {
			relatedCodemarkIds[codemark.id] = codemark;
			HostApi.instance.track("Related Codemark Added", {
				"Codemark ID": this.props.editingCodemark ? this.props.editingCodemark.id : undefined,
				"Sibling Status": this.props.isEditing ? "Existing Codemark" : "New Codemark"
			});
		}
		this.setState({ relatedCodemarkIds });
	};

	handleAttachFiles = async files => {
		if (!files || files.length === 0) return;
		HostApi.instance.track("File Attached", {});
		[...files].forEach(file => {
			file.status = "uploading";
		});

		for (const file of files) {
			const reader = new FileReader();
			reader.addEventListener("loadend", async () => {
				try {
					const response = await Server.post("/upload-file", {
						buffer: new Uint8Array(reader.result as ArrayBuffer),
						// can't pass all the file properties (it's not clone-able)
						file: {
							name: file.name,
							path: file.path,
							size: file.size,
							status: file.status,
							type: file.type
						}
					});
					if (response && response.url) {
						file.status = "uploaded";
						file.url = response.url;
					} else {
						file.status = "error";
					}
				} catch (e) {
					console.warn("Error uploading file: ", e);
					file.status = "error";
				}
			});
			reader.readAsArrayBuffer(file);
		}

		this.setState({ attachments: [...this.state.attachments, ...files] });

		// setTimeout(() => {
		// 	const attachments = [...this.state.attachments];
		// 	attachments.forEach(file => {
		// 		file.status = "uploaded";
		// 		file.url = "http://static.codestream.com/uc/" + file.name;
		// 	});
		// 	this.setState({ attachments });
		// }, 2000);
	};

	handleChangeRelated = codemarkIds => {
		this.setState({ relatedCodemarkIds: codemarkIds });
	};

	// renderCodeblock(marker) {
	// 	if (marker === undefined) return;

	// 	const path = marker.file || "";
	// 	let extension = paths.extname(path).toLowerCase();
	// 	if (extension.startsWith(".")) {
	// 		extension = extension.substring(1);
	// 	}

	// 	let startLine = 1;
	// 	// `range` is not a property of CSMarker
	// 	/* if (marker.range) {
	// 		startLine = marker.range.start.line;
	// 	} else if (marker.location) {
	// 		startLine = marker.location[0];
	// 	} else */ if (
	// 		marker.locationWhenCreated
	// 	) {
	// 		startLine = marker.locationWhenCreated[0];
	// 	}

	// 	const codeHTML = prettyPrintOne(escapeHtml(marker.code), extension, startLine);
	// 	return [
	// 		<div className="related" style={{ padding: "0 10px", marginBottom: 0, position: "relative" }}>
	// 			<div className="file-info">
	// 				<span className="monospace" style={{ paddingRight: "20px" }}>
	// 					<Icon name="file"></Icon> {marker.file}
	// 				</span>{" "}
	// 				{marker.branchWhenCreated && (
	// 					<>
	// 						<span className="monospace" style={{ paddingRight: "20px" }}>
	// 							<Icon name="git-branch"></Icon> {marker.branchWhenCreated}
	// 						</span>{" "}
	// 					</>
	// 				)}
	// 				<span className="monospace">
	// 					<Icon name="git-commit"></Icon> {marker.commitHashWhenCreated.substring(0, 7)}
	// 				</span>
	// 			</div>
	// 			<pre
	// 				className="code prettyprint"
	// 				data-scrollable="true"
	// 				dangerouslySetInnerHTML={{ __html: codeHTML }}
	// 			/>
	// 		</div>
	// 	];
	// }

	getTitleLabel() {
		const commentType = this.getCommentType();
		return commentType === "issue"
			? "issue in "
			: commentType === "question"
			? "question in "
			: commentType === "bookmark"
			? "bookmark in "
			: commentType === "link"
			? "permalink for "
			: commentType === "comment"
			? "comment in "
			: "";
	}

	getCodeBlockHint() {
		const { editingCodemark } = this.props;
		const { codeBlocks, liveLocation } = this.state;

		if (!codeBlocks.length) return this.renderAddLocation();

		if (this.props.multiLocation) {
			const numLocations = codeBlocks.length; // + (this.state.addingLocation ? 1 : 0);
			return (
				<>
					<span className="subhead">{this.getTitleLabel()}&nbsp;</span>
					<span className="channel-label" style={{ display: "inline-block" }}>
						<div className="location">
							{numLocations} location{numLocations > 1 ? "s" : ""}
						</div>
					</span>
					{this.state.addingLocation || liveLocation >= 0 || this.renderAddLocation()}
				</>
			);
		} else {
			const codeBlock = codeBlocks[0];
			if (!codeBlock) return null;
			if (liveLocation == 0 && !codeBlock.range)
				return <span className="add-range">Select a range to add a code location</span>;

			if (!codeBlock.range) return null;

			const scm = codeBlock.scm;
			let file = scm && scm.file ? paths.basename(scm.file) : "";

			let range: any = codeBlock.range;
			if (editingCodemark) {
				if (editingCodemark.markers && editingCodemark.markers.length > 0) {
					const marker = editingCodemark.markers[0];
					if (marker.locationWhenCreated) {
						// TODO: location is likely invalid
						range = arrayToRange(marker.locationWhenCreated as any);
					} else {
						range = undefined;
					}
					file = marker.file || "";
				} else {
					return this.renderAddLocation();
				}
			}

			let lines: string;
			if (range === undefined) lines = "";
			else if (range.start.line === range.end.line) {
				lines = `(Line ${range.start.line + 1})`;
			} else {
				lines = `(Lines ${range.start.line + 1}-${range.end.line + 1})`;
			}
			return (
				<>
					{this.renderAddLocation()}
					<span className="subhead">{this.getTitleLabel()}&nbsp;</span>
					<span className="channel-label" style={{ display: "inline-block" }}>
						<div
							className={cx("location", { live: liveLocation == 0 })}
							onClick={e => this.switchLocation(e, "header")}
						>
							{file} {lines}
						</div>
					</span>
				</>
			);
		}
	}

	renderAddLocation() {
		return null;

		if (
			!this.props.multipleMarkersEnabled ||
			this.props.currentPullRequestId ||
			this.props.isEditing ||
			this.props.commentType === "link"
		)
			return null;

		return (
			<div className="add-location">
				<Tooltip
					placement="topRight"
					title="Comments can refer to multiple blocks of code, even across files."
					delay={1}
				>
					<span onClick={e => this.addLocation()}>
						<Icon name="plus" />
						add range
					</span>
				</Tooltip>
			</div>
		);
	}

	async toggleCodeHighlightInTextEditor(highlight: boolean, index: number) {
		const { editingCodemark } = this.props;
		const codeBlock = this.state.codeBlocks[index];

		let uri;
		let range;
		if (codeBlock) {
			if (!codeBlock.range || !codeBlock.uri) return;
			uri = codeBlock.uri;
			range = codeBlock.range;
		} else if (editingCodemark && editingCodemark.markers) {
			const marker = editingCodemark.markers[index];
			if (!marker) return;
			const response = await getDocumentFromMarker(marker.id);
			if (!response) return;
			uri = response.textDocument.uri;
			range = response.range;
		} else {
			return;
		}
		HostApi.instance.send(EditorHighlightRangeRequestType, { uri, range, highlight });
	}

	renderMessageInput = () => {
		const { codeBlocks, type, text } = this.state;
		let placeholder = this.props.placeholder;

		if (codeBlocks.length) {
			// const range = codeBlock ? arrayToRange(codeBlock.location) : null;
			// let rangeText = "";
			// if (range && codeBlock && codeBlock.file) {
			// 	rangeText += "Add comment for " + codeBlock.file;
			// 	const endLine = range.end.col == 0 ? range.end.row : range.end.row + 1;
			// 	if (range.start.row + 1 === endLine) {
			// 		rangeText += " line " + (range.start.row + 1);
			// 	} else {
			// 		rangeText += " lines " + (range.start.row + 1) + "-" + endLine;
			// 	}
			// 	// placeholder = rangeText;
			// }
			if (type === "question") placeholder = "Answer (optional)";
			else if (type === "issue") placeholder = "Description (optional)";
			else placeholder = "";
		}

		const __onDidRender = ({ insertTextAtCursor, focus }) => {
			this.insertTextAtCursor = insertTextAtCursor;
			this.focusOnMessageInput = focus;
		};

		return (
			<MessageInput
				onKeypress={() => this.setState({ touchedText: true })}
				teamProvider={this.props.teamProvider}
				isDirectMessage={this.props.channel.type === StreamType.Direct}
				text={text}
				placeholder={placeholder}
				multiCompose
				onChange={this.handleChange}
				withTags={!this.props.textEditorUriHasPullRequestContext}
				toggleTag={this.handleToggleTag}
				toggleCodemark={this.handleToggleCodemark}
				shouldShowRelatableCodemark={codemark =>
					this.props.editingCodemark ? codemark.id !== this.props.editingCodemark.id : true
				}
				onSubmit={this.props.currentPullRequestId ? undefined : this.handleClickSubmit}
				selectedTags={this.state.selectedTags}
				relatedCodemarkIds={
					this.props.textEditorUriHasPullRequestContext ? undefined : this.state.relatedCodemarkIds
				}
				setIsPreviewing={isPreviewing => this.setState({ isPreviewing })}
				renderCodeBlock={this.renderCodeBlock}
				renderCodeBlocks={this.renderCodeBlocks}
				attachFiles={this.handleAttachFiles}
				__onDidRender={__onDidRender}
			/>
		);
	};

	copyPermalink = (event: React.SyntheticEvent) => {
		event.preventDefault();
		if (this.permalinkRef.current) {
			this.permalinkRef.current.select();
			document.execCommand("copy");
			this.setState({ copied: true });
		}
	};

	copyPermalinkWithCode = (event: React.SyntheticEvent) => {
		event.preventDefault();
		if (this.permalinkWithCodeRef.current) {
			this.permalinkWithCodeRef.current.select();
			document.execCommand("copy");
			this.setState({ copied: true });
		}
	};

	renderEditingMarker = (marker, index, force) => {
		const { liveLocation, text, isPreviewing } = this.state;
		const { editingCodemark } = this.props;

		if (!marker) return null;
		// if (liveLocation == index && !codeBlock.range)
		// return <span className="add-range">Select a range to add a code location</span>;

		const blockInjected = text.includes(`[#${index + 1}]`);
		if (isPreviewing && blockInjected && !force) return null;

		let range: any = undefined;
		if (marker.locationWhenCreated) {
			range = arrayToRange(marker.locationWhenCreated as any);
		} else {
			range = arrayToRange(marker.referenceLocations[0].location);
		}
		const file = marker.file || "";
		let extension = paths.extname(file).toLowerCase();
		if (extension.startsWith(".")) extension = extension.substring(1);

		const codeHTML = prettyPrintOne(escapeHtml(marker.code), extension, range.start.line + 1);
		return (
			<div
				key={index}
				className={cx("related", { live: liveLocation == index })}
				style={{ padding: "0", marginBottom: 0, position: "relative" }}
			>
				<div className="file-info">
					{file && (
						<>
							<span className="monospace" style={{ paddingRight: "20px" }}>
								<Icon name="file" /> {file}
							</span>{" "}
						</>
					)}
					{marker.branch && (
						<>
							<span className="monospace" style={{ paddingRight: "20px" }}>
								<Icon name="git-branch" /> {marker.branch}
							</span>{" "}
						</>
					)}
					{/* scm && scm.revision && (
						<span className="monospace">
							<Icon name="git-commit" /> {scm.revision.substring(0, 7)}
						</span>
					) */}
				</div>
				<pre
					className="code prettyprint"
					data-scrollable="true"
					dangerouslySetInnerHTML={{ __html: codeHTML }}
				/>
				{liveLocation == index && (
					<div className="code-buttons live">
						<div className="codemark-actions-button ok" onClick={this.cementLocation}>
							OK
						</div>
						<div className="codemark-actions-button" onClick={e => this.deleteLocation(index, e)}>
							Cancel
						</div>
					</div>
				)}
				{liveLocation != index && !isPreviewing && (
					<div className="code-buttons">
						<Icon
							title={
								blockInjected
									? `This code block [#${index + 1}] is in the markdown above`
									: `Insert code block #${index + 1} in markdown`
							}
							placement="bottomRight"
							name="pin"
							className={blockInjected ? "clickable selected" : "clickable"}
							onMouseDown={e => this.pinLocation(index, e)}
						/>
						<Icon
							title={"Jump to this range in " + file}
							placement="bottomRight"
							name="link-external"
							className="clickable"
							onClick={e => this.jumpToLocation(index, e)}
						/>
						<Icon
							title="Select new range"
							placement="bottomRight"
							name="select"
							className="clickable"
							onClick={e => this.editLocation(index, e)}
						/>
						<Icon
							title="Remove Range"
							placement="bottomRight"
							name="x"
							className="clickable"
							onClick={e => this.deleteLocation(index, e)}
						/>
					</div>
				)}
				<div style={{ clear: "both" }}></div>
			</div>
		);
	};

	renderCodeBlock = (index, force) => {
		const { codeBlocks, liveLocation, text, isPreviewing } = this.state;
		const { editingCodemark } = this.props;

		const codeBlock = codeBlocks[index];
		if (!codeBlock) return null;
		if (liveLocation == index && !codeBlock.range)
			return <span className="add-range">Select a range to add a code location</span>;

		if (!codeBlock.range) return null;

		const blockInjected = text.includes(`[#${index + 1}]`);
		if (isPreviewing && blockInjected && !force) return null;

		const scm = codeBlock.scm;

		let file = scm && scm.file ? paths.basename(scm.file) : "";

		let range: any = codeBlock.range;
		// if (editingCodemark) {
		// 	if (editingCodemark.markers) {
		// 		const marker = editingCodemark.markers[0];
		// 		if (marker.locationWhenCreated) {
		// 			// TODO: location is likely invalid
		// 			range = arrayToRange(marker.locationWhenCreated as any);
		// 		} else {
		// 			range = undefined;
		// 		}
		// 		file = marker.file || "";
		// 	}
		// }
		let extension = paths.extname(file).toLowerCase();
		if (extension.startsWith(".")) extension = extension.substring(1);

		const codeHTML = prettyPrintOne(
			escapeHtml(codeBlock.contents),
			extension,
			range.start.line + 1
		);
		return (
			<div
				key={index}
				className={cx("related", { live: liveLocation == index })}
				style={{ padding: "0", marginBottom: 0, position: "relative" }}
			>
				<div className="file-info">
					{file && (
						<>
							<span className="monospace" style={{ paddingRight: "20px" }}>
								<Icon name="file" /> {file}
							</span>{" "}
						</>
					)}
					{scm && scm.branch && (
						<>
							<span className="monospace" style={{ paddingRight: "20px" }}>
								<Icon name="git-branch" /> {scm.branch}
							</span>{" "}
						</>
					)}
					{scm && scm.revision && (
						<span className="monospace">
							<Icon name="git-commit" /> {scm.revision.substring(0, 7)}
						</span>
					)}
				</div>
				<pre
					className="code prettyprint"
					data-scrollable="true"
					dangerouslySetInnerHTML={{ __html: codeHTML }}
				/>
				{liveLocation == index && (
					<div className="code-buttons live">
						<div className="codemark-actions-button ok" onClick={this.cementLocation}>
							OK
						</div>
						<div className="codemark-actions-button" onClick={e => this.deleteLocation(index, e)}>
							Cancel
						</div>
					</div>
				)}
				{liveLocation != index && !isPreviewing && (
					<div className="code-buttons">
						<Icon
							title={
								blockInjected
									? `This code block [#${index + 1}] is in the markdown above`
									: `Insert code block #${index + 1} in markdown`
							}
							placement="bottomRight"
							name="pin"
							className={blockInjected ? "clickable selected" : "clickable"}
							onMouseDown={e => this.pinLocation(index, e)}
						/>
						<Icon
							title={"Jump to this range in " + file}
							placement="bottomRight"
							name="link-external"
							className="clickable"
							onClick={e => this.jumpToLocation(index, e)}
						/>
						<Icon
							title="Select new range"
							placement="bottomRight"
							name="select"
							className="clickable"
							onClick={e => this.editLocation(index, e)}
						/>
						<Icon
							title="Remove Range"
							placement="bottomRight"
							name="x"
							className="clickable"
							onClick={e => this.deleteLocation(index, e)}
						/>
					</div>
				)}
				<div style={{ clear: "both" }}></div>
			</div>
		);
	};

	renderCodeBlocks = () => {
		const { codeBlocks, liveLocation, isPreviewing } = this.state;
		const { editingCodemark, multiLocation, commentType } = this.props;

		const addLocationDiv = (
			<Tooltip
				placement="topLeft"
				title="Comments can refer to multiple blocks of code, even across files."
				delay={1}
			>
				<div
					className="clickable"
					style={{ margin: "15px 0 5px 3px", cursor: "pointer" }}
					onClick={this.addLocation}
				>
					<Icon name="plus" className="clickable margin-right" />
					Add Code Block
				</div>
			</Tooltip>
		);

		if (editingCodemark) {
			const { deleteMarkerLocations } = this.state;
			const { markers = [] } = editingCodemark;
			const numMarkers = markers.length;

			return (
				<>
					{markers.map((marker, index) => {
						if (deleteMarkerLocations[index]) return null;
						if (codeBlocks[index]) return this.renderCodeBlock(index, false);
						else return this.renderEditingMarker(marker, index, false);
					})}
					{codeBlocks.map((codeBlock, index) => {
						if (deleteMarkerLocations[index]) return null;
						if (codeBlock && index >= numMarkers) return this.renderCodeBlock(index, false);
						else return null;
					})}

					{isPreviewing || commentType === "link" ? null : this.state.addingLocation ? (
						<div className="add-range" style={{ clear: "both", position: "relative" }}>
							Select code from any file to add a range
							<div className="code-buttons live">
								<div
									className="codemark-actions-button"
									style={{ margin: "2px 0" }}
									onClick={e => {
										this.setState({ addingLocation: false, liveLocation: -1 });
										this.focus();
									}}
								>
									Done
								</div>
							</div>
						</div>
					) : (
						addLocationDiv
					)}
				</>
			);
		}
		return (
			<>
				{codeBlocks.map((codeBlock, index) => this.renderCodeBlock(index, false))}

				{isPreviewing || commentType === "link" ? null : this.state.addingLocation ? (
					<div className="add-range" style={{ clear: "both", position: "relative" }}>
						Select code from any file to add a range
						<div className="code-buttons live">
							<div
								className="codemark-actions-button"
								style={{ margin: "2px 0" }}
								onClick={e => {
									this.setState({ addingLocation: false, liveLocation: -1 });
									this.focus();
								}}
							>
								Done
							</div>
						</div>
					</div>
				) : (
					addLocationDiv
				)}
			</>
		);
	};

	private _getCrossPostIssueContext(): ICrossPostIssueContext {
		return {
			setSelectedAssignees: assignees => this.setState({ assignees }),
			selectedAssignees: this.state.assignees as any,
			assigneesInputTarget:
				this._assigneesContainerRef.current ||
				(document.querySelector("#members-controls")! as any) ||
				document.createElement("span"),
			setValues: values => {
				this.setState(state => ({
					crossPostIssueValues: { ...state.crossPostIssueValues, ...values }
				}));
			},
			codeBlock: this.state.codeBlocks[0]
		};
	}

	cancelCompose = (e?: Event) => {
		this.props.onClickClose && this.props.onClickClose(e);
	};

	render() {
		const { codeBlocks, scmError } = this.state;
		const { editingCodemark, currentReviewId } = this.props;

		const commentType = this.getCommentType();

		this.renderedCodeBlocks = {};

		// if you are conducting a review, and somehow are able to try to
		// create an issue or a permalink, stop the user from doing that
		if (commentType !== "comment" && currentReviewId) {
			return (
				<Modal translucent onClose={this.cancelCompose} verticallyCenter>
					<div style={{ width: "20em", fontSize: "larger", margin: "0 auto" }}>
						Sorry, you can't add an issue while doing a review. Mark your a comment as a "change
						request" instead.
						<div className="button-group one-button">
							<Button className="control-button" onClick={this.cancelCompose}>
								OK
							</Button>
						</div>
					</div>
				</Modal>
			);
		}
		if (scmError) {
			return (
				<Modal translucent onClose={this.cancelCompose} verticallyCenter>
					<div style={{ width: "20em", fontSize: "larger", margin: "0 auto" }}>
						Sorry, we encountered a git error: {scmError}
						<br />
						<br />
						<FormattedMessage id="contactSupport" defaultMessage="contact support">
							{text => <Link href="https://help.codestream.com">{text}</Link>}
						</FormattedMessage>
						<div className="button-group one-button">
							<Button className="control-button" onClick={this.cancelCompose}>
								Close
							</Button>
						</div>
					</div>
				</Modal>
			);
		}

		if (this.props.multiLocation || !editingCodemark) {
			return (
				<div className="full-height-codemark-form">
					<CancelButton onClick={this.cancelCompose} />
					<PanelHeader
						title={
							this.props.currentReviewId
								? "Add Comment to Review"
								: this.props.textEditorUriHasPullRequestContext
								? "Add Comment to Pull Request"
								: commentType === "comment"
								? "Add a Comment"
								: commentType === "link"
								? "Grab a Permalink"
								: "Open an Issue"
						}
					></PanelHeader>
					<span className="plane-container">
						<div className="codemark-form-container">{this.renderCodemarkForm()}</div>
						{false && commentType === "comment" && !codeBlocks[0] && (
							<VideoLink href={"https://youtu.be/RPaIIZgaFK8"}>
								<img src="https://i.imgur.com/9IKqpzf.png" />
								<span>Discussing Code with CodeStream</span>
							</VideoLink>
						)}
						{false && commentType === "issue" && !codeBlocks[0] && (
							<VideoLink href={"https://youtu.be/lUI110T_SHY"}>
								<img src="https://i.imgur.com/9IKqpzf.png" />
								<span>Ad-hoc Code Review</span>
							</VideoLink>
						)}
					</span>
				</div>
			);
		} else if (this.props.positionAtLocation) {
			if (codeBlocks[0]) {
				const lineNumber = codeBlocks[0].range.start.line;
				return (
					<ContainerAtEditorLine repositionToFit lineNumber={lineNumber} className="cs-has-form">
						<div className="codemark-form-container">{this.renderCodemarkForm()}</div>
					</ContainerAtEditorLine>
				);
			} else {
				return (
					<ContainerAtEditorSelection className="cs-has-form">
						<div className="codemark-form-container">{this.renderCodemarkForm()}</div>
					</ContainerAtEditorSelection>
				);
			}
		} else {
			return this.renderCodemarkForm();
		}
	}

	renderNotificationMessage = () => {
		// @ts-ignore
		const emails = keyFilter(this.state.emailAuthors);
		if (emails.length === 0) return null;
		return (
			<>
				<div style={{ height: "10px" }}></div>
				<CSText muted>
					<SmartFormattedList value={emails} /> will be notified via email
				</CSText>
			</>
		);
	};

	cancelCodemarkCompose = (e?) => {
		const { touchedText, type } = this.state;
		if (!this.props.onClickClose) return;
		// if there is codemark text, confirm the user actually wants to cancel
		if (touchedText && (type === "comment" || type === "issue")) {
			confirmPopup({
				title: "Are you sure?",
				message: "Changes will not be saved.",
				centered: true,
				buttons: [
					{ label: "Go Back", className: "control-button" },
					{
						label: `Discard ${type === "issue" ? "Issue" : "Comment"}`,
						wait: true,
						action: this.props.onClickClose,
						className: "delete"
					}
				]
			});
		} else {
			this.props.onClickClose(e);
		}
	};

	toggleEmail = (email: string) => {
		const { emailAuthors } = this.state;

		this.props.setUserPreference(["skipEmailingAuthors"], emailAuthors[email]);
		this.setState({ emailAuthors: { ...emailAuthors, [email]: !emailAuthors[email] } });
	};

	renderEmailAuthors = () => {
		const { unregisteredAuthors, emailAuthors, isPreviewing } = this.state;
		const { isCurrentUserAdmin } = this.props;

		if (isPreviewing) return null;
		if (unregisteredAuthors.length === 0) return null;

		return unregisteredAuthors.map(author => {
			return (
				<div className="checkbox-row">
					<Checkbox
						name={"email-" + author.email}
						checked={emailAuthors[author.email]}
						onChange={() => this.toggleEmail(author.email)}
					>
						Send to {author.username || author.email}&nbsp;&nbsp;
						<Icon
							name="info"
							title={
								<>
									Retrieved from git blame.
									{isCurrentUserAdmin && <p>Configure Blame Map under MY TEAM.</p>}
								</>
							}
							placement="top"
							delay={1}
							align={{ offset: [0, 5] }}
						/>
					</Checkbox>
				</div>
			);
		});
	};

	handleDragEnter = () => this.setState({ isDragging: this.state.isDragging + 1 });
	handleDragLeave = () => this.setState({ isDragging: this.state.isDragging - 1 });
	handleDrop = () => {
		this.setState({ isDragging: 0 });
	};

	renderCodemarkForm() {
		const { editingCodemark, currentUser } = this.props;
		const commentType = this.getCommentType();

		const titlePlaceholder =
			commentType === "issue"
				? "Title (required)"
				: commentType === "question"
				? "Question (required)"
				: commentType === "bookmark"
				? "Bookmark Name (optional)"
				: "Title (optional)";

		const modifier = navigator.appVersion.includes("Macintosh") ? "⌘" : "Ctrl";

		const submitTip =
			commentType === "link" ? (
				this.state.copied ? (
					"Copied!"
				) : this.state.linkURI ? (
					"Copy Link"
				) : (
					"Create Link"
				)
			) : commentType === "issue" ? (
				"Create Issue"
			) : commentType === "bookmark" ? (
				"Create Bookmark"
			) : (
				<span>
					Submit Comment<span className="keybinding extra-pad">{modifier} ENTER</span>
				</span>
			);

		const cancelTip = (
			<span>
				Discard Comment<span className="keybinding extra-pad">ESC</span>
			</span>
		);

		const locationItems: any[] = [];
		if (this.props.multipleMarkersEnabled && this.props.commentType !== "link")
			locationItems.push({ label: "Add Range", action: () => this.addLocation() });
		// { label: "Change Location", action: () => this.editLocation(0) }

		if (!this.props.multiLocation)
			locationItems.push({ label: "Select New Range", action: () => this.editLocation(0) });
		if (this.state.codeBlocks.length == 1)
			locationItems.push({ label: "Remove Location", action: () => this.deleteLocation(0) });

		const hasError = this.props.error != null && this.props.error !== "";

		const hasExistingPullRequestReview = !!(
			this.state.codeBlocks &&
			this.state.codeBlocks[0] &&
			this.state.codeBlocks[0].context &&
			this.state.codeBlocks[0].context.pullRequest &&
			!!this.state.codeBlocks[0].context.pullRequest.pullRequestReviewId
		);

		let linkWithCodeBlock = "";
		if (this.state.linkURI) {
			const codeBlock = this.state.codeBlocks[0];
			linkWithCodeBlock += this.state.linkURI + "\n\n*";
			const { scm, uri } = codeBlock;
			if (scm && scm.repoId) {
				const repo = this.props.repos[scm.repoId];
				if (repo) linkWithCodeBlock += "[" + repo.name + "] ";
			}
			if (scm && scm.file) {
				linkWithCodeBlock += scm.file;
			}
			linkWithCodeBlock += "*\n```\n" + codeBlock.contents + "\n```\n";
		}

		console.warn("IS DRAGGING: ", this.state.isDragging);
		return [
			<form
				id="code-comment-form"
				className={cx("codemark-form", "standard-form", {
					"active-drag": this.state.isDragging > 0
				})}
				key="two"
				onDragEnter={this.handleDragEnter}
				onDrop={this.handleDrop}
				onDragOver={e => e.preventDefault()}
				onDragLeave={this.handleDragLeave}
			>
				<fieldset className="form-body">
					{hasError && (
						<div className="error-message" style={{ marginTop: 10 }}>
							{this.props.error}
						</div>
					)}
					<div id="controls" className="control-group" key="controls1">
						<div key="headshot" className="headline">
							<Headshot person={currentUser} />
							<b>{currentUser.username}</b>
							{this.getCodeBlockHint()}
							{this.state.locationMenuOpen == "header" && (
								<Menu
									align="center"
									target={this.state.locationMenuTarget}
									items={locationItems}
									action={this.selectLocation}
								/>
							)}
						</div>
						{/* false && commentType === "bookmark" && (
							<div className="hint frame control-group" style={{ marginBottom: "10px" }}>
								{bookmarkTip}
							</div>
						) */}
						{commentType === "issue" && !this.props.isEditing && (
							<CrossPostIssueContext.Provider value={this._getCrossPostIssueContext()}>
								<CrossPostIssueControls />
							</CrossPostIssueContext.Provider>
						)}
						{(commentType === "issue" ||
							commentType === "question" ||
							commentType === "bookmark" ||
							commentType === "snippet") && (
							<div key="title" className="control-group">
								{this.renderTitleHelp()}
								<input
									key="title-text"
									type="text"
									name="title"
									className="input-text control"
									tabIndex={this.tabIndex()}
									value={this.state.title}
									onChange={e => this.setState({ title: e.target.value })}
									placeholder={titlePlaceholder}
									ref={ref => (this._titleInput = ref)}
								/>
							</div>
						)}
						{commentType === "issue" && (
							<div
								ref={this._assigneesContainerRef}
								key="members"
								id="members-controls"
								className="control-group"
								style={{ marginBottom: "10px" }}
							>
								{/*
									There's some magic here. The specific control components for the issue provider,
									will render the input for assignees in here. And since those components aren't used
									while editing, a disabled input will be rendered here.
								*/}
								{this.props.isEditing && (
									<Select
										key="input-assignees2"
										id="input-assignees"
										name="assignees"
										classNamePrefix="react-select"
										isMulti
										isDisabled
										value={this.state.assignees}
									/>
								)}
							</div>
						)}
						{this.renderTextHelp()}
						{commentType === "link" &&
							this.state.linkURI &&
							this.state.isPermalinkPublic && [
								<div key="permalink-warning" className="permalink-warning">
									<Icon name="alert" />
									Note that this is a public URL. Anyone with the link will be able to see the
									quoted code snippet.
								</div>
							]}
						{commentType === "link" &&
							this.state.linkURI && [
								<textarea
									key="link-offscreen"
									ref={this.permalinkRef}
									value={this.state.linkURI}
									style={{ position: "absolute", left: "-9999px" }}
								/>,
								<input type="text" className="permalink" value={this.state.linkURI} />,
								<textarea
									key="link-offscreen-2"
									ref={this.permalinkWithCodeRef}
									value={linkWithCodeBlock}
									style={{ position: "absolute", left: "-9999px" }}
								/>
							]}
						{commentType === "link" && !this.state.linkURI && (
							<div id="privacy-controls" className="control-group" key="1">
								<div className="public-private-hint" key="privacy-hint">
									{this.state.isPermalinkPublic
										? "Anyone can view this link, including the quoted codeblock."
										: "Only members of your team can access this link."}
								</div>
								<LabeledSwitch
									key="privacy"
									colored
									on={this.state.isPermalinkPublic}
									offLabel="Private"
									onLabel="Public"
									onChange={this.togglePermalinkPrivacy}
									height={28}
									width={90}
								/>
							</div>
						)}
						{commentType !== "bookmark" && commentType !== "link" && this.renderMessageInput()}
					</div>
					{false && (commentType === "comment" || commentType === "question") && (
						<div key="alert" className="checkbox-row" onClick={this.toggleNotify}>
							<input type="checkbox" checked={this.state.notify} /> Alert me if someone edits code
							in this range{"  "}
							<Tooltip title="Click to learn more">
								<span>
									<Icon className="clickable" onClick={this.showAlertHelp} name="info" />
								</span>
							</Tooltip>
						</div>
					)}
					<div style={{ clear: "both" }} />
					{/* this.renderPrivacyControls() */}
					{this.renderAttachedFiles()}
					{this.renderRelatedCodemarks()}
					{this.renderTags()}
					{!this.state.isPreviewing && this.renderCodeBlocks()}
					{this.props.multiLocation && <div style={{ height: "10px" }} />}
					{commentType !== "link" && this.renderEmailAuthors()}
					{commentType !== "link" && this.renderSharingControls()}
					{this.props.currentReviewId && this.renderRequireChange()}
					{!this.state.isPreviewing && (
						<div key="buttons" className="button-group float-wrap">
							<CancelButton
								toolTip={cancelTip}
								onClick={this.cancelCodemarkCompose}
								title={this.state.copied ? "Close" : "Cancel"}
								mode="button"
							/>
							{commentType === "link" && this.state.linkURI && !this.state.copied && (
								<Tooltip title={"Copy Link and Code Block (Markdown)"} placement="bottom" delay={1}>
									<Button
										key="copy-with-block"
										style={{
											paddingLeft: "10px",
											paddingRight: "10px",
											marginRight: 0
										}}
										className="control-button"
										type="submit"
										onClick={this.copyPermalinkWithCode}
									>
										Copy Link w/ Code Block
									</Button>
								</Tooltip>
							)}
							<Tooltip title={submitTip} placement="bottom" delay={1}>
								<Button
									key="submit"
									style={{
										paddingLeft: "10px",
										paddingRight: "10px",
										// fixed width to handle the isLoading case
										width:
											this.props.currentReviewId || this.props.textEditorUriHasPullRequestContext
												? "auto"
												: "80px",
										marginRight: 0
									}}
									className="control-button"
									type="submit"
									loading={this.state.isLoading}
									onClick={
										commentType === "link" && this.state.linkURI
											? this.copyPermalink
											: this.handleClickSubmit
									}
									disabled={
										hasError || (this.state.isInsidePrChangeSet && !!hasExistingPullRequestReview)
									}
								>
									{commentType === "link"
										? this.state.copied
											? "Copied!"
											: this.state.linkURI
											? "Copy Link"
											: "Create Link"
										: this.state.isChangeRequest
										? "Add Comment & Request Change"
										: this.props.currentReviewId
										? "Add Comment to Review"
										: this.props.textEditorUriHasPullRequestContext
										? "Add single comment"
										: this.props.editingCodemark
										? "Save"
										: "Submit"}
								</Button>
							</Tooltip>
							{this.props.textEditorUriHasPullRequestContext && this.state.isInsidePrChangeSet && (
								<Button
									key="submit-review"
									loading={this.state.isReviewLoading}
									disabled={hasError}
									onClick={e => {
										this.setState({ isProviderReview: true }, () => {
											this.handleClickSubmit(e);
										});
									}}
									style={{
										paddingLeft: "10px",
										paddingRight: "10px",
										// fixed width to handle the isReviewLoading case
										width: "auto",
										marginRight: 0
									}}
									className="control-button"
									type="submit"
								>
									{hasExistingPullRequestReview && <>Add to review</>}
									{!hasExistingPullRequestReview && <>Start a review</>}
								</Button>
							)}
							{/*
							<span className="hint">Styling with Markdown is supported</span>
						*/}
						</div>
					)}
					<div key="clear" style={{ clear: "both" }} />
				</fieldset>
			</form>
		];
		// 	<span className="hixnt" style={{ grid: "none" }}>
		// 	<input type="checkbox" />
		// 	Open automatically on selection
		// </span>
		// 	<input
		// 	id="radio-comment-type-snippet"
		// 	type="radio"
		// 	name="comment-type"
		// 	checked={commentType === "snippet"}
		// 	onChange={e => this.setCommentType("snippet")}
		// />
		// <label
		// 	htmlFor="radio-comment-type-snippet"
		// 	className={createClassString({
		// 		checked: commentType === "snippet"
		// 	})}
		// >
		// 	<Icon name="code" /> <span>Snippet</span>
		// </label>
	}
}

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

const mapStateToProps = (state: CodeStreamState): ConnectedProps => {
	const {
		context,
		editorContext,
		users,
		teams,
		session,
		preferences,
		providers,
		codemarks,
		repos
	} = state;
	const user = users[session.userId!] as CSMe;
	const channel = context.currentStreamId
		? getStreamForId(state.streams, context.currentTeamId, context.currentStreamId) ||
		  getStreamForTeam(state.streams, context.currentTeamId)
		: getStreamForTeam(state.streams, context.currentTeamId);

	const teamMates = getTeamMates(state);
	const teamMembers = getTeamMembers(state);
	const teamTagsArray = getTeamTagsArray(state);

	const channelStreams = getChannelStreamsForTeam(state, context.currentTeamId);

	const skipPostCreationModal = preferences ? preferences.skipPostCreationModal : false;
	const skipEmailingAuthors = preferences ? preferences.skipEmailingAuthors : false;

	const team = teams[context.currentTeamId];
	const adminIds = team.adminIds || EMPTY_ARRAY;
	const removedMemberIds = team.removedMemberIds || EMPTY_ARRAY;
	const isCurrentUserAdmin = adminIds.includes(session.userId || "");
	const blameMap = team.settings ? team.settings.blameMap : EMPTY_OBJECT;
	const inviteUsersOnTheFly =
		isFeatureEnabled(state, "emailSupport") && isFeatureEnabled(state, "inviteUsersOnTheFly");
	const textEditorUriContext = parseCodeStreamDiffUri(editorContext.textEditorUri!);

	return {
		repos,
		channel,
		teamMates,
		teamMembers,
		removedMemberIds,
		currentTeamId: state.context.currentTeamId,
		blameMap: blameMap || EMPTY_OBJECT,
		isCurrentUserAdmin,
		activePanel: context.panelStack[0] as WebviewPanels,
		shouldShare:
			safe(() => state.preferences[state.context.currentTeamId].shareCodemarkEnabled) || false,
		channelStreams: channelStreams,
		issueProvider: providers[context.issueProvider!],
		currentPullRequestId: state.context.currentPullRequest
			? state.context.currentPullRequest.id
			: undefined,
		providerInfo: (user.providerInfo && user.providerInfo[context.currentTeamId]) || EMPTY_OBJECT,
		teamProvider: getCurrentTeamProvider(state),
		currentUser: user,
		skipPostCreationModal,
		skipEmailingAuthors,
		selectedStreams: preferences.selectedStreams || EMPTY_OBJECT,
		showChannels: context.channelFilter,
		textEditorUri: editorContext.textEditorUri,
		textEditorSelection: getCurrentSelection(editorContext),
		textEditorUriContext: textEditorUriContext,
		textEditorUriHasPullRequestContext: !!(
			textEditorUriContext &&
			textEditorUriContext.context &&
			textEditorUriContext.context.pullRequest &&
			textEditorUriContext.context.pullRequest.id
		),
		teamTagsArray,
		codemarkState: codemarks,
		multipleMarkersEnabled: isFeatureEnabled(state, "multipleMarkers"),
		currentReviewId: context.currentReviewId,
		inviteUsersOnTheFly
	};
};

const ConnectedCodemarkForm = connect(mapStateToProps, {
	openPanel,
	openModal,
	setUserPreference
})(CodemarkForm);

export { ConnectedCodemarkForm as CodemarkForm };
