import { EntityGoldenMetrics, GetAlertViolationsResponse } from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";

import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityAlertViolations } from "./ObservabilityAlertViolations";
import Tooltip from "./Tooltip";

interface Props {
	entityGoldenMetrics: EntityGoldenMetrics | undefined;
	loadingGoldenMetrics: boolean;
	noDropdown?: boolean;
	recentAlertViolations?: GetAlertViolationsResponse;
}

export const ObservabilityGoldenMetricDropdown = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const { entityGoldenMetrics, loadingGoldenMetrics, noDropdown, recentAlertViolations } = props;

	const goldenMetricOutput = () => {
		return (
			<>
				{entityGoldenMetrics?.metrics.map(gm => {
					return (
						<Row
							style={{
								padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 42px",
							}}
							className={"pr-row no-shrink"}
						>
							<div>
								<Tooltip placement="topRight" title={gm.title} delay={1}>
									<span style={{ marginRight: "5px" }}>{gm.title}</span>
								</Tooltip>
							</div>

							<div className="icons">
								<span className={"details"}>
									{gm.value || gm.value === 0 ? (
										<>
											{gm.displayValue} {gm.displayUnit && <>{gm.displayUnit}</>}
										</>
									) : (
										<>No Data</>
									)}
								</span>
							</div>
						</Row>
					);
				})}
			</>
		);
	};

	return (
		<>
			{!noDropdown && (
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
						<span style={{ margin: "0 5px 0 2px" }}>Golden Metrics</span>
						{entityGoldenMetrics?.lastUpdated && (
							<Icon
								style={{ transform: "scale(0.8)" }}
								name="clock"
								className="clickable"
								title={"Updated at " + entityGoldenMetrics.lastUpdated}
								delay={1}
							/>
						)}
					</Row>
				</>
			)}

			{expanded && loadingGoldenMetrics && (
				<Row
					style={{
						padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 42px",
					}}
					className={"pr-row"}
				>
					<Icon
						style={{
							marginRight: "5px",
						}}
						className="spin"
						name="sync"
					/>{" "}
					Loading...
				</Row>
			)}
			{(noDropdown || expanded) &&
				!loadingGoldenMetrics &&
				!_isEmpty(entityGoldenMetrics?.metrics) && (
					<>
						{goldenMetricOutput()}
						<ObservabilityAlertViolations
							alertViolations={recentAlertViolations?.recentAlertViolations}
							customPadding={"2px 10px 2px 42px"}
						/>
					</>
				)}
		</>
	);
});
