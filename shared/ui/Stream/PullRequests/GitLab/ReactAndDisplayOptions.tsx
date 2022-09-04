import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
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
import { DropdownButton } from "../../DropdownButton";

export const Root = styled.div`
	margin: 0 20px 15px 20px;
	display: flex;
	flex-wrap: wrap;
	padding-bottom: 10px;
	border-bottom: 1px solid var(--base-border-color);
	button {
		margin-left: 10px;
		margin-bottom: 5px;
		height: 35px;
	}
`;
export const ReactAndDisplayOptions = props => {
	const { pr, setIsLoadingMessage } = props;

	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;
		return {
			order: preferences.pullRequestTimelineOrder || "oldest",
			filter: preferences.pullRequestTimelineFilter || "all",
		};
	});

	const { order, filter } = derivedState;

	const filterMap = {
		all: "Show all activity",
		history: "Show history only",
		comments: "Show comments only",
	};

	return (
		<Root>
			<PullRequestReactions
				pr={pr}
				targetId={pr.id.replace(/.*\//, "")}
				setIsLoadingMessage={setIsLoadingMessage}
				thumbsFirst
				reactionGroups={pr.reactionGroups}
			/>
			<div style={{ marginLeft: "auto", textAlign: "right" }}>
				<DropdownButton
					variant="secondary"
					items={[
						{
							label: "Oldest first",
							key: "oldest",
							checked: order === "oldest",
							action: () =>
								dispatch(
									setUserPreference({ prefPath: ["pullRequestTimelineOrder"], value: "oldest" })
								),
						},
						{
							label: "Newest first",
							key: "newest",
							checked: order === "newest",
							action: () =>
								dispatch(
									setUserPreference({ prefPath: ["pullRequestTimelineOrder"], value: "newest" })
								),
						},
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
							action: () =>
								dispatch(
									setUserPreference({ prefPath: ["pullRequestTimelineFilter"], value: "all" })
								),
						},
						{ label: "-" },
						{
							label: "Show comments only",
							key: "comments",
							checked: filter === "comments",
							action: () =>
								dispatch(
									setUserPreference({ prefPath: ["pullRequestTimelineFilter"], value: "comments" })
								),
						},
						{
							label: "Show history only",
							key: "history",
							checked: filter === "history",
							action: () =>
								dispatch(
									setUserPreference({ prefPath: ["pullRequestTimelineFilter"], value: "history" })
								),
						},
					]}
				>
					{filterMap[filter] || filter}
				</DropdownButton>
			</div>
		</Root>
	);
};
