import React from "react";
import { safe } from "../utils";
import { HostApi } from "../webview-api";
import { LocateRepoButton } from "./LocateRepoButton";
import Tooltip from "./Tooltip";
import {
	ApplyMarkerRequestType,
	CompareMarkerRequestType,
	EditorSelectRangeRequestType,
	EditorHighlightRangeRequestType
} from "../ipc/webview.protocol";
import {
	Capabilities,
	CodemarkPlus,
	GetCodemarkRangeRequestType,
	TelemetryRequestType,
	GetDocumentFromMarkerRequestType
} from "@codestream/protocols/agent";
import { injectIntl, WrappedComponentProps } from "react-intl";
import { CodeStreamState } from "../store";
import { connect } from "react-redux";
import { getById } from "../store/repos/reducer";
import Icon from "./Icon";
import { CSMarker } from "@codestream/protocols/api";
import { getVisibleRanges } from "../store/editorContext/reducer";
import { getDocumentFromMarker, highlightRange } from "./api-functions";
import { Marker } from "./Marker";

interface State {
	hasDiff: boolean;
	currentContent?: string;
	currentBranch?: string;
	currentCommitHash?: string;
	diff?: string;
	warning?: string;
	textDocumentUri: string;
	startLine: number;
	endLine: number;
	scrollingCodeBlock: boolean;
	expandCodeBlock: boolean;
}

interface ConnectedProps {
	repoName: string;
	textEditorUri: string;
	firstVisibleLine?: number;
	lastVisibleLine?: number;
	editorHasFocus: boolean;
	jumpToMarker?: boolean;
	jumpToMarkerId?: string;
	currentReviewId?: string;
}

type IntlProps = WrappedComponentProps<"intl">;

interface InheritedProps {
	codemark: CodemarkPlus;
	marker: CSMarker;
	markerIndex: number;
	numMarkers: number;
	capabilities: Capabilities;
	isAuthor: boolean;
	alwaysRenderCode?: boolean;
	jumpToMarker?: boolean;
	jumpToMarkerId?: string;
	selected: boolean;
	disableDiffCheck?: boolean;
	disableHighlightOnHover?: boolean;
}

type Props = InheritedProps & ConnectedProps & IntlProps;

class MarkerActions extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasDiff: false,
			textDocumentUri: "",
			startLine: 0,
			endLine: 0,
			expandCodeBlock: false,
			scrollingCodeBlock: false
		};
		this._codeBlockDiv = null;
	}

	private _pollingTimer?: any;
	private _codeBlockDiv: HTMLPreElement | null;
	private _mounted: boolean = false;
	private _highlightDisposable?: { dispose(): void };
	private _jumped = false;

	componentDidMount() {
		this._mounted = true;
		if (this.props.jumpToMarker) {
			this.jump(this.props.marker).then(success => {
				this._jumped = true;
				if (success) this.ensureMarkerInView();
			});

			this.openCodemark();
		}

		if (this.props.selected) this.startCheckingDiffs();
		if (this._codeBlockDiv && this._codeBlockDiv.scrollHeight > this._codeBlockDiv.offsetHeight)
			this.setState({ scrollingCodeBlock: true });
	}

	componentDidUpdate(prevProps, prevState) {
		if (!this.props.marker || !this.props.jumpToMarker) {
			this._jumped = false;
			return;
		}
		if (!this._jumped) {
			this.jump(this.props.marker).then(success => {
				this._jumped = true;
				if (success) this.ensureMarkerInView();
			});
		}
	}

	componentWillUnmount() {
		this._mounted = false;
		this.stopCheckingDiffs();
		if (this._highlightDisposable) this._highlightDisposable.dispose();
	}

	private startCheckingDiffs() {
		if (this.props.disableDiffCheck) return;
		if (!this._mounted || this._pollingTimer !== undefined) return;

		// kick off an initial check diff, then start the polling
		this.checkDiffs(false).then(() => {
			this._pollingTimer = setInterval(() => {
				if (this.props.editorHasFocus) {
					this.checkDiffs(false);
				}
			}, 1000);
		});
	}

	private stopCheckingDiffs() {
		if (this.props.disableDiffCheck) return;
		if (this._pollingTimer === undefined) return;

		clearInterval(this._pollingTimer);
		this._pollingTimer = undefined;
	}

	async openCodemark() {
		const { codemark, marker } = this.props;

		// when would his be true?
		if (codemark == null || marker == null) return;

		try {
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
						preserveFocus: true
					});
					this.setState({
						warning: success ? undefined : "FILE_NOT_FOUND",
						textDocumentUri: response.textDocument.uri
					});
					if (success) {
						this.ensureMarkerInView();
						this._toggleCodeHighlight(true);
					}
				} else {
					// assumption based on GetDocumentFromMarkerRequestType api requiring the workspace to be available
					this.setState({ warning: "REPO_NOT_IN_WORKSPACE" });
				}
			} else this.setState({ warning: "NO_REMOTE" });
		} catch (error) {}
	}

	ensureMarkerInView() {
		if (!this.props.codemark || !this.props.jumpToMarker || !this._codeBlockDiv) return;

		setTimeout(() => {
			if (this._codeBlockDiv) {
				this._codeBlockDiv.scrollIntoView({
					behavior: "smooth"
				});
			}
		}, 50);
	}

	async checkDiffs(jump: boolean) {
		const { codemark, marker, jumpToMarker } = this.props;
		if (codemark == null || marker == null) return;

		try {
			const response = await HostApi.instance.send(GetCodemarkRangeRequestType, {
				codemarkId: codemark.id,
				markerId: marker.id
			});
			const hasDiff = !response.success || response.currentContent !== marker.code;
			this.setState({
				hasDiff,
				currentContent: response.currentContent,
				currentBranch: response.currentBranch,
				diff: response.diff
			});
		} catch (error) {}

		try {
			if (marker.repoId) {
				const response = await HostApi.instance.send(GetDocumentFromMarkerRequestType, {
					markerId: marker.id
				});

				if (response) {
					if (jumpToMarker && jump) {
						const { success } = await HostApi.instance.send(EditorSelectRangeRequestType, {
							uri: response.textDocument.uri,
							// Ensure we put the cursor at the right line (don't actually select the whole range)
							selection: {
								start: response.range.start,
								end: response.range.start,
								cursor: response.range.start
							},
							preserveFocus: true
						});
						this.setState({ warning: success ? undefined : "FILE_NOT_FOUND" });
					} else {
						this.setState({ warning: undefined });
					}
				} else {
					// assumption based on GetDocumentFromMarkerRequestType api requiring the workspace to be available
					this.setState({ warning: "REPO_NOT_IN_WORKSPACE" });
				}
			} else this.setState({ warning: "NO_REMOTE" });
		} catch (error) {}
	}

	handleClickJump = async event => {
		event.preventDefault();
		HostApi.instance.send(TelemetryRequestType, {
			eventName: "Jumped To Code",
			properties: {}
		});

		await this.jump(this.props.marker);
	};

	jump = async (marker: CSMarker) => {
		try {
			const response = await getDocumentFromMarker(marker.id);
			if (response) {
				const { success } = await HostApi.instance.send(EditorSelectRangeRequestType, {
					uri: response.textDocument.uri,
					// Ensure we put the cursor at the right line (don't actually select the whole range)
					selection: {
						start: response.range.start,
						end: response.range.start,
						cursor: response.range.start
					},
					preserveFocus: true
				});

				if (success) {
					highlightRange({
						range: response.range,
						uri: response.textDocument.uri,
						highlight: true
					});
					this._highlightDisposable = {
						dispose() {
							highlightRange({
								range: response.range,
								uri: response.textDocument.uri,
								highlight: false
							});
						}
					};
				}
				this.setState({
					textDocumentUri: response.textDocument.uri,
					warning: success ? undefined : "FILE_NOT_FOUND"
				});
				return success;
			} else {
				// assumption based on GetDocumentFromMarkerRequestType api requiring the workspace to be available
				this.setState({
					warning: "REPO_NOT_IN_WORKSPACE"
				});
			}
		} catch (ex) {
			console.error(ex);
		}
		return false;
	};

	handleClickApplyPatch = async (event, marker) => {
		event.preventDefault();
		HostApi.instance.send(TelemetryRequestType, {
			eventName: "Apply",
			properties: { "Author?": this.props.isAuthor }
		});
		await this.jump(marker);
		HostApi.instance.send(ApplyMarkerRequestType, { marker });
	};

	handleClickCompare = (event, marker) => {
		event.preventDefault();
		event.stopPropagation();
		HostApi.instance.send(TelemetryRequestType, {
			eventName: "Compare",
			properties: { "Author?": this.props.isAuthor }
		});
		HostApi.instance.send(CompareMarkerRequestType, { marker });
	};

	handleClickOpenRevision = (event, marker) => {
		event.preventDefault();
		// HostApi.instance.send(OpenRevisionMarkerRequestType, { marker });
	};

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
						<a href="https://docs.codestream.com/userguide/faq/git-issues/">{learnMore}</a>
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
									this.props.codemark &&
									this.props.codemark.markers &&
									this.props.codemark.markers[0]
										? this.props.codemark.markers[0].repoId
										: undefined
								}
								repoName={this.props.repoName}
								callback={async success => {
									this.setState({ warning: success ? undefined : "REPO_NOT_IN_WORKSPACE" });
									if (success) {
										this.openCodemark();
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
		const { codemark, marker, selected, firstVisibleLine = 0, lastVisibleLine = 0 } = this.props;
		const { startLine, endLine } = this.state;
		if (codemark == null || marker == null) return null;

		let {
			codemarkCompare: canCompare = false,
			codemarkApply: canApply = false,
			codemarkOpenRevision: canOpenRevision = false
		} = this.props.capabilities;

		let ref;
		if (marker.commitHashWhenCreated) {
			ref = marker.commitHashWhenCreated.substr(0, 8);
			if ((canCompare || canApply) && !this.state.hasDiff) {
				canCompare = false;
				canApply = false;
			}
		} else {
			ref = "";
			canCompare = false;
			canApply = false;
			canOpenRevision = false;
		}

		const canJump =
			true ||
			this.state.textDocumentUri !== this.props.textEditorUri ||
			endLine < firstVisibleLine ||
			startLine > lastVisibleLine;

		// we can't check entirelyDeleted because we don't have a DocumentMarker but rather a CSMarker
		// let entirelyDeleted = false;
		// if (marker && marker.location && marker.location.meta && marker.location.meta.entirelyDeleted)
		// 	entirelyDeleted = true;

		return (
			<>
				{(this.props.alwaysRenderCode || this.state.hasDiff || this.state.warning || canJump) &&
					this.renderCodeblock(marker)}
				{(canCompare || canApply || canOpenRevision || canJump) && selected && !this.state.warning && (
					<div className="button-spread" id={codemark.id} key="left">
						{this.state.hasDiff && (
							<div className="left">
								<Icon name="alert" /> This code has changed
							</div>
						)}
						<div className="right" key="right">
							{canApply && (
								<Tooltip title="Apply patch to current buffer" placement="bottomRight" delay={1}>
									<div
										className="codemark-actions-button"
										onClick={e => this.handleClickApplyPatch(e, marker)}
									>
										Apply
									</div>
								</Tooltip>
							)}
							{canCompare && (
								<Tooltip title="Compare current code to original" placement="bottomRight" delay={1}>
									<div
										className="codemark-actions-button"
										onClick={e => this.handleClickCompare(e, marker)}
									>
										Compare
									</div>
								</Tooltip>
							)}
							{canOpenRevision && (
								<a
									id="open-revision-button"
									className="control-button"
									tabIndex={4}
									onClick={e => this.handleClickOpenRevision(e, marker)}
								>
									Open {ref}
								</a>
							)}
						</div>
					</div>
				)}
			</>
		);
	}

	toggleExpandCodeBlock = () => {
		this.setState({ expandCodeBlock: !this.state.expandCodeBlock });
	};

	private _toggleCodeHighlight = (highlight: boolean) => {
		if (!this.props.selected) return;

		// if we're looking at a review, don't try to highlight the code.
		// the logic about state.textDocumentUri assumes a traditional
		// codemark which has been clicked on, so too much breaks from a UI
		// perspective, for little gain.
		// https://trello.com/c/Q0aNjRVh/3717-prevent-vsc-from-switching-to-file-when-its-not-open-in-a-separate-pane
		if (this.props.currentReviewId) return;

		// there are cases we know that we don't want to highlight on
		// hover, for example in the activity feed
		if (this.props.disableHighlightOnHover) return;

		if (!highlight && this._highlightDisposable) {
			this._highlightDisposable.dispose();
			this._highlightDisposable = undefined;
			return;
		}

		if (this.state.textDocumentUri === this.props.textEditorUri) {
			getDocumentFromMarker(this.props.marker.id).then(info => {
				if (info) {
					HostApi.instance.send(EditorHighlightRangeRequestType, {
						uri: info.textDocument.uri,
						range: info.range,
						highlight
					});
					this._highlightDisposable = {
						dispose() {
							HostApi.instance.send(EditorHighlightRangeRequestType, {
								uri: info.textDocument.uri,
								range: info.range,
								highlight: false
							});
						}
					};
				}
			});
		}
	};

	renderCodeblock(marker) {
		const { scrollingCodeBlock, expandCodeBlock, warning, hasDiff, currentContent } = this.state;
		if (marker === undefined) return;

		return (
			<div
				className={`related${warning ? "" : " clickable-marker"}`}
				style={{
					padding: "0",
					marginBottom: 0,
					marginLeft: "10px",
					marginRight: "10px",
					position: "relative"
				}}
				onMouseEnter={e => {
					e.preventDefault();
					this._toggleCodeHighlight(true);
				}}
				onMouseLeave={e => {
					e.preventDefault();
					this._toggleCodeHighlight(false);
				}}
				onClick={e => !warning && this.handleClickJump(e)}
			>
				<Marker
					marker={marker}
					hasDiff={hasDiff}
					currentContent={currentContent}
					diff={this.state.diff}
				/>
				{warning && (
					<div className="repo-warning">
						<Icon name="alert" /> {this.getWarningMessage()}
					</div>
				)}
				{!warning && (
					<div className="code-buttons">
						{scrollingCodeBlock && (
							<Icon
								title={expandCodeBlock ? "Collapse this code block" : "Expand this code block"}
								placement="bottomRight"
								name={expandCodeBlock ? "fold" : "unfold"}
								className="clickable"
								onClick={this.toggleExpandCodeBlock}
							/>
						)}
						<Icon
							title={"Jump to this range in " + marker.file}
							placement="bottomRight"
							name="link-external"
							className="clickable"
							onClick={e => this.handleClickJump(e)}
						/>
					</div>
				)}
			</div>
		);
	}
}

const mapStateToProps = (state: CodeStreamState, props: InheritedProps) => {
	const { editorContext, context } = state;
	//console.log(ownState);

	const textEditorVisibleRanges = getVisibleRanges(editorContext);
	const numVisibleRanges = textEditorVisibleRanges.length;
	let lastVisibleLine = 1;
	let firstVisibleLine = 1;
	if (numVisibleRanges > 0) {
		const lastVisibleRange = textEditorVisibleRanges[numVisibleRanges - 1];
		lastVisibleLine = lastVisibleRange!.end.line;
		firstVisibleLine = textEditorVisibleRanges[0].start.line;
	}

	const repoName = safe(() => getById(state.repos, props.marker.repoId).name) || "";

	return {
		repoName,
		// fileNameToFilterFor: editorContext.activeFile,
		textEditorUri: editorContext.textEditorUri || "",
		firstVisibleLine,
		lastVisibleLine,
		editorHasFocus: context.hasFocus,
		currentReviewId: state.context.currentReviewId
	};
};

export default connect(mapStateToProps)(injectIntl(MarkerActions));
