import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React from "react";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import { setUserPreference } from "./actions";

interface Props {}

export function WallToWallBanner(props: Props) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences = {} } = state;

		const showBanner =
			state.ide.name === "VSC" &&
			(state.editorContext.visibleEditorCount || 0) === 0 && // only populated (and used) by vscode
			!preferences.skipWallToWallBanner;
		return { showBanner };
	});

	const setSkip = () =>
		dispatch(setUserPreference({ prefPath: ["skipWallToWallBanner"], value: true }));

	if (derivedState.showBanner)
		return (
			<div className="banner">
				<div id="wall-to-wall-banner">
					<div className="content">
						<Icon name="x" className="cancel-button clickable" onClick={setSkip} />
						CodeStream works best next to an editor window.{" "}
						<a href="https://docs.codestream.com/userguide/faq/cspane-in-vsc/">Learn more</a>.
					</div>
				</div>
			</div>
		);
	else return null;
}
