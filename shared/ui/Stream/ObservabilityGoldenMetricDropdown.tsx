import { forEach as _forEach } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { CodeStreamState } from "../store";
import { useDidMount } from "../utilities/hooks";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Timestamp from "./Timestamp";
import { HostApi } from "../webview-api";

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
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);

	// useDidMount(() => {});
	// useEffect(() => {}, []);

	const { goldenMetrics } = props;

	const goldenMetricTitleMapping = {
		responseTimeMs: { title: "Response Time Ms", units: "ms" },
		throughput: { title: "Throughput", units: "rpm" },
		errorRate: { title: "Error Rate", units: "avg" }
	};

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
				<span style={{ marginLeft: "2px" }}>Golden Metrics</span>
			</Row>
			{expanded && (
				<>
					{goldenMetrics.map(gm => {
						const goldenMetricUnit = goldenMetricTitleMapping[gm?.name]?.units;
						let goldenMetricValue = gm?.result[0][goldenMetricTitleMapping[gm?.name]?.title];

						// If decimal, round to 2 places more space in UX
						if (goldenMetricValue % 1 !== 0) {
							goldenMetricValue = goldenMetricValue.toFixed(2);
						}

						// add commas to numbers
						goldenMetricValue = goldenMetricValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

						return (
							<Row
								style={{
									padding: "0 10px 0 42px"
								}}
								className={"pr-row"}
							>
								<div>
									<Icon name="info" /> <span>{gm.title}</span>
								</div>

								<div className="icons">
									{/* @TODO: currently no need, but might be added later
									<span
										onClick={e => {
											e.preventDefault();
											e.stopPropagation();
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
									*/}
									<StyledMetric>
										{goldenMetricValue} {goldenMetricUnit}
									</StyledMetric>
								</div>
							</Row>
						);
					})}
				</>
			)}
		</>
	);
});
