import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import React from "react";
import Tooltip, { Placement } from "./Tooltip";
import { useDispatch } from "react-redux";
import { setCurrentCodemark, setCurrentReview } from "../store/context/actions";
import { SearchContext } from "./SearchContextProvider";
import { lightOrDark } from "../utils";

interface Props {
	title?: string | JSX.Element | undefined;
	placement?: Placement;
	align?: any;
	style?: any;
	delay?: number;
	className?: string;
	onClick?(event: React.SyntheticEvent): any;
	tag?: any;
}

const Tag = React.forwardRef<any, Props>((props, ref) => {
	const { tag } = props;

	const color = tag.color.startsWith("#") ? "" : tag.color;
	let label = tag.label || color;
	if (label.match(/\s/)) label = `"${label}"`;

	const dispatch = useAppDispatch();
	const searchContext = React.useContext(SearchContext);
	const goSearch = query => {
		dispatch(setCurrentCodemark());
		dispatch(setCurrentReview());
		searchContext.goToSearch(query);
	};

	let tagDiv;
	if (tag.color.startsWith("#")) {
		const brightness = lightOrDark(tag.color);
		tagDiv = (
			<div key={tag.id} className={`cs-tag ${brightness}`} style={{ background: tag.color }}>
				<div>&nbsp;{tag.label}&nbsp;</div>
			</div>
		);
	} else
		tagDiv = (
			<div
				key={tag.id}
				className={`cs-tag ${tag.color}-background${tag.color === "yellow" ? " light" : ""}`}
			>
				<div>&nbsp;{tag.label}&nbsp;</div>
			</div>
		);

	if (props.title) {
		const { title, placement, align, delay } = props;
		return (
			<Tooltip content={title} placement={placement} align={align} delay={delay}>
				{tagDiv}
			</Tooltip>
		);
	} else return tagDiv;
});

Tag.defaultProps = {
	className: "",
	onClick: event => event.preventDefault(),
};

export default Tag;
