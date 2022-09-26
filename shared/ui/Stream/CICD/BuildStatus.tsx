import { ThirdPartyBuild, ThirdPartyBuildStatus } from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "@codestream/webview/webview-api";
import React from "react";
import Icon from "../Icon";

export const BuildStatus = (props: ThirdPartyBuild) => {
	let icon: "ok" | "sync" | "x-circle" | "alert" | string;
	let colorClass: string | undefined = undefined;
	let iconClass = "";
	switch (props.status) {
		case ThirdPartyBuildStatus.Success:
			icon = "ok";
			colorClass = "green-color";
			break;
		case ThirdPartyBuildStatus.Running:
		case ThirdPartyBuildStatus.Waiting:
			icon = "sync";
			colorClass = "blue-color";
			iconClass = "spin";
			break;
		case ThirdPartyBuildStatus.Failed:
			icon = "x-circle";
			colorClass = "red-color";
			break;
		case ThirdPartyBuildStatus.Unknown:
		default:
			icon = "alert";
			colorClass = "gray-color";
	}

	return (
		<div
			style={{ display: "flex" }}
			className={props.url ? "clickable" : ""}
			onClick={e => {
				e.preventDefault();
				if (props.url) HostApi.instance.send(OpenUrlRequestType, { url: props.url });
			}}
		>
			<span style={{ color: colorClass, flexGrow: 0, flexShrink: 0 }}>
				<Icon name={icon} className={[colorClass, iconClass].join(" ")} />
			</span>
			<span style={{ flexGrow: 10 }}>
				<span className={colorClass}>{props.message}</span>
				<span className="gray-color" style={{ paddingLeft: "1em" }}>
					{props.duration}
				</span>
			</span>
			{props.finishedRelative && (
				<span className="gray-color" style={{ flexGrow: 0, flexShrink: 0 }}>
					{props.finishedRelative}
				</span>
			)}
		</div>
	);
};
