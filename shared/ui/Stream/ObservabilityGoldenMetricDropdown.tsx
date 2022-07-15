import { forEach as _forEach, isNil as _isNil } from "lodash-es";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Tooltip from "./Tooltip";

interface Props {
	goldenMetrics: any;
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

export const ObservabilityGoldenMetricDropdown = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const [updatedAt, setUpdatedAt] = useState<string>("");
	const { goldenMetrics } = props;
	const goldenMetricTitleMapping = {
		responseTimeMs: {
			title: "Response Time Ms",
			units: "ms",
			tooltip: "This shows the average time this service spends processing web requests."
		},
		throughput: {
			title: "Throughput",
			units: "rpm",
			tooltip:
				"Throughput measures how many requests this service processes per minute. It will help you find your busiest service"
		},
		errorRate: {
			title: "Error Rate",
			units: "avg",
			tooltip:
				"Error rate is the percentage of transactions that result in an error during a particular time range."
		}
	};

	useEffect(() => {
		if (goldenMetrics) {
			goldenMetrics.every(gm => {
				if (gm?.timeWindow) {
					setUpdatedAt("Updated at " + new Date(gm.timeWindow).toLocaleString());
					return false;
				}
				return true;
			});
		}
	}, [goldenMetrics]);

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ margin: "0 5px 0 2px" }}>Golden Metrics</span>{" "}
				{updatedAt && <Icon name="clock" className="clickable" title={updatedAt} delay={1} />}
			</Row>
			{expanded && (
				<>
					{goldenMetrics.map(gm => {
						const goldenMetricUnit = goldenMetricTitleMapping[gm?.name]?.units;
						const goldenMetricTooltip = goldenMetricTitleMapping[gm?.name]?.tooltip;
						let goldenMetricValueTrue = gm?.result[0][goldenMetricTitleMapping[gm?.name]?.title];
						let goldenMetricValue = gm?.result[0][goldenMetricTitleMapping[gm?.name]?.title];

						// Set value to non null result if golden metric does not appear in mapping array
						if (!goldenMetricValueTrue && !goldenMetricValue && gm?.result[0]) {
							let resultObject = gm?.result[0];
							for (const property in resultObject) {
								if (!_isNil(resultObject[property])) {
									goldenMetricValue = resultObject[property];
									goldenMetricValueTrue = resultObject[property];
								}
							}
						}
						let noCommas = false;
						// If decimal, round to 2 places more space in UX
						if (goldenMetricValue && goldenMetricValue % 1 !== 0) {
							let logValue = -Math.floor(Math.log10(goldenMetricValue)) + 1;
							let roundToValue = logValue > 2 ? logValue : 2;
							goldenMetricValue = goldenMetricValue.toFixed(roundToValue);
							noCommas = true;
						}
						// add commas to numbers
						if (goldenMetricValue && !noCommas) {
							goldenMetricValue = goldenMetricValue
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						}

						return (
							<Row
								style={{
									padding: "0 10px 0 42px"
								}}
								className={"pr-row"}
							>
								<div>
									<span style={{ marginRight: "5px" }}>{gm.title}</span>
									{goldenMetricTooltip && (
										<Icon
											name="info"
											className="clickable"
											title={goldenMetricTooltip}
											placement="bottomRight"
											delay={1}
										/>
									)}
								</div>

								<div className="icons">
									<Tooltip placement="topRight" title={goldenMetricValueTrue} delay={1}>
										<StyledMetric>
											{goldenMetricValue && goldenMetricUnit ? (
												<>
													{goldenMetricValue} {goldenMetricUnit}
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
			)}
		</>
	);
});
