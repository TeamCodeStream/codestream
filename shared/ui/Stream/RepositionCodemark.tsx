import {
	CodemarkPlus,
	GetRangeScmInfoRequestType,
	MoveMarkerRequestType,
} from "@codestream/protocols/agent";
import { CSMarker } from "@codestream/protocols/api";
import cx from "classnames";
import * as Path from "path-browserify";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Range } from "vscode-languageserver-types";
import { URI } from "vscode-uri";
import { CodeStreamState } from "../store";
import { setCurrentCodemark } from "../store/context/actions";
import { getCurrentSelection } from "../store/editorContext/reducer";
import { useDidMount } from "../utilities/hooks";
import { areRangesEqual, isRangeEmpty } from "../utils";
import { HostApi } from "../webview-api";
import { getDocumentFromMarker } from "./api-functions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import Icon from "./Icon";

interface Props {
	codemark: CodemarkPlus;
	markerId: string;
}

export const RepositionCodemark = (props: Props) => {
	const dispatch = useDispatch();
	const [loading, setLoading] = useState(false);
	const [docMarker, setDocMarker] = useState<{
		range: Range;
		textDocument: { uri: string };
		marker: CSMarker;
	} | void>();

	const reposition = async () => {
		if (!docMarker || !textEditorUri) return;

		setLoading(true);
		const scmInfo = await HostApi.instance.send(GetRangeScmInfoRequestType, {
			uri: textEditorUri,
			gitSha: textEditorGitSha,
			range: textEditorSelection!,
		});
		if (scmInfo && scmInfo.scm) {
			let location = "Same File";
			if (textEditorUri !== docMarker.textDocument.uri) location = "Different File";
			// how do we compare repos if docMarker doesn't have that property?
			// if (scmInfo.scm.repoPath !== docMarker.newRepoPath) location = "Different Repo";

			const payload = {
				markerId: props.markerId,
				code: scmInfo.contents,
				range: textEditorSelection,
				documentId: { uri: textEditorUri },
				source: scmInfo.scm,
			};
			console.log("Payload: ", payload);
			HostApi.instance.send(MoveMarkerRequestType, payload);
		} else {
			// FIXME what to do in this scenario?
		}
		setLoading(false);
		cancel();
	};

	const textEditorSelection = useSelector((state: CodeStreamState) => {
		return getCurrentSelection(state.editorContext);
	});
	const textEditorUri = useSelector((state: CodeStreamState) => {
		return state.editorContext.textEditorUri;
	});
	const textEditorGitSha = useSelector((state: CodeStreamState) => {
		return state.editorContext.textEditorGitSha;
	});

	useDidMount(() => {
		let isValid = true;
		getDocumentFromMarker(props.markerId).then(response => {
			if (response && isValid) setDocMarker(response);
		});
		return () => {
			isValid = false;
		};
	});

	const renderRange = (file: string, range: Range) => {
		if (!range) {
			return (
				<span className="repo-warning">
					<Icon name="question" /> <b>Unknown</b>
				</span>
			);
		}
		const { start, end } = range;
		const rangeString =
			"" +
			(start.line + 1) +
			":" +
			(start.character + 1) +
			"-" +
			(end.line + 1) +
			":" +
			(end.character + 1);
		return (
			<span className="monospace">
				<Icon name="file" /> {file} <b className="highlight">{rangeString}</b>
			</span>
		);
	};

	const selectPrompt = (
		<span className="info-text">
			<Icon name="info" /> <b>Select a new range to reposition this codemark.</b>
		</span>
	);

	const isRangeDifferent = () => {
		// if we don't know where the
		if (!docMarker) return true;
		const { range, textDocument } = docMarker;
		if (textEditorUri !== textDocument.uri) return true;

		// cursor is at the begging of the codemark range. this is where it starts,
		// so we assume it hasn't been moved
		if (
			textEditorSelection.start.line === range.start.line &&
			textEditorSelection.end.line === range.start.line &&
			textEditorSelection.start.character === 0 &&
			textEditorSelection.end.character === 0
		) {
			return false;
		}

		if (areRangesEqual(textEditorSelection, range)) {
			return false;
		}

		return true;
	};

	const noSelection = () => {
		if (!textEditorSelection) return true;
		return isRangeEmpty(textEditorSelection);
	};

	const renderNewRange = () => {
		// if (!props.range) return selectPropmpt;
		if (noSelection()) return selectPrompt;
		if (!isRangeDifferent()) return selectPrompt;
		return renderRange(Path.basename(URI.parse(textEditorUri!).path), textEditorSelection);
	};

	const renderMarkerRange = () => {
		if (!docMarker) return null;
		return renderRange(Path.basename(URI.parse(docMarker.textDocument.uri).path), docMarker.range);
	};

	const cancel = React.useCallback(() => {
		dispatch(setCurrentCodemark());
		// if (codemark) dispatch(repositionCodemark(codemark.id, false));
	}, []);

	return (
		<div id="reposition-blanket">
			<div className="reposition-dialog">
				<form id="reposition-form" className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							<div className="related" style={{ marginTop: 0 }}>
								<div className="related-label">CURRENT RANGE</div>
								{renderMarkerRange()}
							</div>
							<div className="related">
								<div className="related-label">NEW RANGE</div>
								{renderNewRange()}
							</div>
							<div id="switches" className="control-group">
								<div style={{ display: "none" }} onClick={() => false}>
									<div className={cx("switch", { checked: true })} /> Include replies
								</div>
							</div>
						</div>
						<div
							key="buttons"
							className="button-group"
							style={{
								marginLeft: "10px",
								marginTop: "5px",
								float: "right",
								width: "auto",
								marginRight: 0,
							}}
						>
							<CancelButton onClick={cancel} mode="button" />
							<Button
								key="submit"
								style={{
									paddingLeft: "10px",
									paddingRight: "10px",
									marginRight: 0,
									width: "12em", // fixed width to accomodate spinner
								}}
								className="control-button"
								type="submit"
								loading={loading}
								disabled={!noSelection() && isRangeDifferent() ? false : true}
								onClick={reposition}
							>
								Save New Position
							</Button>
						</div>
					</fieldset>
				</form>
			</div>
		</div>
	);
};
