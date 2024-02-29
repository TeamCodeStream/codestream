import React from "react";
import { SkeletonLoader, SkeletonFlexContainer } from "@codestream/webview/Stream/SkeletonLoader";

export const APMLogTableLoading = props => {
	return (
		<div style={{ overflow: "hidden", height: props.height }}>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "25%", height: "40px", margin: "0px 10px 3px 0px" }} />
				<SkeletonLoader style={{ width: "75%", height: "40px", margin: "0px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "120px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "60px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "120px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "100%", height: "90px", margin: "10px 0px 0px 0px" }} />
			</SkeletonFlexContainer>
		</div>
	);
};
