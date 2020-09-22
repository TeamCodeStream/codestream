import React from "react";
import { useDispatch, useSelector } from "react-redux";
import ScrollBox from "./ScrollBox";
import { includes as _includes, sortBy as _sortBy, last as _last } from "lodash-es";
import { CodeStreamState } from "../store";
import { useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { mapFilter } from "../utils";
import { CodemarkType } from "@codestream/protocols/api";
import { PanelHeader } from "../src/components/PanelHeader";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import { createSelector } from "reselect";
import CancelButton from "./CancelButton";
import { closePanel } from "./actions";

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
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const codemarks = useSelector(getSearchableCodemarks);

		return { codemarks, webviewFocused: state.context.hasFocus, repos: state.repos };
	});

	const [text, setText] = React.useState("");

	useDidMount(() => {
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Export" });
	});

	const insertText = () => {};

	const escapeText = text => {
		const returnText = text.replace(/\n/g, "\\\n");
		if (returnText.match(/\"/)) return `"${returnText.replace(/\"/g, '\\"')}"`;
		else return returnText;
	};
	return (
		<div className="panel full-height activity-panel">
			<CreateCodemarkIcons />
			<PanelHeader title="Data Export">
				<CancelButton onClick={() => dispatch(closePanel())} />
			</PanelHeader>
			<ScrollBox>
				<div className="channel-list vscroll">
					<pre
						className="monospace"
						style={{ margin: "20px", whiteSpace: "nowrap", overflow: "auto" }}
					>
						// repo,file,commitSha,location,date,author,id,parentId,type,title,body,assignees
						<br />
						{derivedState.codemarks.map(codemark => {
							if (codemark.markers) {
								return codemark.markers.map(marker => {
									const location = marker.referenceLocations[marker.referenceLocations.length - 1];
									const repo = derivedState.repos[marker.repoId];
									const repoName = repo ? repo.name : "";
									return (
										<>
											{repoName},{marker.file},{location.commitHash},{location.location[0]},
											{codemark.createdAt},{codemark.creatorId},{codemark.id},{codemark.type},
											{escapeText(codemark.title || codemark.text)},
											{escapeText(codemark.title ? codemark.text : "")}
											<br />
										</>
									);
								});
							} else
								return (
									<>
										{escapeText(codemark.text || codemark.title)}
										<br />
									</>
								);
						})}
					</pre>
				</div>
			</ScrollBox>
		</div>
	);
};
