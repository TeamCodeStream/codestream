import React, { Component } from "react";
import { connect } from "react-redux";
import Icon from "./Icon";
import { isNotOnDisk, ComponentUpdateEmitter, uriToFilePath } from "../utils";
import { HostApi } from "../webview-api";
import { NewCodemarkNotificationType, WebviewPanels } from "../ipc/webview.protocol";
import {
	DocumentMarker,
	DidChangeDocumentMarkersNotificationType,
	GetFileScmInfoResponse,
	GetFileScmInfoRequestType,
	MarkerNotLocated
} from "@codestream/protocols/agent";
import { Range } from "vscode-languageserver-types";
import { fetchDocumentMarkers } from "../store/documentMarkers/actions";
import {
	ScmError,
	getFileScmError,
	mapFileScmErrorForTelemetry
} from "../store/editorContext/reducer";
import {
	setCodemarksShowArchived,
	setCodemarksWrapComments,
	setCurrentCodemark,
	setSpatialViewPRCommentsToggle,
	openPanel
} from "../store/context/actions";
import { sortBy as _sortBy } from "lodash-es";
import { setEditorContext } from "../store/editorContext/actions";
import { CodeStreamState } from "../store";
import Codemark from "./Codemark";
import { PostEntryPoint } from "../store/context/types";
import { PRInfoModal } from "./SpatialView/PRInfoModal";
import { isConnected } from "../store/providers/reducer";
import * as fs from "../utilities/fs";
import { PaneHeader, NoContent, PaneState } from "../src/components/Pane";
import { Modal } from "./Modal";
import { Dialog, ButtonRow } from "../src/components/Dialog";
import { Checkbox } from "../src/components/Checkbox";
import { Button } from "../src/components/Button";
import { Link } from "./Link";
import { setUserPreference } from "./actions";
import { InlineMenu } from "../src/components/controls/InlineMenu";

export enum CodemarkDomainType {
	File = "file",
	Directory = "directory",
	Repo = "repo",
	All = "all"
}
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
	currentStreamId?: string;
	hasPRProvider?: boolean;
	showPRComments?: boolean;
	showHidden: boolean;
	wrapComments: boolean;
	fileNameToFilterFor?: string;
	scmInfo?: GetFileScmInfoResponse;
	textEditorUri?: string;
	documentMarkers?: (DocumentMarker | MarkerNotLocated)[];
	numHidden?: number;
	state?: PaneState;
	codemarkDomain: CodemarkDomainType;

	setEditorContext: (
		...args: Parameters<typeof setEditorContext>
	) => ReturnType<typeof setEditorContext>;
	fetchDocumentMarkers: (
		...args: Parameters<typeof fetchDocumentMarkers>
	) => ReturnType<ReturnType<typeof fetchDocumentMarkers>>;
	setCodemarksShowArchived: (
		...args: Parameters<typeof setCodemarksShowArchived>
	) => ReturnType<typeof setCodemarksShowArchived>;
	setCodemarksWrapComments: (
		...args: Parameters<typeof setCodemarksWrapComments>
	) => ReturnType<typeof setCodemarksWrapComments>;
	setCurrentCodemark: (
		...args: Parameters<typeof setCurrentCodemark>
	) => ReturnType<typeof setCurrentCodemark>;
	setUserPreference: any;
	openPanel: (...args: Parameters<typeof openPanel>) => ReturnType<typeof openPanel>;
}

interface State {
	showPRInfoModal: boolean;
	showConfiguationModal: boolean;
	isLoading: boolean;
	problem: ScmError | undefined;
	showHiddenField: boolean | undefined;
	showPRCommentsField: boolean | undefined;
	wrapCommentsField: boolean | undefined;
}

export class SimpleCodemarksForFile extends Component<Props, State> {
	disposables: { dispose(): void }[] = [];
	docMarkersByStartLine: {};
	currentPostEntryPoint?: PostEntryPoint;
	_updateEmitter = new ComponentUpdateEmitter();
	_mounted = false;

	constructor(props: Props) {
		super(props);

		this.state = {
			showPRInfoModal: false,
			showConfiguationModal: false,
			isLoading: props.documentMarkers ? props.documentMarkers.length === 0 : true,
			problem: props.scmInfo && getFileScmError(props.scmInfo),
			showHiddenField: props.showPRComments,
			showPRCommentsField: props.showPRComments,
			wrapCommentsField: props.wrapComments
		};

		this.docMarkersByStartLine = {};
	}

	componentDidMount() {
		this._mounted = true;

		this.disposables.push(
			HostApi.instance.on(DidChangeDocumentMarkersNotificationType, ({ textDocument }) => {
				if (this.props.textEditorUri === textDocument.uri) {
					this.props.fetchDocumentMarkers(textDocument.uri, !this.props.showPRComments);
				}
			}),
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
	}

	onFileChangedError(error: string) {
		if (!error) return;
		HostApi.instance.track("Spatial Error State", { "Error State": error });
	}

	componentDidUpdate(prevProps: Props) {
		this._updateEmitter.emit();
		const { textEditorUri } = this.props;
		if (String(textEditorUri).length > 0 && prevProps.textEditorUri !== textEditorUri) {
			this.onFileChanged(false, this.onFileChangedError);
		}
	}

	componentWillUnmount() {
		this._mounted = false;
		this.disposables.forEach(d => d.dispose());
	}

	async onFileChanged(
		isInitialRender = false,
		renderErrorCallback: ((error: string) => void) | undefined = undefined
	) {
		const { textEditorUri, setEditorContext } = this.props;

		if (textEditorUri === undefined) {
			if (isInitialRender) {
				this.setState({ isLoading: false });
			}
			if (renderErrorCallback !== undefined) {
				renderErrorCallback("InvalidUri");
			}
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

	renderNoCodemarks = () => {
		const { textEditorUri } = this.props;

		if (textEditorUri === undefined) {
			return (
				<NoContent>
					<h3>No file open.</h3>
					<p>
						Open a source file to to start discussing code with your teammates!{" "}
						<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">View guide.</a>
					</p>
				</NoContent>
			);
		} else {
			if (this.props.children) return null;
			const modifier = navigator.appVersion.includes("Macintosh") ? "^ /" : "Ctrl-Shift-/";
			if (isNotOnDisk(textEditorUri)) {
				return (
					<NoContent>
						<h3>This file hasn't been saved.</h3>
						<p>
							Save the file before creating a codemark so that the codemark can be linked to the
							code.
						</p>
					</NoContent>
				);
			}
			if (this.state.problem === ScmError.NoRepo) {
				return (
					<NoContent>
						<h3>This file is not part of a git repository.</h3>
						<p>
							CodeStream requires files to be tracked by Git so that codemarks can be linked to the
							code.
						</p>
						<p>{uriToFilePath(textEditorUri)}</p>
					</NoContent>
				);
			}
			if (this.state.problem === ScmError.NoRemotes) {
				return (
					<NoContent>
						<h3>This repository has no remotes.</h3>
						<p>Please configure a remote URL for this repository before creating a codemark.</p>
					</NoContent>
				);
			}
			if (this.state.problem === ScmError.NoGit) {
				return (
					<NoContent>
						<h3>Git could not be located.</h3>
						<p>
							CodeStream was unable to find the `git` command. Make sure it's installed and
							configured properly.
						</p>
					</NoContent>
				);
			}

			return (
				<NoContent>
					Discuss code by selecting a range and clicking an icon.{" "}
					<Link href="https://docs.codestream.com/userguide/workflow/discuss-code/">See how.</Link>
				</NoContent>
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

	switchDomain = (value: CodemarkDomainType) => {
		const { setUserPreference } = this.props;
		setUserPreference(["codemarkDomain"], value);
	};

	render() {
		const {
			fileNameToFilterFor = "",
			documentMarkers = [],
			showHidden,
			codemarkDomain
		} = this.props;
		const { showHiddenField, showPRCommentsField, wrapCommentsField } = this.state;

		const renderedCodemarks = {};
		const count = documentMarkers.length;
		const domainIcon =
			codemarkDomain === "file"
				? "file"
				: codemarkDomain === "directory"
				? "directory"
				: codemarkDomain === "repo"
				? "repo"
				: "circle";
		const subtitle =
			codemarkDomain === "file"
				? fs.pathBasename(fileNameToFilterFor)
				: codemarkDomain === "directory"
				? fs.pathDirname(fileNameToFilterFor)
				: codemarkDomain === "repo"
				? "codestream" // FIXME
				: "all";

		const domainItems = [
			{
				label: (
					<span>
						Current File <span className="subtle">{fs.pathBasename(fileNameToFilterFor)}</span>
					</span>
				),
				key: "file",
				icon: <Icon name="file" />,
				action: () => this.switchDomain(CodemarkDomainType.File),
				checked: codemarkDomain === CodemarkDomainType.File
			},
			{
				label: (
					<span>
						Current Directory <span className="subtle">{fs.pathDirname(fileNameToFilterFor)}</span>
					</span>
				),
				key: "directory",
				icon: <Icon name="directory" />,
				action: () => this.switchDomain(CodemarkDomainType.Directory),
				checked: codemarkDomain === CodemarkDomainType.Directory
			},
			{
				label: (
					<span>
						Current Repository <span className="subtle">{"codestream"}</span>
					</span>
				),
				key: "repo",
				icon: <Icon name="repo" />,
				action: () => this.switchDomain(CodemarkDomainType.Repo),
				checked: codemarkDomain === CodemarkDomainType.Repo
			},
			{
				label: "All Codemarks in your team",
				key: "all",
				icon: <Icon name="circle" />,
				action: () => this.switchDomain(CodemarkDomainType.All),
				checked: codemarkDomain === CodemarkDomainType.All
			}
		];

		return (
			<>
				{this.state.showConfiguationModal && (
					<Modal translucent>
						<Dialog
							title="File Comment Settings"
							onClose={() => this.setState({ showConfiguationModal: false })}
						>
							<form className="standard-form">
								<fieldset className="form-body">
									<div id="controls">
										<div style={{ margin: "20px 0" }}>
											<Checkbox
												name="wrap-comments"
												checked={wrapCommentsField}
												onChange={() => this.setState({ wrapCommentsField: !wrapCommentsField })}
											>
												Wrap multi-line comments
											</Checkbox>
											<Checkbox
												name="show-hidden"
												checked={showHiddenField}
												onChange={() => this.setState({ showHiddenField: !showHiddenField })}
											>
												Show hidden/archived codemarks
											</Checkbox>
											<Checkbox
												name="show-pr-comments"
												checked={showPRCommentsField}
												onChange={() =>
													this.setState({ showPRCommentsField: !showPRCommentsField })
												}
											>
												Show comments from Pull Requests
											</Checkbox>
										</div>
									</div>
									<ButtonRow>
										<Button onClick={this.saveSettings}>Save Settings</Button>
									</ButtonRow>
								</fieldset>
							</form>
						</Dialog>
					</Modal>
				)}
				{this.state.showPRInfoModal && (
					<PRInfoModal onClose={() => this.setState({ showPRInfoModal: false })} />
				)}
				<PaneHeader
					title="Codemarks"
					count={count}
					subtitle={
						<InlineMenu className="subtle" items={domainItems}>
							<Icon name={domainIcon} className="inline-label" />
							{subtitle}
						</InlineMenu>
					}
					id={WebviewPanels.CodemarksForFile}
					isLoading={this.state.isLoading}
				>
					<Icon
						onClick={() => this.props.openPanel(WebviewPanels.NewComment)}
						name="comment"
						title="Add Comment"
						placement="bottom"
						delay={1}
					/>
					<Icon
						onClick={() => this.props.openPanel(WebviewPanels.NewIssue)}
						name="issue"
						title="Create Issue"
						placement="bottom"
						delay={1}
					/>
					<Icon
						onClick={() =>
							this.setState({ showConfiguationModal: !this.state.showConfiguationModal })
						}
						name="gear"
						title="Configure"
						placement="bottom"
						delay={1}
					/>
				</PaneHeader>
				{documentMarkers.length === 0 && this.renderNoCodemarks()}
				{this.props.state === PaneState.Open &&
					!this.state.isLoading &&
					documentMarkers
						.sort(
							(a, b) =>
								this.getMarkerStartLine(a) - this.getMarkerStartLine(b) || a.createdAt - b.createdAt
						)
						.map(docMarker => {
							const { codemark } = docMarker;

							if (codemark) {
								if (renderedCodemarks[codemark.id]) return null;
								else renderedCodemarks[codemark.id] = true;
							}

							const hidden =
								(!showHidden && codemark && (!codemark.pinned || codemark.status === "closed")) ||
								(docMarker.externalContent && !this.props.showPRComments);
							if (hidden) return null;

							return (
								<Codemark
									key={docMarker.id}
									contextName="Sidebar"
									codemark={docMarker.codemark}
									displayType="collapsed"
									wrap={this.props.wrapComments}
									marker={docMarker}
									hidden={hidden}
									highlightCodeInTextEditor
									postAction={() => {}}
									action={() => {}}
								/>
							);
						})}
			</>
		);
	}

	saveSettings = () => {
		const { showHiddenField, showPRCommentsField, wrapCommentsField } = this.state;

		this.props.setCodemarksShowArchived(!!showHiddenField);
		this.props.setCodemarksWrapComments(!!wrapCommentsField);

		if (this.props.hasPRProvider) {
			// this.props.setSpatialViewPRCommentsToggle(newShowPRComments);
			this.props.fetchDocumentMarkers(this.props.textEditorUri!, !showPRCommentsField);
		} else {
			this.setState({ showPRInfoModal: true });
		}
		this.setState({ showConfiguationModal: false });
	};
}

const EMPTY_ARRAY = [];

const mapStateToProps = (state: CodeStreamState) => {
	const { context, editorContext, configs, documentMarkers, preferences } = state;

	const docMarkers = documentMarkers[editorContext.textEditorUri || ""] || EMPTY_ARRAY;
	const numHidden = docMarkers.filter(
		d => d.codemark && (!d.codemark.pinned || d.codemark.status === "closed")
	).length;

	const hasPRProvider = ["github", "bitbucket", "gitlab"].some(name =>
		isConnected(state, { name })
	);

	const codemarkDomain: CodemarkDomainType = preferences.codemarkDomain || CodemarkDomainType.File;

	return {
		hasPRProvider,
		currentStreamId: context.currentStreamId,
		currentReviewId: context.currentReviewId,
		currentPullRequestId: context.currentPullRequest ? context.currentPullRequest.id : undefined,
		showHidden: context.codemarksShowArchived || false,
		wrapComments: context.codemarksWrapComments || false,
		showPRComments: hasPRProvider && context.spatialViewShowPRComments,
		fileNameToFilterFor: editorContext.activeFile,
		scmInfo: editorContext.scmInfo,
		textEditorUri: editorContext.textEditorUri,
		documentMarkers: docMarkers,
		numHidden,
		codemarkDomain
	};
};

export default connect(mapStateToProps, {
	fetchDocumentMarkers,
	setCodemarksShowArchived,
	setCodemarksWrapComments,
	openPanel,
	setCurrentCodemark,
	setEditorContext,
	setUserPreference,
	setSpatialViewPRCommentsToggle
})(SimpleCodemarksForFile);
