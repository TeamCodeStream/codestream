import {
	openErrorGroup,
} from "@codestream/webview/store/codeErrors/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { isEmpty as _isEmpty } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual } from "react-redux";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./ErrorRow";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "../webview-api";
import {
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	ObservabilityRepo,
	ObservabilityRepoError,
} from "@codestream/protocols/agent";
import { CodeErrorTimeWindow } from "@codestream/protocols/api";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { setUserPreference } from "./actions";
import styled from "styled-components";
import { openModal } from "../store/context/actions";
import { WebviewModals } from "@codestream/protocols/webview";
import { parseId } from "../utilities/newRelic";

interface Props {
	observabilityErrors: ObservabilityRepoError[];
	observabilityRepo?: ObservabilityRepo;
	entityGuid?: string;
	domain?: string;
	isServiceSearch?: boolean;
	hasRepoAssociated?: boolean;
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
			accountId: parseId(state.context.currentEntityGuid!)?.accountId!,
			currentEntityGuid: state.context.currentEntityGuid!,
			sessionStart: state.context.sessionStart,
			timeWindow,
			errorsDemoMode: state.codeErrors.demoMode.enabled,
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);
	const [filteredErrors, setFilteredErrors] = useState<any>([]);
	const [isLoadingErrorGroupGuid, setIsLoadingErrorGroupGuid] = useState<string>("");

	useEffect(() => {
		if (!props.isServiceSearch) {
			let _filteredErrorsByRepo = props.observabilityErrors.filter(
				oe => oe?.repoId === observabilityRepo?.repoId
			);

			const _filteredErrors = _filteredErrorsByRepo.map(fe => {
				return fe.errors.filter(error => {
					return error.entityId === props.entityGuid;
				});
			});
			setFilteredErrors(_filteredErrors || []);
		} else {
			if (props.observabilityErrors.length > 0) {
				setFilteredErrors([props.observabilityErrors[0]?.errors] || []);
			}
		}
	}, [props.observabilityErrors]);

	const { observabilityRepo } = props;

	const timeWindowItems = Object.values(CodeErrorTimeWindow).map(_ => ({
		label: _,
		key: _,
		checked: derivedState.timeWindow === _,
		action: () => dispatch(setUserPreference({ prefPath: ["codeErrorTimeWindow"], value: _ })),
	}));

	const popup = (modal: WebviewModals) => dispatch(openModal(modal));

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
												if (props.isServiceSearch && !props.hasRepoAssociated) {
													popup(WebviewModals.ErrorRoadblock);
												} else {
													try {
														setIsLoadingErrorGroupGuid(indexedErrorGroupGuid);
														const response = derivedState.errorsDemoMode
															? ({} as GetObservabilityErrorGroupMetadataResponse)
															: await HostApi.instance.send(
																	GetObservabilityErrorGroupMetadataRequestType,
																	{ entityGuid: err.entityId, traceId: err.traceId }
															  );
														await dispatch(
															openErrorGroup({
																errorGroupGuid: err.errorGroupGuid,
																occurrenceId: err.occurrenceId,
																data: {
																	multipleRepos: response?.relatedRepos?.length > 1,
																	relatedRepos: response?.relatedRepos || undefined,
																	timestamp: err.lastOccurrence,
																	sessionStart: derivedState.sessionStart,
																	occurrenceId: response?.occurrenceId || err.occurrenceId,
																	openType: "Observability Section",
																	remote: err?.remote || undefined,
																	stackSourceMap: response?.stackSourceMap,
																	domain: props?.domain,
																	traceId: err.traceId,
                                                                    																entityGuid: derivedState.currentEntityGuid,
																accountId: derivedState.accountId,
																errorGroupGuid: err.errorGroupGuid,
																},
															})
														);
													} catch (ex) {
														console.error(ex);
													} finally {
														setIsLoadingErrorGroupGuid("");
													}

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
