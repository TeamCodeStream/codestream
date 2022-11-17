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

interface UnitMappings {
	[name: string]: string;
}

export const ObservabilityGoldenMetricDropdown = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const { entityGoldenMetrics, loadingGoldenMetrics, noDropdown, recentAlertViolations } = props;

	const unitMappings: UnitMappings = {
		APDEX: "apdex",
		BITS: "bits",
		BITS_PER_SECOND: "bits/s",
		BYTES: "bytes",
		BYTES_PER_SECOND: "bytes/s",
		CELSIUS: "C",
		COUNT: "",
		HERTZ: "Hz",
		MESSAGES_PER_SECOND: "messages/s",
		MS: "ms",
		OPERATIONS_PER_SECOND: "operations/s",
		PAGES_PER_SECOND: "pages/s",
		PERCENTAGE: "%",
		REQUESTS_PER_MINUTE: "req/m",
		REQUESTS_PER_SECOND: "req/s",
		SECONDS: "s",
		TIMESTAMP: "time",
	};

	const goldenMetricOutput = () => {
		return (
			<>
				{entityGoldenMetrics?.metrics.map(gm => {
					const goldenMetricDisplayUnit = unitMappings[gm?.unit];

					return (
						<Row
							style={{
								padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 42px",
							}}
							className={"pr-row"}
						>
							<div style={{ flexShrink: "unset" }}>
								<Tooltip placement="topRight" title={gm.title} delay={1}>
									<span style={{ marginRight: "5px" }}>{gm.title}</span>
								</Tooltip>
							</div>

							<div className="icons" style={{ overflow: "initial" }}>
								<span className={"details"}>
									{gm.value || gm.value === 0 ? (
										<>
											{gm.displayValue} {goldenMetricDisplayUnit && <>{goldenMetricDisplayUnit}</>}
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
						<span className="subtle-tight">(last 30 minutes)</span>
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
