import { GetObservabilityAnomaliesResponse } from "@codestream/protocols/agent";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { Link } from "./Link";
import { ObservabilityAnomaliesGroup } from "./ObservabilityAnomaliesGroup";
import { ErrorRow } from "@codestream/webview/Stream/Observability";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { openModal } from "../store/context/actions";
import { WebviewModals } from "@codestream/protocols/webview";
import { shallowEqual } from "react-redux";
import { CodeStreamState } from "../store";

interface Props {
	observabilityAnomalies: GetObservabilityAnomaliesResponse;
	observabilityRepo: any;
	// observabilityAssignments: any;
	entityGuid: string;
	noAccess?: string;
	calculatingAnomalies?: boolean;
}

export const ObservabilityAnomaliesWrapper = React.memo((props: Props) => {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		return {
			clmSettings,
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);

	const dispatch = useAppDispatch();

	const getRoundedPercentage = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		return Math.floor(percentage * factor) / factor;
	};

	const filteredErrorRateAnomalies = props.observabilityAnomalies?.errorRate?.filter(_ => {
		const roundedPercentage = getRoundedPercentage(_.ratio);
		return roundedPercentage > derivedState.clmSettings.minimumChangeValue;
	});

	const filteredResponseTimeAnomalies = props.observabilityAnomalies?.responseTime?.filter(_ => {
		const roundedPercentage = getRoundedPercentage(_.ratio);
		return roundedPercentage > derivedState.clmSettings.minimumChangeValue;
	});

	const totalAnomalyArray = filteredErrorRateAnomalies.concat(filteredResponseTimeAnomalies);

	const showWarningIcon = totalAnomalyArray?.length > 0;
	const warningTooltip =
		showWarningIcon && totalAnomalyArray?.length === 1
			? "1 Anomaly"
			: `${totalAnomalyArray?.length} Anomalies`;

	return (
		<>
			<Row
				style={{
					padding: "0px 10px 0px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				<span style={{ paddingTop: "3px" }}>
					{expanded && <Icon name="chevron-down-thin" />}
					{!expanded && <Icon name="chevron-right-thin" />}
				</span>
				<div className="label">
					<span style={{ margin: "0px 5px 0px 2px" }}>Code-Level Metrics</span>
					{showWarningIcon && (
						<Icon
							name="alert"
							style={{ color: "rgb(188,20,24)" }}
							className="alert"
							title={warningTooltip}
							delay={1}
						/>
					)}
				</div>

				<div className="icons">
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							dispatch(openModal(WebviewModals.CLMSettings));
						}}
					>
						<Icon
							name="gear"
							className="clickable"
							title="Code-Level Metric Settings"
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				</div>
			</Row>
			{expanded && props.observabilityAnomalies.error && !props.calculatingAnomalies && (
				<>
					<ErrorRow
						customPadding={"0 10px 0 50px"}
						title={props.observabilityAnomalies.error}
					></ErrorRow>
				</>
			)}

			{expanded &&
				(props.noAccess ? (
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
						onClick={() => setExpanded(!expanded)}
					>
						<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>
							{props.noAccess === "403" ? (
								<>
									Your New Relic account doesn’t have access to the anomalies integration with
									CodeStream. Contact your New Relic admin to upgrade your account or{" "}
									<Link
										useStopPropagation={true}
										href="https://docs.newrelic.com/docs/accounts/original-accounts-billing/original-users-roles/user-migration"
									>
										migrate to New Relic’s new user model
									</Link>{" "}
									in order to see errors in CodeStream.
								</>
							) : (
								props.noAccess
							)}
						</span>
					</Row>
				) : (
					<>
						{props.calculatingAnomalies && (
							<div style={{ margin: "0px 0px 4px 47px" }}>
								<Icon className={"spin"} name="refresh" /> Calculating...
							</div>
						)}

						{!props.calculatingAnomalies && (
							<>
								<ObservabilityAnomaliesGroup
									observabilityAnomalies={filteredErrorRateAnomalies}
									observabilityRepo={props.observabilityRepo}
									entityGuid={props.entityGuid}
									title="Error Rate"
									detectionMethod={props.observabilityAnomalies.detectionMethod}
								/>
								<ObservabilityAnomaliesGroup
									observabilityAnomalies={filteredResponseTimeAnomalies}
									observabilityRepo={props.observabilityRepo}
									entityGuid={props.entityGuid}
									title="Average Duration"
									detectionMethod={props.observabilityAnomalies.detectionMethod}
								/>
							</>
						)}
					</>
				))}
		</>
	);
});
