import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
import { getNrAiUserId } from "@codestream/webview/store/users/reducer";
import React, { useMemo } from "react";
import {
	setApiNrAiUserId,
	setApiUserId,
} from "@codestream/webview/store/codeErrors/api/apiResolver";
import { Row } from "@codestream/webview/Stream/CrossPostIssueControls/IssuesPane";
import Icon from "@codestream/webview/Stream/Icon";
import Tooltip from "@codestream/webview/Stream/Tooltip";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import Timestamp from "@codestream/webview/Stream/Timestamp";
import styled from "styled-components";

const SubtleRight = styled.time`
	color: var(--text-color-subtle);
	font-weight: normal;
	padding-left: 5px;

	&.no-padding {
		padding-left: 0;
	}
`;

export const ErrorRow = (props: {
	title: string;
	subtle?: string;
	tooltip?: string;
	timestamp?: number;
	alternateSubtleRight?: string;
	isLoading?: boolean;
	url?: string;
	onClick?: Function;
	customPadding?: any;
	icon?: "alert" | "thumbsup";
	dataTestId?: string;
}) => {
	const ideName = useAppSelector((state: CodeStreamState) =>
		encodeURIComponent(state.ide.name || "")
	);
	const nrAiUserId = useAppSelector(getNrAiUserId);
	const userId = useAppSelector((state: CodeStreamState) => state.session.userId);
	const demoMode = useAppSelector((state: CodeStreamState) => state.codeErrors.demoMode);

	return (
		<ErrorRowStandalone
			{...props}
			ideName={ideName}
			nrAiUserId={nrAiUserId}
			userId={userId}
			demoMode={demoMode.enabled}
		></ErrorRowStandalone>
	);
};

export const ErrorRowStandalone = (props: {
	title: string;
	subtle?: string;
	tooltip?: string;
	timestamp?: number;
	alternateSubtleRight?: string;
	isLoading?: boolean;
	url?: string;
	onClick?: Function;
	customPadding?: any;
	icon?: "alert" | "thumbsup";
	dataTestId?: string;
	ideName: string;
	nrAiUserId?: string;
	userId?: string;
	demoMode?: boolean;
}) => {
	useMemo(() => {
		if (props.nrAiUserId && props.demoMode) {
			setApiNrAiUserId(props.nrAiUserId);
		}
	}, [props.nrAiUserId, props.demoMode]);

	useMemo(() => {
		if (props.userId && props.demoMode) {
			setApiUserId(props.userId);
		}
	}, [props.userId, props.demoMode]);

	return (
		<Row
			className="pr-row error-row"
			onClick={e => {
				props.onClick && props.onClick();
			}}
			style={{ padding: props.customPadding ? props.customPadding : "0 10px 0 40px" }}
			data-testid={props.dataTestId}
		>
			<div>
				{props.isLoading ? (
					<Icon className="spin" name="sync" />
				) : props.icon === "thumbsup" ? (
					"👍"
				) : (
					<Icon name="alert" />
				)}
			</div>
			<div>
				<Tooltip title={props.tooltip} delay={1} placement="bottom">
					<div>
						<span>{props.title}</span>
						{props.subtle && <span className="subtle-tight"> {props.subtle}</span>}
					</div>
				</Tooltip>
			</div>
			<div className="icons">
				{props.url && (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.track("codestream/newrelic_link clicked", {
								meta_data: "destination: error_group",
								meta_data_2: `codestream_section: error`,
								event_type: "click",
							});
							HostApi.instance.send(OpenUrlRequestType, {
								url: `${props.url}&utm_source=codestream&utm_medium=ide-${props.ideName}&utm_campaign=error_group_link`,
							});
						}}
					>
						<Icon name="globe" title="View on New Relic" placement="bottomLeft" delay={1} />
					</span>
				)}

				{props.timestamp && <Timestamp time={props.timestamp} relative abbreviated />}
				{!props.timestamp && props.alternateSubtleRight && (
					<SubtleRight>{props.alternateSubtleRight}</SubtleRight>
				)}
			</div>
		</Row>
	);
};
