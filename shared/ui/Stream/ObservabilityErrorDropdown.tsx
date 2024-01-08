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
import { CodeErrorTimeWindow } from "../../util/src/protocol/agent/api.protocol.models";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { setUserPreference } from "./actions";
import styled from "styled-components";

interface Props {
	observabilityErrors?: any;
	observabilityRepo?: any;
	entityGuid?: string;
	domain?: string;
}

const SubtleDropdown = styled.span`
	color: var(--text-color-subtle);
	font-size: 11px;
`;

export const ObservabilityErrorDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const timeWindow =
			state.preferences.codeErrorTimeWindow &&
			Object.values(CodeErrorTimeWindow).includes(state.preferences.codeErrorTimeWindow)
				? state.preferences.codeErrorTimeWindow
				: CodeErrorTimeWindow.ThreeDays;
		return {
			sessionStart: state.context.sessionStart,
			timeWindow,
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

	const timeWindowItems = Object.values(CodeErrorTimeWindow).map(_ => ({
		label: _,
		key: _,
		checked: derivedState.timeWindow === _,
		action: () => dispatch(setUserPreference({ prefPath: ["codeErrorTimeWindow"], value: _ })),
	}));

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
				<span
					data-testid={`recent-errors-${props.entityGuid}`}
					style={{ marginLeft: "2px", marginRight: "5px" }}
				>
					Recent
				</span>
				<InlineMenu
					title="Time Range"
					noFocusOnSelect
					items={timeWindowItems}
					align="bottomRight"
					className="dropdown"
				>
					<SubtleDropdown>{derivedState.timeWindow}</SubtleDropdown>
				</InlineMenu>
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
								dataTestId={`no-recent-errors-${props.entityGuid}`}
							></ErrorRow>
						</>
					) : (
						<>
							{filteredErrors.map(fe => {
								return fe.map((err, index) => {
									const indexedErrorGroupGuid = `${err.errorGroupGuid}_${index}`;
									return (
										<ErrorRow
											dataTestId={`recent-error-${index}`}
											title={`${err.errorClass}`}
											tooltip={err.message}
											subtle={err.message}
											alternateSubtleRight={err.count}
											url={err.errorGroupUrl}
											customPadding={"0 10px 0 50px"}
											isLoading={isLoadingErrorGroupGuid === indexedErrorGroupGuid}
											onClick={async e => {
												try {
													setIsLoadingErrorGroupGuid(indexedErrorGroupGuid);
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
															remote: err?.remote || undefined,
															stackSourceMap: response?.stackSourceMap,
															domain: props?.domain,
															showAI: err?.showAI,
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
