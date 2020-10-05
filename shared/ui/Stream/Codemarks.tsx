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
	MarkerNotLocated,
	CodemarkPlus,
	MarkerNotLocatedReason
} from "@codestream/protocols/agent";
import { Range } from "vscode-languageserver-types";
import { fetchDocumentMarkers } from "../store/documentMarkers/actions";
import {
	ScmError,
	getFileScmError,
	mapFileScmErrorForTelemetry
} from "../store/editorContext/reducer";
import { setCurrentCodemark, openPanel } from "../store/context/actions";
import { sortBy as _sortBy } from "lodash-es";
import { setEditorContext } from "../store/editorContext/actions";
import { CodeStreamState } from "../store";
import Codemark from "./Codemark";
import { PostEntryPoint } from "../store/context/types";
import { PRInfoModal } from "./SpatialView/PRInfoModal";
import { isConnected } from "../store/providers/reducer";
import * as fs from "../utilities/fs";
import { PaneHeader, NoContent, PaneState, PaneBody } from "../src/components/Pane";
import { Modal } from "./Modal";
import { Dialog, ButtonRow } from "../src/components/Dialog";
import { Checkbox } from "../src/components/Checkbox";
import { Button } from "../src/components/Button";
import { Link } from "./Link";
import { setUserPreference, setUserPreferences } from "./actions";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { withSearchableItems, WithSearchableItemsProps } from "./withSearchableItems";
import { ReposState } from "../store/repos/types";
import { getActiveCodemarks } from "../store/codemarks/reducer";
import { orderBy } from "lodash-es";
import { CSMarker } from "@codestream/protocols/api";

export enum CodemarkDomainType {
	File = "file",
	Directory = "directory",
	Repo = "repo",
	Team = "team"
}

export enum CodemarkSortType {
	File = "file",
	CreatedAt = "createdAt"
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

interface InheritedProps {
	paneState: PaneState;
}

interface ConnectedProps {
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
	codemarkDomain: CodemarkDomainType;
	codemarkSortType: CodemarkSortType;
	teamName: string;
	repoName: string;
	repos: ReposState;
	codemarks: CodemarkPlus[];
	count: number;
}

interface DispatchProps {
	setEditorContext: (
		...args: Parameters<typeof setEditorContext>
	) => ReturnType<typeof setEditorContext>;
	fetchDocumentMarkers: (
		...args: Parameters<typeof fetchDocumentMarkers>
	) => ReturnType<ReturnType<typeof fetchDocumentMarkers>>;
	setCurrentCodemark: (
		...args: Parameters<typeof setCurrentCodemark>
	) => ReturnType<typeof setCurrentCodemark>;
	setUserPreference: any;
	setUserPreferences: Function;
	openPanel: (...args: Parameters<typeof openPanel>) => ReturnType<typeof openPanel>;
}

interface Props extends ConnectedProps, DispatchProps, InheritedProps, WithSearchableItemsProps {}

interface State {
	showPRInfoModal: boolean;
	showConfiguationModal: boolean;
	isLoading: boolean;
	problem: ScmError | undefined;
	showHiddenField: boolean | undefined;
	showPRCommentsField: boolean | undefined;
	codemarkSortTypeField: CodemarkSortType | undefined;
	wrapCommentsField: boolean | undefined;
	pendingPRConnection: boolean | undefined;
}

export class SimpleCodemarksForFile extends Component<Props, State> {
	disposables: { dispose(): void }[] = [];
	docMarkersByStartLine: {};
	currentPostEntryPoint?: PostEntryPoint;
	_updateEmitter = new ComponentUpdateEmitter();
	_mounted = false;

	renderedCodemarks = {};

	constructor(props: Props) {
		super(props);

		this.state = {
			showPRInfoModal: false,
			showConfiguationModal: false,
			isLoading: props.documentMarkers ? props.documentMarkers.length === 0 : true,
			problem: props.scmInfo && getFileScmError(props.scmInfo),
			showHiddenField: props.showHidden,
			showPRCommentsField: props.showPRComments,
			wrapCommentsField: props.wrapComments,
			codemarkSortTypeField: props.codemarkSortType || CodemarkSortType.File,
			pendingPRConnection: false
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
		const { codemarkDomain, textEditorUri, documentMarkers } = this.props;
		if (codemarkDomain !== CodemarkDomainType.Team) {
			if (String(textEditorUri).length > 0 && prevProps.textEditorUri !== textEditorUri) {
				this.onFileChanged(false, this.onFileChangedError);
			}
		}
		if (
			documentMarkers &&
			prevProps.documentMarkers &&
			documentMarkers.length > prevProps.documentMarkers.length
		) {
			for (var i = prevProps.documentMarkers.length; i < documentMarkers.length; i++) {
				const { codemark } = documentMarkers[i];
				if (codemark) {
					setTimeout(() => {
						const el = document.getElementById(`codemark-${codemark.id}`);
						if (el) el.classList.add("highlight-pulse");
					}, 500);
				}
			}
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

	// compareStart(range1?: Range[], range2?: Range[]) {
	// 	if (range1 == null || range1.length === 0 || range2 == null || range2.length === 0) return true;
	// 	const start1 = range1[0].start.line;
	// 	const start2 = range2[0].start.line;
	// 	return start1 !== start2;
	// }

	renderNoCodemarks = () => {
		const { textEditorUri } = this.props;

		if (textEditorUri === undefined) {
			return (
				<NoContent>
					<p>
						Open a source file to to start discussing code with your teammates{" "}
						<a href="https://docs.codestream.com/userguide/workflow/discuss-code/">Learn more.</a>
					</p>
				</NoContent>
			);
		} else {
			if (this.props.children) return null;
			const modifier = navigator.appVersion.includes("Macintosh") ? "^ /" : "Ctrl-Shift-/";
			if (isNotOnDisk(textEditorUri)) {
				return (
					<NoContent>
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
					<Link href="https://docs.codestream.com/userguide/workflow/discuss-code/">
						Learn more.
					</Link>
				</NoContent>
			);
		}
	};

	static getMarkerStartLine = (marker: CSMarker | undefined) => {
		if (!marker) return 0;
		if (marker.locationWhenCreated && marker.locationWhenCreated.length)
			return marker.locationWhenCreated[0] - 1;
		if (marker.referenceLocations) {
			const item = marker.referenceLocations.find(_ => _.flags && _.flags.canonical);
			if (item && item.location && item.location.length) {
				return item.location[0];
			}
		}
		return 0;
	};

	static getDocumentMarkerStartLine = (
		markerLike: (DocumentMarker & MarkerNotLocated) | undefined
	) => {
		if (!markerLike || markerLike.notLocatedReason) return 0;
		if (markerLike.range) {
			return markerLike.range.start.line;
		}

		if (markerLike.locationWhenCreated && markerLike.locationWhenCreated.length)
			return markerLike.locationWhenCreated[0] - 1;
		if (markerLike.referenceLocations) {
			const item = markerLike.referenceLocations.find(_ => _.flags && _.flags.canonical);
			if (item && item.location && item.location.length) {
				return item.location[0];
			}
		}
		return 0;
	};

	switchDomain = (value: CodemarkDomainType) => {
		const { setUserPreference } = this.props;
		setUserPreference(["codemarkDomain"], value);
	};

	renderCodemarks = () => {
		switch (this.props.codemarkDomain) {
			case CodemarkDomainType.File:
				return this.renderCodemarksFile();
			case CodemarkDomainType.Directory:
			case CodemarkDomainType.Repo:
			case CodemarkDomainType.Team:
				return this.renderCodemarksFromSearch();
			default:
				return null;
		}
	};

	renderCodemarksFromSearch = () => {
		const { codemarks } = this.props;
		if (codemarks.length === 0) return this.renderNoCodemarks();
		// if (this.state.isLoading) return null;
		return codemarks.map(codemark => {
			this.renderedCodemarks[codemark.id] = true;
			return (
				<Codemark
					key={codemark.id}
					contextName="Sidebar"
					codemark={codemark as CodemarkPlus}
					displayType="collapsed"
					wrap={this.props.wrapComments}
					marker={{} as MarkerNotLocated}
					highlightCodeInTextEditor
					postAction={() => {}}
					action={() => {}}
				/>
			);
		});
	};

	renderCodemarksFile = () => {
		const { documentMarkers = [], showHidden, codemarkSortType: codemarkSortType } = this.props;
		if (documentMarkers.length === 0) return this.renderNoCodemarks();
		if (this.state.isLoading) return null;
		const codemarksInList = {};
		let codemarkSortFn;
		if (codemarkSortType === CodemarkSortType.File) {
			codemarkSortFn = (a: DocumentMarker, b: DocumentMarker) => {
				return (
					SimpleCodemarksForFile.getDocumentMarkerStartLine(
						a as DocumentMarker & MarkerNotLocated
					) -
						SimpleCodemarksForFile.getDocumentMarkerStartLine(
							b as DocumentMarker & MarkerNotLocated
						) || b.createdAt - a.createdAt
				);
			};
		} else {
			codemarkSortFn = (a: DocumentMarker, b: DocumentMarker) => b.createdAt - a.createdAt;
		}
		return documentMarkers
			.sort((a, b) => codemarkSortFn(a, b))
			.map(docMarker => {
				const { codemark } = docMarker;

				if (codemark) {
					if (codemarksInList[codemark.id]) return null;
					else codemarksInList[codemark.id] = true;
					this.renderedCodemarks[codemark.id] = true;
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
			});
	};

	render() {
		const { fileNameToFilterFor = "", codemarkDomain, codemarkSortType, count } = this.props;
		const {
			showHiddenField,
			showPRCommentsField,
			codemarkSortTypeField,
			wrapCommentsField
		} = this.state;

		const domainIcon =
			codemarkDomain === CodemarkDomainType.File
				? "file"
				: codemarkDomain === CodemarkDomainType.Directory
				? "directory"
				: codemarkDomain === CodemarkDomainType.Repo
				? "repo"
				: "team";
		const subtitle =
			codemarkDomain === CodemarkDomainType.File
				? fs.pathBasename(fileNameToFilterFor) || "[no file]"
				: codemarkDomain === CodemarkDomainType.Directory
				? fs.pathDirname(fileNameToFilterFor) || "[no file]"
				: codemarkDomain === CodemarkDomainType.Repo
				? this.props.repoName || "[repository]"
				: this.props.teamName;

		const domainItems = [
			{
				label: "Current File",
				subtle: fs.pathBasename(fileNameToFilterFor),
				key: "file",
				icon: <Icon name="file" />,
				action: () => this.switchDomain(CodemarkDomainType.File),
				checked: codemarkDomain === CodemarkDomainType.File
			},
			{
				label: "Current Directory",
				subtle: fs.pathDirname(fileNameToFilterFor),
				key: "directory",
				icon: <Icon name="directory" />,
				action: () => this.switchDomain(CodemarkDomainType.Directory),
				checked: codemarkDomain === CodemarkDomainType.Directory
			},
			{
				label: "Current Repository",
				subtle: this.props.repoName || "[repository]",
				key: "repo",
				icon: <Icon name="repo" />,
				action: () => this.switchDomain(CodemarkDomainType.Repo),
				checked: codemarkDomain === CodemarkDomainType.Repo
			},
			{
				label: "All Codemarks",
				subtle: this.props.teamName,
				key: "team",
				icon: <Icon name="team" />,
				action: () => this.switchDomain(CodemarkDomainType.Team),
				checked: codemarkDomain === CodemarkDomainType.Team
			}
		];

		// console.warn("RENDERING CODEMARKS");
		return (
			<>
				{this.state.showConfiguationModal && (
					<Modal translucent>
						<Dialog
							title="Codemark Settings"
							onClose={() => this.setState({ showConfiguationModal: false })}
						>
							<div className="standard-form">
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
												checked={
													this.props.hasPRProvider
														? this.state.pendingPRConnection
															? true
															: !!showPRCommentsField
														: false
												}
												onChange={() => {
													if (!this.props.hasPRProvider) {
														this.setState({ showPRInfoModal: true });
														this.setState({ pendingPRConnection: true });
													} else {
														this.setState({ pendingPRConnection: false });
														this.setState({ showPRCommentsField: !showPRCommentsField });
													}
												}}
											>
												Show comments from Pull Requests
											</Checkbox>
											<Checkbox
												name="sort-codemarks"
												checked={codemarkSortTypeField === CodemarkSortType.CreatedAt}
												onChange={e =>
													this.setState({
														codemarkSortTypeField: e
															? CodemarkSortType.CreatedAt
															: CodemarkSortType.File
													})
												}
											>
												Sort comments by date
											</Checkbox>
										</div>
									</div>
									<ButtonRow>
										<Button onClick={this.saveSettings}>Save Settings</Button>
									</ButtonRow>
								</fieldset>
							</div>
						</Dialog>
					</Modal>
				)}
				{this.state.showPRInfoModal && (
					<PRInfoModal
						onClose={() => {
							this.setState({ showPRInfoModal: false });
						}}
					/>
				)}
				<PaneHeader
					title="Codemarks"
					count={count}
					subtitle={
						<>
							<InlineMenu
								key="codemark-display-options"
								className="subtle no-padding"
								noFocusOnSelect
								items={domainItems}
								title="Show Codemarks"
							>
								<Icon name={domainIcon} className="inline-label" />
								{subtitle}
							</InlineMenu>
						</>
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
						tabIndex={1}
					/>
					<Icon
						onClick={() => this.props.openPanel(WebviewPanels.NewIssue)}
						name="issue"
						title="Create Issue"
						placement="bottom"
						delay={1}
						tabIndex={1}
					/>
					<Icon
						onClick={() => this.props.openPanel(WebviewPanels.CodemarksForFile)}
						name="maximize"
						title="Spatial View"
						placement="bottom"
						delay={1}
						tabIndex={1}
					/>
					<Icon
						onClick={() =>
							this.setState({ showConfiguationModal: !this.state.showConfiguationModal })
						}
						name="gear"
						title="Configure"
						placement="bottom"
						delay={1}
						tabIndex={1}
					/>
				</PaneHeader>
				{this.props.paneState !== PaneState.Collapsed && (
					<PaneBody>{this.renderCodemarks()}</PaneBody>
				)}
			</>
		);
	}

	saveSettings = async () => {
		const {
			showHiddenField,
			showPRCommentsField,
			codemarkSortTypeField,
			wrapCommentsField
		} = this.state;

		let preferences = {
			codemarksShowArchived: !!showHiddenField,
			codemarksWrapComments: !!wrapCommentsField,
			codemarkSortType: codemarkSortTypeField
		} as any;
		if (this.props.hasPRProvider) {
			preferences.codemarksShowPRComments = !!showPRCommentsField;
		} else {
			preferences.codemarksShowPRComments = false;
		}
		await this.props.setUserPreferences(preferences);
		if (this.props.hasPRProvider) {
			this.props.fetchDocumentMarkers(this.props.textEditorUri!, !showPRCommentsField);
		}
		this.setState({ showConfiguationModal: false });
	};
}

const EMPTY_ARRAY = [];

const mapStateToProps = (state: CodeStreamState, props): ConnectedProps => {
	const { context, repos, editorContext, documentMarkers, preferences, teams, codemarks } = state;

	const teamName = teams[context.currentTeamId].name;
	const docMarkers = documentMarkers[editorContext.textEditorUri || ""] || EMPTY_ARRAY;
	const numHidden = docMarkers.filter(
		d => d.codemark && (!d.codemark.pinned || d.codemark.status === "closed")
	).length;

	const hasPRProvider = ["github", "bitbucket", "gitlab"].some(name =>
		isConnected(state, { name })
	);

	let repoName = "";
	const scmInfo = editorContext.scmInfo;
	if (scmInfo && scmInfo.scm) {
		const { repoId } = scmInfo.scm;
		if (repoId && repos[repoId]) repoName = repos[repoId].name;
	}

	const codemarkDomain: CodemarkDomainType = preferences.codemarkDomain || CodemarkDomainType.File;
	const codemarkSortType: CodemarkSortType = preferences.codemarkSortType || CodemarkSortType.File;

	let codemarksToRender = EMPTY_ARRAY as CodemarkPlus[];
	if (scmInfo && codemarkDomain !== CodemarkDomainType.File) {
		const { items = [], showHidden } = props;
		const { scm = {} as any } = scmInfo as GetFileScmInfoResponse;
		const { repoId } = scm;
		const currentDirectory = fs.pathDirname(scm.file || "");
		let codemarkSortFn;
		if (codemarkSortType === CodemarkSortType.File) {
			codemarkSortFn = (a: CodemarkPlus, b: CodemarkPlus) => {
				let marker1File = "0";
				let marker2File = "0";
				let markerA: CSMarker | undefined;
				let markerB: CSMarker | undefined;
				if (a.markers && a.markers.length) {
					markerA = a.markers[0];
					marker1File = markerA.file || "0";
				}
				if (b.markers && b.markers.length) {
					markerB = b.markers[0];
					marker2File = markerB.file || "0";
				}

				return (
					marker1File.localeCompare(marker2File, undefined, { caseFirst: "lower" }) ||
					SimpleCodemarksForFile.getMarkerStartLine(markerA) -
						SimpleCodemarksForFile.getMarkerStartLine(markerB)
				);
			};
		} else {
			codemarkSortFn = (a: CodemarkPlus, b: CodemarkPlus) => b.createdAt - a.createdAt;
		}

		codemarksToRender = getActiveCodemarks(state)
			.filter(codemark => {
				const hidden =
					//@ts-ignore
					!showHidden && codemark && (!codemark.pinned || codemark.status === "closed");
				if (hidden) return false;

				if (
					codemarkDomain === CodemarkDomainType.Repo ||
					codemarkDomain === CodemarkDomainType.Directory
				) {
					if (!((codemark as any).markers || []).find(marker => marker.repoId === repoId))
						return false;
				}
				if (codemarkDomain === CodemarkDomainType.Directory) {
					if (
						!((codemark as any).markers || []).find(marker =>
							fs.pathDirname(marker.file || "").startsWith(currentDirectory)
						)
					)
						return false;
				}
				return true;
			})
			.sort((a: CodemarkPlus, b: CodemarkPlus) => codemarkSortFn(a, b));
	}

	const count =
		codemarkDomain === CodemarkDomainType.File ? docMarkers.length : codemarksToRender.length;

	return {
		repos,
		teamName,
		repoName,
		hasPRProvider,
		currentStreamId: context.currentStreamId,
		showHidden: preferences.codemarksShowArchived || false,
		wrapComments: preferences.codemarksWrapComments || false,
		showPRComments: hasPRProvider && preferences.codemarksShowPRComments,
		fileNameToFilterFor: editorContext.activeFile,
		scmInfo: editorContext.scmInfo,
		textEditorUri: editorContext.textEditorUri,
		documentMarkers: docMarkers,
		codemarks: codemarksToRender,
		count,
		numHidden,
		codemarkDomain,
		codemarkSortType
	};
};
export default withSearchableItems(
	connect(mapStateToProps, {
		fetchDocumentMarkers,
		openPanel,
		setCurrentCodemark,
		setEditorContext,
		setUserPreference,
		setUserPreferences
	})(SimpleCodemarksForFile)
);
