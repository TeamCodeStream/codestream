import React from "react";
import { SkeletonLoader } from "@codestream/webview/Stream/SkeletonLoader";

export const NrAiLoading = () => {
	return (
		<>
			<SkeletonLoader
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
			<SkeletonLoader
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
			<SkeletonLoader
				style={{ width: "50%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
		</>
	);
};

export const NrAiCodeBlockLoading = () => {
	return (
		<>
			<SkeletonLoader
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
			<SkeletonLoader
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
			<SkeletonLoader
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
			<SkeletonLoader
				style={{ width: "90%", marginLeft: "25px", marginTop: "4px", marginBottom: "4px" }}
			/>
		</>
	);
};
