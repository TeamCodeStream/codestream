import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { ChangesetFile } from "./Review/ChangesetFile";
import Icon from "./Icon";
import { setCurrentPullRequest } from "../store/context/actions";
import { openModal } from "../store/context/actions";
import { WebviewModals } from "../ipc/webview.protocol.common";
import { orderBy } from "lodash-es";
import { api } from "../store/providerPullRequests/actions";
import { useDidMount } from "../utilities/hooks";
import { useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import {
	getCurrentProviderPullRequest,
	getProviderPullRequestRepo
} from "../store/providerPullRequests/reducer";
import * as Path from "path-browserify";
import { Range } from "vscode-languageserver-types";
import { HostApi } from "../webview-api";
import { GetReposScmRequestType } from "@codestream/protocols/agent";
import { EditorRevealRangeRequestType } from "@codestream/protocols/webview";
import semver from "semver";

export const FileWithComments = styled.div`
	cursor: pointer;
	margin: 0 !important;
`;

export const Comment = styled.div`
	cursor: pointer;
	margin: 0 !important;
	padding: 2px 0 2px 0;
	overflow: hidden;
	text-overflow: ellipsis;
	width: calc(100%);
	white-space: nowrap;
	&:hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
`;

export const PendingCircle = styled.div`
	margin-left: auto;
	color: #bf8700;
	border-radius: 50%;
	border: 1px solid #bf8700;
	width: 17px;
	height: 17px;
	text-align: center;
	margin-right: 13px;
	font-size: 10px;
`;

//@TODO: better typescript-ify this interface
interface Props {
	hasComments?: any;
	selected?: any;
	viewMode?: any;
	commentMap?: any;
	comments?: any;
	icon?: any;
	iconClass?: any;
	index?: any;
	fileObject?: any;
	isDisabled?: any;
	loading?: any;
	unVisitFile?: any;
	visitFile?: any;
	goDiff?: any;
	depth?: any;
	visited?: any;
	filesChanged?: any;
	pullRequest?: any;
	cardIndex?: any;
	prCommitsRange?: any;
}

/**
 * File line in PR sidebar, shows comments if available
 *
 * @param props
 * @returns jsx
 */
export const PullRequestFilesChangedFileComments = (props: Props) => {
	const {
		hasComments,
		comments,
		selected,
		index,
		fileObject,
		isDisabled,
		loading,
		goDiff,
		depth,
		pullRequest,
		prCommitsRange,
		//these props will go away if we ever get a gitlab graphql mutation
		//for marking files as viewed, for the timebeing we need them
		icon,
		iconClass,
		unVisitFile,
		visitFile,
		visited
	} = props;

	const dispatch = useDispatch();
	const [showComments, setShowComments] = React.useState(true);
	const [showCheckIcon, setShowCheckIcon] = React.useState(false);
	const [showGoToFileIcon, setShowGoToFileIcon] = React.useState(false);
	const [isChecked, setIsChecked] = React.useState(false);
	const [iconName, setIconName] = React.useState("sync");
	const [currentRepoRoot, setCurrentRepoRoot] = React.useState("");
	const isGitLab = pullRequest?.providerId?.includes("gitlab");

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentPullRequest: getCurrentProviderPullRequest(state),
			currentRepo: getProviderPullRequestRepo(state)
		};
	});
	const { currentPullRequest } = derivedState;
	const currentPr = isGitLab
		? currentPullRequest?.conversations?.mergeRequest ||
		  currentPullRequest?.conversations?.project?.mergeRequest
		: currentPullRequest?.conversations?.repository?.pullRequest;
	// For GHE, can only check files in version greater than 3.0.0
	const supportsViewerViewedState = currentPr
		? semver.gt(currentPr?.supports?.version?.version, "3.0.0")
		: false;

	useEffect(() => {
		syncCheckedStatusWithPr();
	}, [currentPr, prCommitsRange]);

	const syncCheckedStatusWithPr = () => {
		if (currentPr && !isGitLab && supportsViewerViewedState) {
			const prFiles = currentPr.files.nodes;
			const currentFilepath = fileObject.file;

			const prFile = prFiles.find(pr => pr.path === currentFilepath);
			const isVisitedCheck = prFile?.viewerViewedState === "VIEWED";

			if (isVisitedCheck) {
				setIconName("ok");
				setIsChecked(true);
				// if (isGitLab || !supportsViewerViewedState) visitFile(fileObject.file, index);
			} else {
				setIconName("circle");
				setIsChecked(false);
				// if (isGitLab || !supportsViewerViewedState) unVisitFile(fileObject.file);
			}
		}
	};

	const visitAndCheckFile = async () => {
		await dispatch(
			api("markFileAsViewed", {
				onOff: true,
				path: fileObject.file
			})
		);
		setIconName("ok");
		setIsChecked(true);
	};

	const unvisitAndUncheckFile = async () => {
		await dispatch(
			api("markFileAsViewed", {
				onOff: false,
				path: fileObject.file
			})
		);
		setIconName("circle");
		setIsChecked(false);
	};

	const handleIconClick = event => {
		event.preventDefault();
		event.stopPropagation();

		if (loading) {
			return;
		}

		if (isChecked) {
			if (!isGitLab && supportsViewerViewedState) unvisitAndUncheckFile();
			if (isGitLab || !supportsViewerViewedState) {
				unVisitFile(fileObject.file);
				setIsChecked(false);
			}
		} else {
			if (!isGitLab && supportsViewerViewedState) visitAndCheckFile();
			if (isGitLab || !supportsViewerViewedState) {
				visitFile(fileObject.file, index);
				setIsChecked(true);
			}
		}
	};

	const handleClick = e => {
		e.preventDefault();
		setShowComments(!showComments);
	};

	/**
	 * Github/lab makes it difficult to find a comment line number, so we have to
	 * parse the diffHunk and do some basic math
	 * @param commentObject
	 * @returns string lineNumber
	 */
	const lineNumber = commentObject => {
		// With git, the "line number" is actually 2 numbers, left and right
		// For now, we are going to base it off of the right number, subject to change.
		// The basic formula is:
		// 		Right line number taken from top of diff hunk
		//    + Length of the diff hunk (in new lines)
		//    - Number of negative or removed lines from diff hunk
		//    -----------------------------------------------------
		//      Line Number
		let rightLine = 0;

		if (!commentObject?.comment || !commentObject?.review) {
			return "";
		}

		let diffHunk =
			commentObject.comment?.diffHunk ||
			commentObject.review?.diffHunk ||
			commentObject?.comment?.position?.patch ||
			"";
		let diffHunkNewLineLength = diffHunk.split("\n").length - 1;
		let negativeLineCount = 1;

		diffHunk.split("\n").map(d => {
			const topLineMatch = d.match(/@@ \-(\d+).*? \+(\d+)/);
			const negativeLineMatch = d.match(/^\-.*/);
			if (topLineMatch) {
				rightLine = parseInt(topLineMatch[2]);
			}
			if (negativeLineMatch) {
				negativeLineCount++;
			}
		});

		if (rightLine) {
			return rightLine + diffHunkNewLineLength - negativeLineCount;
		} else {
			return "";
		}
	};

	const handleCommentClick = (event, comment) => {
		event.preventDefault();
		event.stopPropagation();

		let prId = isGitLab ? pullRequest?.idComputed : pullRequest?.id;

		dispatch(
			setCurrentPullRequest(
				pullRequest?.providerId,
				prId,
				comment?.comment?.id || comment?.review?.id,
				"",
				"details"
			)
		);

		HostApi.instance.track("PR Conversation View", {
			Host: pullRequest?.providerId
		});
	};

	const handlePendingClick = event => {
		event.preventDefault();
		event.stopPropagation();
		if (
			pullRequest?.providerId === "gitlab*com" ||
			pullRequest?.providerId === "gitlab/enterprise"
		) {
			return;
		} else {
			dispatch(openModal(WebviewModals.FinishReview));
		}
	};

	const handleMouseEnter = event => {
		event.preventDefault();
		event.stopPropagation();
		setShowCheckIcon(true);
		setShowGoToFileIcon(true);
	};

	const handleMouseLeave = event => {
		event.preventDefault();
		event.stopPropagation();
		setShowCheckIcon(false);
		setShowGoToFileIcon(false);
	};

	const handleOpenFile = async e => {
		e.preventDefault();
		e.stopPropagation();
		let repoRoot = currentRepoRoot;
		if (!repoRoot) {
			const response = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: false
			});
			if (!response.repositories) return;

			const repoIdToCheck = derivedState.currentRepo ? derivedState.currentRepo.id : undefined;
			if (repoIdToCheck) {
				const currentRepoInfo = response.repositories.find(r => r.id === repoIdToCheck);
				if (currentRepoInfo) {
					setCurrentRepoRoot(currentRepoInfo.path);
					repoRoot = currentRepoInfo.path;
				}
			}
		}

		if (repoRoot) {
			HostApi.instance.send(EditorRevealRangeRequestType, {
				uri: Path.join("file://", repoRoot, fileObject.file),
				range: Range.create(0, 0, 0, 0)
			});
		}

		HostApi.instance.track("PR Jump To Local File from Tree", {
			Host: pullRequest && pullRequest.providerId
		});
	};

	let commentsSortedByLineNumber;
	if (hasComments) {
		commentsSortedByLineNumber = orderBy(
			comments,
			["asc", "comment.position"],
			//@ts-ignore
			["asc", "comment.bodyText"],
			//@ts-ignore
			["asc", "comment.body"]
		);
	}
	//@TODO: define these on mount, hook, and/or state so we don't do the
	//		 calculation every re-render.
	const displayIcon = isGitLab || !supportsViewerViewedState ? icon : iconName;
	const iconIsFlex = showCheckIcon || displayIcon === "ok";

	if (!hasComments) {
		return (
			<div onMouseEnter={e => handleMouseEnter(e)} onMouseLeave={e => handleMouseLeave(e)}>
				<ChangesetFile
					selected={props.selected}
					viewMode={props.viewMode}
					iconLast={
						isDisabled ? null : (
							<span
								style={{
									margin: showGoToFileIcon ? "0 9px 0 0" : "0 9px 0 auto",
									display: showCheckIcon || displayIcon === "ok" ? "flex" : "none"
								}}
							>
								<Icon
									onClick={e => handleIconClick(e)}
									name={displayIcon}
									style={{ color: "var(--text-color-subtle)" }}
									className={"clickable"}
									delay={1}
									title={displayIcon === "ok" ? "Mark as Not Viewed" : "Mark as Viewed"}
									placement="bottom"
								/>
							</span>
						)
					}
					badge={
						<span
							style={{
								marginLeft: "auto",
								marginRight: "10px",
								display: showGoToFileIcon ? "flex" : "none"
							}}
						>
							<Icon
								title="Open Local File"
								placement="bottom"
								name="goto-file"
								className="clickable"
								style={{ color: "var(--text-color-subtle)" }}
								onClick={e => handleOpenFile(e)}
								delay={1}
							/>
						</span>
					}
					noHover={isDisabled || loading}
					onClick={
						isDisabled || loading
							? undefined
							: async e => {
									e.preventDefault();
									goDiff(index);
									HostApi.instance.track("PR File Clicked", {
										Host: pullRequest && pullRequest.providerId
									});
							  }
					}
					key={index + ":" + fileObject.file}
					depth={depth}
					{...fileObject}
					customFilenameColor={"#dfbd8b"}
				/>
			</div>
		);
	} else {
		// hasComments
		return (
			<div onMouseEnter={e => handleMouseEnter(e)} onMouseLeave={e => handleMouseLeave(e)}>
				<FileWithComments onClick={e => handleClick(e)}>
					<ChangesetFile
						chevron={<Icon name={showComments ? "chevron-down-thin" : "chevron-right-thin"} />}
						selected={selected}
						viewMode={props.viewMode}
						count={
							<div style={{ margin: "0 10px 0 auto", display: "flex" }}>
								{comments.length === 0 || showComments ? null : (
									<span style={{ margin: "0 0 0 -5px" }} className={`badge`}>
										{comments.length}
									</span>
								)}
							</div>
						}
						badge={
							<span
								style={{
									marginRight: "10px",
									display: showGoToFileIcon ? "flex" : "none"
								}}
							>
								<Icon
									title="Open Local File"
									placement="bottom"
									name="goto-file"
									className="clickable"
									onClick={e => handleOpenFile(e)}
									style={{ color: "var(--text-color-subtle)" }}
									delay={1}
								/>
							</span>
						}
						iconLast={
							isDisabled ? null : (
								<>
									{iconIsFlex && (
										<span
											style={{
												display: "flex",
												marginRight: "9px"
											}}
										>
											<Icon
												onClick={e => handleIconClick(e)}
												name={displayIcon}
												style={{ color: "var(--text-color-subtle)" }}
												className={"clickable"}
												delay={1}
												title={displayIcon === "ok" ? "Mark as Not Viewed" : "Mark as Viewed"}
												placement="bottom"
											/>
										</span>
									)}
									{!iconIsFlex && (
										<span
											style={{
												width: "16px",
												display: "flex",
												marginRight: "9px"
											}}
										>
											{" "}
										</span>
									)}
								</>
							)
						}
						noHover={isDisabled || loading}
						onClick={
							isDisabled || loading
								? undefined
								: async e => {
										e.preventDefault();
										goDiff(index);
										HostApi.instance.track("PR File Clicked", {
											Host: pullRequest && pullRequest.providerId
										});
								  }
						}
						key={index + ":" + fileObject.file}
						depth={depth}
						{...fileObject}
						customFilenameColor={"#dfbd8b"}
					/>
				</FileWithComments>
				{showComments && (
					<>
						{commentsSortedByLineNumber.map((c, index) => {
							const isPending = c.comment.state === "PENDING";
							return (
								<Comment
									onClick={e => handleCommentClick(e, c)}
									style={depth ? { paddingLeft: `${depth * 12}px` } : {}}
									key={`comment_${c.comment.id}_${index}`}
								>
									<div style={{ display: "flex" }}>
										<div
											style={{
												overflow: "hidden",
												textOverflow: "ellipsis",
												width: "calc(100%)",
												whiteSpace: "nowrap"
											}}
										>
											<Icon name="comment" className="type-icon" />{" "}
											{lineNumber(c) && <span>Line {lineNumber(c)}: </span>}
											{c.comment.bodyText || c.comment.body}
										</div>
										{isPending && (
											<PendingCircle onClick={e => handlePendingClick(e)}>P</PendingCircle>
										)}
									</div>
								</Comment>
							);
						})}
					</>
				)}
			</div>
		);
	}
};
