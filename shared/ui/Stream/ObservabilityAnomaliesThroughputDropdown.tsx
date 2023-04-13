import React, { useEffect, useState } from "react";
import { shallowEqual } from "react-redux";

import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./Observability";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
interface Props {
	observabilityAnomalies?: any;
	observabilityRepo?: any;
	entityGuid?: string;
}

//@TODO Candidate for deletion
export const ObservabilityAnomaliesThroughputDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);
	const [filteredErrors, setFilteredErrors] = useState<any>([]);

	useEffect(() => {
		let _filteredErrorsByRepo = props.observabilityAnomalies.filter(
			oe => oe?.repoId === observabilityRepo?.repoId
		);

		const _filteredErrors = _filteredErrorsByRepo.map(fe => {
			return fe.errors.filter(error => {
				return error.entityId === props.entityGuid;
				// if (error.entityId === props.entityGuid) {
				// 	return error;
				// }
			});
		});
		setFilteredErrors(_filteredErrors || []);
	}, [props.observabilityAnomalies]);

	// useDidMount(() => {});
	// useEffect(() => {}, []);

	const { observabilityAnomalies, observabilityRepo } = props;
	const noDropdown = false;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 40px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Throughput</span>
			</Row>
			{expanded && (
				<>
					{props.observabilityAnomalies.length == 0 ? (
						<>
							<ErrorRow customPadding={"0 10px 0 50px"} title={"No anomalies found"}></ErrorRow>
						</>
					) : (
						<>
							{props.observabilityAnomalies.map(anomaly => {
								return (
									<Row
										style={{
											padding: noDropdown ? "0 10px 0 60px" : "0 10px 0 42px",
										}}
										className={"pr-row"}
									>
										<div>
											<span style={{ marginRight: "5px" }}>{anomaly.text}</span>
										</div>
									</Row>
								);
							})}
							;
						</>
					)}
				</>
			)}
		</>
	);
});
