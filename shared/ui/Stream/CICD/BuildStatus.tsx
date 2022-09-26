import { ThirdPartyBuild, ThirdPartyBuildStatus } from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "@codestream/webview/webview-api";
import React from "react";
import styled from "styled-components";
import Icon from "../Icon";

type Props = ThirdPartyBuild & {
	providerName: string;
};

const BuildStatusRow = styled.div`
	display: flex;
	&:not(.no-hover) {
		cursor: pointer;
	}
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
	padding: 0;
	> div {
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 0;
		&:nth-child(2) {
			flex-grow: 10;
		}
	}
	.icons {
		display: none;
	}
	.finished {
		display: inline-block;
	}
	&:hover .icons {
		display: inline-block;
	}
	&:hover .finished {
		display: none;
	}
`;

export const BuildStatus = (props: Props) => {
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
		<BuildStatusRow
			style={{ display: "flex", padding: "0" }}
			onClick={e => {
				e.preventDefault();
				e.stopPropagation();
				if (props.url) HostApi.instance.send(OpenUrlRequestType, { url: props.url });
			}}
		>
			<div style={{ color: colorClass, flexGrow: 0, flexShrink: 0 }}>
				<Icon name={icon} className={[colorClass, iconClass].join(" ")} />
			</div>
			<div style={{ flexGrow: 10 }}>
				<span className={colorClass}>{props.message}</span>
				<span className="gray-color" style={{ paddingLeft: "1em" }}>
					{props.duration}
				</span>
			</div>
			{props.finishedRelative && (
				<div className="gray-color finished" style={{ flexGrow: 0, flexShrink: 0 }}>
					{props.finishedRelative}
				</div>
			)}
			<div className="icons" style={{ position: "relative" }}>
				{props.url && (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							if (props.url) HostApi.instance.send(OpenUrlRequestType, { url: props.url });
						}}
					>
						<Icon
							name="link-external"
							className="clickable"
							title={`View build on ${props.providerName}`}
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				)}
				{props.logsUrl && (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							if (props.logsUrl) HostApi.instance.send(OpenUrlRequestType, { url: props.logsUrl });
						}}
					>
						<Icon
							name="file-lines"
							className="clickable"
							title={`View logs on ${props.providerName}`}
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				)}
				{props.artifactsUrl && (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							if (props.artifactsUrl)
								HostApi.instance.send(OpenUrlRequestType, { url: props.artifactsUrl });
						}}
					>
						<Icon
							name="archive"
							className="clickable"
							title={`View artifacts on ${props.providerName}`}
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				)}
			</div>
		</BuildStatusRow>
	);
};
