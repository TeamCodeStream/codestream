import { forEach as _forEach } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { CodeStreamState } from "../store";
import { useDidMount } from "../utilities/hooks";
import { PaneNodeName } from "../src/components/Pane";
import { ErrorRow } from "./Observability";
import { openErrorGroup } from "../store/codeErrors/actions";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "../webview-api";

interface Props {
	observabilityErrors?: any;
	observabilityRepo?: any;
}

export const ObservabilityErrorDropdown = React.memo((props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);

	// useDidMount(() => {});
	// useEffect(() => {}, []);

	const { observabilityErrors, observabilityRepo } = props;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 40px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Recent</span>
			</Row>
			{expanded && (
				<>
					{observabilityErrors
						.filter(oe => oe?.repoId === observabilityRepo?.repoId)
						.map(oe => {
							return oe.errors.map(err => {
								return (
									<ErrorRow
										title={`${err.errorClass} (${err.count})`}
										tooltip={err.message}
										subtle={err.message}
										timestamp={err.lastOccurrence}
										url={err.errorGroupUrl}
										customPadding={"0 10px 0 50px"}
										onClick={e => {
											dispatch(
												openErrorGroup(err.errorGroupGuid, err.occurrenceId, {
													timestamp: err.lastOccurrence,
													remote: observabilityRepo.repoRemote,
													sessionStart: derivedState.sessionStart,
													pendingEntityId: err.entityId,
													occurrenceId: err.occurrenceId,
													pendingErrorGroupGuid: err.errorGroupGuid,
													src: "Observability Section"
												})
											);
										}}
									/>
								);
							});
						})}
				</>
			)}
		</>
	);
});
