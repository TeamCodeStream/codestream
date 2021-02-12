import React, { useEffect, useState, useCallback } from "react";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	FetchForkPointRequestType
} from "@codestream/protocols/agent";
import { HostApi } from "..";
import { ChangesetFile } from "./Review/ChangesetFile";
import { useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import Icon from "./Icon";
import {
	ShowNextChangedFileNotificationType,
	ShowPreviousChangedFileNotificationType,
	EditorRevealRangeRequestType
} from "@codestream/protocols/webview";
import { useDidMount } from "../utilities/hooks";
import { CompareLocalFilesRequestType } from "../ipc/host.protocol";
import * as path from "path-browserify";
import { Range } from "vscode-languageserver-types";
import styled from "styled-components";
import { parseCodeStreamDiffUri } from "../store/codemarks/actions";
import { Link } from "./Link";
import { Meta, MetaLabel } from "./Codemark/BaseCodemark";
import { MetaIcons } from "./Review";
import {
	getProviderPullRequestRepo,
	getPullRequestId
} from "../store/providerPullRequests/reducer";
import { CompareFilesProps } from "./PullRequestFilesChangedList";
import { TernarySearchTree } from "../utilities/searchTree";
import { PRErrorBox } from "./PullRequestComponents";

export const Directory = styled.div`
	cursor: pointer;
	padding: 2px 0;
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
}

export const PullRequestFilesChanged = (props: Props) => {
	const { pr, filesChanged } = props;
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

		return {
			matchFile,
			parsedDiffUri,
			userId,
			repos: state.repos,
			currentRepo: getProviderPullRequestRepo(state),
			numFiles: props.filesChanged.length,
			isInVscode: state.ide.name === "VSC",
			pullRequestId: getPullRequestId(state)
		};
	});

	const { visitedFiles, visitFile, unVisitFile } = props;
	const [currentRepoRoot, setCurrentRepoRoot] = React.useState("");
	const [forkPointSha, setForkPointSha] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | React.ReactNode>("");
	const [repoErrorMessage, setRepoErrorMessage] = React.useState<string | React.ReactNode>("");
	const [loading, setLoading] = React.useState(false);
	const [isDisabled, setIsDisabled] = React.useState(false);
	const [isMounted, setIsMounted] = React.useState(false);

	const handleForkPointResponse = forkPointResponse => {
		if (!forkPointResponse || forkPointResponse.error) {
			setErrorMessage(
				forkPointResponse &&
					forkPointResponse.error &&
					forkPointResponse.error.type === "COMMIT_NOT_FOUND" ? (
					"A commit required to perform this review was not found in the local git repository. Fetch all remotes and try again."
				) : pr && forkPointResponse.error.type === "REPO_NOT_FOUND" ? (
					<>
						Repo <span className="monospace highlight">{pr.repository.name}</span> not found in your
						editor. Open it, or <Link href={pr.repository.url}>clone the repo</Link>.
					</>
				) : (
					<span>Could not get fork point.</span>
				)
			);

			setIsDisabled(true);
		} else if (forkPointResponse.sha) {
			setForkPointSha(forkPointResponse.sha);
		}
	};

	useDidMount(() => {
		if (derivedState.currentRepo) {
			(async () => {
				setLoading(true);
				let forkPointResponse;
				try {
					forkPointResponse = await HostApi.instance.send(FetchForkPointRequestType, {
						repoId: derivedState.currentRepo!.id!,
						baseSha: props.baseRef,
						headSha: props.headRef,
						// TODO check ref format for GitLab and Bitbucket
						ref: props.pr && `refs/pull/${props.pr.number}/head`
					});
				} catch (ex) {
					console.error(ex);
				} finally {
					handleForkPointResponse(forkPointResponse);
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
			if (isMounted && derivedState.currentRepo && props.pr && !forkPointSha) {
				try {
					setLoading(true);
					const forkPointResponse = await HostApi.instance.send(FetchForkPointRequestType, {
						repoId: derivedState.currentRepo!.id!,
						baseSha: props.pr.baseRefOid,
						headSha: props.pr.headRefOid,
						// TODO check ref format for GitLab and Bitbucket
						ref: props.pr && `refs/pull/${props.pr.number}/head`
					});
					handleForkPointResponse(forkPointResponse);
				} catch (err) {
					console.error(err);
				} finally {
					setLoading(false);
				}
			}
		})();
	}, [isMounted, derivedState.currentRepo, pr]);

	const goDiff = useCallback(
		i => {
			(async index => {
				setErrorMessage("");
				if (index < 0) index = derivedState.numFiles - 1;
				if (index > derivedState.numFiles - 1) index = 0;
				const f = filesInOrder[index];

				const request = {
					baseBranch: props.baseRefName,
					baseSha: pr && !props.commitBased ? forkPointSha : props.baseRef,
					headBranch: props.headRefName,
					headSha: props.headRef,
					filePath: f.file,
					repoId: pr ? derivedState.currentRepo!.id! : props.repoId!,
					context: pr
						? {
								pullRequest: {
									providerId: pr.providerId,
									id: derivedState.pullRequestId
								}
						  }
						: undefined
				};
				try {
					await HostApi.instance.send(CompareLocalFilesRequestType, request);
				} catch (err) {
					console.warn(err);
					setErrorMessage(err || "Could not open file diff");
				}

				visitFile(f.file, index);

				HostApi.instance.track("PR Diff Viewed", {
					Host: pr && pr.providerId
				});
			})(i);
		},
		[derivedState.currentRepo, repoId, visitedFiles, forkPointSha, pr, derivedState.pullRequestId]
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
			HostApi.instance.on(ShowPreviousChangedFileNotificationType, prevFile)
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
				inEditorOnly: false
			});
			if (!response.repositories) return;
			const repoIdToCheck = props.repoId
				? props.repoId
				: derivedState.currentRepo
				? derivedState.currentRepo.id
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
				range: Range.create(0, 0, 0, 0)
			});

			if (!result.success) {
				setErrorMessage("Could not open file");
			} else {
				HostApi.instance.track("PR File Viewed", {
					Host: props.pr && props.pr.providerId
				});
			}
		} else {
			setErrorMessage("Could not find a repo");
		}
	};

	const renderFile = (f, index, depth) => {
		const selected = derivedState.parsedDiffUri && derivedState.parsedDiffUri.path == f.file;
		const visited = visitedFiles[f.file];
		if (selected && !visited) {
			visitFile(f.file, index);
		}

		let icon;
		// if we're loading, show a spinner
		if (loading) icon = "sync";
		// this file is currently selected, and visible in diff view
		else if (selected) icon = "arrow-right";
		// this file has been visitied during the review
		else if (visited) icon = "ok";
		// not yet visited, but part of the review
		else icon = "circle";

		const iconClass = loading ? "file-icon spin" : "file-icon";
		// i is a temp variable to create the correct scope binding
		const i = index;
		const commentCount = (props.commentMap[f.file] || []).length;
		return (
			<>
				<ChangesetFile
					selected={selected}
					viewMode={props.viewMode}
					icon={
						isDisabled ? null : (
							<Icon
								onClick={
									visited
										? async e => {
												e.preventDefault();
												e.stopPropagation();
												unVisitFile(f.file);
										  }
										: undefined
								}
								name={icon}
								className={iconClass}
							/>
						)
					}
					noHover={isDisabled || loading}
					onClick={
						isDisabled || loading
							? undefined
							: async e => {
									e.preventDefault();
									goDiff(i);
							  }
					}
					badge={commentCount > 0 ? <span className="badge">{commentCount}</span> : undefined}
					actionIcons={
						!loading &&
						!isDisabled && (
							<div className="actions">
								<Icon
									name="goto-file"
									className="clickable action"
									title="Open File"
									placement="left"
									delay={1}
									onClick={async e => {
										e.stopPropagation();
										e.preventDefault();
										openFile(i);
									}}
								/>
							</div>
						)
					}
					key={i + ":" + f.file}
					depth={depth}
					{...f}
				/>
			</>
		);
	};

	const renderDirectory = (fullPath, dirPath, depth) => {
		const hideKey = "hide:" + fullPath.join("/");
		const hidden = visitedFiles[hideKey];
		return (
			<Directory
				style={{ paddingLeft: `${depth * 12}px` }}
				onClick={() => props.toggleDirectory(hideKey)}
			>
				<Icon name={hidden ? "chevron-right-thin" : "chevron-down-thin"} />
				{path.join(...dirPath)}
			</Directory>
		);
	};

	const [changedFiles, filesInOrder] = React.useMemo(() => {
		const lines: any[] = [];
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
			render((tree as any)._root, [], [], 0, true);
		} else {
			lines.push(...props.filesChanged.map((f, index) => renderFile(f, index, 0)));
			filesInOrder = [...props.filesChanged];
		}
		return [lines, filesInOrder];
	}, [pr, loading, derivedState.matchFile, visitedFiles, forkPointSha, props.viewMode]);

	React.useEffect(() => {
		if (pr && !derivedState.currentRepo) {
			setRepoErrorMessage(
				<span>
					Repo <span className="monospace highlight">{pr.repository.name}</span> not found in your
					editor. Open it, or <Link href={pr.repository.url}>clone the repo</Link>.
				</span>
			);
			setIsDisabled(true);
		} else {
			setRepoErrorMessage("");
		}
	}, [pr, derivedState.currentRepo]);

	const isMacintosh = navigator.appVersion.includes("Macintosh");
	const nextFileKeyboardShortcut = () => (isMacintosh ? `⌥ F6` : "Alt-F6");
	const previousFileKeyboardShortcut = () => (isMacintosh ? `⇧ ⌥ F6` : "Shift-Alt-F6");

	return (
		<>
			{(errorMessage || repoErrorMessage) && (
				<PRErrorBox>
					<Icon name="alert" className="alert" />
					<div className="message">
						{errorMessage || repoErrorMessage}
						<p style={{ margin: "5px 0 0 0" }}>
							Changes can be viewed under <Icon name="diff" /> Diff Hunks view.
						</p>
					</div>
				</PRErrorBox>
			)}
			{changedFiles.length > 0 && (
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
			{changedFiles}
		</>
	);
};
