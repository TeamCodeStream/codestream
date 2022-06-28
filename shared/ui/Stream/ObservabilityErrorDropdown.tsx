import { forEach as _forEach } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { CodeStreamState } from "../store";
import { useDidMount } from "../utilities/hooks";
import { PaneNodeName } from "../src/components/Pane";
import { ErrorRow } from "./Observability";
import { openErrorGroup } from "../store/codeErrors/actions";
import { HostApi } from "../webview-api";

interface Props {
	observabilityErrors?: any;
	observabilityRepo?: any;
}

const ExpansionNode = styled.div`
	padding: 2px 10px 2px 20px;
	display: flex;
	cursor: pointer;
	position: relative;

	&:hover {
		background: var(--app-background-color-hover);
		// color: var(--text-color-highlight);
	}
`;

export const ObservabilityErrorDropdown = React.memo((props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
			textEditorUri: state.editorContext.textEditorUri,
			scmInfo: state.editorContext.scmInfo
		};
	}, shallowEqual);

	const [problem, setProblem] = useState();

	useDidMount(() => {});

	useEffect(() => {}, []);

	const { observabilityErrors, observabilityRepo } = props;

	return (
		<>
			<ExpansionNode>
				<PaneNodeName title={"Errors"} id={"observability_errors"} />
			</ExpansionNode>
			{observabilityErrors
				.filter(oe => oe.repoId === observabilityRepo.repoId)
				.map(oe => {
					return oe.errors.map(err => {
						return (
							<ErrorRow
								title={`${err.errorClass} (${err.count})`}
								tooltip={err.message}
								subtle={err.message}
								timestamp={err.lastOccurrence}
								url={err.errorGroupUrl}
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
	);
});
