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
import { WriteTextFileRequestType, ReadTextFileRequestType } from "@codestream/protocols/agent";
import { useDidMount } from "../utilities/hooks";
import { CompareLocalFilesRequestType } from "../ipc/host.protocol";
import * as path from "path-browserify";
import { Range } from "vscode-languageserver-types";
import styled from "styled-components";
import { parseCodeStreamDiffUri } from "../store/codemarks/actions";
import { Link } from "./Link";
import { Meta, MetaLabel } from "./Codemark/BaseCodemark";
import { MetaIcons } from "./Review";
import { getProviderPullRequestRepo } from "../store/providerPullRequests/reducer";
import { CompareFilesProps } from "./PullRequestFilesChangedList";
import { TernarySearchTree } from "../utilities/searchTree";

const Directory = styled.div`
	cursor: pointer;
	padding: 2px 0;
	&:hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
`;

// const VISITED_REVIEW_FILES = "review:changeset-file-list";
const NOW = new Date().getTime(); // a rough timestamp so we know when the file was visited
// const visitedFiles = localStore.get(VISITED_REVIEW_FILES) || {};

interface Props extends CompareFilesProps {
	filesChanged: any[];
	isLoading: boolean;
	pr?: FetchThirdPartyPullRequestPullRequest;
	withTelemetry?: boolean;
	viewMode: "tree" | "files";
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
			isInVscode: state.ide.name === "VSC"
		};
	});

	const [visitedFiles, setVisitedFiles] = React.useState({ _latest: 0 });
	const [currentRepoRoot, setCurrentRepoRoot] = React.useState("");
	const [forkPointSha, setForkPointSha] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [isDisabled, setIsDisabled] = React.useState(false);
	const [isMounted, setIsMounted] = React.useState(false);

	const visitFile = (visitedKey: string, index: number) => {
		const newVisitedFiles = { ...visitedFiles, [visitedKey]: NOW, _latest: index };
		saveVisitedFiles(newVisitedFiles, key);
		setVisitedFiles(newVisitedFiles);
	};

	const unVisitFile = (visitedKey: string) => {
		const newVisitedFiles = { ...visitedFiles, [visitedKey]: false };
		saveVisitedFiles(newVisitedFiles, key);
		setVisitedFiles(newVisitedFiles);
	};

	let key = "all";

	const saveVisitedFiles = (newVisitedFiles, key) => {
		HostApi.instance.send(WriteTextFileRequestType, {
			path: `${props.baseRef}-${props.headRef}.json`,
			contents: JSON.stringify(newVisitedFiles, null, 4)
		});
	};

	const handleForkPointResponse = forkPointResponse => {
		if (!forkPointResponse || forkPointResponse.error) {
			setErrorMessage(
				forkPointResponse &&
					forkPointResponse.error &&
					forkPointResponse.error.type === "COMMIT_NOT_FOUND"
					? "A commit required to perform this review was not found in the local git repository. Fetch all remotes and try again."
					: "Could not get fork point."
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
				try {
					const forkPointResponse = await HostApi.instance.send(FetchForkPointRequestType, {
						repoId: derivedState.currentRepo!.id!,
						baseSha: props.baseRef,
						headSha: props.headRef
					});

					handleForkPointResponse(forkPointResponse);
				} catch (ex) {
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
			const response = (await HostApi.instance.send(ReadTextFileRequestType, {
				path: `${props.baseRef}-${props.headRef}.json`
			})) as any;

			try {
				setVisitedFiles(JSON.parse(response.contents || "{}"));
			} catch (ex) {
				console.warn("Error parsing JSON data: ", response.contents);
			}
		})();
	}, [pr, filesChanged, forkPointSha]);

	useEffect(() => {
		(async () => {
			if (isMounted && derivedState.currentRepo && props.pr && !forkPointSha) {
				try {
					setLoading(true);
					const forkPointResponse = await HostApi.instance.send(FetchForkPointRequestType, {
						repoId: derivedState.currentRepo!.id!,
						baseSha: pr.baseRefOid,
						headSha: pr.headRefOid
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
				const f = filesChanged[index];

				const request = {
					baseBranch: props.baseRefName,
					baseSha: forkPointSha,
					headBranch: props.headRefName,
					headSha: props.headRef,
					filePath: f.file,
					repoId: derivedState.currentRepo!.id!,
					context: pr
						? {
								pullRequest: {
									providerId: pr.providerId,
									id: pr.id
								}
						  }
						: undefined
				};
				try {
					await HostApi.instance.send(CompareLocalFilesRequestType, request);
				} catch (err) {
					setErrorMessage(err || "Could not open file diff");
				}

				visitFile(f.file, index);

				HostApi.instance.track("PR Diff Viewed", {
					Host: props.pr && props.pr.providerId
				});
			})(i);
		},
		[derivedState.currentRepo, repoId, visitedFiles, forkPointSha]
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
		const f = filesChanged[index];

		let repoRoot = currentRepoRoot;
		if (!repoRoot) {
			const response = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: false
			});
			if (!response.repositories) return;
			const currentRepoInfo = response.repositories.find(
				r => r.id === derivedState.currentRepo!.id
			);
			if (currentRepoInfo) {
				setCurrentRepoRoot(currentRepoInfo.path);
				repoRoot = currentRepoInfo.path;
			}
		}

		const result = await HostApi.instance.send(EditorRevealRangeRequestType, {
			uri: path.join("file://", repoRoot, f.file),
			range: Range.create(0, 0, 0, 0)
		});

		if (!result.success) {
			setErrorMessage("Could not open file");
		}

		HostApi.instance.track("PR File Viewed", {
			Host: props.pr && props.pr.providerId
		});
	};

	const latest = visitedFiles[key] ? visitedFiles[key]._latest : 0;

	const fileTree = files => {};

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
		return (
			<>
				<ChangesetFile
					selected={selected}
					viewMode={props.viewMode}
					icon={
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

	const toggleDirectory = hideKey => {
		const newVisitedFiles = { ...visitedFiles, [hideKey]: !visitedFiles[hideKey] };
		saveVisitedFiles(newVisitedFiles, key);
		setVisitedFiles(newVisitedFiles);
	};

	const renderDirectory = (fullPath, dirPath, depth) => {
		const hideKey = "hide:" + fullPath.join("/");
		const hidden = visitedFiles[hideKey];
		return (
			<Directory
				style={{ paddingLeft: `${depth * 10}px` }}
				onClick={() => toggleDirectory(hideKey)}
			>
				<Icon name={hidden ? "chevron-right-thin" : "chevron-down-thin"} />
				{path.join(...dirPath)}
			</Directory>
		);
	};

	const changedFiles = React.useMemo(() => {
		const lines: any[] = [];

		if (props.viewMode === "tree") {
			const tree: TernarySearchTree<any> = TernarySearchTree.forPaths();

			props.filesChanged.forEach(f => tree.set(f.file, f));
			let index = 0;
			const render = (node: any, fullPath: string[], dirPath: string[], depth: number) => {
				if (dirPath.length > 0 && (node.right || node.value)) {
					lines.push(renderDirectory(fullPath, dirPath, depth));
					dirPath = [];
					depth++;

					const hideKey = "hide:" + fullPath.join("/");
					if (visitedFiles[hideKey]) return;
				}

				// node.value is a file object, so render the file
				if (node.value) {
					lines.push(renderFile(node.value, index++, depth));
				}
				// recurse deeper into file path if the dir isn't collapsed
				if (node.mid) {
					render(node.mid, [...fullPath, node.segment], [...dirPath, node.segment], depth);
				}
				// render sibling nodes at the same depth w/same dirPath
				if (node.right) {
					render(node.right, [...fullPath, node.segment], dirPath, depth);
				}
			};
			render((tree as any)._root, [], [], 0);
		} else {
			lines.push(...props.filesChanged.map((f, index) => renderFile(f, index, 0)));
		}
		return lines;
	}, [pr, loading, derivedState.matchFile, latest, visitedFiles, forkPointSha, props.viewMode]);

	if (pr && !derivedState.currentRepo) {
		return (
			<div style={{ marginTop: "10px" }}>
				<Icon name="alert" className="margin-right" />
				Repo <span className="monospace highlight">{pr.repository.name}</span> not found in your
				editor. Open it, or <Link href={pr.repository.url}>clone the repo</Link>.
			</div>
		);
	}

	const isMacintosh = navigator.appVersion.includes("Macintosh");
	const nextFileKeyboardShortcut = () => (isMacintosh ? `⌥ F6` : "Alt-F6");
	const previousFileKeyboardShortcut = () => (isMacintosh ? `⇧ ⌥ F6` : "Shift-Alt-F6");

	return (
		<>
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
			{errorMessage && (
				<div style={{ margin: "10px 0 10px 0" }}>
					<Icon name="alert" className="margin-right" />
					{errorMessage}
				</div>
			)}
			{changedFiles}
		</>
	);
};
