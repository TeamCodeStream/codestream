import React from "react";
import { SkeletonLoader } from "@codestream/webview/Stream/SkeletonLoader";

export const FossaLoading = () => {
	return (
		<>
			<SkeletonLoader style={{ width: "50%", marginLeft: "20px" }} />
			<SkeletonLoader style={{ width: "70%", marginLeft: "20px" }} />
		</>
	);
};
