import React from "react";
import { NoContent } from "../src/components/Pane";
import { PRDiffHunks, PRDiffHunk } from "./PullRequestFilesChangedList";
import { PullRequestPatch } from "./PullRequestPatch";
import { PanelHeader } from "../src/components/PanelHeader";

export const RepoHunkDiffs = (props: { repoId: string; filesChanged: any[] }) => {
	if (props.filesChanged.length > 0)
		return (
			<>
				<PanelHeader title={`${props.filesChanged.length} Changed Files`}></PanelHeader>
				<div style={{ padding: "0 20px" }}>
					<PRDiffHunks>
						{props.filesChanged.map(_ => {
							return (
								<PRDiffHunk>
									<h1>{_.filename}</h1>
									<PullRequestPatch patch={_.patch} hunks={_.hunks} filename={_.filename} />
								</PRDiffHunk>
							);
						})}
					</PRDiffHunks>
				</div>
			</>
		);
	else return <NoContent style={{ marginLeft: 0, marginRight: 0 }}>No diffs found.</NoContent>;
};
