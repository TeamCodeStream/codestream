import { FileStatus } from "@codestream/protocols/api";
import copy from "copy-to-clipboard";
import { orderBy } from "lodash-es";
import React, { PropsWithChildren, useEffect, useState } from "react";
import styled from "styled-components";
import { CodeStreamState } from "../store";
import { getPullRequestFiles } from "../store/providerPullRequests/thunks";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import Icon from "./Icon";
import { Modal } from "./Modal";
import { PullRequestFileCommentCard } from "./PullRequestFileCommentCard";

const Root = styled.div`
	background: var(--app-background-color);
	box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
	.vscode-dark & {
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
	}
`;

const CommentsContainer = styled.div`
	margin: 0 0 20px 0;
	padding: 0 0 1px 0;
	h1 {
		display: flex;
		align-items: center;
		border-radius: 5px 5px 0 0;
		font-size: 12px;
		font-weight: normal;
		margin: 0;
		padding: 10px;
		background: var(--app-background-color);
		border: 1px solid var(--base-border-color);
		width: 100%;
		overflow: hidden;
		position: sticky;
		top: -14px;
		z-index: 5;
		.filename-container {
			overflow: hidden;
			text-overflow: ellipsis;
		}
		&.hidden {
			border-radius: 5px;
		}
		.toggle {
			display: inline-block;
			margin-right: 5px;
			margin-top: -2px;
		}
		.viewed {
			flex-shrink: 0;
			margin-left: auto;
		}
		a .icon {
			color: var(--text-color);
		}
	}
`;

const CardContainer = styled.div`
	margin: 10px 10px 15px 10px;
	padding: 10px;
	background: var(--base-background-color);
	border-radius: 6px;
`;

const STATUS_MAP = {
	modified: FileStatus.modified,
};

interface Props {
	pr: any;
	setIsLoadingMessage: Function;
	commentId: string | undefined;
	quote: Function;
	onClose: Function;
	prCommitsRange?: string[];
}

export const PullRequestFileComments = (props: PropsWithChildren<Props>) => {
	const { quote, pr, prCommitsRange } = props;
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			providerPullRequests: state.providerPullRequests.pullRequests,
			pullRequestFilesChangedMode: state.preferences.pullRequestFilesChangedMode || "files",
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
		};
	});

	const [isLoading, setIsLoading] = useState(true);
	const [fileInfo, setFileInfo] = useState<any>({});
	const [filename, setFilename] = useState("");
	const [sortedComments, setSortedComments] = useState<any[]>([]);

	const _mapData = data => {
		const fileInfo = data
			.filter(_ => _.filename === filename)
			.map(_ => {
				return {
					..._,
					linesAdded: _.additions,
					linesRemoved: _.deletions,
					file: _.filename,
					sha: _.sha,
					status: STATUS_MAP[_.status],
				};
			});
		setFileInfo(fileInfo[0]);
		setIsLoading(false);
	};

	useDidMount(() => {
		(async () => {
			const data = await dispatch(
				getPullRequestFiles({ providerId: pr.providerId, id: derivedState.currentPullRequestId! })
			).unwrap();
			_mapData(data);
		})();

		let commentsArray = commentMap[filename];
		let sortedComments = orderBy(
			commentsArray,
			["asc", "comment.position"],
			//@ts-ignore
			["asc", "comment.bodyText"]
		);
		let sortedCommentsWithRefs = sortedComments.map(c => ({
			//@ts-ignore
			...c,
			ref: React.createRef(),
		}));

		setSortedComments(sortedCommentsWithRefs);
	});

	useEffect(() => {
		if (sortedComments) {
			sortedComments.map(c => {
				let el = c.ref.current;
				if (c.comment.id === props.commentId && el) {
					el.scrollIntoView();
				}
			});
		}
	}, [sortedComments]);

	const commentMap = React.useMemo(() => {
		const map = {} as any;
		if (
			derivedState.currentPullRequestProviderId === "gitlab*com" ||
			derivedState.currentPullRequestProviderId === "gitlab/enterprise"
		) {
			(pr as any).discussions.nodes.forEach((review: any) => {
				if (review.notes && review.notes.nodes) {
					review.notes.nodes.forEach((comment: any) => {
						const position = comment.position;
						if (position) {
							if (!map[position.newPath]) map[position.newPath] = [];
							map[position.newPath].push({
								review: {
									state: comment.state,
								},
								comment: comment,
							});
							if (
								comment.id === props.commentId ||
								comment.id.toString().replace("gid://gitlab/DiffNote/", "") === props.commentId
							) {
								setFilename(comment.position.newPath);
							}
						}
					});
				}
			});
		} else if (derivedState.currentPullRequestProviderId === "bitbucket*org") {
			// TODO some typings
			(pr as any).comments.forEach(comment => {
				//check for deleted flag in comment object / comment.deleted
				if (comment.deleted === true) {
					return;
				}
				if (comment && comment.inline && comment.inline.path) {
					if (!map[comment.inline.path]) map[comment.inline.path] = [];
					map[comment.inline.path].push({
						review: {
							// TODO??
							state: comment.state,
						},
						// TODO? what shape is this (need type)
						comment: comment,
					});
					if (comment.id === props.commentId) {
						setFilename(comment.inline.path);
					}
				}
			});
		} else {
			const reviews = pr
				? pr.timelineItems.nodes.filter(node => node.__typename === "PullRequestReview")
				: [];
			reviews.forEach(review => {
				if (!review.comments) return;
				review.comments.nodes.forEach(comment => {
					if (!map[comment.path]) map[comment.path] = [];
					map[comment.path].push({ review, comment });
					if (comment.id === props.commentId || comment.threadId === props.commentId)
						setFilename(comment.path);
				});
			});
		}
		return map;
	}, [pr, pr?.updatedAt]);

	useEffect(() => {
		let commentsArray = commentMap[filename];
		let sortedComments = orderBy(
			commentsArray,
			["asc", "comment.position"],
			//@ts-ignore
			["asc", "comment.bodyText"]
		);
		let sortedCommentsWithRefs = sortedComments.map(c => ({
			//@ts-ignore
			...c,
			ref: React.createRef(),
		}));

		setSortedComments(sortedCommentsWithRefs);
	}, [commentMap]);

	if (!filename) {
		console.warn("no filename");
		return null;
	}

	return (
		<Modal translucent onClose={() => props.onClose()}>
			<Root>
				<CommentsContainer>
					<>
						<h1>
							<span className="filename-container">
								<span className="filename">{filename}</span>{" "}
								<Icon
									title="Copy File Path"
									placement="bottom"
									name="copy"
									className="clickable"
									onClick={e => copy(filename)}
								/>{" "}
							</span>
						</h1>

						{sortedComments && !isLoading && (
							<>
								{sortedComments.map((c, index) => {
									const isFirst = index === 0;

									return (
										<CardContainer key={`${c.comment.id}_${index}`}>
											<PullRequestFileCommentCard
												pr={pr}
												comment={c.comment}
												review={c.review}
												setIsLoadingMessage={props.setIsLoadingMessage}
												author={c?.author?.login || ""}
												isFirst={isFirst}
												fileInfo={fileInfo}
												prCommitsRange={prCommitsRange}
												cardIndex={index}
												commentRef={c.ref}
												clickedComment={props.commentId === c.comment.id}
											/>
										</CardContainer>
									);
								})}
							</>
						)}
					</>
				</CommentsContainer>
			</Root>
		</Modal>
	);
};
