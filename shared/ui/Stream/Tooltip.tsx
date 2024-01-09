import * as React from "react";
import { default as RCTooltip, RCTooltip as RCT } from "rc-tooltip";
import { AnyObject, emptyObject } from "../utils";
import { ModalContext } from "./ModalContext";
import styled from "styled-components";

export const TipTitle = styled.div`
	h1 {
		font-size: 14px;
		font-weight: normal;
		margin: 0 0 5px 0;
		color: var(--text-color-highlight);
	}
	max-width: 20em;
	.learn-more {
		display: block;
		margin-top: 5px;
	}
`;

export function placeArrowTopRight(tooltipEl, align) {
	const arrowEl = tooltipEl.querySelector(".rc-tooltip-arrow");
	arrowEl.style.right = "10px";
}

interface Props {
	children: any;
	content?: any;
	title?: any;
	placement?: RCT.Placement;
	align?: any;
	delay?: number;
	overlayStyle?: AnyObject;
	defaultVisible?: boolean;
	trigger?: RCT.Trigger[];
	transitionName?: string;
	onPopupAlign?: any;
}

export type Placement = RCT.Placement;
export type Trigger = RCT.Trigger;

export default function Tooltip(props: Props) {
	// TODO: deprecate `title` for `content`

	const overlayStyle = props.overlayStyle || emptyObject;
	const content = props.content ? props.content : <span>{props.title}</span>;

	// if there's no title, just return the children rather than
	// creating a blank hover bubble
	if (!props.content && !props.title) return props.children;

	return (
		<ModalContext.Consumer>
			{({ zIndex }) => (
				<RCTooltip
					placement={props.placement}
					align={props.align}
					overlay={content}
					transitionName={props.transitionName}
					defaultVisible={props.defaultVisible}
					trigger={props.trigger || ["hover", "click"]}
					overlayStyle={{ opacity: 1, zIndex, ...overlayStyle }}
					mouseEnterDelay={props.delay || 0}
					onPopupAlign={props.onPopupAlign}
				>
					{props.children}
				</RCTooltip>
			)}
		</ModalContext.Consumer>
	);
}
