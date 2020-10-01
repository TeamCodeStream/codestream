import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect, batch } from "react-redux";
import * as userSelectors from "../store/users/reducer";
import Icon from "./Icon";
import ScrollBox from "./ScrollBox";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import Tooltip from "./Tooltip"; // careful with tooltips on codemarks; they are not performant
import { ReviewNav } from "./ReviewNav";
import Feedback from "./Feedback";
import cx from "classnames";
import {
	range,
	debounceToAnimationFrame,
	isNotOnDisk,
	ComponentUpdateEmitter,
	isRangeEmpty,
	uriToFilePath,
	safe
} from "../utils";
import { HostApi } from "../webview-api";
import {
	EditorRevealRangeRequestType,
	EditorSelection,
	EditorMetrics,
	EditorScrollToNotificationType,
	EditorScrollMode,
	NewCodemarkNotificationType,
	WebviewPanels,
	ReviewCloseDiffRequestType,
	LocalFilesCloseDiffRequestType
} from "../ipc/webview.protocol";
import {
	DocumentMarker,
	DidChangeDocumentMarkersNotificationType,
	GetFileScmInfoResponse,
	GetFileScmInfoRequestType,
	MarkerNotLocated
} from "@codestream/protocols/agent";
import { Range, Position } from "vscode-languageserver-types";
import { fetchDocumentMarkers, addDocumentMarker } from "../store/documentMarkers/actions";
import {
	getCurrentSelection,
	getVisibleLineCount,
	getVisibleRanges,
	ScmError,
	getFileScmError,
	mapFileScmErrorForTelemetry
} from "../store/editorContext/reducer";
import { CSTeam, CodemarkType } from "@codestream/protocols/api";
import {
	setCodemarksFileViewStyle,
	setCodemarksShowArchived,
	setCurrentCodemark,
	repositionCodemark,
	setComposeCodemarkActive,
	closeAllPanels
} from "../store/context/actions";
import { sortBy as _sortBy } from "lodash-es";
import { setEditorContext, changeSelection } from "../store/editorContext/actions";
import { CodeStreamState } from "../store";
import ContainerAtEditorLine from "./SpatialView/ContainerAtEditorLine";
import { CodemarkForm } from "./CodemarkForm";
import { middlewareInjector } from "../store/middleware-injector";
import { DocumentMarkersActionsType } from "../store/documentMarkers/types";
import { createPostAndCodemark } from "./actions";
import Codemark from "./Codemark";
import { PostEntryPoint } from "../store/context/types";
import { localStore } from "../utilities/storage";
import { PRInfoModal } from "./SpatialView/PRInfoModal";
import { isConnected } from "../store/providers/reducer";
import { confirmPopup } from "./Confirm";
import ComposeTitles from "./ComposeTitles";
import { Switch } from "../src/components/controls/Switch";
import {
	NewCodemarkAttributes,
	isCreateCodemarkError,
	canCreateCodemark
} from "../store/codemarks/actions";
import styled from "styled-components";
import { PanelHeader } from "../src/components/PanelHeader";
import * as fs from "../utilities/fs";
import { FileInfo } from "./FileInfo";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { supportsIntegrations } from "../store/configs/reducer";
import { Keybindings } from "./Keybindings";
import { setNewPostEntry } from "../store/context/actions";
import { PullRequest } from "./PullRequest";
import { Modal } from "./Modal";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//   Note that there is a big potential for off-by-one errors in this file, because the webview line numbers are
//   0-based, and the linenumbers in the editor are 1-based. I've tried to make it more clear which is which by
//   naming the 0-based line number variables with a "0" at the end, for example line0 or lineNum0. Hopefully
//   this helps avoid some confusion... please stick with this paradigm unless you really hate it, in which case
//   please talk to me first. Thanks. -Pez
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface Props {
	showFeedbackSmiley: boolean;
	hasPRProvider: boolean;
	showPRComments: boolean;
	currentStreamId?: string;
	team: CSTeam;
	viewInline: boolean;
	viewHeadshots: boolean;
	showLabelText: boolean;
	showHidden: boolean;
	fileNameToFilterFor?: string;
	scmInfo?: GetFileScmInfoResponse;
	textEditorUri?: string;
	textEditorLineCount: number;
	firstVisibleLine: number;
	lastVisibleLine: number;
	numLinesVisible: number;
	textEditorVisibleRanges?: Range[];
	textEditorSelection?: EditorSelection;
	metrics: EditorMetrics;
	documentMarkers: (DocumentMarker | MarkerNotLocated)[];
	numHidden: number;
	isInVscode: boolean;
	webviewFocused: boolean;
	currentReviewId?: string;
	currentPullRequestId?: string;
	lightningCodeReviewsEnabled: boolean;
	activePanel: WebviewPanels;
	supportsIntegrations: boolean;

	setEditorContext: (
		...args: Parameters<typeof setEditorContext>
	) => ReturnType<typeof setEditorContext>;
	fetchDocumentMarkers: (
		...args: Parameters<typeof fetchDocumentMarkers>
	) => ReturnType<ReturnType<typeof fetchDocumentMarkers>>;
	postAction(): void;
	setCodemarksFileViewStyle: (
		...args: Parameters<typeof setCodemarksFileViewStyle>
	) => ReturnType<typeof setCodemarksFileViewStyle>;
	setComposeCodemarkActive: Function;
	setCodemarksShowArchived: (
		...args: Parameters<typeof setCodemarksShowArchived>
	) => ReturnType<typeof setCodemarksShowArchived>;
	setCurrentCodemark: (
		...args: Parameters<typeof setCurrentCodemark>
	) => ReturnType<typeof setCurrentCodemark>;
	repositionCodemark: (
		...args: Parameters<typeof repositionCodemark>
	) => ReturnType<typeof repositionCodemark>;
	closeAllPanels: Function;

	createPostAndCodemark: (...args: Parameters<typeof createPostAndCodemark>) => any;
	addDocumentMarker: Function;
	changeSelection: Function;
	composeCodemarkActive: CodemarkType | undefined;
	newPostEntryPoint?: string;
	setNewPostEntry: Function;
	setUserPreference: any;
}

interface State {
	showPRInfoModal: boolean;
	isLoading: boolean;
	query: string | undefined;
	highlightedLine?: number;
	rippledLine?: number;
	numAbove: number;
	numBelow: number;
	numLinesVisible: number;
	problem: ScmError | undefined;
	// newCodemarkAttributes: { type: CodemarkType; viewingInline: boolean } | undefined;
	multiLocationCodemarkForm: boolean;
	codemarkFormError?: string;
	showPRCommentsField: boolean | undefined;
}

const NEW_CODEMARK_ATTRIBUTES_TO_RESTORE = "spatial-view:restore-codemark-form";

export class SimpleInlineCodemarks extends Component<Props, State> {
	disposables: { dispose(): void }[] = [];
	docMarkersByStartLine: {};
	_scrollDiv: HTMLDivElement | null | undefined;
	private root = React.createRef<HTMLDivElement>();
	hiddenCodemarks = {};
	currentPostEntryPoint?: PostEntryPoint;
	_updateEmitter = new ComponentUpdateEmitter();
	minimumDistance = 20;
	_waitingForPRProviderConnection = false;
	_mounted = false;
	_rippleIcons = false;

	constructor(props: Props) {
		super(props);

		this.state = {
			showPRInfoModal: false,
			// newCodemarkAttributes: localStore.get(NEW_CODEMARK_ATTRIBUTES_TO_RESTORE),
			isLoading: props.documentMarkers.length === 0,
			query: undefined,
			numAbove: 0,
			numBelow: 0,
			numLinesVisible: props.numLinesVisible,
			problem: props.scmInfo && getFileScmError(props.scmInfo),
			multiLocationCodemarkForm: false,
			showPRCommentsField: props.showPRComments
		};

		this.docMarkersByStartLine = {};
	}

	componentDidMount() {
		this._mounted = true;
		if (this.props.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "CurrentFile Tab" });
		const mutationObserver = new MutationObserver(() => this.repositionCodemarks());
		mutationObserver.observe(document.getElementById("stream-root")!, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["data-top"]
		});

		this.disposables.push(
			HostApi.instance.on(DidChangeDocumentMarkersNotificationType, ({ textDocument }) => {
				if (this.props.textEditorUri === textDocument.uri) {
					this.props.fetchDocumentMarkers(textDocument.uri, !this.props.showPRComments);
				}
			}),
			{
				dispose() {
					mutationObserver.disconnect();
				}
			},
			HostApi.instance.on(NewCodemarkNotificationType, e => {
				this.currentPostEntryPoint = e.source as PostEntryPoint;
				if (!this._mounted) {
					console.debug(
						`<InlineCodemarks/>: notification ${NewCodemarkNotificationType.method} received but the component is not mounted yet so the notification will be re-emitted`
					);
					Promise.resolve().then(() => {
						HostApi.instance.emit(NewCodemarkNotificationType.method, e);
					});
				}
			})
		);

		this.onFileChanged(true, this.onFileChangedError);

		this.scrollTo(this.props.metrics.lineHeight!);
	}

	onFileChangedError(error: string) {
		if (!error) return;
		HostApi.instance.track("Spatial Error State", { "Error State": error });
	}

	// componentWillReceiveProps(nextProps) {
	// 	Object.keys(nextProps)
	// 		.filter(key => {
	// 			return nextProps[key] !== this.props[key];
	// 		})
	// 		.map(key => {
	// 			console.warn("changed property:", key, "from", this.props[key], "to", nextProps[key]);
	// 		});
	// }

	componentDidUpdate(prevProps: Props) {
		this._updateEmitter.emit();
		const { textEditorUri } = this.props;
		if (String(textEditorUri).length > 0 && prevProps.textEditorUri !== textEditorUri) {
			this.onFileChanged(false, this.onFileChangedError);
		}

		const didStartLineChange = this.compareStart(
			this.props.textEditorVisibleRanges,
			prevProps.textEditorVisibleRanges
		);
		if (didStartLineChange) {
			this.scrollTo(this.props.metrics.lineHeight!);
		}

		if (
			this.props.hasPRProvider &&
			!prevProps.hasPRProvider &&
			this._waitingForPRProviderConnection
		) {
			this.props.setUserPreference(["codemarksShowPRComments"], true);
		}

		this.repositionCodemarks();
	}

	componentWillUnmount() {
		this._mounted = false;
		// if (this.state.newCodemarkAttributes != undefined) {
		// 	localStore.set(NEW_CODEMARK_ATTRIBUTES_TO_RESTORE, this.state.newCodemarkAttributes);
		// } else {
		// 	localStore.delete(NEW_CODEMARK_ATTRIBUTES_TO_RESTORE);
		// }
		this.disposables.forEach(d => d.dispose());
	}

	scrollTo(top) {
		const $div = document.getElementById("inline-codemarks-scroll-container");
		if ($div) {
			$div.scrollTop = top;
		}
	}

	// shiftUp and shiftDown use different frames of reference to
	// determine height -- one takes into account the container's
	// padding (due to breadcrumbs or other UI elements in the editor)
	// and the other does not. this should be simplified so that there
	// aren't subtle bugs introduced
	shiftUp(previousTop: number, $elements: HTMLElement[]) {
		let topOfLastDiv = previousTop;
		for (let $element of $elements) {
			const domRect = $element.getBoundingClientRect();

			// determine the difference between the top of the last div, and
			// this one, to see if there is an overlap
			const overlap = domRect.bottom - topOfLastDiv;
			// even if there is zero overlap, we want at least a minimum
			// distance, so we add this.minimumDistance to compare
			const yDiff = Math.round(overlap + this.minimumDistance);

			// if there is greater than zero overlap (when taking into
			// account the minimum distance between boxes), we need to
			// shift this box up
			if (yDiff > 0) {
				// the new marginTop for this box is equal to the old
				// one, minus the overlap yDiff
				const marginTop = parseInt($element.style.marginTop || "0", 10);
				$element.style.marginTop = `${marginTop - yDiff}px`;
				// now that we shifted this box up, the top of it's
				// domRect will be yDiff less
				topOfLastDiv = domRect.top - yDiff;
			} else {
				topOfLastDiv = domRect.top;
			}
		}
	}

	shiftDown(previousBottom: number, $elements: HTMLElement[]) {
		let bottomOfLastDiv = previousBottom;
		// loop through all of the elements and use dataset.top
		// as the "originally desired" position which represents
		// where the inline view would put the box ideally to the
		// right of the code. we use that as a starting point to
		// know where the box wants to be ideally. as we shift
		// boxes down, we keep track of the bottom of the last box
		// as a minimum starting point for the top of the next one
		for (let $element of $elements) {
			const domRect = $element.getBoundingClientRect();
			const origTop = parseInt($element.dataset.top || "", 10);
			const overlap = bottomOfLastDiv - origTop;
			const yDiff = Math.round(overlap + this.minimumDistance);
			const height = domRect.bottom - domRect.top;

			if (yDiff > 0) {
				$element.style.marginTop = yDiff + "px";
				bottomOfLastDiv = origTop + height + yDiff;
			} else {
				$element.style.marginTop = "0";
				bottomOfLastDiv = origTop + height;
			}
		}
	}

	repositionCodemarks = debounceToAnimationFrame(() => {
		let $containerDivs: HTMLElement[] = Array.from(
			document.querySelectorAll(".plane-container:not(.cs-off-plane)")
		);
		if ($containerDivs.length > 0) this.repositionElements($containerDivs);

		let $hiddenDivs: HTMLElement[] = Array.from(
			document.querySelectorAll(".plane-container.cs-hidden")
		);
		if ($hiddenDivs.length > 0) this.repositionElements($hiddenDivs);
	});

	repositionElements = ($elements: HTMLElement[]) => {
		$elements.sort((a, b) => Number(a.dataset.top) - Number(b.dataset.top));

		const composeIndex = $elements.findIndex($e => {
			return $e.children[0].classList.contains("codemark-form-container");
		});

		if (composeIndex > -1) {
			const $element = $elements[composeIndex];
			const domRect = $element.getBoundingClientRect();
			const top = parseInt($element.dataset.top || "", 10);
			const height = domRect.bottom - domRect.top;
			this.shiftUp(domRect.top, $elements.slice(0, composeIndex).reverse());
			this.shiftDown(
				// we subtract minimumDistance (20px) here because
				// otherwise there is 40px margin below the compose
				// box, since it adds 20 more before it shifts down
				// composeDimensions.bottom - this.minimumDistance,
				top + height,
				$elements.slice(composeIndex + 1)
			);
		} else {
			// -3000 is just an arbitrary off-screen number that will allow
			// codemarks that appear above the viewport to render properly,
			// even if we just get a glimpse of the bottom of them because
			// they are off-screen. If codemarks are more than 3000px hight
			// when collapsed this will be a bug, but fine otherwise. -Pez
			this.shiftDown(-3000, $elements);
		}
	};

	async onFileChanged(
		isInitialRender = false,
		renderErrorCallback: ((error: string) => void) | undefined = undefined
	) {
		const { textEditorUri, setEditorContext, composeCodemarkActive } = this.props;

		if (
			textEditorUri === undefined &&
			composeCodemarkActive &&
			!this.state.multiLocationCodemarkForm
		) {
			this.props.setComposeCodemarkActive(undefined);
		}

		if (textEditorUri === undefined) {
			if (isInitialRender) {
				this.setState({ isLoading: false });
			}
			// used to log InvalidUri here, but it's not terribly useful and mostly noise
			return;
		}

		if (isNotOnDisk(textEditorUri)) {
			if (isInitialRender) {
				this.setState({ isLoading: false });
			}
			if (renderErrorCallback !== undefined) {
				renderErrorCallback("FileNotSaved");
			}
			return;
		}

		let scmInfo = this.props.scmInfo;
		if (!scmInfo) {
			this.setState({ isLoading: true });
			scmInfo = await HostApi.instance.send(GetFileScmInfoRequestType, {
				uri: textEditorUri
			});
			setEditorContext({ scmInfo });
		}

		const scmError = getFileScmError(scmInfo);
		this.setState({ problem: scmError });

		await this.props.fetchDocumentMarkers(textEditorUri, !this.props.showPRComments);
		this.setState(state => (state.isLoading ? { isLoading: false } : null));
		if (scmError && renderErrorCallback !== undefined) {
			renderErrorCallback(mapFileScmErrorForTelemetry(scmError));
		}
	}

	compareStart(range1?: Range[], range2?: Range[]) {
		if (range1 == null || range1.length === 0 || range2 == null || range2.length === 0) return true;
		const start1 = range1[0].start.line;
		const start2 = range2[0].start.line;
		return start1 !== start2;
	}

	renderList = (paddingTop, fontSize, height) => {
		const { documentMarkers, showHidden } = this.props;

		this.hiddenCodemarks = {};
		const seenCodemarks = {};
		return (
			<div style={{ height: "100%", paddingTop: "55px" }}>
				<ScrollBox>
					<div
						className="channel-list vscroll spatial-list"
						onClick={this.handleClickField}
						id="inline-codemarks-scroll-container"
						style={{ paddingTop: "20px", fontSize: fontSize }}
					>
						{this.props.children}
						{documentMarkers
							.sort(
								(a, b) =>
									this.getMarkerStartLine(a) - this.getMarkerStartLine(b) ||
									a.createdAt - b.createdAt
							)
							.map(docMarker => {
								const { codemark } = docMarker;

								if (codemark) {
									if (seenCodemarks[codemark.id]) return null;
									seenCodemarks[codemark.id] = true;
								}
								// const hidden =
								// 	!showHidden &&
								// 	((codemark && (!codemark.pinned || codemark.status === "closed")) ||
								// 		(docMarker.externalContent && !this.props.showPRComments));

								const hidden =
									(!showHidden && codemark && (!codemark.pinned || codemark.status === "closed")) ||
									(docMarker.externalContent && !this.props.showPRComments);
								if (hidden) {
									this.hiddenCodemarks[docMarker.id] = true;
									return null;
								}

								return (
									<div key={docMarker.id} className="codemark-container">
										<Codemark
											contextName="Spatial View"
											codemark={docMarker.codemark}
											marker={docMarker}
											hidden={hidden}
											highlightCodeInTextEditor
											query={this.state.query}
											postAction={this.props.postAction}
										/>
									</div>
								);
							})}
					</div>
				</ScrollBox>
			</div>
		);
	};

	renderNoCodemarks = () => {
		const {
			textEditorUri,
			currentReviewId,
			currentPullRequestId,
			composeCodemarkActive
		} = this.props;

		if (composeCodemarkActive || currentReviewId || currentPullRequestId) return null;

		if (textEditorUri === undefined) {
			return (
				<div key="no-codemarks" className="no-codemarks-container">
					<div key="no-codemarks" className="no-codemarks">
						<h3>No file open.</h3>
						<p>
							Open a source file to to start discussing code with your teammates!{" "}
							<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">Learn more.</a>
						</p>
					</div>
				</div>
			);
		} else {
			if (this.props.children) return null;
			const modifier = navigator.appVersion.includes("Macintosh") ? "^ /" : "Ctrl-Shift-/";
			if (isNotOnDisk(textEditorUri)) {
				return (
					<div key="no-codemarks" className="no-codemarks-container">
						<div className="no-codemarks">
							<h3>This file hasn't been saved.</h3>
							<p>
								Save the file before creating a codemark so that the codemark can be linked to the
								code.
							</p>
						</div>
					</div>
				);
			}
			if (this.state.problem === ScmError.NoRepo) {
				return (
					<div key="no-codemarks" className="no-codemarks-container">
						<div className="no-codemarks">
							<h3>This file is not part of a git repository.</h3>
							<p>
								CodeStream requires files to be tracked by Git so that codemarks can be linked to
								the code.
							</p>
							<p>{uriToFilePath(textEditorUri)}</p>
						</div>
					</div>
				);
			}
			if (this.state.problem === ScmError.NoRemotes) {
				return (
					<div key="no-codemarks" className="no-codemarks-container">
						<div className="no-codemarks">
							<h3>This repository has no remotes.</h3>
							<p>Please configure a remote URL for this repository before creating a codemark.</p>
						</div>
					</div>
				);
			}
			if (this.state.problem === ScmError.NoGit) {
				return (
					<div key="no-codemarks" className="no-codemarks-container">
						<div className="no-codemarks">
							<h3>Git could not be located.</h3>
							<p>
								CodeStream was unable to find the `git` command. Make sure it's installed and
								configured properly.
							</p>
						</div>
					</div>
				);
			}
			// giving this a 70% max width ensures that the tooltip
			// doesn't go wall-to-wall in the view. it'd be nice if
			// rc-tooltips handled this for us, but thereis no margin
			// to an rc-tooltip, so without this, it would literally
			// touch the left and right edges of the panel -Pez
			const title = (
				<div style={{ maxWidth: "70vw" }}>
					A codemark is a link between a block of code and a conversation or an issue. Codemarks
					work across branches, and stay anchored to the block of code even as your codebase
					changes.
				</div>
			);

			return (
				<div key="no-codemarks" className="no-codemarks-container">
					<div className="no-codemarks">
						<h3>No codemarks in this file.</h3>
						<p>
							Discuss code by selecting a range and clicking an icon{" "}
							<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">show me how</a>
						</p>
					</div>
				</div>
			);
		}
	};

	getMarkerStartLine = marker => {
		if (marker.notLocatedReason) return 0;

		if (marker.range) {
			return marker.range.start.line;
		}

		return marker.locationWhenCreated[0] - 1;
	};

	renderCodemarks() {
		const { viewInline } = this.props;
		const {
			textEditorVisibleRanges = [],
			textEditorLineCount,
			lastVisibleLine,
			documentMarkers,
			metrics,
			currentReviewId,
			currentPullRequestId
		} = this.props;
		const { numLinesVisible } = this.state;

		if (currentReviewId || currentPullRequestId) return null;

		const numVisibleRanges = textEditorVisibleRanges.length;

		const fontSize = metrics && metrics.fontSize ? metrics.fontSize : "12px";

		const paddingTop = (metrics && metrics.margins && metrics.margins.top) || 0;
		// we add two here because the editor only reports *entirely* visible lines,
		// so there could theoretically be one line that is 99% visible at the top,
		// and also one line that is 99% visible at the bottom, both at the same time.
		const heightPerLine = (window.innerHeight - paddingTop) / (numLinesVisible + 2);
		const expectedLineHeight = ((metrics && metrics.fontSize) || 12) * 1.5;

		// here we have to decide whether we think the editor window is "full of code"
		// in which case we want the height of inlinecodemarks to be 100% minus any
		// padding, or whether the editor window is not full of code, in which case
		// we want to approximate the height of inlinecodemarks to be less than 100%,
		// and instead based on the number of lines visible. this latter case happens
		// when you are editing a small file with not enough lines to fill up the
		// editor, or in the case of vscode when, like a fucking idiot, it lets you
		// scroll the end of the file up to the top of the pane for some brain-dead
		// stupid asenine ridiculous totally useless reason.
		const lastRange = textEditorVisibleRanges[numVisibleRanges - 1];
		const isLastLineVisible = lastRange ? textEditorLineCount <= lastVisibleLine + 1 : false;
		const lessThanFull = heightPerLine > expectedLineHeight && isLastLineVisible;
		const height = lessThanFull
			? expectedLineHeight * numLinesVisible + paddingTop + "px"
			: "calc(100vh - " + paddingTop + "px)";
		// console.log("HEIGHT IS: ", height, " because ", lessThanFull);
		const divStyle = {
			top: paddingTop,
			// background: "#333366",
			position: "relative",
			fontSize: fontSize,
			height: height
		};

		if (documentMarkers.length === 0) {
			if (this.state.numAbove) this.setState({ numAbove: 0 });
			if (this.state.numBelow) this.setState({ numBelow: 0 });
			return (
				<div
					id="inline-codemarks-field"
					style={{
						top: paddingTop,
						// purple background for debugging purposes
						// background: "#333366",
						position: "relative",
						fontSize: fontSize,
						height: height
					}}
					onClick={this.handleClickField}
				>
					{this.renderNoCodemarks()}
					{this.props.children}
				</div>
			);
		}
		return viewInline || this.props.composeCodemarkActive
			? this.renderInline(paddingTop, fontSize, height)
			: this.renderList(paddingTop, fontSize, height);
	}

	renderInline(paddingTop, fontSize, height) {
		const {
			textEditorVisibleRanges = [],
			firstVisibleLine,
			lastVisibleLine,
			documentMarkers,
			showHidden
		} = this.props;
		const { numLinesVisible } = this.state;

		// console.log("HEIGHT IS: ", height);
		const numVisibleRanges = textEditorVisibleRanges.length;
		let numAbove = 0,
			numBelow = 0;
		// create a map from start-lines to the codemarks that start on that line
		// and while we're at it, count the number of non-filtered-out codemarks
		// that are above the current viewport, and below the current viewport
		this.docMarkersByStartLine = {};
		this.hiddenCodemarks = {};
		documentMarkers.forEach(docMarker => {
			const codemark = docMarker.codemark;
			let startLine = Number(this.getMarkerStartLine(docMarker));
			// if there is already a codemark on this line, keep skipping to the next one
			while (this.docMarkersByStartLine[startLine]) startLine++;
			this.docMarkersByStartLine[startLine] = docMarker;
			const hidden =
				!showHidden &&
				((codemark && (!codemark.pinned || codemark.status === "closed")) ||
					(docMarker.externalContent && !this.props.showPRComments));
			if (hidden) {
				this.hiddenCodemarks[docMarker.id] = true;
			} else {
				if (startLine < firstVisibleLine) numAbove++;
				if (startLine > lastVisibleLine) numBelow++;
			}
		});

		if (numAbove != this.state.numAbove) this.setState({ numAbove });
		if (numBelow != this.state.numBelow) this.setState({ numBelow });

		let rangeStartOffset = 0;
		return (
			<div
				style={{ height: "100vh" }}
				onWheel={this.onWheel}
				id="inline-codemarks-scroll-container"
				ref={ref => (this._scrollDiv = ref)}
				onClick={this.handleClickField}
				data-scrollable="true"
				className={cx("scrollbox", { "off-top": firstVisibleLine > 0 })}
			>
				<div>
					<div
						style={{
							top: paddingTop,
							// purple background for debugging purposes
							// background: "#333366",
							position: "relative",
							fontSize: fontSize,
							height: height
						}}
						id="inline-codemarks-field"
					>
						<div className="inline-codemarks vscroll-x">
							{numAbove > 0 && (
								<ViewSelectorButton className="above" onClick={this.showAbove}>
									<span className="nospace">
										{numAbove} comment{numAbove > 1 ? "s" : ""}
									</span>
									<Icon name="arrow-up" />
								</ViewSelectorButton>
							)}
							{numBelow > 0 && (
								<ViewSelectorButton className="below" onClick={this.showBelow}>
									<span className="nospace">
										{numBelow} comment{numBelow > 1 ? "s" : ""}
									</span>
									<Icon name="arrow-down" />
								</ViewSelectorButton>
							)}
							{textEditorVisibleRanges.map((lineRange, rangeIndex) => {
								const realFirstLine = lineRange.start.line;
								const realLastLine = lineRange.end.line;
								const linesInRange = realLastLine - realFirstLine + 1;
								// if this is the first range, we start 20 lines above the viewport to
								// try to capture any codemarks that are out of view, but the bottom
								// may still be visible
								const lineToStartOn = rangeIndex == 0 ? realFirstLine - 20 : realFirstLine;
								const marksInRange = range(lineToStartOn, realLastLine + 1).map(lineNum => {
									const docMarker = this.docMarkersByStartLine[lineNum];
									if (!docMarker) return null;
									return this.renderInlineCodemark(docMarker, lineNum, height);
								});
								rangeStartOffset += linesInRange;
								if (rangeIndex + 1 < numVisibleRanges) {
									let top = (100 * rangeStartOffset) / numLinesVisible + "%";
									marksInRange.push(<div style={{ top }} className="folded-code-indicator" />);
								}
								return marksInRange;
							})}
						</div>
					</div>
				</div>
			</div>
		);
	}

	renderInlineCodemark(docMarker, lineNum, height) {
		const codemark = docMarker.codemark;
		const hidden = this.hiddenCodemarks[docMarker.id] ? true : false;
		return (
			<ContainerAtEditorLine
				key={docMarker.id}
				lineNumber={lineNum}
				className={cx({
					"cs-hidden": hidden,
					"cs-off-plane": hidden,
					"no-padding": true
				})}
			>
				<div className="codemark-container">
					<Codemark
						contextName="Spatial View"
						codemark={codemark}
						marker={docMarker}
						deselectCodemarks={this.deselectCodemarks}
						hidden={hidden}
						highlightCodeInTextEditor
						query={this.state.query}
						postAction={this.props.postAction}
					/>
				</div>
			</ContainerAtEditorLine>
		);
	}

	renderCodemarkForm() {
		if (this.props.composeCodemarkActive == undefined) return null;

		return (
			// <ContainerAtEditorSelection>
			<CodemarkForm
				commentType={this.props.composeCodemarkActive}
				streamId={this.props.currentStreamId!}
				onSubmit={this.submitCodemark}
				onClickClose={this.closeCodemarkForm}
				collapsed={false}
				positionAtLocation={true}
				multiLocation={this.state.multiLocationCodemarkForm}
				setMultiLocation={this.setMultiLocation}
				error={this.state.codemarkFormError}
			/>
			// </ContainerAtEditorSelection>
		);
	}

	setMultiLocation = value => {
		this.setState({ multiLocationCodemarkForm: value });
	};

	closeCodemarkForm = (e?: Event) => {
		this.setState({
			multiLocationCodemarkForm: false,
			codemarkFormError: undefined
		});
		this.clearSelection();

		this.props.setComposeCodemarkActive(undefined);
	};

	static contextTypes = {
		store: PropTypes.object
	};

	/**
	 * 	We want the form to be replaced with the newly created codemark seamlessly,
	 * 	without a flash of blank space. To achieve this, the code that controls the display of the form,
	 * 	needs to wait until the corresponding document marker is available because the spatial view doesn't
	 * 	actually render codemark objects. So when the document marker arrives via pubnub,
	 * 	the form needs to withold it from getting into the redux store, and then update the store for
	 * 	this specific document marker and the state of whether the form is displayed, within the same React update phase,
	 * 	in order to give the impression that the form has become the newly created codemark.
	 *
	 * 	Intercepting the redux update is done via the injected middleware
	 */
	submitCodemark = async (attributes: NewCodemarkAttributes) => {
		let docMarker: DocumentMarker | undefined;
		const injectedMiddleware = middlewareInjector.inject(
			DocumentMarkersActionsType.SaveForFile,
			(payload: { uri: string; markers: DocumentMarker[] }) => {
				return {
					...payload,
					markers: payload.markers.filter(documentMarker => {
						const storeState: CodeStreamState = this.context.store.getState();
						const author = userSelectors.getUserByCsId(storeState.users, documentMarker.creatorId);
						if (author != undefined && author.id === storeState.session.userId) {
							// only taking the first one here because this code only applies to creating a single
							// marker codemark in spatial view
							const codeBlock = attributes.codeBlocks[0];
							if (
								safe(() => codeBlock.scm!.file) === documentMarker.file &&
								codeBlock.contents === documentMarker.code
							) {
								docMarker = documentMarker;
								return false;
							}
						}
						return true;
					})
				};
			}
		);

		let retVal;
		try {
			// attempt to create the codemark
			try {
				let { newPostEntryPoint } = this.props;
				if (newPostEntryPoint === WebviewPanels.CodemarksForFile) {
					// use the previous name instead of the panel name
					newPostEntryPoint = "Spatial View";
				} else if (newPostEntryPoint) {
					// convert to Title Case
					newPostEntryPoint = newPostEntryPoint
						.split("-")
						.map(word => word.charAt(0).toUpperCase() + word.slice(1))
						.join(" ");
				}

				retVal = await this.props.createPostAndCodemark(
					attributes,
					this.currentPostEntryPoint || newPostEntryPoint || "Spatial View"
				);
			} catch (error) {
				// if the error was specific to the sharing step, just continue
				// https://trello.com/c/ZoSRHGVi/3171-bug-submitting-a-codemark-while-in-review-mode-stays-on-the-codemark-compose-form#comment-5e6199467d3fb86590a942ac
				if (!isCreateCodemarkError(error) || error.reason === "create") {
					const message = `There was an error creating the codemark.${
						!isCreateCodemarkError(error) ? ` (${error.toString()})` : ""
					}`;
					this.setState({ codemarkFormError: message });
					return;
				}
			}

			// now get the new document markers
			await this.props.fetchDocumentMarkers(this.props.textEditorUri!, !this.props.showPRComments);

			if (docMarker) {
				batch(() => {
					// wait until the next update, ideally because the new document marker is about to be rendered, and close the form
					this._updateEmitter.enqueue(() => {
						this.closeCodemarkForm();
					});
					this.props.addDocumentMarker(this.props.textEditorUri!, docMarker);
				});
			} else {
				this.closeCodemarkForm();
			}
		} finally {
			// cleanup that must happen regardless of what occurs above
			this.currentPostEntryPoint = undefined;
			this.props.setNewPostEntry(undefined);
			injectedMiddleware.dispose();
		}
		return retVal;
	};

	private _clearWheelingStateTimeout?: any;
	private _wheelingState: { accumulatedPixels: number; topLine: number } | undefined;

	onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
		if (event.deltaY === 0) return;

		if (this.state.multiLocationCodemarkForm) return;

		const target = event.target as HTMLElement;
		if (target.closest(".codemark.selected") != null) {
			return;
		}

		if (target.closest(".code.preview") != null) {
			return;
		}

		if (target.classList.contains("message-input") || target.closest(".compose") != null) {
			return;
		}
		if (target.closest(".mentions-popup") != null) {
			return;
		}

		if (this._clearWheelingStateTimeout !== undefined) {
			clearTimeout(this._clearWheelingStateTimeout);
			this._clearWheelingStateTimeout = undefined;
		}

		// Find the nearest scrollable element and if its not the container we expect, kick out
		const scroller = (event.target as HTMLElement).closest("[data-scrollable]");
		if (
			scroller == null ||
			(scroller.id !== "inline-codemarks-scroll-container" &&
				scroller.scrollHeight > scroller.clientHeight)
		) {
			this._wheelingState = undefined;

			return;
		}

		// Keep track of the "editor" top line, since these events will be too fast for the editor and our eventing to keep up
		if (this._wheelingState === undefined) {
			const { textEditorVisibleRanges } = this.props;
			if (textEditorVisibleRanges == null) return;

			this._wheelingState = {
				accumulatedPixels: 0,
				topLine: textEditorVisibleRanges[0].start.line
			};
		}

		// We only want to accumulate data while the user is actively scrolling, if they pause reset everything
		this._clearWheelingStateTimeout = setTimeout(() => (this._wheelingState = undefined), 500);

		const { metrics } = this.props;

		let deltaY = event.deltaY * metrics.scrollRatio!;

		let deltaPixels;
		let lines = 0;
		switch (event.deltaMode) {
			case 0: // deltaY is in pixels
				const lineHeight = metrics.lineHeight!;

				deltaPixels = deltaY;

				const pixels = this._wheelingState.accumulatedPixels + deltaY;
				this._wheelingState.accumulatedPixels = pixels % lineHeight;
				lines = pixels < 0 ? Math.ceil(pixels / lineHeight) : Math.floor(pixels / lineHeight);

				break;
			case 1: // deltaY is in lines
				lines = deltaY;

				break;
			case 2: // deltaY is in pages
				// Not sure how to handle it, nor is it worth the time
				debugger;

				break;
		}

		if (metrics.scrollMode !== EditorScrollMode.Pixels && lines === 0) return;

		let topLine;
		if (deltaY < 0) {
			topLine = Math.max(0, this._wheelingState.topLine + lines);
		} else {
			topLine = Math.min(this.props.textEditorLineCount, this._wheelingState.topLine + lines);
		}

		if (metrics.scrollMode !== EditorScrollMode.Pixels && topLine === this._wheelingState.topLine)
			return;

		// Update our tracking as the events will be too slow
		this._wheelingState.topLine = topLine;

		HostApi.instance.notify(EditorScrollToNotificationType, {
			uri: this.props.textEditorUri!,
			position: Position.create(topLine, 0),
			deltaPixels: deltaPixels,
			atTop: true
		});
	};

	renderHeader() {
		const { fileNameToFilterFor = "", scmInfo } = this.props;
		const repoId = scmInfo && scmInfo.scm ? scmInfo.scm.repoId : "";
		const file = scmInfo && scmInfo.scm ? scmInfo.scm.file : fileNameToFilterFor;
		return (
			<PanelHeader title={fs.pathBasename(fileNameToFilterFor)} position="fixed">
				<FileInfo repoId={repoId || ""} file={file || ""} />
			</PanelHeader>
		);
	}

	renderViewSelectors() {
		const { numHidden, viewInline } = this.props;
		const { numAbove, numBelow } = this.state;

		return (
			<ViewSelectors>
				{false && viewInline && numAbove > 0 && (
					<ViewSelectorControl onClick={this.showAbove}>
						<span className="nospace">{numAbove}</span>
						<Icon name="arrow-up" />
					</ViewSelectorControl>
				)}
				{false && viewInline && numBelow > 0 && (
					<ViewSelectorControl onClick={this.showBelow}>
						<span className="nospace">{numBelow}</span>
						<Icon name="arrow-down" />
					</ViewSelectorControl>
				)}
				{/*  {false && this.props.supportsIntegrations && (
					<Tooltip title="Show/hide pull request comments" placement="top" delay={1}>
						<ViewSelectorControl onClick={this.togglePRComments} id="pr-toggle">
							<span>PRs</span>{" "}
							<Switch
								size="small"
								on={this.props.showPRComments}
								onChange={this.togglePRComments}
							/>
						</ViewSelectorControl>
					</Tooltip>
				)}
				*/}
				{numHidden > 0 && (
					<Tooltip title="Show/hide archived codemarks" placement="top" delay={1}>
						<ViewSelectorControl onClick={this.toggleShowHidden}>
							<span>{numHidden} archived</span>
							<Switch size="small" on={this.props.showHidden} onChange={this.toggleShowHidden} />
						</ViewSelectorControl>
					</Tooltip>
				)}
				<Tooltip
					title="Display codemarks as a list, or next to the code they reference"
					placement="topRight"
					delay={1}
				>
					<ViewSelectorControl onClick={this.toggleViewCodemarksInline}>
						<span>list</span>
						<Switch size="small" on={!viewInline} onChange={this.toggleViewCodemarksInline} />
					</ViewSelectorControl>
				</Tooltip>
				{this.props.showFeedbackSmiley && (
					<ViewSelectorControl>
						<Feedback />
					</ViewSelectorControl>
				)}
			</ViewSelectors>
		);
	}

	close() {
		const { currentReviewId, currentPullRequestId } = this.props;
		if (currentReviewId) {
			HostApi.instance.send(ReviewCloseDiffRequestType, {});
		}
		if (currentPullRequestId) {
			HostApi.instance.send(LocalFilesCloseDiffRequestType, {});
		}
		this.props.closeAllPanels();
	}

	render() {
		const { currentReviewId, currentPullRequestId, composeCodemarkActive } = this.props;

		const composeOpen = composeCodemarkActive ? true : false;
		return (
			<Modal noScroll noPadding onClose={() => this.close()}>
				<div style={{ overflow: "hidden" }}>
					{currentReviewId ? (
						<ReviewNav reviewId={currentReviewId} composeOpen={composeOpen} />
					) : currentPullRequestId ? (
						<PullRequest />
					) : (
						this.renderHeader()
					)}
					{!currentPullRequestId && <CreateCodemarkIcons />}
					{this.renderCodemarkForm()}
					{this.state.showPRInfoModal && (
						<PRInfoModal onClose={() => this.setState({ showPRInfoModal: false })} />
					)}
					{this.state.isLoading ? null : this.renderCodemarks()}
					{!currentReviewId && !currentPullRequestId && this.renderViewSelectors()}
				</div>
			</Modal>
		);
	}

	clearSelection = () => {
		const { textEditorSelection } = this.props;
		if (textEditorSelection && !isRangeEmpty(textEditorSelection)) {
			const position = Position.create(
				textEditorSelection.cursor.line,
				textEditorSelection.cursor.character
			);
			const range = Range.create(position, position);
			this.props.changeSelection(this.props.textEditorUri!, { ...range, cursor: range.end });
		}
	};

	handleClickField = (event: React.SyntheticEvent<HTMLDivElement>) => {
		// if the compose box is open, then there is no selected codemark
		// so no need to deselect it, plus we don't want the side-effect
		// of clearSelection() which removes the highlight of what code
		// you are commenting on
		if (this.props.composeCodemarkActive) return;

		if (event && event.target) {
			const id = (event.target as any).id;
			if (
				id === "inline-codemarks-scroll-container" ||
				id === "inline-codemarks-field" ||
				id === "codemark-blanket" ||
				(event.target as any).classList.contains("plane-container")
			) {
				this.deselectCodemarks();
			}
		}
	};

	deselectCodemarks = () => {
		this.props.setCurrentCodemark();
		this.clearSelection();
	};

	enableAnimations(fn: Function) {
		// Turn on the CSS animations (there is probably a more react way to do this)
		this._scrollDiv && this._scrollDiv.classList.add("animate");

		fn();

		// Turn on the CSS animations (there is probably a more react way to do this)
		setTimeout(() => this._scrollDiv && this._scrollDiv.classList.remove("animate"), 500);
	}

	toggleViewCodemarksInline = () => {
		this.props.setCodemarksFileViewStyle(this.props.viewInline ? "list" : "inline");
	};

	toggleShowHidden = () => {
		this.enableAnimations(() => this.props.setCodemarksShowArchived(!this.props.showHidden));
	};

	// togglePRComments = () => {
	// 	const { showPRCommentsField } = this.state;
	// 	const newShowPRComments = !this.props.showPRComments;
	// 	if (this.props.hasPRProvider)
	// 		this.enableAnimations(() => {
	// 			this.props.setUserPreference(["codemarksShowPRComments"], !!showPRCommentsField);
	// 			this.props.fetchDocumentMarkers(this.props.textEditorUri!, !newShowPRComments);
	// 		});
	// 	else {
	// 		this._waitingForPRProviderConnection = true;
	// 		this.setState({ showPRInfoModal: true });
	// 	}
	// };

	showAbove = () => {
		const { firstVisibleLine } = this.props;

		let done = false;
		Object.keys(this.docMarkersByStartLine)
			.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
			.reverse()
			.forEach(line => {
				let lineNum = parseInt(line, 10) - 1;
				if (
					!done &&
					lineNum < firstVisibleLine &&
					!this.hiddenCodemarks[this.docMarkersByStartLine[line].id]
				) {
					lineNum = Math.max(0, lineNum);
					HostApi.instance.send(EditorRevealRangeRequestType, {
						uri: this.props.textEditorUri!,
						range: Range.create(lineNum, 0, lineNum, 0),
						preserveFocus: true,
						atTop: true
					});
					done = true;
				}
			});
	};

	showBelow = () => {
		const { lastVisibleLine, textEditorUri } = this.props;

		let done = false;
		Object.keys(this.docMarkersByStartLine)
			.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
			.forEach(line => {
				let lineNum = parseInt(line, 10) + 1;
				if (
					!done &&
					lineNum > lastVisibleLine &&
					!this.hiddenCodemarks[this.docMarkersByStartLine[line].id]
				) {
					lineNum = Math.max(0, lineNum);
					HostApi.instance.send(EditorRevealRangeRequestType, {
						uri: textEditorUri!,
						range: Range.create(lineNum, 0, lineNum, 0),
						preserveFocus: true
					});
					done = true;
				}
			});
	};

	mapLine0ToVisibleRange = fromLineNum0 => {
		const { textEditorVisibleRanges } = this.props;

		let lineCounter = 0;
		let toLineNum = 0;
		if (textEditorVisibleRanges != null) {
			textEditorVisibleRanges.forEach(lineRange => {
				range(lineRange.start.line, lineRange.end.line + 1).forEach(thisLine => {
					if (lineCounter === fromLineNum0) toLineNum = thisLine;
					lineCounter++;
				});
			});
		}
		return toLineNum;
	};
}

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const mapStateToProps = (state: CodeStreamState) => {
	const { context, editorContext, preferences, teams, configs, documentMarkers, ide } = state;

	const docMarkers = documentMarkers[editorContext.textEditorUri || ""] || EMPTY_ARRAY;
	const numHidden = docMarkers.filter(
		d => d.codemark && (!d.codemark.pinned || d.codemark.status === "closed")
	).length;

	const textEditorVisibleRanges = getVisibleRanges(editorContext);
	const numVisibleRanges = textEditorVisibleRanges.length;

	let lastVisibleLine = 1;
	let firstVisibleLine = 1;
	if (numVisibleRanges > 0) {
		const lastVisibleRange = textEditorVisibleRanges[numVisibleRanges - 1];
		lastVisibleLine = lastVisibleRange!.end.line;
		firstVisibleLine = textEditorVisibleRanges[0].start.line;
	}

	const hasPRProvider = ["github", "bitbucket", "gitlab"].some(name =>
		isConnected(state, { name })
	);

	return {
		showFeedbackSmiley: false, // context.showFeedbackSmiley,
		hasPRProvider,
		currentStreamId: context.currentStreamId,
		currentReviewId: context.currentReviewId,
		currentPullRequestId: context.currentPullRequest ? context.currentPullRequest.id : undefined,
		team: teams[context.currentTeamId],
		viewInline: context.codemarksFileViewStyle === "inline",
		viewHeadshots: configs.showHeadshots,
		showLabelText: false, //configs.showLabelText,
		showHidden: context.codemarksShowArchived || false,
		showPRComments: hasPRProvider && preferences.codemarksShowPRComments,
		fileNameToFilterFor: editorContext.activeFile,
		scmInfo: editorContext.scmInfo,
		textEditorUri: editorContext.textEditorUri,
		textEditorLineCount: editorContext.textEditorLineCount || 0,
		firstVisibleLine,
		lastVisibleLine,
		textEditorVisibleRanges,
		textEditorSelection: getCurrentSelection(editorContext),
		metrics: editorContext.metrics || EMPTY_OBJECT,
		documentMarkers: docMarkers,
		numLinesVisible: getVisibleLineCount(textEditorVisibleRanges),
		numHidden,
		isInVscode: ide.name === "VSC",
		webviewFocused: context.hasFocus,
		lightningCodeReviewsEnabled: isFeatureEnabled(state, "lightningCodeReviews"),
		supportsIntegrations: supportsIntegrations(configs),
		composeCodemarkActive: context.composeCodemarkActive,
		newPostEntryPoint: context.newPostEntryPoint
	};
};

export default connect(mapStateToProps, {
	fetchDocumentMarkers,
	setCodemarksFileViewStyle,
	setComposeCodemarkActive,
	setCodemarksShowArchived,
	setCurrentCodemark,
	repositionCodemark,
	setEditorContext,
	createPostAndCodemark,
	addDocumentMarker,
	changeSelection,
	setNewPostEntry,
	closeAllPanels
})(SimpleInlineCodemarks);

const ViewSelectorButton = styled.div`
	position: fixed;
	border: none;
	padding: 2px 8px 2px 10px;
	left: 50%;
	transform: translateX(-50%);
	background: var(--button-background-color);
	color: var(--buton-foreground-color);
	&:hover {
		background: var(--button-background-color-hover);
	}
	&.above {
		border-radius: 0 0 5px 5px;
		top: 0;
	}
	&.below {
		border-radius: 5px 5px 0 0;
		bottom: 0;
	}
	.icon {
		display: inline-block;
		transform: scale(0.7);
	}
	opacity: 1;
	cursor: pointer;
	z-index: 3;
`;

const ViewSelectorControl = styled.span`
	cursor: pointer;
	opacity: 0.75;
	padding: 5px 5px;
	white-space: nowrap;
	:hover {
		opacity: 1;
		color: var(--text-color-highlight);
	}

	span:first-child:not(.nospace) {
		margin-right: 5px;
	}

	display: inline-flex;
	align-items: center;
	justify-content: space-evenly;

	transition: transform 0.1s;

	&.pulse {
		transform: scale(1.5);
		color: var(--buton-foreground-color);
		background: var(--button-background-color);
		opacity: 1;
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		z-index: 3;
	}
`;

const ViewSelectors = styled.div`
	height: 30px;
	position: fixed;
	bottom: 0px;
	right: 0;
	display: flex;
	justify-content: flex-end;
	// background: var(--app-background-color);
	padding-top: 3px;
	padding-bottom: 5px;
	padding-right: 5px;
	// border-top: 1px solid var(--base-border-color);
	text-align: right;
`;
