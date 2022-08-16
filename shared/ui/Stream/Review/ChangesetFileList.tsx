import { CSReviewChangeset } from "@codestream/protocols/api";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import React, { useEffect } from "react";
import { ReviewPlus } from "@codestream/protocols/agent";
import { HostApi } from "../..";
import * as path from "path-browserify";
import { ChangesetFile } from "./ChangesetFile";
import { useSelector, useDispatch } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { showDiff } from "@codestream/webview/store/reviews/actions";
import { Dispatch } from "../../store/common";
import Icon from "../Icon";
import { safe } from "@codestream/webview/utils";
import { getById } from "@codestream/webview/store/repos/reducer";
import {
	ShowNextChangedFileNotificationType,
	ShowPreviousChangedFileNotificationType,
	EditorRevealRangeRequestType
} from "@codestream/protocols/webview";
import { WriteTextFileRequestType, ReadTextFileRequestType } from "@codestream/protocols/agent";
import { Range } from "vscode-languageserver-types";
import { getPreferences } from "@codestream/webview/store/users/reducer";
import { setUserPreference } from "../actions";
import { PRSelectorButtons } from "../PullRequestComponents";
import { PRProgress, PRProgressFill, PRProgressLine } from "../PullRequestFilesChangedList";
import { TernarySearchTree } from "@codestream/webview/utilities/searchTree";
import { Directory } from "../PullRequestFilesChanged";

// const VISITED_REVIEW_FILES = "review:changeset-file-list";
const NOW = new Date().getTime(); // a rough timestamp so we know when the file was visited
// const visitedFiles = localStore.get(VISITED_REVIEW_FILES) || {};

export const ChangesetFileList = (props: {
	review: ReviewPlus;
	loading?: boolean;
	noOnClick?: boolean;
	showRepoLabels?: boolean;
	checkpoint?: number;
	withTelemetry?: boolean;
	repoRoots?: { [repoId: string]: string };
	showViewOptions?: boolean;
	isTouring?: boolean;
}) => {
	const { review, noOnClick, loading, checkpoint } = props;
	const dispatch = useDispatch<Dispatch>();
	const derivedState = useSelector((state: CodeStreamState) => {
		const userId = state.session.userId || "";
		const matchFile =
			state.context.currentReviewId &&
			state.editorContext.scmInfo &&
			state.editorContext.scmInfo.uri &&
			state.editorContext.scmInfo.uri.startsWith("codestream-diff://")
				? state.editorContext.scmInfo.uri
				: "";

		let changesets: CSReviewChangeset[] = [];

		if (review.reviewChangesets) {
			if (checkpoint !== undefined) {
				changesets = review.reviewChangesets.filter(rc => rc.checkpoint === checkpoint);
			} else {
				const latestChangesetByRepo = new Map<string, CSReviewChangeset>();
				for (const changeset of review.reviewChangesets) {
					latestChangesetByRepo.set(changeset.repoId, changeset);
				}
				changesets = Array.from(latestChangesetByRepo.values());
			}
		}
		const preferences = getPreferences(state);

		return {
			matchFile,
			userId,
			repos: state.repos,
			changesets,
			filesChangedMode: preferences.reviewFilesChangedMode || "files",
			isInJetBrains: state.ide.name === "JETBRAINS",
			openFirstDiff:
				state.context.currentReviewOptions && state.context.currentReviewOptions.openFirstDiff,
			maxCheckpoint:
				review.reviewChangesets && review.reviewChangesets.length
					? review.reviewChangesets[review.reviewChangesets.length - 1].checkpoint
					: 0
		};
	});

	useDidMount(() => {
		if (derivedState.openFirstDiff) {
			goDiff(0);
		}
	});

	const mode = derivedState.filesChangedMode;
	const setMode = mode => dispatch(setUserPreference(["reviewFilesChangedMode"], mode));

	// visitedFiles contains three things:
	// 1. key/value pairs where the key is the filename, and the value is whether the file
	//    has been visited/seen yet. this can be toggled on and off
	// 2. _latest which holds the index of the most recently visited file
	// 3. _hide:[path] which denotes whether to expand/collapse files and directories
	const [visitedFiles, setVisitedFiles] = React.useState({ _latest: 0 });

	const visitFile = (visitedKey: string, index: number) => {
		const newVisitedFiles = { ...visitedFiles, [visitedKey]: NOW, _latest: index };
		saveVisitedFiles(newVisitedFiles, reviewCheckpointKey);
		setVisitedFiles(newVisitedFiles);
	};

	const unVisitFile = (visitedKey: string) => {
		const newVisitedFiles = { ...visitedFiles, [visitedKey]: false };
		saveVisitedFiles(newVisitedFiles, reviewCheckpointKey);
		setVisitedFiles(newVisitedFiles);
	};

	// if we're looking at a specific checkpoint, save the visisted
	// information under that key. if however we're looking at the overall
	// changes, we want that to "reset" each time the review gets amended,
	// so we further base the 'all' key on the total number of changesets.
	// one final exception to the rule is that if you look at the original
	// review, and then later after 8 checkpoints are added, look back at
	// "Initial Review" (which is now referred to as checkpoint 0), then
	// those are equivalent.
	let reviewCheckpointKey: string | number;
	// checkpoint == undefined means we're looking at the whole review
	if (checkpoint == undefined) {
		// this is the case where we are in the initial review
		if (derivedState.maxCheckpoint == 0) reviewCheckpointKey = 0;
		// this is the case where we're looking at all the changes
		// across multiple checkpoints
		else reviewCheckpointKey = `all:${review.reviewChangesets.length}`;
	} else {
		reviewCheckpointKey = checkpoint;
	}

	const saveVisitedFiles = (newVisitedFiles, key) => {
		HostApi.instance.send(WriteTextFileRequestType, {
			path: `review-${review.id}-${key}.json`,
			contents: JSON.stringify(newVisitedFiles, null, 4)
		});
	};

	const [hasLoaded, setHasLoaded] = React.useState(false);

	useEffect(() => {
		(async () => {
			const response = (await HostApi.instance.send(ReadTextFileRequestType, {
				path: `review-${review.id}-${reviewCheckpointKey}.json`
			})) as any;

			try {
				setVisitedFiles(JSON.parse(response.contents || "{}"));
			} catch (ex) {
				console.warn("Error parsing JSON data: ", response.contents);
			}
			setHasLoaded(true);
		})();
	}, [review, reviewCheckpointKey]);

	const totalVisitedFiles = React.useMemo(() => {
		if (!visitedFiles) return 0;
		let num = 0;
		Object.keys(visitedFiles).forEach(key => {
			if (key && !key.startsWith("_") && visitedFiles[key]) num++;
		});
		return num;
	}, [visitedFiles, reviewCheckpointKey]);

	const latest = visitedFiles[reviewCheckpointKey] ? visitedFiles[reviewCheckpointKey]._latest : 0;

	const toggleDirectory = hideKey => {
		const newVisitedFiles = { ...visitedFiles, [hideKey]: !visitedFiles[hideKey] };
		saveVisitedFiles(newVisitedFiles, reviewCheckpointKey);
		setVisitedFiles(newVisitedFiles);
	};

	const renderDirectory = (fullPath, dirPath, depth) => {
		const hideKey = "_hide:" + fullPath.join("/");
		const hidden = visitedFiles[hideKey];
		return (
			<Directory
				key={hideKey}
				style={{ paddingLeft: `${depth * 10}px` }}
				onClick={() => {
					toggleDirectory(hideKey);
				}}
			>
				<Icon name={hidden ? "chevron-right-thin" : "chevron-down-thin"} />
				{path.join(...dirPath)}
			</Directory>
		);
	};

	const [filesInOrder, setFilesInOrder] = React.useState<any[]>([]);

	// we need to re-make these handlers each time visitedFiles changes, otherwise
	// it creates a closeure over the wrong version of those variables. not sure
	// if there is a better solution here....
	useEffect(() => {
		const disposables = [
			HostApi.instance.on(ShowNextChangedFileNotificationType, nextFile),
			HostApi.instance.on(ShowPreviousChangedFileNotificationType, prevFile)
		];

		return () => disposables.forEach(disposable => disposable.dispose());
	}, [visitedFiles, filesInOrder]);

	const [changedFiles] = React.useMemo(() => {
		if (!hasLoaded) {
			return [];
		}
		const lines: any[] = [];
		let filesInOrder: any[] = [];

		const renderFile = (f, index, depth, changeset) => {
			const visitedKey = [changeset!.repoId, f.file].join(":");
			const uri = `codestream-diff://${review.id}/${checkpoint}/${changeset!.repoId}/right/${
				f.file
			}`;
			const selected = (derivedState.matchFile || "") == uri;
			const visited = visitedFiles[visitedKey];
			if (selected && !visited && derivedState.isInJetBrains) {
				visitFile(visitedKey, index);
			}

			let icon;
			// if we're loading, show a spinner
			if (loading) icon = "sync";
			// noOnClick means no icon indicators and no click handler
			else if (noOnClick) icon = null;
			// this file is currently selected, and visible in diff view
			else if (selected) icon = "arrow-right";
			// this file has been visitied during the review
			else if (visited) icon = "ok";
			// not yet visited, but part of the review
			else icon = "circle";

			const iconClass = loading ? "file-icon spin" : "file-icon";
			// i is a temp variable to create the correct scope binding
			const i = index++;
			return (
				<ChangesetFile
					viewMode={mode}
					selected={selected}
					noHover={noOnClick}
					icon={
						icon ? (
							<Icon
								onClick={
									visited
										? async e => {
												e.preventDefault();
												e.stopPropagation();
												unVisitFile(visitedKey);
										  }
										: undefined
								}
								name={icon}
								className={iconClass}
							/>
						) : null
					}
					onClick={async e => {
						if (noOnClick) return;
						e.preventDefault();
						goDiff(i);
					}}
					actionIcons={
						!loading &&
						!noOnClick && (
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
					depth={depth}
					key={changeset!.checkpoint + ":" + i + ":" + f.file}
					{...f}
				/>
			);
		};

		let index = 0;
		if (!derivedState.changesets) {
			setFilesInOrder([]);
			return [lines];
		}
		for (let changeset of derivedState.changesets) {
			if (props.showRepoLabels) {
				const repoName = safe(() => getById(derivedState.repos, changeset!.repoId).name) || "";
				if (repoName) {
					lines.push(
						<div style={{ marginBottom: "5px" }}>
							<Icon name="repo" /> {repoName} &nbsp; <Icon name="git-branch" /> {changeset!.branch}
						</div>
					);
				}
			}
			let modifiedFiles =
				checkpoint !== undefined ? changeset.modifiedFilesInCheckpoint : changeset.modifiedFiles;

			modifiedFiles.forEach(f => {
				f.repoId = changeset.repoId;
			});

			if (mode === "tree") {
				const tree: TernarySearchTree<any> = TernarySearchTree.forPaths();

				let filesChanged = [...modifiedFiles];
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

						const hideKey = "_hide:" + fullPath.join("/");
						if (visitedFiles[hideKey]) return;
					}

					// we either render siblings, or nodes. if we aren't
					// rendering siblings, then check to see if this node
					// has a value or children and render them
					if (!renderSiblings) {
						// node.value is a file object, so render the file
						if (node.value) {
							lines.push(renderFile(node.value, index++, depth, changeset));
							filesInOrder.push(node.value);
						}
						// recurse deeper into file path if the dir isn't collapsed
						if (node.mid) {
							render(
								node.mid,
								[...fullPath, node.segment],
								[...dirPath, node.segment],
								depth,
								true
							);
						}
					}
					// render sibling nodes at the same depth w/same dirPath
					if (renderSiblings) {
						// grab all the siblings, sort them, and render them.
						const siblings: any[] = [];
						if (node) siblings.push(node);

						let n = node;
						// we don't need to check left because we sort the paths
						// prior to inserting into the tree, so we never end up
						// with left nodes
						while (n && n.right) {
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
				lines.push(...modifiedFiles.map((f, index) => renderFile(f, index, 0, changeset)));
				filesInOrder.push(...modifiedFiles);
			}
		}
		// console.warn("RETURNING: ", filesInOrder);
		setFilesInOrder(filesInOrder);
		return [lines];
	}, [
		review,
		loading,
		noOnClick,
		derivedState.matchFile,
		latest,
		checkpoint,
		visitedFiles,
		mode,
		hasLoaded,
		props.isTouring
	]);

	const goDiff = React.useCallback(
		async index => {
			// console.warn("GOING TO: ", index);
			// console.warn("FIO: ", filesInOrder);

			if (index < 0) index = filesInOrder.length - 1;
			if (index > filesInOrder.length - 1) index = 0;
			const f = filesInOrder[index];
			const visitedKey = [f?.repoId, f.file].join(":");
			await dispatch(showDiff(review.id, checkpoint, f.repoId, f.file));
			visitFile(visitedKey, index);

			if (props.withTelemetry && review.id) {
				HostApi.instance.track("Review Diff Viewed", {
					"Review ID": review.id
				});
			}
		},
		[visitedFiles, filesInOrder]
	);

	const openFile = React.useCallback(
		async index => {
			if (index < 0) index = filesInOrder.length - 1;
			if (index > filesInOrder.length - 1) index = 0;
			const f = filesInOrder[index];

			if (f.repoId && props.repoRoots) {
				const repoRoot = props.repoRoots[f.repoId];
				void HostApi.instance.send(EditorRevealRangeRequestType, {
					uri: path.join("file://", repoRoot, f.file),
					range: Range.create(0, 0, 0, 0)
				});

				if (props.withTelemetry && review.id) {
					HostApi.instance.track("Review File Viewed", {
						"Review ID": review.id
					});
				}
			}
		},
		[visitedFiles, filesInOrder, props.repoRoots]
	);

	const nextFile = React.useCallback(() => {
		if (!visitedFiles) goDiff(0);
		else if (visitedFiles._latest == null) goDiff(0);
		else goDiff(visitedFiles._latest + 1);
	}, [visitedFiles, goDiff]);

	const prevFile = React.useCallback(() => {
		if (!visitedFiles) goDiff(-1);
		else if (visitedFiles._latest == null) goDiff(-1);
		else goDiff(visitedFiles._latest - 1);
	}, [visitedFiles, goDiff]);

	const pct = filesInOrder.length > 0 ? (100 * totalVisitedFiles) / filesInOrder.length : 0;

	return (
		<>
			{props.showViewOptions && (
				<div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
					<div style={{ margin: "10px 10px 5px 0", flexGrow: 2 }}>
						<PRSelectorButtons>
							<span className={mode == "files" ? "selected" : ""} onClick={() => setMode("files")}>
								<Icon name="list-flat" title="List View" placement="bottom" />
							</span>
							<span className={mode == "tree" ? "selected" : ""} onClick={() => setMode("tree")}>
								<Icon name="list-tree" title="Tree View" placement="bottom" />
							</span>
							{/*
							<span className={mode == "hunks" ? "selected" : ""} onClick={() => setMode("hunks")}>
								<Icon name="file-diff" title="Diff Hunks" placement="bottom" />
							</span>
							*/}
						</PRSelectorButtons>
					</div>

					<PRProgress style={{ margin: "0 0 5px auto", minWidth: "30px" }}>
						{totalVisitedFiles} / {filesInOrder.length}{" "}
						<span className="wide-text">
							files viewed{" "}
							<Icon
								name="info"
								placement="bottom"
								title={
									<div style={{ width: "250px" }}>
										As you visit files they will be marked as viewed. Unmark a file by clicking the
										checkmark.
									</div>
								}
							/>
						</span>
						<PRProgressLine>
							{pct > 0 && <PRProgressFill style={{ width: pct + "%" }} />}
						</PRProgressLine>
					</PRProgress>
				</div>
			)}
			{changedFiles}
		</>
	);
};
