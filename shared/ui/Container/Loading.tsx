import { AnyObject, noop } from "../utils";
import React, { useState, useEffect } from "react";

interface Props {
	style?: AnyObject;
	forceAnimation?: boolean;
}
export function Loading(props: Props) {
	const [shouldShowRings, setShouldShowRings] = useState(Boolean(props.forceAnimation));

	useEffect(() => {
		if (!shouldShowRings) {
			const id = setTimeout(() => {
				setShouldShowRings(true);
			}, 100);

			return () => clearTimeout(id);
		}
		return noop;
	}, []);

	return (
		<div id="spinner" style={props.style}>
			<div className="loader-ring">
				{shouldShowRings ? (
					<React.Fragment>
						<div className="loader-ring__segment" />
						<div className="loader-ring__segment" />
						<div className="loader-ring__segment" />
						<div className="loader-ring__segment" />
					</React.Fragment>
				) : null}
			</div>
		</div>
	);
}
