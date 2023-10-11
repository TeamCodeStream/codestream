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

	const [text, setText] = React.useState("");

	useDidMount(() => {
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Export" });
	});

	const insertText = () => {};

	const escapeText = text => {
		const returnText = (text || "").replace(/\n/g, "\\" + "n");
		if (returnText.match(/\"/)) return `"${returnText.replace(/\"/g, '\\"')}"`;
		else return returnText;
	};

	let output =
		"// repo,file,commitSha,location,date,author,id,parentId,type,title,body,assignees\n";
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
				output += `${repoName},${marker.file},${location.commitHash},${
					location.location ? location.location[0] : ""
				},${codemark.createdAt},${codemark.creatorId},${codemark.id},${codemark.type},${escapeText(
					codemark.title || codemark.text
				)},${escapeText(codemark.title ? codemark.text : "")}\n`;
			});
		} else {
			output += `${escapeText(codemark.text || codemark.title)}\n`;
		}
	});

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
							onClick={() => copy(output)}
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
						{output}
					</textarea>
				</div>
			</ScrollBox>
		</div>
	);
};
