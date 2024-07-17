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
					<Icon name="chevron-right-thin" />
					<StyledSpan>Summary</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />

					<StyledSpan>Transaction Performance</StyledSpan>

					<Icon name="alert" style={{ color: "rgb(188,20,24)" }} className="alert" delay={1} />
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
