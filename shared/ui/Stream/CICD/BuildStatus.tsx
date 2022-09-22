import { ThirdPartyBuild, ThirdPartyBuildStatus } from "@codestream/protocols/agent";
import React from "react";
import Icon from "../Icon";

export const BuildStatus = (props: ThirdPartyBuild) => {
	let icon: "ok" | "sync" | "x" | "i";
	let color: string | undefined = undefined;
	switch (props.status) {
		case ThirdPartyBuildStatus.Success:
			icon = "ok";
			color = "green";
			break;
		case ThirdPartyBuildStatus.Running:
		case ThirdPartyBuildStatus.Waiting:
			icon = "sync";
			color = "green";
			break;
		case ThirdPartyBuildStatus.Failed:
			icon = "x";
			color = "red";
			break;
		case ThirdPartyBuildStatus.Unknown:
		default:
			icon = "i";
			color = "gray";
	}

	return (
		<div style={{ display: "flex" }}>
			<span style={{ color, flexGrow: 0, flexShrink: 0 }}>
				<Icon name={icon} style={{ color }} />
			</span>
			<span style={{ flexGrow: 10 }}>
				<span style={{ color }}>{props.message}</span>
				<span style={{ color: "gray", paddingLeft: "1em" }}>{props.duration}</span>
			</span>
			{props.finishedRelative && (
				<span style={{ color: "gray", flexGrow: 0, flexShrink: 0 }}>{props.finishedRelative}</span>
			)}
		</div>
	);
};
