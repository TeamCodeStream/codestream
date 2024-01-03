import React from "react";
import ScrollBox from "./ScrollBox";
import { CodeStreamState } from "../store";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { mapFilter } from "../utils";
import { CodemarkType } from "@codestream/protocols/api";
import { PanelHeader } from "../src/components/PanelHeader";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import { createSelector } from "reselect";
import CancelButton from "./CancelButton";
import { closePanel } from "./actions";
import Icon from "./Icon";
import { stringify } from "csv-stringify/browser/esm/sync";
import copy from "copy-to-clipboard";

const getSearchableCodemarks = createSelector(
	(state: CodeStreamState) => state.codemarks,
	codemarksState => {
		return mapFilter(Object.values(codemarksState), codemark => {
			if (
				!codemark.isChangeRequest &&
				(codemark.type === CodemarkType.Comment || codemark.type === CodemarkType.Issue)
			) {
				return codemark;
			}
			return;
		});
	}
);

export const ExportPanel = () => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const codemarks = useAppSelector(getSearchableCodemarks);

		return { codemarks, webviewFocused: state.context.hasFocus, repos: state.repos };
	});

	useDidMount(() => {
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Export" });
	});

	function generateCsv() {
		// repo,file,commitSha,location,date,author,id,parentId,type,title,body,assignees
		if (!derivedState.codemarks.length) return "";
		let output = [{}];
		derivedState.codemarks.forEach(codemark => {
			if (!codemark) return;
			if (codemark.markers) {
				codemark.markers.map(marker => {
					if (!marker) return;
					const location: any = marker.referenceLocations
						? marker.referenceLocations[marker.referenceLocations.length - 1] || {}
						: {};
					const repo = derivedState.repos[marker.repoId];
					const repoName = repo ? repo.name : "";
					output.push(
						{ repo: repoName },
						{ file: marker.file },
						{ commitSha: location.commitHash },
						{ location: location.location ? location.location[0] : "" },
						{ date: codemark.createdAt },
						{ author: codemark.creatorId },
						{ id: codemark.id },
						{ parentId: codemark.parentPostId },
						{ type: codemark.type },
						{ title: codemark.title || codemark.text },
						{ body: codemark.title ? codemark.text : "" },
						{ assignees: codemark.assignees }
					);
				});
			}
		});

		const data = stringify(output, {
			header: true,
			columns: {
				repo: "repo",
				file: "file",
				commitSha: "commitSha",
				location: "location",
				date: "date",
				author: "author",
				id: "id",
				parentId: "parentId",
				type: "type",
				title: "title",
				body: "body",
				assignees: "assignees",
			},
		});
		return derivedState.codemarks.length ? data : "";
	}

	return (
		<div className="panel full-height activity-panel">
			<CreateCodemarkIcons />
			<PanelHeader
				title={
					<span>
						Data Export{" "}
						<Icon
							name="copy"
							className="clickable"
							onClick={() => copy(generateCsv())}
							title="Copy Export to Clipboard"
						/>
					</span>
				}
			>
				<CancelButton onClick={() => dispatch(closePanel())} />
			</PanelHeader>
			<ScrollBox>
				<div className="channel-list vscroll" style={{ padding: "0 0 0 0" }}>
					<textarea
						className="monospace"
						style={{
							width: "100%",
							height: "calc(100% - 5px)",
							whiteSpace: "nowrap",
							overflow: "auto",
						}}
					>
						{derivedState.codemarks.length ? generateCsv() : ""}
					</textarea>
				</div>
			</ScrollBox>
		</div>
	);
};
