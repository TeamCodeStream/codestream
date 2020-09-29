import { CSReviewChangeset } from "@codestream/protocols/api";
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

		let index = 0;
		let indexToChangesetMap = {};
		let indexToFileMap = {};

		let changesets;
		if (checkpoint !== undefined) {
			changesets = review.reviewChangesets.filter(rc => rc.checkpoint === checkpoint);
		} else {
			const latestChangesetByRepo = new Map<string, CSReviewChangeset>();
			for (const changeset of review.reviewChangesets) {
				latestChangesetByRepo.set(changeset.repoId, changeset);
			}
			changesets = Array.from(latestChangesetByRepo.values());
		}

		for (let changeset of changesets) {
			const modifiedFiles =
				checkpoint !== undefined ? changeset.modifiedFilesInCheckpoint : changeset.modifiedFiles;
			modifiedFiles.forEach(f => {
				indexToChangesetMap[index] = changeset;
				indexToFileMap[index] = f;
				index++;
			});
		}
		// for (const modifiedFile of modifiedFiles) {
		// 	indexToChangesetMap[index] = changeset;
		// 	indexToFileMap[index] = modifiedFile;
		// 	index++;
		// }

		return {
			matchFile,
			userId,
			repos: state.repos,
			numFiles: index,
			indexToChangesetMap,
			indexToFileMap,
			changesets,
			maxCheckpoint: review.reviewChangesets[review.reviewChangesets.length - 1].checkpoint
		};
	});

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
		})();
	}, [review, reviewCheckpointKey]);

	useEffect(() => {
		const disposables = [
			HostApi.instance.on(ShowNextChangedFileNotificationType, nextFile),
			HostApi.instance.on(ShowPreviousChangedFileNotificationType, prevFile)
		];

		return () => disposables.forEach(disposable => disposable.dispose());
	}, [checkpoint]);

	const goDiff = async index => {
		if (index < 0) index = derivedState.numFiles - 1;
		if (index > derivedState.numFiles - 1) index = 0;
		const f = derivedState.indexToFileMap[index];
		const changeset = derivedState.indexToChangesetMap[index];
		const visitedKey = [changeset.repoId, f.file].join(":");
		await dispatch(showDiff(review.id, checkpoint, changeset.repoId, f.file));
		visitFile(visitedKey, index);

		if (props.withTelemetry && review.id) {
			HostApi.instance.track("Review Diff Viewed", {
				"Review ID": review.id
			});
		}
	};

	const nextFile = () => {
		if (!visitedFiles) goDiff(0);
		else if (visitedFiles._latest == null) goDiff(0);
		else goDiff(visitedFiles._latest + 1);
	};

	const prevFile = () => {
		if (!visitedFiles) goDiff(-1);
		else if (visitedFiles._latest == null) goDiff(-1);
		else goDiff(visitedFiles._latest - 1);
	};

	const openFile = async index => {
		if (index < 0) index = derivedState.numFiles - 1;
		if (index > derivedState.numFiles - 1) index = 0;
		const f = derivedState.indexToFileMap[index];
		const changeset = derivedState.indexToChangesetMap[index];
		const visitedKey = [changeset.repoId, f.file].join(":");

		if (changeset.repoId && props.repoRoots) {
			const repoRoot = props.repoRoots[changeset.repoId];
			const response = HostApi.instance.send(EditorRevealRangeRequestType, {
				uri: path.join(repoRoot, f.file),
				range: Range.create(0, 0, 0, 0)
			});

			if (props.withTelemetry && review.id) {
				HostApi.instance.track("Review File Viewed", {
					"Review ID": review.id
				});
			}
		}
	};

	const latest = visitedFiles[reviewCheckpointKey] ? visitedFiles[reviewCheckpointKey]._latest : 0;

	const changedFiles = React.useMemo(() => {
		const files: any[] = [];

		let index = 0;
		for (let changeset of derivedState.changesets) {
			if (props.showRepoLabels) {
				const repoName = safe(() => getById(derivedState.repos, changeset!.repoId).name) || "";
				if (repoName) {
					files.push(
						<div style={{ marginBottom: "5px" }}>
							<Icon name="repo" /> {repoName} &nbsp; <Icon name="git-branch" /> {changeset!.branch}
						</div>
					);
				}
			}
			const modifiedFiles =
				checkpoint !== undefined ? changeset.modifiedFilesInCheckpoint : changeset.modifiedFiles;
			files.push(
				...modifiedFiles.map(f => {
					const visitedKey = [changeset!.repoId, f.file].join(":");
					const uri = `codestream-diff://${review.id}/${checkpoint}/${changeset!.repoId}/right/${
						f.file
					}`;
					const selected = (derivedState.matchFile || "") == uri;
					const visited = visitedFiles[visitedKey];
					if (selected && !visited) {
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
							selected={selected}
							noHover={noOnClick}
							icon={
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
							key={changeset!.checkpoint + ":" + i + ":" + f.file}
							{...f}
						/>
					);
				})
			);
		}
		return files;
	}, [review, loading, noOnClick, derivedState.matchFile, latest, checkpoint, visitedFiles]);

	return <>{changedFiles}</>;
};
