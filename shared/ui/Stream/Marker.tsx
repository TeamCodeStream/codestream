import React from "react";
import * as Path from "path-browserify";
import { connect, useDispatch, useSelector } from "react-redux";
import { prettyPrintOne } from "code-prettify";
import { CSMarker } from "@codestream/protocols/api";
import { escapeHtml, safe } from "../utils";
import Icon from "./Icon";
import { CodeStreamState } from "../store";
import { getById } from "../store/repos/reducer";
import { setCurrentCodemark, setCurrentReview } from "../store/context/actions";
import { SearchContext } from "./SearchContextProvider";
import styled from "styled-components";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { setUserPreference } from "./actions";
import { PRDiffHunk } from "./PullRequestFilesChangedList";
import { PullRequestPatch } from "./PullRequestPatch";

const Label = styled.span`
	display: inline-block;
	padding-right: 20px;
	.icon {
		margin-right: 5px;
	}
`;

const Gear = styled.div`
	.icon {
		opacity: 0.7;
	}
	border-bottom: 1px solid var(--base-border-color);
	flex-grow: 100;
	text-align: right;
`;

const Tabs = styled.div`
	display: flex;
	align-items: flex-end;
	width: 100%;
	margin-bottom: -6px;
	z-index: 50;
	margin-top: 10px;
	${Gear} {
		padding-bottom: 5px;
	}
`;

const Tab = styled.div<{ selected?: boolean }>`
	border: ${props =>
		props.selected ? "1px solid var(--base-border-color)" : "1px solid transparent"};
	color: ${props => (props.selected ? "var(--text-color-highlight)" : "var(--text-color-subtle)")};
	background: ${props => (props.selected ? "rgba(0, 0, 0, 0.1)" : "none")};
	border-bottom: ${props => (props.selected ? "none" : "1px solid var(--base-border-color)")};
	padding: 5px 10px;
	&:hover {
		color: var(--text-color-highlight);
	}
	z-index: 50;
	cursor: pointer;
`;

const Root = styled.div<{ hasDiff?: boolean }>`
	margin-top: 10px;
	pre.code {
		cursor: pointer;
		border-top: ${props =>
			props.hasDiff ? "none !important" : "1px solid var(--base-border-color)"};
	}
	&:hover pre.code {
		background: rgba(0, 0, 0, 0.2);
	}
`;

interface Props {
	marker: CSMarker;
	repoName?: string;
	className?: string;
	hasDiff?: boolean;
	currentContent?: string;
	diff?: string;
}

function Marker(props: Props) {
	const { marker } = props;

	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;

		return {
			showRepo: preferences.markerShowRepo,
			hideFile: preferences.markerHideFile,
			showBranch: preferences.markerShowBranch,
			showCommit: preferences.markerShowCommit,
			tab: preferences.markerTab || "original"
		};
	});
	const { showRepo, hideFile, showBranch, showCommit, tab } = derivedState;

	const searchContext = React.useContext(SearchContext);
	const goSearch = (e: React.SyntheticEvent, query: string) => {
		e.preventDefault();
		e.stopPropagation();

		dispatch(setCurrentCodemark());
		dispatch(setCurrentReview());
		searchContext.goToSearch(query);
	};

	const setPreference = (key, value) => {
		dispatch(setUserPreference([key], value));
	};

	const selectTab = value => {
		dispatch(setUserPreference(["markerTab"], value));
	};

	const path = marker.file || "";
	let extension = Path.extname(path).toLowerCase();
	if (extension.startsWith(".")) {
		extension = extension.substring(1);
	}

	let startLine = 1;
	if (marker.locationWhenCreated && marker.locationWhenCreated.length)
		startLine = marker.locationWhenCreated[0];
	else if (marker.referenceLocations && marker.referenceLocations.length)
		startLine = marker.referenceLocations[0].location[0];

	const codeHTML = prettyPrintOne(
		escapeHtml(tab === "current" ? props.currentContent || "" : marker.code),
		extension,
		startLine
	);

	console.warn("DIFF IS: ", props.diff);

	const gear = (
		<Gear>
			<InlineMenu
				className="subtle"
				noChevronDown
				noFocusOnSelect
				items={[
					{
						key: "repo",
						label: "Show Repo",
						checked: !!showRepo,
						action: () => setPreference("markerShowRepo", !showRepo)
					},
					{
						key: "file",
						label: "Show File",
						checked: !hideFile,
						action: () => setPreference("markerHideFile", !hideFile)
					},
					{
						key: "branch",
						label: "Show Branch",
						checked: !!showBranch,
						action: () => setPreference("markerShowBranch", !showBranch)
					},
					{
						key: "commit",
						label: "Show Commit",
						checked: !!showCommit,
						action: () => setPreference("markerShowCommit", !showCommit)
					}
				]}
			>
				<Icon name="gear" className="clickable" />
			</InlineMenu>
		</Gear>
	);
	return (
		<Root className={props.className} hasDiff={props.hasDiff}>
			<div className="file-info">
				{props.repoName && showRepo && (
					<Label>
						<span className="monospace">
							<Icon name="repo" />
							{props.repoName}
						</span>
						{" " /* spaces are to allow wrapping */}
					</Label>
				)}
				{marker.file && !hideFile && (
					<Label>
						<span className="monospace">
							<Icon name="file" />
							{marker.file}
						</span>{" "}
					</Label>
				)}
				{marker.branchWhenCreated && showBranch && (
					<Label>
						<span className="monospace">
							<Icon name="git-branch" />
							{marker.branchWhenCreated}
						</span>{" "}
					</Label>
				)}
				{marker.commitHashWhenCreated && showCommit && (
					<Label>
						<span className="monospace">
							<Icon name="git-commit-vertical" />
							{marker.commitHashWhenCreated.substring(0, 7)}
						</span>
					</Label>
				)}
				{!props.hasDiff && <div style={{ marginLeft: "auto" }}>{gear}</div>}
			</div>
			{props.hasDiff && (
				<Tabs>
					<Tab selected={tab === "original"} onClick={() => selectTab("original")}>
						Original
					</Tab>
					<Tab selected={tab === "current"} onClick={() => selectTab("current")}>
						Current
					</Tab>
					<Tab selected={tab === "diff"} onClick={() => selectTab("diff")}>
						Diff
					</Tab>
					{gear}
				</Tabs>
			)}
			{(tab === "current" || tab === "original") && (
				<pre
					className="code prettyprint"
					data-scrollable="true"
					dangerouslySetInnerHTML={{ __html: codeHTML }}
				/>
			)}
			{tab === "diff" && (
				<PRDiffHunk style={{ marginTop: "5px", borderRadius: 0, borderTop: "none" }}>
					<PullRequestPatch patch={props.diff} hunks={[]} filename={marker.file} noHeader />
				</PRDiffHunk>
			)}
		</Root>
	);
}

const mapStateToProps = (state: CodeStreamState, props: Props) => {
	const { editorContext, context } = state;
	//console.log(ownState);

	const repoName =
		(props.marker && safe(() => getById(state.repos, props.marker.repoId).name)) || "";

	return { repoName };
};

const Component = connect(mapStateToProps)(Marker);

export { Component as Marker };
