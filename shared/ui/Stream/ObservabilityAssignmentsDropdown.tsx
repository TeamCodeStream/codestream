import { openErrorGroup } from "@codestream/webview/store/codeErrors/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useEffect, useState } from "react";
import { shallowEqual } from "react-redux";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./Observability";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "../webview-api";
import {
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	ObservabilityErrorCore,
} from "@codestream/protocols/agent";

interface Props {
	observabilityAssignments?: ObservabilityErrorCore[];
	entityGuid?: string;
	errorInboxError?: string;
	domain?: string;
}

export const ObservabilityAssignmentsDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);
	const [filteredAssignments, setFilteredAssignments] = useState<any>([]);
	const [isLoadingErrorGroupGuid, setIsLoadingErrorGroupGuid] = useState<string>("");

	// Only show assigments that correlate to the entityId prop
	useEffect(() => {
		const _filteredAssignments = props.observabilityAssignments?.filter(
			_ => _.entityId === props.entityGuid
		);
		setFilteredAssignments(_filteredAssignments || []);
	}, [props.observabilityAssignments]);

	if (!filteredAssignments) {
		return null;
	}

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
				<span data-testid={`assigned-errors-${props.entityGuid}`} style={{ marginLeft: "2px" }}>
					Assigned to Me
				</span>
			</Row>
			{expanded && (
				<>
					{filteredAssignments && filteredAssignments.length == 0 ? (
						<>
							<ErrorRow
								customPadding={"0 10px 0 50px"}
								title={props.errorInboxError ?? "No errors assigned to me"}
								icon={props.errorInboxError ? "alert" : "thumbsup"}
								dataTestId={`no-assigned-errors-${props.entityGuid}`}
							></ErrorRow>
						</>
					) : (
						<>
							{filteredAssignments.map((_, index) => {
								const indexedErrorGroupGuid = `${_.errorGroupGuid}_${index}`;
								return (
									<ErrorRow
										dataTestId={`assigned-error-${index}`}
										key={index}
										title={_.errorClass}
										subtle={_.message}
										tooltip={_.message}
										url={_.errorGroupUrl}
										customPadding={"0 10px 0 50px"}
										isLoading={isLoadingErrorGroupGuid === indexedErrorGroupGuid}
										onClick={async e => {
											try {
												setIsLoadingErrorGroupGuid(indexedErrorGroupGuid);
												const response = (await HostApi.instance.send(
													GetObservabilityErrorGroupMetadataRequestType,
													{ errorGroupGuid: _.errorGroupGuid }
												)) as GetObservabilityErrorGroupMetadataResponse;
												if (response) {
													await dispatch(
														openErrorGroup({
															errorGroupGuid: _.errorGroupGuid,
															occurrenceId: response.occurrenceId,
															data: {
																multipleRepos: response?.relatedRepos?.length > 1,
																relatedRepos: response?.relatedRepos,
																sessionStart: derivedState.sessionStart,
																pendingEntityId: response.entityId,
																occurrenceId: response.occurrenceId,
																pendingErrorGroupGuid: _.errorGroupGuid,
																openType: "Observability Section",
																remote: _?.remote || undefined,
																stackSourceMap: response?.stackSourceMap,
																domain: props.domain,
															},
														})
													);
												} else {
													console.error("could not open error group");
												}
											} catch (ex) {
												console.error(ex);
											} finally {
												setIsLoadingErrorGroupGuid("");
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
