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
		return derivedState.codemarks.length ? stringify(derivedState.codemarks) : "";
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
						{derivedState.codemarks.length ? stringify(derivedState.codemarks) : ""}
					</textarea>
				</div>
			</ScrollBox>
		</div>
	);
};
