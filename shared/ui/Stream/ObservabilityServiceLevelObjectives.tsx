import { ServiceLevelObjectiveResult } from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { CodeStreamState } from "@codestream/webview/store";
import Tooltip from "@codestream/webview/Stream/Tooltip";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useState } from "react";
import { Simulate } from "react-dom/test-utils";
import { shallowEqual } from "react-redux";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import load = Simulate.load;

interface Props {
	serviceLevelObjectives: ServiceLevelObjectiveResult[];
	loadingServiceLevelObjectives: boolean;
}

export const ObservabilityServiceLevelObjectives = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { serviceLevelObjectives, loadingServiceLevelObjectives } = props;

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			ideName: encodeURIComponent(state.ide.name || ""),
		};
	}, shallowEqual);

	const showWarningIcon =
		serviceLevelObjectives.filter(v => {
			return v.result === "UNDER";
		})?.length > 0;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 18px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Service Level Objectives</span>
				{showWarningIcon && <Icon name="alert" className="alert" />}
			</Row>
			{expanded && loadingServiceLevelObjectives && (
				<Row
					style={{
						padding: "0 10px 0 60px",
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
			{expanded && !loadingServiceLevelObjectives && (
				<>
					{serviceLevelObjectives.map((slo, index) => {
						return (
							<Row
								style={{
									padding: "0 10px 0 60px",
								}}
								className={"pr-row"}
							>
								<div>
									<span style={{ marginRight: "5px" }}>{slo.name}</span>
									{slo.summaryPageUrl && (
										<span
											onClick={e => {
												e.preventDefault();
												e.stopPropagation();
												HostApi.instance.send(OpenUrlRequestType, {
													url:
														`${slo.summaryPageUrl}` +
														`&utm_source=codestream&utm_medium=ide-${derivedState.ideName}&utm_campaign=service_objective_link`,
												});
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
									)}
								</div>

								<div className="icons">
									<Tooltip placement="topRight" delay={1}>
										{slo.timeWindow}
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
