import React, { PropsWithChildren } from "react";
import ComposeTitles from "./ComposeTitles";

interface Props {
	onClick?: any;
}

export const Keybindings = (props: PropsWithChildren<Props>) => {
	return (
		<div key="no-codemarks" className="no-codemarks-container" onClick={props.onClick}>
			<div className="no-codemarks">
				{props.children}
				<div className="keybindings">
					<div className="function-row">{ComposeTitles.comment}</div>
					<div className="function-row">{ComposeTitles.issue}</div>
					<div className="function-row">{ComposeTitles.toggleCodeStreamPanel}</div>
				</div>
			</div>
		</div>
	);
};
