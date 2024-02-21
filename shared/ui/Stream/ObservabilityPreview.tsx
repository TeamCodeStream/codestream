import React from "react";
import Icon from "./Icon";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
import styled from "styled-components";

interface Props {}

const Container = styled.div`
	opacity: 0.2;
	cursor: default;
	margin-top: 10px;
`;

const StyledSpan = styled.span`
	margin-left: 2px;
	margin-right: 5px;
`;

export const ObservabilityPreview = React.memo((props: Props) => {
	return (
		<>
			<Container>
				<div
					style={{
						padding: "2px 10px 2px 20px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<StyledSpan>
						<HealthIcon color={"#9FA5A5"} />
						Sample Service
					</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<StyledSpan>Golden Metrics</StyledSpan>
				</div>

				<div
					style={{
						padding: "2px 20px 2px 40px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<StyledSpan>Throughput</StyledSpan>
					</div>
					<div className="icons">
						<span className={"details"}>9.35 rpm</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 40px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<StyledSpan>Response Time</StyledSpan>
					</div>
					<div className="icons">
						<span className={"details"}>3,413.34 ms</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 40px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<StyledSpan>Error Rate</StyledSpan>
					</div>
					<div className="icons">
						<span className={"details"}>0.62 avg</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Service Level Objectives</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-down-thin" />

					<StyledSpan>Transaction Performance</StyledSpan>

					<Icon name="alert" style={{ color: "rgb(188,20,24)" }} className="alert" delay={1} />
				</div>
				<div
					style={{
						padding: "2px 20px 2px 50px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<Icon className="anomaly" name="anomaly"></Icon>
						<StyledSpan>WebTransaction/ ...chase/confirmation.jsp</StyledSpan>
					</div>
					<div className="icons">
						<span style={{ color: "red" }} className={"details"}>
							+35.06%
						</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 50px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<Icon className="anomaly" name="anomaly"></Icon>
						<StyledSpan>WebTransaction/JSP/browse/phone.jsp</StyledSpan>
					</div>
					<div className="icons">
						<span style={{ color: "red" }} className={"details"}>
							+22.59%
						</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 60px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<Icon className="anomaly" name="anomaly"></Icon>
						<StyledSpan>Java/ ...rowsePhoneAction/browsePhone</StyledSpan>
					</div>
					<div style={{ color: "red" }} className="icons">
						<span className={"details"}>+34.41%</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Errors</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Vulnerabilities</StyledSpan>
					<Icon name="alert" style={{ color: "rgb(188,20,24)" }} className="alert" delay={1} />
					<> critical and high </>
					<Icon name="chevron-down-thin" />
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Related Services</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="file-lines" />
					<StyledSpan>View Logs</StyledSpan>
				</div>
			</Container>
		</>
	);
});
