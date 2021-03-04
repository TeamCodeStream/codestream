import React, { PropsWithChildren, useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { api, getPullRequestFiles } from "../store/providerPullRequests/actions";
import { useDispatch, useSelector } from "react-redux";
import { PRDiffHunk } from "./PullRequestFilesChangedList";
import { PullRequestPatch } from "./PullRequestPatch";
import { Link } from "./Link";
import copy from "copy-to-clipboard";
import { FileStatus } from "@codestream/protocols/api";
import { CodeStreamState } from "../store";
import styled from "styled-components";
import { Modal } from "./Modal";
import { useDidMount } from '../utilities/hooks';

const Root = styled.div`
	background: var(--app-background-color);
	box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
	.vscode-dark & {
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
	}
`;

const STATUS_MAP = {
	modified: FileStatus.modified
};

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	fetch: Function;
	setIsLoadingMessage: Function;
	commentId: string;
	quote: Function;
	onClose: Function;
}

export const PullRequestFileComments = (props: PropsWithChildren<Props>) => {
	const { quote, pr } = props;
	const dispatch = useDispatch();

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			providerPullRequests: state.providerPullRequests.pullRequests,
			pullRequestFilesChangedMode: state.preferences.pullRequestFilesChangedMode || "files",
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined
		};
	});

	const [isLoading, setIsLoading] = useState(true);
	const [fileInfo, setFileInfo] = useState<any>({});
	const [filename, setFilename] = useState("");

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
					status: STATUS_MAP[_.status]
				};
			});
		setFileInfo(fileInfo[0]);
		setIsLoading(false);
	};

	useDidMount(() => {
		(async () => {
			const data = await dispatch(
				getPullRequestFiles(pr.providerId, derivedState.currentPullRequestId!)
			);
			_mapData(data);
		})();
	});

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
									state: comment.state
								},
								comment: comment
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
	}, [pr]);

	if (!filename) return null;

	return (
		<Modal translucent onClose={() => props.onClose()}>
			<Root>
				<PRDiffHunk>
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
							{pr && pr.url && (
								<Link href={pr.url.replace(/\/pull\/\d+$/, `/blob/${pr.headRefOid}/${filename}`)}>
									<Icon
										title="Open File on Remote"
										placement="bottom"
										name="link-external"
										className="clickable"
									/>
								</Link>
							)}
						</span>
					</h1>
					{fileInfo && (
						<PullRequestPatch
							pr={pr}
							patch={fileInfo.patch}
							hunks={fileInfo.hunks}
							filename={filename}
							canComment
							comments={commentMap[filename]}
							commentId={props.commentId}
							setIsLoadingMessage={props.setIsLoadingMessage}
							quote={quote}
							fetch={props.fetch!}
						/>
					)}
				</PRDiffHunk>
			</Root>
		</Modal>
	);
};
