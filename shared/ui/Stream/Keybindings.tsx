import React, { PropsWithChildren } from "react";
import ComposeTitles from "./ComposeTitles";
import { FeatureFlag } from "./FeatureFlag";

interface Props {
	onClick?: any;
}

export const Keybindings = (props: PropsWithChildren<Props>) => {
	return (
		<div key="no-codemarks" className="no-codemarks-container" onClick={props.onClick}>
			<div className="no-codemarks">
				{props.children}
				<div className="keybindings">
					<div className="function-row">{ComposeTitles.pullRequest}</div>
					<FeatureFlag flag="lightningCodeReviews">
						{isOn => isOn && <div className="function-row">{ComposeTitles.review}</div>}
					</FeatureFlag>
					<div className="function-row">{ComposeTitles.comment}</div>
					<div className="function-row">{ComposeTitles.issue}</div>
					<div className="function-row">{ComposeTitles.link}</div>
					<div className="function-row">{ComposeTitles.privatePermalink}</div>
					<div className="function-row">{ComposeTitles.toggleCodeStreamPanel}</div>
				</div>
			</div>
		</div>
	);
};
