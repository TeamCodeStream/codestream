import React from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import { CodeStreamState } from "../store";
import { getCodemark } from "../store/codemarks/reducer";
import { Loading } from "../Container/Loading";
import Codemark from "./Codemark";
import CancelButton from "./CancelButton";
import { DelayedRender } from "../Container/DelayedRender";
import { setCurrentCodemark } from "../store/context/actions";
import { HostApi } from "../webview-api";
import { EditorSelectRangeRequestType } from "@codestream/protocols/webview";
import { useDidMount } from "../utilities/hooks";
import { getDocumentFromMarker } from "./api-functions";

export async function moveCursorToLine(markerId: string) {
	const hostApi = HostApi.instance;
	try {
		const response = await getDocumentFromMarker(markerId);

		if (response) {
			// Ensure we put the cursor at the right line (don't actually select the whole range)
			hostApi.send(EditorSelectRangeRequestType, {
				uri: response.textDocument.uri,
				selection: {
					start: response.range.start,
					end: response.range.start,
					cursor: response.range.start
				},
				preserveFocus: true
			});
		}
	} catch (error) {
		// TODO:
	}
}

export function CodemarkView() {
	const dispatch = useDispatch();
	const codemark = useSelector((state: CodeStreamState) => {
		return getCodemark(state.codemarks, state.context.currentCodemarkId);
	});
	const store = useStore<CodeStreamState>();

	useDidMount(() => {
		if (store.getState().context.hasFocus)
			HostApi.instance.track("Page Viewed", { "Page Name": "Codemark View" });

		if (codemark == undefined) {
			// TODO: fetch it when we have the api for that
			dispatch(setCurrentCodemark());
		}
	});

	const handleClickCancel = React.useCallback(event => {
		dispatch(setCurrentCodemark());
	}, []);

	// this click handler is on the root element of this
	// component, and is meant to dismiss it whenever you
	// click outside the codemark. so if the target doesn't
	// have the same class as the root element, then do not
	// perform the cancel operation
	const handleClickField = React.useCallback(event => {
		if (!event.target.classList.contains("codemark-view")) return;
		event.preventDefault();
		dispatch(setCurrentCodemark());
	}, []);

	if (codemark == undefined)
		return (
			<DelayedRender>
				<Loading />
			</DelayedRender>
		);

	return (
		<div className="codemark-view" onClick={handleClickField}>
			<div className="codemark-container">
				<Codemark codemark={codemark} selected />
			</div>
		</div>
	);
}
