import cx from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { getCodemark } from "../store/codemarks/reducer";
import { setCurrentCodemark } from "../store/context/actions";
import { HostApi } from "../webview-api";
import Icon from "./Icon";

export function RelatedCodemark(props: { id: string; className?: string }) {
	const dispatch = useDispatch();
	const codemark = useSelector((state: CodeStreamState) => {
		return getCodemark(state.codemarks, props.id);
	});
	const currentUserId = useSelector((state: CodeStreamState) => state.session.userId || "");

	// React.useEffect(() => {
	// 	if (!codemark) {
	// 		// TODO: fetch it when the api is ready
	// 	}
	// }, []);

	const handleClickRelatedCodemark = React.useCallback(
		event => {
			event.preventDefault();
			event.stopPropagation();
			HostApi.instance.track("Codemark Clicked", {
				"Codemark ID": props.id,
				"Codemark Location": "Related List",
				Following: (codemark?.followerIds || []).includes(currentUserId),
			});

			dispatch(setCurrentCodemark(codemark!.id));
		},
		[props.id]
	);

	if (!codemark) {
		return null;
	}

	const color = codemark.pinned ? (codemark.status === "closed" ? "purple" : "green") : "gray";
	const icon = <Icon name={codemark.type || "comment"} className={`${color}-color type-icon`} />;

	const marker = codemark.markers && codemark.markers[0];
	const file = marker && marker.file;
	const resolved = codemark.status === "closed";

	return (
		<div
			key={codemark.id}
			className={cx("related-codemark", props.className)}
			onClick={handleClickRelatedCodemark}
		>
			{icon}&nbsp;{codemark.title || codemark.text}
			<span className="codemark-file">{file}</span>
		</div>
	);
}
