import {
	FetchForkPointRequestType,
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	ReposScm,
} from "@codestream/protocols/agent";
import * as path from "path-browserify";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Range } from "vscode-languageserver-types";
import { TernarySearchTree } from "@codestream/utils/system/searchTree";

import { HostApi } from "@codestream/webview/webview-api";
import { CodeStreamState } from "@codestream/webview/store";
import {
	CompareLocalFilesRequest,
	EditorRevealRangeRequestType,
	ShowNextChangedFileNotificationType,
	ShowPreviousChangedFileNotificationType,
} from "@codestream/protocols/webview";
import { CompareLocalFilesRequestType } from "../ipc/host.protocol";
import { logError } from "../logger";
import { parseCodeStreamDiffUri } from "../store/codemarks/actions";
import {
	getCurrentProviderPullRequest,
	getProviderPullRequestCollaborators,
	getPullRequestId,
} from "../store/providerPullRequests/slice";
import { useDidMount } from "../utilities/hooks";
import { Meta, MetaLabel } from "./Codemark/BaseCodemark";
import Icon from "./Icon";
import { Link } from "./Link";
import { PRErrorBox, PRErrorBoxSidebar } from "./PullRequestComponents";
import { PullRequestFilesChangedFileComments } from "./PullRequestFilesChangedFileComments";
import { CompareFilesProps } from "./PullRequestFilesChangedList";
import { MetaIcons } from "./Review";

export const Directory = styled.div`
	cursor: pointer;
	padding: 2px 0;
	margin: 0 !important;
	&:hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
`;

export const FileWithComments = styled.div`
	cursor: pointer;
	margin: 0 !important;
	&:hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
`;

const NOW = new Date().getTime(); // a rough timestamp so we know when the file was visited

interface Props extends CompareFilesProps {
	filesChanged: any[];
	isLoading: boolean;
	pr?: FetchThirdPartyPullRequestPullRequest;
	withTelemetry?: boolean;
	viewMode: "tree" | "files";
	visitFile: (filename: string, index: number) => void;
	unVisitFile: (filename: string) => void;
	toggleDirectory: (hideKey: string) => void;
	visitedFiles: {
		_latest: number;
		[key: string]: boolean | number;
	};
	commentMap: {
		[path: string]: any;
	};
	commitBased?: boolean;
	prCommitsRange: any;
	sidebarView?: boolean;
	startingDepth?: number;
	accessRawDiffs?: boolean;
	setAccessRawDiffs?: Function;
}

export const PullRequestFilesChanged = (props: Props) => {
	const { pr, filesChanged, accessRawDiffs, setAccessRawDiffs } = props;
	// const dispatch = useDispatch<Dispatch>();
	const [repoId, setRepoId] = useState("");
	const derivedState = useSelector((state: CodeStreamState) => {
		const userId = state.session.userId || "";
		const currentPullRequestId = state.context.currentPullRequest
			? state.context.currentPullRequest.id
			: undefined;
		const matchFile =
			currentPullRequestId &&
			state.editorContext.scmInfo &&
			state.editorContext.scmInfo.uri &&
			state.editorContext.scmInfo.uri.startsWith("codestream-diff://")
				? state.editorContext.scmInfo.uri
				: "";
		const parsedDiffUri = parseCodeStreamDiffUri(matchFile || "");
		const currentPullRequest = getCurrentProviderPullRequest(state);

		const result = {
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequest: currentPullRequest,
			matchFile,
			parsedDiffUri,
			userId,
			repos: state.repos,
			// FIXME each provider has a different shape. We made the GL response
			// conform to the GH object, since repository was under
			// project.mergeRequest.repository.
			prRepoId: currentPullRequest?.conversations?.repository?.prRepoId,
			numFiles: props.filesChanged.length,
			isInVscode: state.ide.name === "VSC",
			pullRequestId: getPullRequestId(state),
			collaborators: getProviderPullRequestCollaborators(state),
		};
		return result;
	});

	const { visitedFiles, visitFile, unVisitFile } = props;
	const [currentRepoRoot, setCurrentRepoRoot] = React.useState("");
	const [forkPointSha, setForkPointSha] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | React.ReactNode>("");
	const [repoErrorMessage, setRepoErrorMessage] = React.useState<string | React.ReactNode>("");
	const [loading, setLoading] = React.useState(false);
	const [isDisabled, setIsDisabled] = React.useState(false);
	const [isMounted, setIsMounted] = React.useState(false);
	const [showErrorDetails, setShowErrorDetails] = React.useState(false);
	const [openRepos, setOpenRepos] = React.useState<ReposScm[]>([]);

	const handleForkPointResponse = forkPointResponse => {
		if (!forkPointResponse || forkPointResponse.error) {
			const errorMessageCopy =
				forkPointResponse &&
				forkPointResponse.error &&
				forkPointResponse.error.type === "COMMIT_NOT_FOUND" ? (
					<span>
						A commit required to perform this review was not found in the local git repository.
						Fetch all remotes and try again.
					</span>
				) : pr && forkPointResponse.error.type === "REPO_NOT_FOUND" ? (
					<div>
						Repo <span className="monospace highlight">{pr.repository?.name}</span> not found in
						your editor. Open it, or <Link href={pr.repository?.url}>clone the repo</Link>.
					</div>
				) : (
					<span>Could not get fork point.</span>
				);

			logError(forkPointResponse?.error?.type || "undefined forkPointResponse", {
				detail: errorMessageCopy,
				repoId: derivedState.prRepoId!,
				baseSha: props?.baseRef,
				headSha: props?.headRef,
				baseShaFromPrProp: props?.pr?.baseRefOid,
				headShaFromPrProp: props?.pr?.headRefOid,
				ref: getRef,
			});
			setErrorMessage(errorMessageCopy);

			setIsDisabled(true);
		} else if (forkPointResponse.sha) {
			setForkPointSha(forkPointResponse.sha);
		}
	};

	const handleMoreDetailsErrorClick = async e => {
		e.preventDefault();
		e.stopPropagation();
		if (!showErrorDetails) {
			const response = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: true,
				includeCurrentBranches: true,
				includeProviders: true,
				includeRemotes: true,
				includeConnectedProviders: true,
			});
			if (response && response.repositories) {
				setOpenRepos(response.repositories);
			}
			setShowErrorDetails(true);
		}
	};

	const getRef = useMemo(() => {
		if (props.pr && derivedState.currentPullRequestProviderId) {
			if (derivedState.currentPullRequestProviderId.indexOf("github") > -1) {
				return `refs/pull/${props.pr.number}/head`;
			} else if (derivedState.currentPullRequestProviderId.indexOf("gitlab") > -1) {
				return `merge-requests/${props.pr.iid}/head`;
			} else if (derivedState.currentPullRequestProviderId.indexOf("bitbucket") > -1) {
				//TODO: figure this out  FETCH_HEAD???
				return `refs/pull/${props.pr.number}/head`;
			}
		}
		return "";
	}, [derivedState.currentPullRequestProviderId, props.pr]);

	useDidMount(() => {
		if (derivedState.prRepoId) {
			(async () => {
				setLoading(true);
				let forkPointResponse;
				try {
					forkPointResponse = await HostApi.instance.send(FetchForkPointRequestType, {
						repoId: derivedState.prRepoId!,
						baseSha: props.baseRef,
						headSha: props.headRef,
						ref: getRef,
					});
					handleForkPointResponse(forkPointResponse);
				} catch (ex) {
					logError(ex, {
						detail: `failed to fetchForkPoint`,
						repoId: derivedState.prRepoId!,

						baseSha: props.baseRef,
						headSha: props.headRef,
						ref: getRef,
					});
					console.error(ex);
				} finally {
					setLoading(false);
					setIsMounted(true);
				}
			})();
		} else {
			setIsMounted(true);
		}
	});

	useEffect(() => {
		(async () => {
			if (isMounted && derivedState.prRepoId && props.pr && !forkPointSha) {
				try {
					setLoading(true);
					const forkPointResponse = await HostApi.instance.send(FetchForkPointRequestType, {
						repoId: derivedState.prRepoId!,
						baseSha: props.pr.baseRefOid,
						headSha: props.pr.headRefOid,
						ref: getRef,
					});
					handleForkPointResponse(forkPointResponse);
				} catch (err) {
					logError(err, {
						detail: `failed to fetchForkPoint`,
						repoId: derivedState.prRepoId!,
						baseSha: props.pr.baseRefOid,
						headSha: props.pr.headRefOid,
						ref: getRef,
					});
					console.error(err);
				} finally {
					setLoading(false);
				}
			}
		})();
	}, [isMounted, derivedState.prRepoId, pr]);

	const goDiff = useCallback(
		i => {
			(async index => {
				setErrorMessage("");
				if (index < 0) index = derivedState.numFiles - 1;
				if (index > derivedState.numFiles - 1) index = 0;
				const f = filesInOrder[index];

				const request: CompareLocalFilesRequest = {
					baseBranch: props.baseRefName,
					baseSha: pr && !props.commitBased ? forkPointSha : props.baseRef,
					headBranch: props.headRefName,
					headSha: props.headRef,
					filePath: f.file,
					previousFilePath: f.previousFilename,
					repoId: pr ? derivedState.prRepoId! : props.repoId!,
					context: pr
						? {
								pullRequest: {
									providerId: pr.providerId,
									id: derivedState.pullRequestId,
									collaborators: derivedState.collaborators!,
								},
						  }
						: undefined,
				};
				try {
					await HostApi.instance.send(CompareLocalFilesRequestType, request);
				} catch (err) {
					console.warn(err);
					setErrorMessage(err || "Could not open file diff");
				}

				HostApi.instance.track("PR Diff Viewed", {
					Host: pr && pr.providerId,
				});
			})(i);
		},
		[derivedState.prRepoId, repoId, visitedFiles, forkPointSha, pr, derivedState.pullRequestId]
	);

	const nextFile = useCallback(() => {
		if (!visitedFiles) goDiff(0);
		else if (visitedFiles._latest == null) goDiff(0);
		else goDiff(visitedFiles._latest + 1);
	}, [visitedFiles, goDiff]);

	const prevFile = useCallback(() => {
		if (!visitedFiles) goDiff(-1);
		else if (visitedFiles._latest == null) goDiff(-1);
		else goDiff(visitedFiles._latest - 1);
	}, [visitedFiles, goDiff]);

	useEffect(() => {
		const disposables = [
			HostApi.instance.on(ShowNextChangedFileNotificationType, nextFile),
			HostApi.instance.on(ShowPreviousChangedFileNotificationType, prevFile),
		];

		return () => disposables.forEach(disposable => disposable.dispose());
	}, [nextFile, prevFile, pr, filesChanged, visitedFiles, forkPointSha]);

	const openFile = async index => {
		if (index < 0) index = derivedState.numFiles - 1;
		if (index > derivedState.numFiles - 1) index = 0;
		const f = filesInOrder[index];

		let repoRoot = currentRepoRoot;
		if (!repoRoot) {
			const response = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: false,
			});
			if (!response.repositories) return;
			const repoIdToCheck = props.repoId
				? props.repoId
				: derivedState.prRepoId
				? derivedState.prRepoId
				: undefined;
			if (repoIdToCheck) {
				const currentRepoInfo = response.repositories.find(r => r.id === repoIdToCheck);
				if (currentRepoInfo) {
					setCurrentRepoRoot(currentRepoInfo.path);
					repoRoot = currentRepoInfo.path;
				}
			}
		}
		if (repoRoot) {
			const result = await HostApi.instance.send(EditorRevealRangeRequestType, {
				uri: path.join("file://", repoRoot, f.file),
				range: Range.create(0, 0, 0, 0),
			});

			if (!result.success) {
				setErrorMessage("Could not open file");
			} else {
				HostApi.instance.track("PR File Viewed", {
					Host: props.pr && props.pr.providerId,
				});
			}
		} else {
			setErrorMessage("Could not find a repo");
		}
	};

	const renderFile = (f, index, depth) => {
		const selected = derivedState.parsedDiffUri && derivedState.parsedDiffUri.path == f.file;
		const visited = visitedFiles[f.file];

		// This logic replaces old logic of auto-checking
		// Now, we have the user manually check files off in their diff list
		let icon;
		// if we're loading, show a spinner
		if (loading) icon = "sync";
		// this file is currently selected, and visible in diff view
		else if (visited) icon = "ok";
		// not yet visited, but part of the review
		else icon = "circle";

		const iconClass = loading ? "file-icon spin" : "file-icon";
		// i is a temp variable to create the correct scope binding
		const i = index;

		const hasComments = (props.commentMap[f.file] || []).length > 0;
		return (
			<PullRequestFilesChangedFileComments
				key={`${i}_${f.file}`}
				comments={hasComments && props.commentMap[f.file]}
				icon={icon}
				prCommitsRange={props.prCommitsRange}
				iconClass={iconClass}
				index={i}
				hasComments={hasComments}
				selected={selected}
				viewMode={props.viewMode}
				fileObject={f}
				isDisabled={isDisabled}
				loading={loading}
				unVisitFile={unVisitFile}
				visitFile={visitFile}
				goDiff={goDiff}
				depth={depth}
				visited={visited}
				filesChanged={props.filesChanged}
				pullRequest={pr}
			/>
		);
	};

	const renderDirectory = (fullPath, dirPath, depth) => {
		const hideKey = "hide:" + fullPath.join("/");
		const hidden = visitedFiles[hideKey];
		return (
			<Directory
				style={{ paddingLeft: `${depth * 10}px` }}
				onClick={() => props.toggleDirectory(hideKey)}
				key={`directory_${dirPath}_${hideKey}`}
			>
				<Icon name={hidden ? "chevron-right-thin" : "chevron-down-thin"} />
				{path.join(...dirPath)}
			</Directory>
		);
	};

	const [changedFiles, filesInOrder] = React.useMemo(() => {
		const lines: any[] = [];
		//@TODO: No need to reorder files since that logic is done in agent
		//this can be cleaned up
		let filesInOrder: any[] = [];

		if (props.viewMode === "tree") {
			const tree: TernarySearchTree<any> = TernarySearchTree.forPaths();

			let filesChanged = [...props.filesChanged];
			filesChanged = filesChanged
				.sort((a, b) => {
					if (b.file < a.file) return 1;
					if (a.file < b.file) return -1;
					return 0;
				})
				.filter(f => f.file);
			// console.warn("SETTING UP THE TREE: ", tree, filesChanged);
			filesChanged.forEach(f => tree.set(f.file, f));
			let index = 0;
			const render = (
				node: any,
				fullPath: string[],
				dirPath: string[],
				depth: number,
				renderSiblings: boolean
			) => {
				if (dirPath.length > 0 && (node.right || node.value)) {
					lines.push(renderDirectory(fullPath, dirPath, depth));
					dirPath = [];
					depth++;

					const hideKey = "hide:" + fullPath.join("/");
					if (visitedFiles[hideKey]) return;
				}

				// we either render siblings, or nodes. if we aren't
				// rendering siblings, then check to see if this node
				// has a value or children and render them
				if (!renderSiblings) {
					// node.value is a file object, so render the file
					if (node.value) {
						lines.push(renderFile(node.value, index++, depth));
						filesInOrder.push(node.value);
					}
					// recurse deeper into file path if the dir isn't collapsed
					if (node.mid) {
						render(node.mid, [...fullPath, node.segment], [...dirPath, node.segment], depth, true);
					}
				}
				// render sibling nodes at the same depth w/same dirPath
				if (renderSiblings) {
					// grab all the siblings, sort them, and render them.
					const siblings: any[] = [node];

					let n = node;
					// we don't need to check left because we sort the paths
					// prior to inserting into the tree, so we never end up
					// with left nodes
					while (n.right) {
						siblings.push(n.right);
						n = n.right;
					}
					// sort directories first, then by segment name lexographically
					siblings.sort(
						(a, b) => Number(!!a.value) - Number(!!b.value) || a.segment.localeCompare(b.segment)
					);
					// render the siblings, but tell render not to re-render siblings
					siblings.forEach(n => render(n, [...fullPath, n.segment], dirPath, depth, false));
				}
			};
			render((tree as any)._root, [], [], props.startingDepth || 0, true);
		} else {
			lines.push(
				...props.filesChanged.map((f, index) => renderFile(f, index, props.startingDepth || 0))
			);
			filesInOrder = [...props.filesChanged];
		}
		return [lines, filesInOrder];
	}, [
		pr,
		derivedState.currentPullRequest,
		props.prCommitsRange,
		loading,
		derivedState.matchFile,
		visitedFiles,
		forkPointSha,
		props.viewMode,
	]);

	React.useEffect(() => {
		if (pr && !derivedState.prRepoId) {
			setRepoErrorMessage(
				<span>
					Repo <span className="monospace highlight">{pr.repository?.name}</span> not found in your
					editor. Open it, or <Link href={pr.repository?.url}>clone the repo</Link>.
					<p style={{ margin: "5px 0 0 0" }}>
						Changes can be viewed under <Icon name="diff" /> Diff Hunks view.
					</p>
				</span>
			);
			setIsDisabled(true);
		} else if (pr && (pr as any).overflow && !accessRawDiffs && setAccessRawDiffs) {
			setRepoErrorMessage(
				<span>
					GitLab only permits the first {(pr as any).changesCount} files of this merge request to be
					displayed.&nbsp;
					<Link
						onClick={() => {
							setAccessRawDiffs(true);
						}}
					>
						Load more from Gitaly
					</Link>
					.
				</span>
			);
		} else {
			setRepoErrorMessage("");
		}
	}, [pr, derivedState.prRepoId, accessRawDiffs]);

	const isMacintosh = navigator.appVersion.includes("Macintosh");
	const nextFileKeyboardShortcut = () => (isMacintosh ? `⌥ F6` : "Alt-F6");
	const previousFileKeyboardShortcut = () => (isMacintosh ? `⇧ ⌥ F6` : "Shift-Alt-F6");

	return (
		<>
			{(errorMessage || repoErrorMessage) && !props.sidebarView && (
				<PRErrorBox>
					<Icon name="alert" className="alert" />
					<div className="message">{errorMessage || repoErrorMessage}</div>
				</PRErrorBox>
			)}
			{(errorMessage || repoErrorMessage) && props.sidebarView && (
				<PRErrorBoxSidebar>
					<Icon style={{ marginRight: "10px" }} name="alert" className="alert" />
					<div>
						{errorMessage || repoErrorMessage}
						{!showErrorDetails && (
							<div>
								<Link onClick={e => handleMoreDetailsErrorClick(e)}>More details</Link>
							</div>
						)}
						{showErrorDetails && (
							<>
								<div style={{ marginTop: "10px" }}>This pull request is associated with:</div>
								<div>
									<div style={{ marginLeft: "10px" }}>
										<Link href={pr?.repository?.url}>{pr?.repository?.url}</Link>
									</div>
								</div>
								<div style={{ marginTop: "10px" }}>You have the following repositories open:</div>
								<div style={{ marginLeft: "10px" }}>
									{openRepos.map((_, index) => {
										const repoName = _.path.substring(_.path.lastIndexOf("/") + 1);
										const remotes = _?.remotes;
										return (
											<>
												<div key={`${index}_${repoName}`}>{repoName}</div>
												{remotes && (
													<>
														{remotes.map(_ => {
															const remoteUrl = `https://${_.domain}/${_.path}`;
															return (
																<div style={{ marginLeft: "10px" }}>
																	<Link href={remoteUrl}>{remoteUrl}</Link>
																</div>
															);
														})}
													</>
												)}
											</>
										);
									})}
								</div>
							</>
						)}
					</div>
				</PRErrorBoxSidebar>
			)}
			{changedFiles.length > 0 && !props.sidebarView && (
				<Meta id="changed-files">
					<MetaLabel>
						{props.filesChanged.length} Changed Files
						{!isDisabled && (
							<MetaIcons>
								<Icon
									onClick={nextFile}
									name="arrow-down"
									className="clickable"
									placement="top"
									delay={1}
									title={
										derivedState.isInVscode && (
											<span>
												Next File <span className="keybinding">{nextFileKeyboardShortcut()}</span>
											</span>
										)
									}
								/>
								<Icon
									onClick={prevFile}
									name="arrow-up"
									className="clickable"
									placement="top"
									delay={1}
									title={
										derivedState.isInVscode && (
											<span>
												Previous File{" "}
												<span className="keybinding">{previousFileKeyboardShortcut()}</span>
											</span>
										)
									}
								/>
							</MetaIcons>
						)}
					</MetaLabel>
				</Meta>
			)}
			{!errorMessage && !repoErrorMessage && <>{changedFiles}</>}
		</>
	);
};
