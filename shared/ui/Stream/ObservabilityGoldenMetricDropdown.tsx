import {
	EntityGoldenMetrics,
	GetAlertViolationsResponse,
} from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import styled from "styled-components";

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

const StyledMetric = styled.div`
	color: var(--text-color-subtle);
	font-weight: normal;
	padding-left: 5px;
	&.no-padding {
		padding-left: 0;
	}
	// details isn't used in relative timestamps
	.details {
		padding-left: 5px;
		transition: opacity 0.4s;
	}
`;

interface TooltipMappings {
	[name: string]: string;
}

interface UnitMappings {
	[name: string]: string;
}

export const ObservabilityGoldenMetricDropdown = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const [updatedAt, setUpdatedAt] = useState<string>("");
	const { entityGoldenMetrics, loadingGoldenMetrics, noDropdown, recentAlertViolations } = props;

	const unitMappings: UnitMappings = {
		APDEX: "apdex",
		BITS: "bits",
		BITS_PER_SECOND: "bits ps",
		BYTES: "bytes",
		BYTES_PER_SECOND: "bytes ps",
		CELSIUS: "c",
		COUNT: "",
		HERTZ: "hz",
		MESSAGES_PER_SECOND: "mps",
		MS: "ms",
		OPERATIONS_PER_SECOND: "ops",
		PAGES_PER_SECOND: "ppm",
		PERCENTAGE: "%",
		REQUESTS_PER_MINUTE: "rpm",
		REQUESTS_PER_SECOND: "rps",
		SECONDS: "s",
		TIMESTAMP: "time",
	};

	const tooltipMappings: TooltipMappings = {
		responseTimeMs: "This shows the average time this service spends processing web requests.",
		throughput:
			"Throughput measures how many requests this service processes per minute. It will help you find your busiest service.",
		errorRate:
			"Error rate is the percentage of transactions that result in an error during a particular time range.",
	};

	const goldenMetricOutput = () => {
		return (
			<>
				{entityGoldenMetrics?.metrics.map(gm => {
					const goldenMetricDisplayUnit = unitMappings[gm?.unit];
					const goldenMetricTooltip = tooltipMappings[gm?.name];

					return (
						<Row
							style={{
								padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 42px",
							}}
							className={"pr-row"}
						>
							<div>
								<span style={{ marginRight: "5px" }}>{gm.title}</span>
								{goldenMetricTooltip && (
									<Icon
										style={{ transform: "scale(0.9)" }}
										name="info"
										className="clickable"
										title={goldenMetricTooltip}
										placement="bottomRight"
										delay={1}
									/>
								)}
							</div>

							<div className="icons">
								<Tooltip placement="topRight" title={gm.displayValue} delay={1}>
									<StyledMetric>
										{gm.value || gm.value === 0 ? (
											<>
												{gm.displayValue}{" "}
												{goldenMetricDisplayUnit && <>{goldenMetricDisplayUnit}</>}
											</>
										) : (
											<>No Data</>
										)}
									</StyledMetric>
								</Tooltip>
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
						<span style={{ margin: "0 5px 0 2px" }}>Golden Metrics</span>{" "}
						<span className="subtle-tight"> (last 30 minutes)</span>
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
