import React from "react";
import { useStore } from "react-redux";
import { DelayedRender } from "../Container/DelayedRender";
import { Loading } from "../Container/Loading";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { getCodemark } from "../store/codemarks/reducer";
import { setCurrentCodemark } from "../store/context/actions";
import { isUnread } from "../store/users/reducer";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { markItemRead } from "./actions";
import Codemark from "./Codemark";

const EMPTY_HASH = {};
export function CodemarkView() {
	const dispatch = useAppDispatch();
	const codemark = useAppSelector((state: CodeStreamState) => {
		return getCodemark(state.codemarks, state.context.currentCodemarkId);
	});
	const unread = useAppSelector((state: CodeStreamState) => {
		return codemark ? isUnread(state, codemark) : false;
	});
	const unreadEnabled = useAppSelector((state: CodeStreamState) =>
		isFeatureEnabled(state, "readItem")
	);

	const store = useStore<CodeStreamState>();

	useDidMount(() => {
		if (codemark == undefined) {
			// TODO: fetch it when we have the api for that
			dispatch(setCurrentCodemark());
		} else if (unread && unreadEnabled) {
			dispatch(markItemRead(codemark.id, codemark.numReplies || 0));
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
