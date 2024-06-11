import { NewRelicErrorGroup, ResolveStackTraceResponse } from "@codestream/protocols/agent";
import { CSCodeError, CSUser } from "@codestream/protocols/api";
import styled from "styled-components";

export interface CodeErrorProps {
	codeError: CSCodeError;
	errorGroup: NewRelicErrorGroup;

	parsedStackTrace?: ResolveStackTraceResponse;

	stackFrameClickDisabled?: boolean;
	stackTraceTip?: any;
	isCollapsed?: boolean;
	readOnly?: boolean;
}

export interface CodeErrorHeaderProps {
	codeError: CSCodeError;
	errorGroup: NewRelicErrorGroup;

	isCollapsed?: boolean;
	assignees?: CSUser[];
	resolutionTip?: any;
}

export interface CodeErrorMenuProps {
	codeError: CSCodeError;
	errorGroup: NewRelicErrorGroup;
	isCollapsed?: boolean;
}

export const ComposeWrapper = styled.div.attrs(() => ({
	className: "compose codemark-compose",
}))`
	&&& {
		padding: 0 !important;
	}
	.message-input#input-div {
		max-width: none !important;
	}
`;

export const ExpandedAuthor = styled.div`
	width: 100%;
	color: var(--text-color-subtle);
	white-space: normal;
`;

export const Description = styled.div`
	margin-bottom: 15px;
`;

export const ClickLines = styled.div`
	padding: 1px !important;
	&:focus {
		border: none;
		outline: none;
	}
	,
	&.pulse {
		opacity: 1;
		background: var(--app-background-color-hover);
	}
`;

export const DisabledClickLine = styled.div`
	color: var(--text-color);
	opacity: 0.4;
	text-align: right;
	direction: rtl;
	text-overflow: ellipsis;
	overflow: hidden;
	padding: 2px 0px 2px 0px;
`;

export const ClickLine = styled.div`
	position: relative;
	cursor: pointer;
	padding: 2px 0px 2px 0px;
	text-align: right;
	direction: rtl;
	text-overflow: ellipsis;
	overflow: hidden;
	:hover {
		color: var(--text-color-highlight);
		background: var(--app-background-color-hover);
		opacity: 1;
	}
`;

export const DataRow = styled.div`
	display: flex;
	align-items: center;
`;
export const DataLabel = styled.div`
	margin-right: 5px;
`;
export const DataValue = styled.div`
	color: var(--text-color-subtle);
`;

export const ApmServiceTitle = styled.span`
	a {
		color: var(--text-color-highlight);
		text-decoration: none;
	}
	.open-external {
		margin-left: 5px;
		font-size: 12px;
		visibility: hidden;
		color: var(--text-color-highlight);
	}
	&:hover .open-external {
		visibility: visible;
	}
	padding-left: 5px;
`;

export const Message = styled.div`
	width: 100%;
	margin-bottom: 10px;
	display: flex;
	align-items: flex-start;
	font-size: 12px;
`;

export const ALERT_SEVERITY_COLORS = {
	"": "#9FA5A5",
	CRITICAL: "#F5554B",
	NOT_ALERTING: "#01B076",
	NOT_CONFIGURED: "#9FA5A5",
	WARNING: "#F0B400",
};

export const ALERT_SEVERITY_SORTING_ORDER: string[] = [
	"",
	"CRITICAL",
	"NOT_ALERTING",
	"NOT_CONFIGURED",
	"WARNING",
];

/**
 * States are from NR
 */
export const STATES_TO_ACTION_STRINGS = {
	RESOLVED: "Resolve",
	IGNORED: "Ignore",
	UNRESOLVED: "Unresolve",
};

/**
 * States are from NR
 */
export const STATES_TO_DISPLAY_STRINGS = {
	RESOLVED: "Resolved",
	IGNORED: "Ignored",
	UNRESOLVED: "Unresolved",
};

export type CopyMethodState = "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "FAILED";
