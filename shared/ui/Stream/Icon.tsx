import React from "react";
import createClassString from "classnames";
import Icons8 from "./Icons8";
import octicons from "@primer/octicons";
import Tooltip, { Placement, Trigger } from "./Tooltip";

interface Props {
	// this name can come from one of two sources; either
	// the keys in icons8-data.json (which are our custom
	// icons and we add to that file from time to time),
	// or the included "Ocitcons" from GitHub https://octicons.github.com/
	name: string;
	className?: string;
	title?: React.ReactNode;
	placement?: Placement;
	align?: any;
	style?: any;
	delay?: number;
	clickable?: boolean;
	muted?: boolean;
	loading?: boolean;
	onClick?(event: React.SyntheticEvent): any;
	onPopupAlign?: any;
	trigger?: Trigger[];
	tabIndex?: number;
}

const Icon = React.forwardRef<any, Props>((props, ref) => {
	const name = props.loading ? "sync" : props.name;
	const icon = Icons8[name] || octicons[name];
	// const icon = octicons[props.name]; why is this commented out?
	// if we can't find the icon, throw an error
	if (!icon) throw new Error(`No icon found for '${props.name}'`);

	const iconImage = (
		<span
			className={createClassString("icon", props.className, {
				spin: props.loading,
				clickable: props.clickable,
				muted: props.muted
			})}
			onClick={props.onClick}
			style={props.style}
			dangerouslySetInnerHTML={{ __html: icon.toSVG() }}
			ref={ref}
			tabIndex={props.tabIndex}
		/>
	);

	if (props.title) {
		return (
			<Tooltip
				content={props.title}
				placement={props.placement}
				align={props.align}
				delay={props.delay}
				onPopupAlign={props.onPopupAlign}
				trigger={props.trigger}
			>
				<span>{iconImage}</span>
			</Tooltip>
		);
	} else return iconImage;
});

Icon.defaultProps = {
	clickable: false,
	muted: false,
	className: "",
	onClick: event => event.preventDefault()
};

export default Icon;
