import React from "react";
import { SkeletonLoader } from "@codestream/webview/Stream/SkeletonLoader";

export const GrokLoading = () => {
	return (
		<>
			<SkeletonLoader style={{ width: "90%", marginLeft: "25px" }} />
			<SkeletonLoader style={{ width: "90%", marginLeft: "25px", marginBottom: "5px" }} />
		</>
	);
};
