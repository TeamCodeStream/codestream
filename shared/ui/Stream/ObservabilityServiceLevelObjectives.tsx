import { ServiceLevelObjectiveResult } from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { CodeStreamState } from "@codestream/webview/store";
import Tooltip from "@codestream/webview/Stream/Tooltip";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import cx from "classnames";
import React, { useState } from "react";
import { shallowEqual } from "react-redux";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";

interface Props {
	serviceLevelObjectives: ServiceLevelObjectiveResult[];
}

export const ObservabilityServiceLevelObjectives = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { serviceLevelObjectives } = props;

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			ideName: encodeURIComponent(state.ide.name || ""),
		};
	}, shallowEqual);

	const unmetObjectives = serviceLevelObjectives.filter(v => {
		return v.result === "UNDER";
	});
	const showWarningIcon = unmetObjectives?.length > 0;
	const warningTooltip =
		showWarningIcon && unmetObjectives?.length === 1
			? "1 non-compliant SLO"
			: `${unmetObjectives?.length} non-compliant SLOs`;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Service Level Objectives</span>
				{showWarningIcon && (
					<Icon
						name="alert"
						style={{ marginLeft: "2px", color: "red" }}
						className="alert"
						title={warningTooltip}
						delay={1}
					/>
				)}
			</Row>
			{expanded && (
				<>
					{serviceLevelObjectives.map((slo, index) => {
						return (
							<Row
								style={{
									padding: "0 10px 0 42px",
								}}
								className={"pr-row"}
							>
								<div>
									<span style={{ marginRight: "5px" }}>{slo.name}</span>
								</div>

								<div className="icons" style={{ textAlign: "left" }}>
									{slo.summaryPageUrl && (
										<Icon
											onClick={e => {
												e.preventDefault();
												e.stopPropagation();
												HostApi.instance.send(OpenUrlRequestType, {
													url: `${slo.summaryPageUrl}`,
												});
											}}
											name="globe"
											className={cx("clickable", {
												"icon-override-actions-visible": true,
											})}
											style={{ marginLeft: 0 }}
											title="View on New Relic"
											placement="bottomLeft"
											delay={1}
										/>
									)}
								</div>

								<div>
									<Tooltip placement="topRight" delay={1}>
										{slo.result === "UNDER" && (
											<span style={{ color: "red" }}>
												{slo.actual}% last {slo.timeWindow}
											</span>
										)}
										{slo.result === "OVER" && (
											<span style={{ color: "green" }}>
												{slo.actual}% last {slo.timeWindow}
											</span>
										)}
									</Tooltip>
								</div>
							</Row>
						);
					})}
				</>
			)}
		</>
	);
});
