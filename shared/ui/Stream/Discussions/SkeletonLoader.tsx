import React from "react";
import { SkeletonLoader as SkeletonLoader_1 } from "@codestream/webview/Stream/SkeletonLoader";

export const DiscussionLoadingSkeleton = () => {
	return (
		<>
			<SkeletonLoader_1
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
			<SkeletonLoader_1
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
			<SkeletonLoader_1
				style={{ width: "50%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
		</>
	);
};
