import { ThirdPartyBuild, ThirdPartyBuildStatus } from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useState } from "react";
import styled from "styled-components";
import Icon from "../Icon";

type Props = ThirdPartyBuild & {
	providerName: string;
};

const BuildStatusWrapper = styled.div`
	display: flex;
	&.no-hover {
		cursor: auto;
	}
	&:not(.no-hover) {
		cursor: pointer;
	}
	> div {
		flex-grow: 1;
		overflow: hidden;
	}
`;
const BuildStatusRow = styled.div`
	display: flex;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
	padding: 0;
	gap: 2px;
	> div {
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 0;
		&:nth-child(2) {
			flex-grow: 10;
			flex-shrink: 1;
		}
	}
	.icons {
		display: none;
	}
	.finished {
		display: inline-block;
	}
	&:hover .icons {
		display: flex;
		gap: 4px;
	}
	&:hover .finished {
		display: none;
	}
`;
const BuildStatusDropdown = styled.div`
	display: block;
	padding-left: 10px;
	&.collapsed {
		display: none;
	}
`;

export const BuildStatus = (props: Props) => {
	const [collapsed, setCollapsed] = useState(true);
	const toggleCollapsed = () => {
		setCollapsed(x => !x);
	};
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

	// TODO: add telemetry events for icon clicks
	return (
		<BuildStatusWrapper
			className={props.builds.length > 0 ? "" : "no-hover"}
			onClick={e => {
				e.preventDefault();
				e.stopPropagation();
				toggleCollapsed();
			}}
		>
			{props.builds.length > 0 && (
				<Icon name={collapsed ? "chevron-right-thin" : "chevron-down-thin"} />
			)}
			<div>
				<BuildStatusRow>
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
									if (props.logsUrl)
										HostApi.instance.send(OpenUrlRequestType, { url: props.logsUrl });
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
				<BuildStatusDropdown className={collapsed ? "collapsed" : ""}>
					{props.builds.map(build => (
						<BuildStatus key={build.id} providerName={props.providerName} {...build} />
					))}
				</BuildStatusDropdown>
			</div>
		</BuildStatusWrapper>
	);
};
