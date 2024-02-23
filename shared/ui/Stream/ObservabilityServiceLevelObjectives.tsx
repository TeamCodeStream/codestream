import { ServiceLevelObjectiveResult } from "@codestream/protocols/agent";
import React, { useState } from "react";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import Tooltip from "@codestream/webview/Stream/Tooltip";
import { HostApi } from "@codestream/webview/webview-api";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { setUserPreference } from "./actions";

interface Props {
	serviceLevelObjectives: ServiceLevelObjectiveResult[];
	errorMsg?: string;
}

export const ObjectiveRow = (props: {
	objectiveName: string;
	objectiveResult: string;
	objectiveActual: string;
	objectiveTimeWindow: string;
	url?: string;
}) => {
	const sloColor = props.objectiveResult === "UNDER" ? "rgb(188,20,24)" : "#6a6";

	return (
		<Row className={"pr-row no-shrink"} style={{ padding: "0 10px 0 40px" }}>
			<div>
				<Tooltip delay={1} placement="bottom" title={props.objectiveName}>
					<span>{props.objectiveName}</span>
				</Tooltip>
			</div>

			<div className={"icons"}>
				<span
					onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						HostApi.instance.send(OpenUrlRequestType, {
							url: `${props.url}`,
						});
					}}
				>
					<Icon
						name="globe"
						className="clickable"
						title="View on New Relic"
						placement="bottomLeft"
						delay={1}
					/>
				</span>
				<span className="slo-time" style={{ color: `${sloColor}`, paddingLeft: "5px" }}>
					{props.objectiveActual}% / {props.objectiveTimeWindow}
				</span>
			</div>
		</Row>
	);
};

export const ObservabilityServiceLevelObjectives = React.memo((props: Props) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const serviceLevelObjectivesIsExpanded = preferences?.serviceLevelObjectivesIsExpanded ?? false;

		return {
			serviceLevelObjectivesIsExpanded,
		};
	});

	const [expanded, setExpanded] = useState<boolean>(false);
	const { errorMsg, serviceLevelObjectives } = props;

	const unmetObjectives = serviceLevelObjectives.filter(v => {
		return v.result === "UNDER";
	});
	const showWarningIcon = unmetObjectives?.length > 0;
	const warningTooltip =
		showWarningIcon && unmetObjectives?.length === 1
			? "1 non-compliant SLO"
			: `${unmetObjectives?.length} non-compliant SLOs`;

	const handleRowOnClick = () => {
		const { serviceLevelObjectivesIsExpanded } = derivedState;

		dispatch(
			setUserPreference({
				prefPath: ["serviceLevelObjectivesIsExpanded"],
				value: !serviceLevelObjectivesIsExpanded,
			})
		);
	};

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => handleRowOnClick()}
			>
				{derivedState.serviceLevelObjectivesIsExpanded && <Icon name="chevron-down-thin" />}
				{!derivedState.serviceLevelObjectivesIsExpanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px", marginRight: "5px" }}>Service Level Objectives</span>
				{showWarningIcon && (
					<Icon
						name="alert"
						style={{ color: "rgb(188,20,24)" }}
						className="alert"
						title={warningTooltip}
						delay={1}
					/>
				)}
				{errorMsg && <Icon name="alert" className="alert" title={errorMsg} delay={1} />}
			</Row>
			{derivedState.serviceLevelObjectivesIsExpanded && (
				<>
					{serviceLevelObjectives.map((slo, index) => {
						return (
							<ObjectiveRow
								objectiveResult={slo.result}
								objectiveName={slo.name}
								objectiveActual={slo.actual}
								objectiveTimeWindow={slo.timeWindow}
								url={slo.summaryPageUrl}
							/>
						);
					})}
				</>
			)}
		</>
	);
});
