import { forEach as _forEach } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { CodeStreamState } from "../store";
import { useDidMount } from "../utilities/hooks";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "../webview-api";

interface Props {}

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
					<Row
						style={{
							padding: "0 0 0 42px"
						}}
						className={"pr-row"}
					>
						<div>
							<Icon name="info" /> <span>Throughput</span>
						</div>

						<div className="icons">
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
							{/* 				
							{props.timestamp && <Timestamp time={props.timestamp} relative abbreviated />}
							 */}
							33m
						</div>
					</Row>
				</>
			)}
		</>
	);
});
