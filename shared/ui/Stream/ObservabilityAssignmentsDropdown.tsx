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
import {
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse
} from "@codestream/protocols/agent";

interface Props {
	observabilityAssignments?: any;
}

export const ObservabilityAssignmentsDropdown = React.memo((props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);

	// useDidMount(() => {});
	// useEffect(() => {}, []);

	const { observabilityAssignments } = props;

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
				<span style={{ marginLeft: "2px" }}>Errors Assigned to Me</span>
			</Row>
			{expanded && (
				<>
					{observabilityAssignments.length == 0 ? (
						<>
							<ErrorRow title={"No errors to display"}></ErrorRow>
						</>
					) : (
						<>
							{observabilityAssignments.map((_, index) => {
								return (
									<ErrorRow
										key={index}
										title={_.errorClass}
										tooltip={_.message}
										url={_.errorGroupUrl}
										onClick={async e => {
											try {
												const response = (await HostApi.instance.send(
													GetObservabilityErrorGroupMetadataRequestType,
													{ errorGroupGuid: _.errorGroupGuid }
												)) as GetObservabilityErrorGroupMetadataResponse;
												if (response) {
													dispatch(
														openErrorGroup(_.errorGroupGuid, response.occurrenceId, {
															remote: response.remote,
															sessionStart: derivedState.sessionStart,
															pendingEntityId: response.entityId,
															occurrenceId: response.occurrenceId,
															pendingErrorGroupGuid: _.errorGroupGuid,
															openType: "Observability Section"
														})
													);
												} else {
													console.error("could not open error group");
												}
											} catch (ex) {
												console.error(ex);
											} finally {
											}
										}}
									></ErrorRow>
								);
							})}
						</>
					)}
				</>
			)}
		</>
	);
});
