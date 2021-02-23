import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";
import { Checkbox } from "@codestream/webview/src/components/Checkbox";
import { CodeStreamState } from "@codestream/webview/store";
import { setUserPreference } from "../../actions";
import { Link } from "../../Link";
import { CommandLineInstructions } from "./CommandLineInstructions";
import styled from "styled-components";
import { PullRequestReactions } from "./PullRequestReactions";
import { DropdownButton } from "../../Review/DropdownButton";

export const Root = styled.div`
	margin: 0 20px 15px 20px;
	display: flex;
	align-items: stretch;
	padding-bottom: 15px;
	border-bottom: 1px solid var(--base-border-color);
	button {
		margin-left: 10px;
		height: 35px;
	}
`;
export const ReactAndDisplayOptions = props => {
	const { pr, setIsLoadingMessage } = props;

	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		return {
			order: preferences.pullRequestTimelineOrder || "oldest",
			filter: preferences.pullRequestTimelineFilter || "all"
		};
	});

	const { order, filter } = derivedState;

	const filterMap = {
		all: "Show all activity",
		history: "Show history only",
		comments: "Show comments only"
	};

	return (
		<Root>
			<PullRequestReactions
				pr={pr as any}
				targetId={pr.id}
				setIsLoadingMessage={setIsLoadingMessage}
				thumbsFirst
				reactionGroups={pr.reactionGroups}
			/>
			<div style={{ marginLeft: "auto" }}>
				<DropdownButton
					variant="secondary"
					items={[
						{
							label: "Oldest first",
							key: "oldest",
							checked: order === "oldest",
							action: () => dispatch(setUserPreference(["pullRequestTimelineOrder"], "oldest"))
						},
						{
							label: "Newest first",
							key: "newest",
							checked: order === "newest",
							action: () => dispatch(setUserPreference(["pullRequestTimelineOrder"], "newest"))
						}
					]}
				>
					{order === "oldest" ? "Oldest first" : "Newest first"}
				</DropdownButton>
				<DropdownButton
					variant="secondary"
					items={[
						{
							label: "Show all activity",
							key: "all",
							checked: filter === "all",
							action: () => dispatch(setUserPreference(["pullRequestTimelineFilter"], "all"))
						},
						{ label: "-" },
						{
							label: "Show comments only",
							key: "comments",
							checked: filter === "comments",
							action: () => dispatch(setUserPreference(["pullRequestTimelineFilter"], "comments"))
						},
						{
							label: "Show history only",
							key: "history",
							checked: filter === "history",
							action: () => dispatch(setUserPreference(["pullRequestTimelineFilter"], "history"))
						}
					]}
				>
					{filterMap[filter] || filter}
				</DropdownButton>
			</div>
		</Root>
	);
};
