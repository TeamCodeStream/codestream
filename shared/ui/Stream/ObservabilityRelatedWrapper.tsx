import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedCalledBy } from "./ObservabilityRelatedCalledBy";
import { ObservabilityRelatedCalls } from "./ObservabilityRelatedCalls";
import { setUserPreference } from "./actions";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
interface Props {
	currentRepoId: string;
	entityGuid: string;
}

export const ObservabilityRelatedWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const relatedServicesExpanded =
			preferences?.relatedServicesExpanded && props?.entityGuid
				? preferences.relatedServicesExpanded[props?.entityGuid]
				: true;

		return {
			relatedServicesExpanded,
		};
	});

	const handleRowOnClick = () => {
		const { relatedServicesExpanded } = derivedState;

		dispatch(
			setUserPreference({
				prefPath: ["relatedServicesExpanded", props.entityGuid],
				value: !relatedServicesExpanded,
			})
		);
	};

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => handleRowOnClick()}
			>
				{derivedState.relatedServicesExpanded && <Icon name="chevron-down-thin" />}
				{!derivedState.relatedServicesExpanded && <Icon name="chevron-right-thin" />}
				<span data-testid={`related-services-${props.entityGuid}`} style={{ marginLeft: "2px" }}>
					Related Services
				</span>
			</Row>
			{derivedState.relatedServicesExpanded && (
				<>
					<ObservabilityRelatedCalls
						currentRepoId={props.currentRepoId}
						entityGuid={props.entityGuid}
					/>
					<ObservabilityRelatedCalledBy
						currentRepoId={props.currentRepoId}
						entityGuid={props.entityGuid}
					/>
				</>
			)}
		</>
	);
});
