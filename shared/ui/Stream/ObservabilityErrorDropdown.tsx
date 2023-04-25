import { openErrorGroup } from "@codestream/webview/store/codeErrors/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { isEmpty as _isEmpty } from "lodash-es";
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
} from "@codestream/protocols/agent";

interface Props {
	observabilityErrors?: any;
	observabilityRepo?: any;
	entityGuid?: string;
}

export const ObservabilityErrorDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);
	const [filteredErrors, setFilteredErrors] = useState<any>([]);
	const [isLoadingErrorGroupGuid, setIsLoadingErrorGroupGuid] = useState<string>("");

	useEffect(() => {
		let _filteredErrorsByRepo = props.observabilityErrors.filter(
			oe => oe?.repoId === observabilityRepo?.repoId
		);

		const _filteredErrors = _filteredErrorsByRepo.map(fe => {
			return fe.errors.filter(error => {
				return error.entityId === props.entityGuid;
			});
		});
		setFilteredErrors(_filteredErrors || []);
	}, [props.observabilityErrors]);

	const { observabilityRepo } = props;

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
				<span style={{ marginLeft: "2px" }}>Recent</span>
			</Row>
			{expanded && (
				<>
					{(filteredErrors && filteredErrors.length == 0) ||
					(filteredErrors && _isEmpty(filteredErrors[0])) ? (
						<>
							<ErrorRow
								customPadding={"0 10px 0 50px"}
								title={"No recent errors"}
								icon="thumbsup"
							></ErrorRow>
						</>
					) : (
						<>
							{filteredErrors.map(fe => {
								return fe.map(err => {
									return (
										<ErrorRow
											title={`${err.errorClass} (${err.count})`}
											tooltip={err.message}
											subtle={err.message}
											timestamp={err.lastOccurrence}
											url={err.errorGroupUrl}
											customPadding={"0 10px 0 50px"}
											isLoading={isLoadingErrorGroupGuid === err.errorGroupGuid}
											onClick={async e => {
												try {
													setIsLoadingErrorGroupGuid(err.errorGroupGuid);
													const response = (await HostApi.instance.send(
														GetObservabilityErrorGroupMetadataRequestType,
														{ errorGroupGuid: err.errorGroupGuid }
													)) as GetObservabilityErrorGroupMetadataResponse;
													await dispatch(
														openErrorGroup(err.errorGroupGuid, err.occurrenceId, {
															multipleRepos: response?.relatedRepos?.length > 1,
															relatedRepos: response?.relatedRepos || undefined,
															timestamp: err.lastOccurrence,
															sessionStart: derivedState.sessionStart,
															pendingEntityId: response?.entityId || err.entityId,
															occurrenceId: response?.occurrenceId || err.occurrenceId,
															pendingErrorGroupGuid: err.errorGroupGuid,
															openType: "Observability Section",
														})
													);
												} catch (ex) {
													console.error(ex);
												} finally {
													setIsLoadingErrorGroupGuid("");
												}
											}}
										/>
									);
								});
							})}
						</>
					)}
				</>
			)}
		</>
	);
});
