import React from "react";
import { RCTooltip as RCT } from "rc-tooltip";
import { AnyObject } from "../../utils";
import Tooltip from "@codestream/webview/Stream/Tooltip";

export interface Props {
	title?: any;
	placement?: RCT.Placement;
	align?: any;
	overlayStyle?: AnyObject;
}

export function TourTip(props: React.PropsWithChildren<Props>) {
	const title = props.title ? <div style={{ fontSize: "larger" }}>{props.title}</div> : null;

	return (
		<Tooltip
			defaultVisible={true}
			placement={props.placement}
			align={props.align}
			transitionName="zoom"
			title={title}
			trigger={[]}
		>
			{props.children}
		</Tooltip>
	);
}
