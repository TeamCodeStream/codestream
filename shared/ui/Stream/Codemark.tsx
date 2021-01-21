import cx from "classnames";
import React from "react";
import { connect } from "react-redux";
import { Range } from "vscode-languageserver-protocol";
import { fetchThread, setCodemarkStatus, setUserPreference, createPost } from "./actions";
import Headshot from "./Headshot";
import Tag from "./Tag";
import Icon from "./Icon";
import Menu from "./Menu";
import { InjectAsComment } from "./InjectAsComment";
import { RepositionCodemark } from "./RepositionCodemark";
import { markdownify } from "./Markdowner";
import Timestamp from "./Timestamp";
import CodemarkDetails from "./CodemarkDetails";
import {
	DocumentMarker,
	CodemarkPlus,
	Capabilities,
	MarkerNotLocated
} from "@codestream/protocols/agent";
import {
	CodemarkType,
	CSUser,
	CSMe,
	CSPost,
	CSReview,
	CodemarkStatus
} from "@codestream/protocols/api";
import { HostApi } from "../webview-api";
import {
	FollowCodemarkRequestType,
	SetCodemarkPinnedRequestType
} from "@codestream/protocols/agent";
import { range, emptyArray, emptyObject } from "../utils";
import {
	getUserByCsId,
	getTeamMembers,
	getUsernames,
	getTeamTagsHash
} from "../store/users/reducer";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { CodemarkForm } from "./CodemarkForm";
import {
	deleteCodemark,
	editCodemark,
	addCodemarks,
	NewCodemarkAttributes
} from "../store/codemarks/actions";
import { confirmPopup } from "./Confirm";
import { getPost } from "../store/posts/reducer";
import { getPosts } from "../store/posts/actions";
import Tooltip from "./Tooltip";
import { getCurrentTeamProvider } from "../store/teams/reducer";
import { isNil } from "lodash-es";
import { CodeStreamState } from "../store";
import {
	EditorHighlightRangeRequestType,
	EditorHighlightRangeRequest,
	EditorSelectRangeRequestType,
	EditorSelectRangeRequest,
	EditorRevealRangeRequestType,
	OpenUrlRequestType
} from "@codestream/protocols/webview";
import {
	setCurrentCodemark,
	repositionCodemark,
	setCurrentReview,
	setCurrentPullRequest
} from "../store/context/actions";
import { RelatedCodemark } from "./RelatedCodemark";
import { addDocumentMarker } from "../store/documentMarkers/actions";
import { Link } from "./Link";
import { getDocumentFromMarker } from "./api-functions";
import { SharingModal } from "./SharingModal";
import { getReview } from "../store/reviews/reducer";
import { DropdownButton } from "./Review/DropdownButton";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { HeadshotName } from "../src/components/HeadshotName";
import { PRCodeCommentPatch } from "./PullRequestComponents";
import { PullRequestPatch } from "./PullRequestPatch";
import MarkerActions from "./MarkerActions";
import { MarkdownText } from "./MarkdownText";
import { AddReactionIcon, Reactions } from "./Reactions";
import { Attachments } from "./Attachments";

interface State {
	hover: boolean;
	isEditing: boolean;
	isInjecting: boolean;
	injectingLocation?: string;
	menuOpen?: boolean;
	menuTarget?: any;
	shareModalOpen: boolean;
	showDiffHunk: boolean;
}

interface DispatchProps {
	createPost: typeof createPost;
	deleteCodemark: typeof deleteCodemark;
	editCodemark: typeof editCodemark;
	fetchThread: typeof fetchThread;
	setCodemarkStatus: typeof setCodemarkStatus;
	setUserPreference: typeof setUserPreference;
	getPosts: typeof getPosts;
	setCurrentCodemark: typeof setCurrentCodemark;
	repositionCodemark: typeof repositionCodemark;
	addDocumentMarker: typeof addDocumentMarker;
	addCodemarks: typeof addCodemarks;
	setCurrentReview: typeof setCurrentReview;
	setCurrentPullRequest: typeof setCurrentPullRequest;
}

interface ConnectedProps {
	teammates: CSUser[];
	usernames: string[];
	author: CSUser;
	capabilities: Capabilities;
	codemarkKeybindings: { [key: string]: string };
	currentUser: CSMe;
	editorHasFocus: boolean;
	pinnedReplies: CSPost[];
	pinnedAuthors: CSUser[];
	relatedCodemarkIds: string[];
	isCodeStreamTeam: boolean;
	teamTagsHash: any;
	codeWasDeleted?: boolean;
	codeWillExist?: boolean;
	missingCanonicalCommit?: boolean;
	codeNotInCurrentBranch?: boolean;
	textEditorUri: string;
	jumpToMarkerId?: string;
	currentMarkerId?: string;
	isRepositioning?: boolean;
	review?: CSReview;
	post?: CSPost;
	moveMarkersEnabled: boolean;
}

export type DisplayType = "default" | "collapsed" | "activity";

interface InheritedProps {
	contextName?: "Spatial View" | "Codemarks Tab" | "Sidebar";
	displayType?: DisplayType;
	selected?: boolean;
	codemark?: CodemarkPlus;
	marker: DocumentMarker | MarkerNotLocated;
	postAction?(...args: any[]): any;
	action(action: string, post: any, args: any): any;
	onClick?(event: React.SyntheticEvent, marker: DocumentMarker | MarkerNotLocated): any;
	highlightCodeInTextEditor?: boolean;
	query?: string;
	hidden?: boolean;
	deselectCodemarks?: Function;
	wrap?: boolean;
}

type Props = InheritedProps & DispatchProps & ConnectedProps;

export class Codemark extends React.Component<Props, State> {
	static defaultProps: Partial<Props> = {
		displayType: "default"
	};

	private _pollingTimer?: any;

	// when there's no `marker` prop (in CodemarkView), the info required to highlight the range needs to be retrieved and stored
	private _markersToHighlight: { [markerId: string]: { range: Range; fileUri: string } } = {};
	private _isHighlightedInTextEditor = false; // TODO: when there are multiple markers, this should be inside _markersToHighlight
	private permalinkRef = React.createRef<HTMLTextAreaElement>();
	private skipMarkers: number[] = [];

	constructor(props: Props) {
		super(props);
		this.state = {
			hover: false,
			isEditing: false,
			isInjecting: false,
			menuOpen: false,
			shareModalOpen: false,
			showDiffHunk: false
		};
	}

	componentDidMount() {
		const { codemark, pinnedReplies, getPosts, selected } = this.props;
		if (codemark != undefined) {
			if (
				codemark.pinnedReplies &&
				codemark.pinnedReplies.length > 0 &&
				pinnedReplies.length === 0
			) {
				getPosts(codemark.streamId, codemark.pinnedReplies!, codemark.postId);
			}
		}

		if (selected) {
			this.startPollingReplies(false);
		}
	}

	componentDidUpdate(prevProps: Props, _prevState: State) {
		if (prevProps.selected && !this.props.selected) {
			this.stopPollingReplies();
		} else if (this.props.selected && this._pollingTimer === undefined) {
			this.startPollingReplies(true);
		}

		// if selected codemark changes, then clean up highlight in file and highlight for new codemark
		if (
			prevProps.codemark &&
			this.props.codemark &&
			prevProps.codemark.id !== this.props.codemark.id &&
			this.props.selected
		) {
			this._cleanUpHighlights();
		}
	}

	componentWillUnmount() {
		this.stopPollingReplies();
		this._cleanUpHighlights();
	}

	private _cleanUpHighlights() {
		for (let { fileUri, range } of Object.values(this._markersToHighlight)) {
			this._sendHighlightRequest({
				uri: fileUri,
				range: range,
				highlight: false
			});
		}
		this._markersToHighlight = {};
	}

	private startPollingReplies(prefetch: boolean) {
		if (this.props.capabilities.providerSupportsRealtimeEvents) return;

		if (prefetch) {
			this.fetchReplies();
		}

		if (this._pollingTimer !== undefined) return;

		this._pollingTimer = setInterval(() => {
			if (this.props.editorHasFocus) {
				this.fetchReplies();
			}
		}, 5000);
	}

	private stopPollingReplies() {
		if (this._pollingTimer === undefined) return;

		clearInterval(this._pollingTimer);
		this._pollingTimer = undefined;
	}

	private async fetchReplies() {
		if (this.props.codemark == undefined) return;

		const postId = this.props.codemark.postId;
		// because the codemark is created before the third party chat post,
		// `postId` can be undefined for a period. in the case of ms teams at least,
		// that period can be long enough that if a user attempts to expand the newly created codemark,
		// postId will still be nil
		if (isNil(postId) || postId === "") return;

		return this.props.fetchThread(this.props.codemark.streamId, this.props.codemark.postId);
	}

	render() {
		if (this.state.shareModalOpen)
			return (
				<SharingModal
					codemark={this.props.codemark!}
					onClose={() => this.setState({ shareModalOpen: false })}
				/>
			);
		if (this.state.isEditing)
			return (
				<div className="editing-codemark-container">
					<CodemarkForm
						isEditing
						editingCodemark={this.props.codemark}
						commentType={this.props.codemark!.type}
						onSubmit={this.editCodemark}
						onClickClose={this.cancelEditing}
						streamId={this.props.codemark!.streamId}
						collapsed={false}
					/>
				</div>
			);

		switch (this.props.displayType) {
			case "collapsed":
				return this.renderCollapsedCodemark();
			case "activity":
			case "default":
			default:
				return this.renderInlineCodemark();
		}
	}

	cancelEditing = () => {
		this.setState({ isEditing: false });
	};

	cancelInjecting = () => {
		this.setState({ isInjecting: false });
	};

	editCodemark = async (attributes: NewCodemarkAttributes) => {
		const {
			text,
			assignees,
			title,
			relatedCodemarkIds,
			tags,
			codeBlocks,
			deleteMarkerLocations
		} = attributes;
		this.props.editCodemark(this.props.codemark!, {
			text,
			title,
			assignees,
			relatedCodemarkIds,
			tags,
			codeBlocks,
			deleteMarkerLocations
		});
		this.setState({ isEditing: false });
	};

	renderTextReplaceCodeBlocks = (text: string) => {
		const { codemark, capabilities } = this.props;
		if (!codemark || !codemark.markers) return <MarkdownText text={text} inline={true} />;

		const blocks: any[] = [];
		const groups = text.split(/\[#(\d+)]/);
		let index = 0;
		this.skipMarkers = [];
		while (index < groups.length) {
			blocks.push(<MarkdownText text={groups[index]} />);
			if (index + 1 < groups.length) {
				const markerIndex = parseInt(groups[index + 1], 10);
				if (markerIndex > 0) {
					const marker = codemark.markers[markerIndex - 1];
					if (marker) {
						this.skipMarkers.push(markerIndex - 1);
						blocks.push(
							<div key={index}>
								<MarkerActions
									key={marker.id}
									codemark={codemark}
									marker={marker}
									capabilities={capabilities}
									isAuthor={false}
									alwaysRenderCode
									markerIndex={index}
									selected={true}
									noMargin
								/>
							</div>
						);
					}
				}
			}
			index += 2;
		}
		return <>{blocks}</>;
	};

	renderTypeIcon() {
		const { codemark } = this.props;
		if (!codemark) return null;

		const { externalProvider } = codemark;
		if (externalProvider) {
			const providerDisplay = PROVIDER_MAPPINGS[externalProvider];
			if (providerDisplay && providerDisplay.icon)
				return <Icon name={providerDisplay.icon} className="type-icon" />;
		}
		switch (codemark.type) {
			case "question":
				return <Icon name="question" className="type-icon" />;
			case "bookmark":
				return <Icon name="bookmark" className="type-icon" />;
			case "trap":
				return <Icon name="trap" className="type-icon" />;
			case "issue":
				return <Icon name="issue" className="type-icon" />;
			default:
				return <Icon name="comment" className="type-icon" />;
		}
	}

	// renderVisibilitySelected = () => {
	// 	return this.props.usersWithAccess.length > 0 ? (
	// 		<div className="related" style={{ marginBottom: "0" }}>
	// 			<div className="related-label">Visible to</div>
	// 			{mapFilter(this.props.usersWithAccess, user =>
	// 				user.id !== this.props.currentUser.id ? (
	// 					<span style={{ marginRight: "5px" }}>
	// 						<Headshot size={18} person={user} />
	// 						<span>{user.username}</span>
	// 					</span>
	// 				) : null
	// 			)}
	// 			<div style={{ clear: "both" }} />
	// 		</div>
	// 	) : null;
	// };

	renderTagsAndAssigneesSelected = codemark => {
		const renderedTagsSelected = this.renderTagsSelected(codemark);
		const renderedAssigneesSelected = this.renderAssigneesSelected(codemark);

		if (renderedTagsSelected && renderedAssigneesSelected) {
			return (
				<div className="related-row" style={{ display: "flex" }}>
					{renderedTagsSelected}
					{renderedAssigneesSelected}
				</div>
			);
		} else {
			return [renderedTagsSelected, renderedAssigneesSelected];
		}
	};

	renderTagsSelected = codemark => {
		const renderedTags = this.renderTags(codemark);

		if (!renderedTags) return null;

		// we use a 5px margin bottom instead of the standard 10px of the .related
		// style because each tag has a 5px bottom margin
		return (
			<div className="related">
				<div className="related-label">Tags</div>
				<div style={{ marginBottom: "-5px" }}>
					{renderedTags}
					<div style={{ clear: "both" }} />
				</div>
			</div>
		);
	};

	renderAssigneesSelected = codemark => {
		const renderedAssignees = this.renderAssignees(codemark, true);

		if (!renderedAssignees) return null;

		return (
			<div className="related">
				<div className="related-label">Assignees</div>
				{renderedAssignees}
				<div style={{ clear: "both" }} />
			</div>
		);
	};

	renderTags = codemark => {
		let { tags = [] } = codemark;
		const { teamTagsHash, selected } = this.props;
		const { hover } = this.state;

		// don't display this tooltip right now because showing matching tags is not a feature yet
		// const title = hover && !selected ? "Show matching tags" : "";

		// LEGACY (backward compat) we used to store one "color" property on a codemark
		// so now we promote it to a tag if it exists. We should remove this code if we
		// do a data migration that removes ".color" attributes and replaces them with
		// tags. note that we don't do any backward compat if tags have been set
		if (tags.length === 0 && codemark.color) {
			const tag = { id: "_" + codemark.color, label: "", color: codemark.color };
			return <Tag tag={tag} placement="bottom" />;
		}

		return tags.length === 0
			? null
			: tags.map(tagId => {
					const tag = teamTagsHash[tagId];
					return tag ? <Tag key={tagId} tag={tag} placement="bottom" /> : null;
			  });
	};

	renderRelatedCodemarks = () => {
		const { relatedCodemarkIds } = this.props;

		if (relatedCodemarkIds.length === 0) return null;

		return (
			<div className="related" key="related-codemarks">
				<div className="related-label">Related</div>
				{relatedCodemarkIds.map(id => (
					<RelatedCodemark id={id} />
				))}
				<div style={{ clear: "both" }} />
			</div>
		);
	};

	handleClickStatusToggle = (event: React.SyntheticEvent): any => {
		event.stopPropagation();
		this.toggleStatus();
	};

	toggleStatus = () => {
		const { codemark } = this.props;
		if (codemark!.status === "closed") this.openIssue();
		else this.closeIssue();
	};

	closeIssue = () => {
		const { codemark, setCodemarkStatus } = this.props;
		setCodemarkStatus(codemark!.id, "closed");
		// this.submitReply("/me closed this issue");
	};

	openIssue = () => {
		const { codemark, setCodemarkStatus } = this.props;
		setCodemarkStatus(codemark!.id, "open");
		// this.submitReply("/me reopened this issue");
	};

	submitReply = text => {
		const { action, codemark } = this.props;
		const forceThreadId = codemark!.parentPostId || codemark!.postId;
		action("submit-post", null, { forceStreamId: codemark!.streamId, forceThreadId, text });
	};

	renderStatus(codemark, menuItems = [] as any[]) {
		const { isChangeRequest, type, status = "open" } = codemark;

		if (this.state.isInjecting) return null;

		const resolveItem = { label: "Resolve", action: this.toggleStatus };
		const reopenItem = { label: "Reopen", action: this.toggleStatus };

		const permalinkTextarea = (
			<textarea
				key="permalink-offscreen"
				ref={this.permalinkRef}
				value={codemark.permalink}
				style={{ position: "absolute", left: "-9999px" }}
			/>
		);

		if (isChangeRequest || type === CodemarkType.Issue) {
			if (this.props.displayType === "default") {
				if (codemark.status === CodemarkStatus.Closed) {
					menuItems.unshift(reopenItem, { label: "-" });
					return (
						<DropdownButton size="compact" variant="secondary" items={menuItems}>
							Resolved
							{permalinkTextarea}
						</DropdownButton>
					);
				} else {
					menuItems.unshift(resolveItem, { label: "-" });
					return (
						<DropdownButton size="compact" items={menuItems}>
							Open
							{permalinkTextarea}
						</DropdownButton>
					);
				}
			} else {
				return null;
				// return (
				// 	<div className="align-far-left">
				// 		<div
				// 			className={cx("status-button", { checked: status === "closed" })}
				// 			onClick={this.handleClickStatusToggle}
				// 		>
				// 			<Icon name="check" className="check" />
				// 		</div>
				// 	</div>
				// );
			}
		}
		return null;
	}

	handleClickCodemark = (event: React.MouseEvent): any => {
		const target = event && (event.target as HTMLElement);

		if (this.state.isInjecting) return false;

		if (target) {
			if (
				target.tagName === "A" ||
				target.closest(".post.reply") ||
				target.closest(".external-provider")
			)
				return false;
		}

		if (target && (target.classList.contains("info") || target.closest(".info"))) {
			return false;
		}

		event.preventDefault();

		// in codemarkview, toggling by the header doesn't seem like a good idea
		// if (this.props.selected) {
		// 	if (target && (target.classList.contains("header") || target.closest(".header"))) {
		// 		this.props.setCurrentCodemark();
		// 	}
		// 	if (target && target.closest(".related-codemarks")) {
		// 		this.props.setCurrentCodemark();
		// 	}
		// 	return;
		// }

		const selection = window.getSelection();
		if (selection != null && selection.toString().length > 0) {
			// in this case the user has selected a string
			// by dragging
			return;
		}

		if (!this.props.selected) {
			HostApi.instance.track("Codemark Clicked", {
				"Codemark ID": this.props.codemark!.id,
				"Codemark Location": this.props.contextName ? this.props.contextName : undefined
			});
		}

		if (this.props.onClick) {
			this.props.onClick(event, this.props.marker);
		} else {
			if (!this.props.selected && this.props.codemark)
				this.props.setCurrentCodemark(
					this.props.codemark.id,
					this.props.marker ? this.props.marker.id : undefined
				);
		}
	};

	private _sendHighlightRequest(request: EditorHighlightRangeRequest) {
		HostApi.instance.send(EditorHighlightRangeRequestType, request);
	}

	private _sendSelectRequest(request: EditorSelectRangeRequest) {
		HostApi.instance.send(EditorSelectRangeRequestType, request);
	}

	jumpToMarker = markerId => {
		getDocumentFromMarker(markerId).then(info => {
			if (info) {
				const uri = info.textDocument.uri;

				this._markersToHighlight[markerId] = {
					fileUri: uri,
					range: info.range
				};
				if (info.range) {
					const position = { line: info.range.start.line, character: 0 };
					const range = { start: position, end: position, cursor: position };
					this._sendSelectRequest({ uri, selection: range });
					this._sendHighlightRequest({ uri, range, highlight: true });
				}
			}
		});
	};

	toggleCodeHighlightInTextEditor = async (
		highlight: boolean,
		forceRemoval = false,
		// markerId is optionally passed in when we want to highlight a specific codeblock
		markerId?: string
	) => {
		const { codemark, selected, marker } = this.props;
		if (selected) return;

		const selectedMultiMarker =
			selected && codemark && codemark.markers && codemark.markers.length > 1;

		// if the codemark is selected, and has multiple markers, and nobody told us which
		// marker to highlight explicitly, then don't do anything by default, because each
		// individual marker is going to highlight itself when hovering on that codeblock
		if (selectedMultiMarker && !markerId) return;

		// don't do anything if trying to highlight already highlighted code
		if (!selectedMultiMarker && highlight && this._isHighlightedInTextEditor) return;
		// require explicitly forcing de-highlighting while selected
		if (!selectedMultiMarker && selected && this._isHighlightedInTextEditor && !forceRemoval)
			return;

		if (markerId && codemark && codemark.markers) {
			getDocumentFromMarker(markerId).then(info => {
				if (info && info.range) {
					this._markersToHighlight[markerId] = {
						fileUri: info.textDocument.uri,
						range: info.range
					};
					this._sendHighlightRequest({ uri: info.textDocument.uri, range: info.range, highlight });
				}
			});
			return;
		}

		if (marker) {
			this._isHighlightedInTextEditor = highlight;
			// @ts-ignore
			if (marker.range) {
				// @ts-ignore
				this._sendHighlightRequest({ uri: marker.fileUri, range: marker.range, highlight });
			}
		} else {
			for (let { fileUri: uri, range } of Object.values(this._markersToHighlight)) {
				this._isHighlightedInTextEditor = highlight;
				this._sendHighlightRequest({ uri, range, highlight });
			}
		}

		// if (jump) {
		// 	await HostApi.instance.send(EditorSelectRangeRequestType, {
		// 		uri: this._fileUri[marker.id],
		// 		// Ensure we put the cursor at the right line (don't actually select the whole range)
		// 		selection: {
		// 			start: this._range[marker.id].start,
		// 			end: this._range[marker.id].start,
		// 			cursor: this._range[marker.id].start
		// 		},
		// 		preserveFocus: true
		// 	});
		// } else {
		// 	// don't jump to a new file to highlight it, unless we explicitly ask to
		// 	if (this._fileUri[marker.id] !== this.props.textEditorUri) return;
		// }

		// this._isHighlightedInTextEditor = highlight;
		// HostApi.instance.send(EditorHighlightRangeRequestType, {
		// 	uri: this._fileUri[marker.id],
		// 	range: this._range[marker.id],
		// 	highlight: highlight
		// });
	};

	handleMouseEnterCodemark = (event: React.MouseEvent): any => {
		event.preventDefault();
		this.setState({ hover: true });
		this.props.highlightCodeInTextEditor && this.toggleCodeHighlightInTextEditor(true);
	};

	handleMouseLeaveCodemark = (event: React.MouseEvent): any => {
		event.preventDefault();
		this.setState({ hover: false });
		this.props.highlightCodeInTextEditor && this.toggleCodeHighlightInTextEditor(false);
	};

	handleMenuClick = (event: React.MouseEvent) => {
		event.stopPropagation();
		this.setState({ menuOpen: !this.state.menuOpen, menuTarget: event.target });
	};

	handleSelectMenu = (action, arg) => {
		this.setState({ menuOpen: false });

		if (!action) return;

		switch (action) {
			case "edit-post": {
				// TODO: ideally should also open the <CodemarkView/> but that's more complicated
				// if (!this.props.selected) this.props.setCurrentCodemark(this.props.codemark.id);
				this.setState({ isEditing: true });
				break;
			}
			case "follow": {
				this.followCodemark();
				break;
			}
			case "unfollow": {
				this.unfollowCodemark();
				break;
			}
		}
		const found = action.match(/set-keybinding-(\d)/);
		if (found) this.setKeybinding(found[1]);
	};

	deleteCodemark = () => {
		const { codemark } = this.props;
		if (!codemark) return;
		const type = codemark.type === "issue" ? "Issue" : "Comment";
		confirmPopup({
			title: "Are you sure?",
			message: "Deleting cannot be undone.",
			centered: true,
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Delete " + type,
					className: "delete",
					wait: true,
					action: () => {
						this.props.deleteCodemark(this.props.codemark!.id);
						this.props.setCurrentCodemark();
					}
				}
			]
		});
	};

	setPinned = value => {
		const { codemark, marker } = this.props;
		if (!codemark) return;

		// if it's pinned, we're hiding/archiving/unpinning it
		if (!value) {
			if (this.props.deselectCodemarks) this.props.deselectCodemarks();
		}

		const updatedCodemark: CodemarkPlus = { ...codemark, pinned: value };

		// updating optimistically. because spatial view renders DocumentMarkers, the corresponding one needs to be updated too
		// @ts-ignore
		if (marker && marker.fileUri != undefined) {
			// @ts-ignore
			this.props.addDocumentMarker(marker.fileUri, {
				...marker,
				codemark: updatedCodemark,
				codemarkId: marker.codemarkId!,
				externalContent: undefined
			} as DocumentMarker);
		}
		this.props.addCodemarks([updatedCodemark]);

		HostApi.instance.send(SetCodemarkPinnedRequestType, {
			codemarkId: codemark.id,
			value
		});
	};

	toggleLabelIndicators = (_event: React.SyntheticEvent) => {
		// event.stopPropagation();
		// HostApi.instance.send(UpdateConfigurationRequestType, {
		// 	name: "showLabelText",
		// 	value: !this.props.showLabelText
		// });
		// this.setState({ showLabelText: !this.state.showLabelText });
	};

	followCodemark = () => {
		const { codemark } = this.props;
		HostApi.instance.send(FollowCodemarkRequestType, {
			codemarkId: codemark!.id,
			value: true
		});
		HostApi.instance.track("Notification Change", {
			Change: "Codemark Followed",
			"Source of Change": "Codemark menu"
		});
	};

	unfollowCodemark = () => {
		const { codemark } = this.props;
		HostApi.instance.send(FollowCodemarkRequestType, {
			codemarkId: codemark!.id,
			value: false
		});
		HostApi.instance.track("Notification Change", {
			Change: "Codemark Unfollowed",
			"Source of Change": "Codemark menu"
		});
	};

	renderCollapsedCodemark() {
		const { codemark, marker } = this.props;

		const lines: string | undefined = (() => {
			if (!marker) return;
			//@ts-ignore
			const range = marker.range;
			if (range) {
				if (range.start.line == range.end.line) return `Line ${range.start.line}`;
				else return `Lines ${range.start.line}-${range.end.line}`;
			} else return;
		})();

		if (!codemark && !marker) return null;

		// it's a document marker without a codemark
		if (!codemark) {
			if (this.props.marker.externalContent) return this.renderCollapsedFromExternalContent();
			return null;
		}

		const renderedTags = this.renderTags(codemark);
		return (
			<div
				id={`codemark-${codemark.id}`}
				className={cx("codemark", { collapsed: !this.props.wrap, wrap: this.props.wrap })}
				onClick={this.handleClickCodemark}
				onMouseEnter={this.handleMouseEnterCodemark}
				onMouseLeave={this.handleMouseLeaveCodemark}
			>
				<div className="contents">
					{this.renderStatus(codemark)}
					<div style={{ display: "flex", alignItems: "flex-start" }}>
						<span style={{ flexGrow: 0, flexShrink: 0 }} className={codemark.color}>
							{this.renderTypeIcon()}
						</span>
						<div className="body" style={{ flexGrow: 10 }}>
							<MarkdownText text={codemark.title || codemark.text} inline={true} />
							{renderedTags && <span className="cs-tag-container">{renderedTags}</span>}
						</div>
						{codemark.numReplies > 0 && (
							<span className="badge" style={{ marginLeft: "10px", flexGrow: 0, flexShrink: 0 }}>
								{codemark.numReplies}
							</span>
						)}
						{false && lines && (
							<span
								style={{ marginLeft: "auto", paddingLeft: "15px", opacity: 0.75 }}
								className="subtle"
							>
								{lines}
							</span>
						)}
					</div>
				</div>
			</div>
		);
	}

	setKeybinding(key) {
		const { codemark, codemarkKeybindings } = this.props;

		const bindings = { ...codemarkKeybindings };

		for (const [k, codemarkId] of Object.entries(codemarkKeybindings)) {
			if (codemarkId !== codemark!.id) continue;

			bindings[k] = "";
		}
		bindings[key] = codemark!.id;

		this.props.setUserPreference(["codemarkKeybindings"], bindings);
	}

	renderKeybinding(codemark) {
		const { codemarkKeybindings } = this.props;

		const found = Object.entries(codemarkKeybindings).find(
			([, codemarkId]) => codemarkId === codemark.id
		);
		if (found == null) return null;

		const [index] = found;
		if (parseInt(index, 10) > 0) {
			const modifier = navigator.appVersion.includes("Macintosh") ? "^ /" : "Ctrl-Shift-/";
			return (
				<div style={{ float: "right", marginRight: "10px", opacity: 0.6 }}>
					<span className="keybinding extra-pad">{modifier}</span>
					<span className="keybinding extra-pad">{index}</span>
				</div>
			);
		}

		return null;
	}

	renderAttachments = post => {
		if (!post) return null;
		if (post.files && post.files.length > 0) {
			return (
				<div className="related">
					<div className="related-label">Attachments</div>

					{post.files.map((file, index) => {
						// console.log(file);
						//<img src={preview.url} width={preview.width} height={preview.height} />
						const { mimetype = "", url, name } = file;
						const isImage = mimetype.startsWith("image");
						return (
							<div
								key={index}
								className="attachment clickable"
								onClick={e => {
									e.preventDefault();
									HostApi.instance.send(OpenUrlRequestType, { url });
								}}
							>
								<span>
									<Icon name="paperclip" />
								</span>
								<span>{name}</span>
								<span>
									<Icon name="download" className="clickable" />
								</span>
							</div>
						);

						// if (mimetype.startsWith("image")) {
						// 	return (
						// 		<div className="thumbnail">
						// 			<Link href={url}>
						// 				<img src={url} />
						// 			</Link>
						// 		</div>
						// 	);
						// } else {
						// 	return (
						// 		<div className="attachment">
						// 			<Link href={url}>{name}</Link>
						// 		</div>
						// 	);
						// }
					})}
				</div>
			);
		}
		return null;
	};

	renderReplyCount = post => {
		let message = "";
		const { codemark } = this.props;

		if (!codemark) return null;

		const numReplies = codemark.numReplies || "0";
		switch (codemark.type) {
			case "question":
				message = numReplies === 1 ? "1 Answer" : `${numReplies} Answers`;
				break;
			default:
				message = numReplies === 1 ? "1 Reply" : `${numReplies} Replies`;
				break;
		}
		return <a className="num-replies">{message}</a>;
	};

	renderAssignees = (codemark: CodemarkPlus, showNames?: boolean) => {
		const { hover } = this.state;
		const { selected } = this.props;

		let assigneeIcons: any = null;

		const { teammates } = this.props;
		if (teammates) {
			const assignees = (codemark.assignees || [])
				.map(id => teammates.find(t => t.id === id))
				.filter(Boolean) as CSUser[];
			const externalAssignees = (codemark.externalAssignees || [])
				.filter(user => !assignees.find(a => a.email === user.email))
				.filter(Boolean)
				.map(a => ({ fullName: a.displayName, email: a.email }));

			const assigneeHeadshots = [...assignees, ...externalAssignees].map(a => {
				if (hover && !selected) {
					return (
						<Tooltip
							title={"Assigned to " + (a.fullName || a.email)}
							placement="bottomRight"
							align={{ offset: [17, 4] }}
						>
							<span>
								<Headshot size={18} person={a} />
							</span>
						</Tooltip>
					);
				} else if (showNames) {
					return (
						<div style={{ marginTop: "3px" }}>
							<Headshot size={18} person={a} />
							<span className={cx({ "at-mention me": a.email === this.props.currentUser.email })}>
								{a.fullName || a.email}
							</span>
						</div>
					);
				} else return <Headshot size={18} person={a} />;
			});

			if (assigneeHeadshots.length > 0) {
				assigneeIcons = <span className="assignees">{assigneeHeadshots}</span>;
			}
		}
		return assigneeIcons;
	};

	renderExternalLink = codemark => {
		if (codemark.externalProviderUrl) {
			const providerDisplay = PROVIDER_MAPPINGS[codemark.externalProvider];
			if (!providerDisplay) {
				return null;
			}
			return (
				<div className="related">
					<div className="related-label">Linked issues</div>
					<Link className="external-link" href={codemark.externalProviderUrl}>
						{providerDisplay.icon && (
							<span>
								<Icon name={providerDisplay.icon} />
							</span>
						)}
						{providerDisplay.displayName}
						<span className="external-url">{codemark.externalProviderUrl}</span>
					</Link>
				</div>
			);
		}
		return null;
	};

	copyPermalink = () => {
		if (this.permalinkRef.current) {
			this.permalinkRef.current.select();
			document.execCommand("copy");
		}
	};

	renderDetailIcons = codemark => {
		const { hover } = this.state;
		const { selected, relatedCodemarkIds } = this.props;

		const hasDescription = codemark.title && codemark.text;
		const hasReplies = codemark.numReplies > 0;

		let externalLink: any = null;
		if (codemark.externalProviderUrl) {
			//@ts-ignore
			const providerDisplay = PROVIDER_MAPPINGS[codemark.externalProvider];
			if (!providerDisplay) return null;
			const icon = providerDisplay.icon;
			if (!icon) return null;
			externalLink = (
				<span
					className="detail-icon"
					onClickCapture={e => {
						e.preventDefault();
						HostApi.instance.send(OpenUrlRequestType, { url: codemark.externalProviderUrl });
					}}
				>
					<Icon
						title={hover && !selected ? "Open on " + providerDisplay.displayName : undefined}
						placement="bottom"
						name={icon}
						className="external-provider"
					/>
				</span>
			);
		}

		const renderedTags = this.renderTags(codemark);

		const renderedAssignees = this.renderAssignees(codemark);

		const numMarkers = codemark.markers ? codemark.markers.length : 0;

		const following =
			codemark && (codemark.followerIds || []).indexOf(this.props.currentUser.id) !== -1;

		// const privateIndicator = (() => {
		// 	if (!this.props.isCodeStreamTeam || this.props.usersWithAccess.length === 0) return null;
		//
		// 	const usernames = mapFilter(this.props.usersWithAccess, user =>
		// 		user.id !== this.props.currentUser.id ? user.username : undefined
		// 	);
		//
		// 	const tooltipText = `Visible to ${(() => {
		// 		switch (usernames.length) {
		// 			case 1:
		// 				return usernames[0];
		// 			case 2:
		// 				return usernames.join(" and ");
		// 			case 3: {
		// 				const [first, second, third] = usernames;
		// 				return `${first}, ${second} and ${third}`;
		// 			}
		// 			default: {
		// 				const [first, second, third, ...others] = usernames;
		// 				return `${first}, ${second}, ${third} and ${others.length} others`;
		// 			}
		// 		}
		// 	})()}`;
		//
		// 	return (
		// 		<span className="detail-icon">
		// 			<Icon
		// 				name="lock"
		// 				title={hover && !selected ? tooltipText : undefined}
		// 				placement="bottom"
		// 			/>
		// 		</span>
		// 	);
		// })();

		if (
			relatedCodemarkIds.length ||
			renderedTags ||
			externalLink ||
			hasDescription ||
			hasReplies ||
			renderedAssignees ||
			numMarkers > 1 ||
			following
			// || privateIndicator
		) {
			return (
				<div className="detail-icons">
					{following && (
						<span className="detail-icon">
							<Icon
								title={hover && !selected ? "You are following this codemark" : undefined}
								placement="bottomRight"
								name="eye"
								align={{ offset: [22, 4] }}
							/>
						</span>
					)}
					{/* privateIndicator */}
					{renderedTags}
					{renderedAssignees}
					{externalLink}
					{hasDescription && (
						<span className="detail-icon">
							<Icon
								title={hover && !selected ? "Show description" : undefined}
								placement="bottom"
								name="description"
							/>
						</span>
					)}
					{numMarkers > 1 && (
						<span className="detail-icon">
							<Icon
								title={hover && !selected ? "Multiple code locations" : undefined}
								placement="bottom"
								name="code"
							/>{" "}
							{numMarkers}
						</span>
					)}
					{relatedCodemarkIds.length > 0 && (
						<span className="detail-icon">
							<Icon
								title={hover && !selected ? "Show related codemarks" : undefined}
								placement="bottom"
								name="codestream"
							/>{" "}
							{relatedCodemarkIds.length}
						</span>
					)}
					{hasReplies && (
						<span className="detail-icon">
							<Icon
								title={hover && !selected ? "Show replies" : undefined}
								placement="bottom"
								name="comment"
							/>{" "}
							{this.props.isCodeStreamTeam && codemark.numReplies}
						</span>
					)}
				</div>
			);
		}
		return null;
	};

	setInjecting = (markerId: string) => {
		this.jumpToMarker(markerId);
		// this.toggleCodeHighlightInTextEditor(true, false, markerId, true);
		this.setState({ isInjecting: true, injectingLocation: markerId });
	};

	startRepositioning = (codemarkId, markerId, value) => {
		this.props.repositionCodemark(codemarkId, markerId, value);
		this.toggleCodeHighlightInTextEditor(false, true);
		this._cleanUpHighlights();
	};

	renderInlineCodemark() {
		const {
			codemark,
			codemarkKeybindings,
			hidden,
			selected,
			codeWasDeleted,
			codeWillExist,
			missingCanonicalCommit,
			codeNotInCurrentBranch,
			author,
			marker,
			isRepositioning,
			repositionCodemark
		} = this.props;
		const { menuOpen, menuTarget, isInjecting } = this.state;

		if (!codemark) {
			if (this.props.marker.externalContent) return this.renderFromExternalContent();
			return null;
		}

		const renderExpandedBody = selected || this.props.displayType === "activity";
		const renderAlternateBody = isInjecting;

		const type = codemark && codemark.type;

		const mine = author && author.id === this.props.currentUser.id;

		let menuItems: any[] = [
			{
				label: "Share",
				key: "share",
				action: () => this.setState({ shareModalOpen: true })
			}
			// { label: "Add Reaction", action: "react" },
			// { label: "Get Permalink", action: "get-permalink" },
			// { label: "-" }
		];

		if (!codemark || !codemark.reviewId) {
			if (codemark && (codemark.followerIds || []).indexOf(this.props.currentUser.id) !== -1) {
				menuItems.push({ label: "Unfollow", action: this.unfollowCodemark });
			} else {
				menuItems.push({ label: "Follow", action: this.followCodemark });
			}
		}

		menuItems.push({ label: "Copy link", action: this.copyPermalink });

		if (codemark.pinned) {
			menuItems.push({
				label: "Archive",
				action: () => this.setPinned(!this.props.codemark!.pinned)
			});
		} else {
			menuItems.push({
				label: "Unarchive",
				action: () => this.setPinned(!this.props.codemark!.pinned)
			});
		}

		if (mine) {
			menuItems.push(
				{ label: "Edit", action: () => this.setState({ isEditing: true }) },
				{ label: "Delete", action: this.deleteCodemark }
			);
		}

		if (renderExpandedBody && codemark.markers && codemark.markers.length > 1) {
			const submenu = codemark.markers.map((m, index) => {
				let label = "At Code Location #" + (index + 1);
				return { label, action: () => this.setInjecting(m.id), key: index };
			});
			menuItems.push({ label: "Inject as Inline Comment", submenu: submenu, key: "inject" });
		} else if (codemark.markers && codemark.markers[0]) {
			const m = codemark.markers[0];
			menuItems.push({
				label: "Inject as Inline Comment",
				action: () => this.setInjecting(m.id),
				key: "inject"
			});
		}

		if (this.props.moveMarkersEnabled && repositionCodemark) {
			if (renderExpandedBody && codemark.markers && codemark.markers.length > 1) {
				const submenu = codemark.markers.map((m, index) => {
					let label = "Code Location #" + (index + 1);
					return {
						label,
						action: () => this.startRepositioning(codemark.id, m.id, true),
						key: index
					};
				});
				menuItems.push({ label: "Reposition Codemark", submenu: submenu, key: "reposition" });
			} else if (codemark.markers && codemark.markers[0]) {
				const m = codemark.markers[0];
				menuItems.push({
					label: "Reposition Codemark",
					action: () => this.startRepositioning(codemark.id, m.id, true),
					key: "reposition"
				});
			}
		}

		const submenu = range(1, 10).map(index => {
			const inUse = codemarkKeybindings[index] ? " (in use)" : "";
			return {
				label: `${index}${inUse}`,
				action: `set-keybinding-${index}`
			};
		});

		// menuItems.push({ label: "Set Keybinding", action: "set-keybinding", submenu: submenu });

		const description =
			codemark.title && codemark.text ? <MarkdownText text={codemark.text} inline={true} /> : null;

		// show a striped header if the codemark is selected, or unhidden, and it matches
		// manual-archive, resolved, or deleted state
		const showStripedHeader =
			(renderExpandedBody || !hidden) &&
			(!codemark.pinned ||
				codemark.status === "closed" ||
				codeWasDeleted ||
				codeWillExist ||
				missingCanonicalCommit ||
				codeNotInCurrentBranch ||
				// @ts-ignore
				(marker && marker.notLocatedReason));

		if (isRepositioning) {
			return (
				<RepositionCodemark
					codemark={codemark}
					markerId={this.props.currentMarkerId!} /*range={this_.range} file={this._fileUri}*/
				/>
			);
		}

		// if it's archived or we've lost the position, and it's just
		// an emoji, then return
		// if (showStripedHeader && type == CodemarkType.Reaction) return null;

		// const isReaction = codemark.text.trim().match(/^(:[\w_+]+:|\s)+$/);

		// if (false && isReaction && !renderExpandedBody) {
		// 	return (
		// 		<div
		// 			onMouseEnter={this.handleMouseEnterCodemark}
		// 			onMouseLeave={this.handleMouseLeaveCodemark}
		// 			style={{ display: "flex", alignItems: "center" }}
		// 		>
		// 			<div><MarkdownText text={codemark.title || codemark.text} inline={true} /></div>
		// 			<div className="author" style={{ paddingLeft: "10px" }}>
		// 				<b>{author.username}</b>
		// 				<Timestamp relative time={codemark.createdAt} />
		// 			</div>
		// 		</div>
		// 	);
		// }

		const re = /\[#(\d+)]/g;
		const matchingLocatedBlocks = {};
		let match;
		while ((match = re.exec(codemark.title || codemark.text))) {
			matchingLocatedBlocks[match[1]] = true;
		}

		return (
			<div
				className={cx("codemark inline type-" + type, {
					// if it's selected, we don't render as hidden
					"cs-hidden": !renderExpandedBody ? hidden : false,
					// collapsed: !selected,
					selected: selected,
					unpinned: !codemark.pinned,
					injecting: isInjecting,
					repositioning: isRepositioning,
					"has-striped-header": showStripedHeader
				})}
				onClick={this.handleClickCodemark}
				onMouseEnter={this.handleMouseEnterCodemark}
				onMouseLeave={this.handleMouseLeaveCodemark}
			>
				<div className="contents">
					{showStripedHeader && (
						<div className="striped-header">
							{// foo
							// @ts-ignore
							marker && marker.notLocatedReason && (
								<>
									Position lost for this codemark
									{this.props.moveMarkersEnabled && (
										<Tooltip
											title="Connect this codemark to a block of code in this file or another"
											placement="topRight"
											delay={1}
										>
											<div className="right">
												<div
													className="resolve-button reposition-button"
													onClick={e => {
														e.stopPropagation();
														this.props.repositionCodemark(codemark.id, marker.id, true);
													}}
												>
													Reposition
												</div>
											</div>
										</Tooltip>
									)}
								</>
							)}
							{!codemark.pinned && <div>This codemark is archived.</div>}
							{codemark.status == "closed" && <div>This codemark is resolved.</div>}
							{codeWasDeleted && <div>This codemark refers to deleted code.</div>}
							{codeWillExist && (
								<div>
									This codemark refers to code that will exist on a future version of this file.
								</div>
							)}
							{missingCanonicalCommit && (
								<div>
									This codemark refers to code that does not exist in the local git repository.
								</div>
							)}
							{codeNotInCurrentBranch && (
								<div>This codemark refers to code that does not exist in the current branch.</div>
							)}
						</div>
					)}
					<div className="body">
						<div className="header">
							{!renderExpandedBody && type === "bookmark" ? (
								<>
									<span className={codemark.color}>{this.renderTypeIcon()}</span>
									<MarkdownText text={codemark.title || codemark.text} inline={true} />
									<div className="right">
										<span onClick={this.handleMenuClick}>
											{menuOpen && (
												<Menu
													items={menuItems}
													target={menuTarget}
													action={this.handleSelectMenu}
												/>
											)}
											<Icon name="kebab-vertical" className="kebab-vertical clickable" />
										</span>
									</div>
								</>
							) : (
								<>
									<div className="author">
										<Headshot person={author} />
										{author.username}
										<span className="verb">
											{codemark.type === "issue" ? " opened an issue " : ""}
										</span>
										<Timestamp relative time={codemark.createdAt} />
									</div>
									<div className="right" style={{ alignItems: "center" }}>
										{type !== CodemarkType.Issue && (
											<span onClick={this.handleMenuClick}>
												<Icon name="kebab-vertical" className="kebab-vertical clickable" />
											</span>
										)}
										{this.renderStatus(codemark, menuItems)}
										{this.props.post && <AddReactionIcon post={this.props.post} />}
										{/* this.renderKeybinding(codemark) */}
										{menuOpen && (
											<Menu items={menuItems} target={menuTarget} action={this.handleSelectMenu} />
										)}
									</div>
								</>
							)}
						</div>
						{menuOpen && (
							<textarea
								key="permalink-offscreen"
								ref={this.permalinkRef}
								value={codemark.permalink}
								style={{ position: "absolute", left: "-9999px" }}
							/>
						)}
						<div
							style={{ position: "absolute", top: "5px", right: "5px" }}
							onClick={this.handleMenuClick}
						>
							{menuOpen && (
								<Menu items={menuItems} target={menuTarget} action={this.handleSelectMenu} />
							)}
						</div>
						{!renderAlternateBody && (renderExpandedBody || type !== "bookmark")
							? this.renderTextReplaceCodeBlocks(codemark.title || codemark.text)
							: null}
						{!renderExpandedBody && !renderAlternateBody && this.renderPinnedReplies()}
						{!renderExpandedBody && !renderAlternateBody && this.renderDetailIcons(codemark)}
						{isInjecting && (
							<InjectAsComment
								cancel={this.cancelInjecting}
								setPinned={this.setPinned}
								codemark={codemark}
								markerId={this.state.injectingLocation}
								author={author}
							/>
						)}
					</div>
					{renderExpandedBody && !renderAlternateBody && (
						<CodemarkDetails
							codemark={codemark}
							author={this.props.author}
							postAction={this.props.postAction}
							displayType={this.props.displayType}
							skipMarkers={this.skipMarkers}
						>
							<div className="description">
								{/* this.renderVisibilitySelected() */}
								{this.props.review != null && (
									<div className="related">
										<div className="related-label">Feedback Request</div>
										<div className="description-body">
											<Link
												className="external-link"
												onClick={() => {
													this.props.setCurrentCodemark();
													this.props.setCurrentReview(this.props.review!.id);
												}}
											>
												<Icon name="review" />
												{this.props.review.title}
											</Link>
										</div>
									</div>
								)}
								{this.renderTagsAndAssigneesSelected(codemark)}
								{this.props.post && <Attachments post={this.props.post} />}
								{description && (
									<div className="related">
										<div className="related-label">Description</div>
										<div className="description-body" style={{ display: "flex" }}>
											<Icon name="description" />
											<div className="description-text" style={{ paddingLeft: "5px" }}>
												{description}
											</div>
										</div>
									</div>
								)}
								{this.props.post && <Reactions className="no-pad-left" post={this.props.post} />}
								{this.renderExternalLink(codemark)}
								{this.renderRelatedCodemarks()}
								{this.renderPinnedRepliesSelected()}
							</div>
						</CodemarkDetails>
					)}
					{false && this.state.hover && !renderExpandedBody && type !== "bookmark" && (
						<div className="info-wrapper">
							<Icon
								className="info"
								title={this.renderCodemarkFAQ()}
								placement="bottomRight"
								delay={1}
								name="info"
							/>
						</div>
					)}
				</div>
			</div>
		);
	}

	renderFromExternalContent() {
		const { hidden, selected, author, marker } = this.props;
		const externalContent = marker.externalContent!;
		const providerName = externalContent.provider.name;
		// FIXME better id lookup (we only support GH here)
		const providerId = providerName === "GitHub" ? "github*com" : undefined;

		const pullOrMergeRequestText = providerName === "GitLab" ? "merge" : "pull";

		return (
			<div
				className={cx("codemark inline", {
					// if it's selected, we don't render as hidden
					"cs-hidden": !selected ? hidden : false,
					selected: selected
				})}
				onClick={e => {
					e.preventDefault();
					// @ts-ignore
					HostApi.instance.send(EditorRevealRangeRequestType, {
						// @ts-ignore
						uri: marker.fileUri,
						// @ts-ignore
						range: marker.range,
						preserveFocus: true
					});
					if (providerId && externalContent.externalId) {
						this.props.setCurrentPullRequest(providerId!, externalContent.externalId);
					}
				}}
				onMouseEnter={this.handleMouseEnterCodemark}
				onMouseLeave={this.handleMouseLeaveCodemark}
			>
				<div className="contents">
					<div className="body">
						<div className="header">
							<div className="author">
								<span style={{ paddingRight: "5px" }}>
									<Icon name={externalContent.provider.icon || "codestream"} />
								</span>
								{author.username}{" "}
								<span className="verb">commented on {pullOrMergeRequestText} request </span>
								{externalContent.title}{" "}
								<span className="verb subtle">{externalContent.subhead}</span>
								<Timestamp relative time={marker.createdAt} />
							</div>
							{/* <div className="right">
								<span onClick={this.handleMenuClick}>
									<Icon name="kebab-vertical" className="kebab-vertical clickable" />
								</span>
							</div> */}
						</div>
						{/*
							<div
								style={{ position: "absolute", top: "5px", right: "5px" }}
								onClick={this.handleMenuClick}
							></div> */}
						{externalContent.diffHunk && this.state.showDiffHunk && (
							<PRCodeCommentPatch>
								<PullRequestPatch patch={externalContent.diffHunk} filename={marker.file} />
							</PRCodeCommentPatch>
						)}
						<MarkdownText text={marker.summary} inline={true} />
						{!selected && this.renderPinnedReplies()}
						{!selected && this.renderDetailIcons(marker)}
						{((marker.externalContent!.actions || emptyArray).length > 0 ||
							externalContent.diffHunk ||
							externalContent.externalId) && (
							<div style={{ marginTop: "10px" }}>
								{externalContent.diffHunk && (
									<span
										style={{ marginRight: "10px" }}
										onClick={e => {
											e.preventDefault();
											e.stopPropagation();
											this.setState({ showDiffHunk: !this.state.showDiffHunk });
										}}
									>
										<Icon name="diff" className="margin-right" />
										{this.state.showDiffHunk ? "Hide" : "Show"} Diff
									</span>
								)}
								{providerId && externalContent.externalId && (
									<span
										style={{ marginRight: "10px" }}
										onClick={() =>
											this.props.setCurrentPullRequest(
												providerId!,
												externalContent.externalId!,
												externalContent.externalChildId
											)
										}
									>
										<Icon name="pull-request" className="margin-right" />
										View Pull Request
									</span>
								)}

								{(marker.externalContent!.actions || emptyArray).map(action => (
									<span key={action.uri} style={{ marginRight: "10px" }}>
										<span style={{ marginRight: "5px" }}>
											<Icon name={action.icon || "link-external"} />
										</span>
										<Link
											onClick={e => {
												e.preventDefault();
												HostApi.instance.send(OpenUrlRequestType, { url: action.uri });
												HostApi.instance.track("PR Comment Action", {
													Host: marker.externalContent!.provider.name,
													"Action Label": action.label
												});
											}}
										>
											{action.label}
										</Link>
									</span>
								))}
							</div>
						)}
					</div>
					{/* selected && (
						<CodemarkDetails
							codemark={codemark}
							author={this.props.author}
							postAction={this.props.postAction}
						>
							<div className="description">
								{this.renderTagsAndAssigneesSelected(codemark)}
								{description && (
									<div className="related">
										<div className="related-label">Description</div>
										<div className="description-body" style={{ display: "flex" }}>
											<Icon name="description" />
											<div className="description-text" style={{ paddingLeft: "5px" }}>
												{description}
											</div>
										</div>
									</div>
								)}
								{this.renderExternalLink(codemark)}
								{this.renderRelatedCodemarks()}
								{this.renderPinnedRepliesSelected()}
							</div>
						</CodemarkDetails>
					) */}
					{/* this.state.hover && !selected && type !== "bookmark" && (
						<div className="info-wrapper">
							<Icon
								className="info"
								title={this.renderCodemarkFAQ()}
								placement="bottomRight"
								delay={1}
								name="info"
							/>
						</div>
					) */}
				</div>
			</div>
		);
	}

	renderCollapsedFromExternalContent() {
		const { marker } = this.props;
		const externalContent = marker.externalContent!;
		const providerName = externalContent.provider.name;
		// FIXME better id lookup (we only support GH here)
		const providerId = providerName === "GitHub" ? "github*com" : undefined;

		const pullOrMergeRequestText = providerName === "GitLab" ? "Merge" : "Pull";

		const lines: string | undefined = (() => {
			if (!marker) return;
			//@ts-ignore
			const range = marker.range;
			if (range) {
				if (range.start.line == range.end.line) return `Line ${range.start.line}`;
				else return `Lines ${range.start.line}-${range.end.line}`;
			} else return;
		})();

		return (
			<div
				className={cx("codemark collapsed", { wrap: this.props.wrap })}
				onClick={e => {
					e.preventDefault();
					// @ts-ignore
					HostApi.instance.send(EditorRevealRangeRequestType, {
						// @ts-ignore
						uri: marker.fileUri,
						// @ts-ignore
						range: marker.range,
						preserveFocus: true
					});
					if (providerId && externalContent.externalId) {
						this.props.setCurrentPullRequest(
							providerId!,
							externalContent.externalId,
							externalContent.externalChildId
						);
					}
				}}
				onMouseEnter={this.handleMouseEnterCodemark}
				onMouseLeave={this.handleMouseLeaveCodemark}
			>
				<div className="contents">
					<div className="body" style={{ display: "flex", alignItems: "flex-start" }}>
						<span style={{ flexGrow: 0, flexShrink: 0 }}>
							<Icon name={externalContent.provider.icon || "codestream"} className="margin-right" />
						</span>
						<div>
							<MarkdownText text={marker.summary} inline={true} />
							{lines && (
								<span style={{ paddingLeft: "15px", opacity: 0.75 }} className="subtle">
									{lines}
								</span>
							)}
						</div>
						{/*
						<div className="actions">
							{((marker.externalContent!.actions || emptyArray).length > 0 ||
								externalContent.diffHunk ||
								externalContent.externalId) && (
								<>
									{externalContent.diffHunk && (
										<span
											onClick={e => {
												e.preventDefault();
												e.stopPropagation();
												this.setState({ showDiffHunk: !this.state.showDiffHunk });
											}}
										>
											<Icon
												name="diff"
												className="margin-right"
												title="Show Diff"
												delay={1}
												placement="bottom"
											/>
										</span>
									)}
									{providerId && externalContent.externalId && (
										<span
											onClick={() =>
												this.props.setCurrentPullRequest(providerId!, externalContent.externalId!)
											}
										>
											<Icon
												name="pull-request"
												className="margin-right"
												title={`View ${pullOrMergeRequestText} Request`}
												delay={1}
												placement="bottom"
											/>
										</span>
									)}

									{(marker.externalContent!.actions || emptyArray).map(action => (
										<span key={action.uri}>
											<span style={{ marginRight: "5px" }}>
												<Icon
													title={action.label}
													delay={1}
													placement="bottom"
													name={action.icon || "link-external"}
												/>
											</span>
											<Link
												onClick={e => {
													e.preventDefault();
													HostApi.instance.send(OpenUrlRequestType, { url: action.uri });
													HostApi.instance.track("PR Comment Action", {
														Host: marker.externalContent!.provider.name,
														"Action Label": action.label
													});
												}}
											>
												{action.label}
											</Link>
										</span>
									))}
								</>
							)}
											</div> */}
					</div>
				</div>
			</div>
		);
	}

	renderPinnedRepliesSelected() {
		const renderedPinnedReplies = this.renderPinnedReplies();

		if (renderedPinnedReplies) {
			return (
				<div className="related">
					<div className="related-label">Starred Replies</div>
					<div style={{ margin: "-5px 0 0 0" }}>{renderedPinnedReplies}</div>
				</div>
			);
		} else return null;
	}

	renderPinnedReplies() {
		const { pinnedReplies = [] } = this.props;

		if (pinnedReplies.length === 0) return null;
		return (
			<div className="pinned-replies">
				{pinnedReplies.map((post, i) => {
					return (
						<div className="pinned-reply">
							<Icon className="pinned-reply-star" name="star" />{" "}
							<Headshot size={18} person={this.props.pinnedAuthors[i]} />
							<div className="pinned-reply-body">
								<MarkdownText text={post.text} inline={true} />
							</div>
						</div>
					);
				})}
			</div>
		);
	}

	renderCodemarkFAQ() {
		return (
			<div className="codemark-faq">
				Just like Twitter has Tweets, CodeStream uses Codemarks as a unit of conversation.
				<ul style={{ paddingLeft: "20px" }}>
					<li>
						Codemarks are <b>branch-agnostic</b>. That means this codemark will appear "in the right
						place" even for your teammates who are checked out to a different version of this file.{" "}
						<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">learn more</a>
					</li>
					<li>
						Codemarks <b>move with the code</b>, so your conversation remains connected to the right
						code block even as your code changes.{" "}
						<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">
							learn about comment drift
						</a>
					</li>
					<li>
						Codemarks <b>can be managed</b> by archiving or deleting them if they're no longer
						relevant.{" "}
						<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">see how</a>
					</li>
					<li>
						<b>Replies can be promoted</b> with a <Icon name="star" /> so the best answer surfaces
						to the top, like in stack overflow.{" "}
						<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">see how</a>
					</li>
				</ul>
			</div>
		);
	}

	renderDemoShit(codemark) {
		const user = {
			username: "pez",
			email: "pez@codestream.com",
			fullName: "Peter Pezaris"
		};
		return (
			<div>
				{codemark.text &&
					codemark.text.startsWith("does this") && [
						<div className="pinned-reply">
							<Icon name="star" /> <Headshot size={18} person={user} />
							<div className="pinned-reply-body">
								no; the javascript byte compiler optimizes it away
							</div>
						</div>,
						<div className="pinned-reply">
							<Icon name="star" /> <Headshot size={18} person={user} />
							<div className="pinned-reply-body">are you sure?</div>
						</div>
					]}
				{codemark.title && codemark.title.startsWith("let's avoid") && (
					<div className="pinned-reply">
						<Icon name="star" /> <Headshot size={18} person={user} />
						<div className="pinned-reply-body">i'll grab this in the next sprint</div>
					</div>
				)}
				{codemark.text && codemark.text.startsWith("how does") && (
					<div className="pinned-reply">
						<Icon name="star" /> <Headshot size={18} person={user} />
						<div className="pinned-reply-body">
							Sample <code>n</code> random values from a collection using the modern version of the{" "}
							<b>Fisher-Yates</b> shuffle. If <code>n</code> is not specified, returns a single
							random element. The internal <code>guard</code> argument allows it to work with{" "}
							<code>map</code>.
						</div>
					</div>
				)}
			</div>
		);
	}
}

const unknownAuthor = {
	username: "CodeStream",
	fullName: "Unknown User"
};

const mapStateToProps = (state: CodeStreamState, props: InheritedProps): ConnectedProps => {
	const { capabilities, context, editorContext, preferences, users, session, posts } = state;
	const { codemark, marker } = props;

	const post =
		codemark && codemark.postId ? getPost(posts, codemark!.streamId, codemark.postId) : undefined;

	const pinnedReplies = ((codemark && codemark.pinnedReplies) || emptyArray)
		.map(id => getPost(posts, codemark!.streamId, id))
		.filter(Boolean);

	const pinnedAuthors = pinnedReplies.map(post => users[post.creatorId]);

	const relatedCodemarkIds = (codemark && codemark.relatedCodemarkIds) || emptyArray;

	const teamTagsHash = getTeamTagsHash(state);

	// @ts-ignore
	const meta = marker && marker.location && marker.location.meta;
	const codeWasDeleted =
		meta &&
		meta.entirelyDeleted &&
		(meta.isDescendant ||
			(meta.createdAtCurrentCommit && marker.creatorId === state.session.userId));
	const codeWillExist =
		meta &&
		meta.entirelyDeleted &&
		(meta.isAncestor || (meta.createdAtCurrentCommit && marker.creatorId !== state.session.userId));
	const missingCanonicalCommit =
		!codeWasDeleted &&
		!codeWillExist &&
		meta &&
		meta.entirelyDeleted &&
		meta.canonicalCommitDoesNotExist;
	const codeNotInCurrentBranch =
		meta && meta.entirelyDeleted && !missingCanonicalCommit && !codeWillExist && !codeWasDeleted;

	const author = (() => {
		if (codemark != undefined) {
			return getUserByCsId(users, codemark.creatorId);
		}

		if (marker.externalContent != undefined) {
			return {
				username: marker.creatorName,
				avatar: { image: marker.externalContent.provider.name },
				fullName: ""
			} as CSUser;
		}
		return unknownAuthor;
	})();

	const review =
		codemark != null && codemark.reviewId != null
			? getReview(state.reviews, codemark.reviewId)
			: undefined;

	return {
		post,
		review,
		capabilities: capabilities,
		editorHasFocus: context.hasFocus,
		jumpToMarkerId: context.currentMarkerId,
		currentMarkerId: context.currentMarkerId,
		pinnedReplies,
		pinnedAuthors,
		relatedCodemarkIds,
		currentUser: users[session.userId!] as CSMe,
		author: author as CSUser,
		codemarkKeybindings: preferences.codemarkKeybindings || emptyObject,
		isCodeStreamTeam: true /*teamProvider === "codestream",*/, // this should always be true now, even for SSO sign-in
		teammates: getTeamMembers(state),
		usernames: getUsernames(state),
		teamTagsHash,
		codeWasDeleted,
		codeWillExist,
		missingCanonicalCommit,
		codeNotInCurrentBranch,
		textEditorUri: editorContext.textEditorUri || "",
		isRepositioning: context.isRepositioning,
		moveMarkersEnabled: isFeatureEnabled(state, "moveMarkers2")
	};
};

export default connect(
	// @ts-ignore
	mapStateToProps,
	{
		setCodemarkStatus,
		setUserPreference,
		deleteCodemark,
		editCodemark,
		fetchThread,
		getPosts,
		setCurrentCodemark,
		repositionCodemark,
		addDocumentMarker,
		addCodemarks,
		createPost,
		setCurrentReview,
		setCurrentPullRequest
	}
	// @ts-ignore
)(Codemark);
