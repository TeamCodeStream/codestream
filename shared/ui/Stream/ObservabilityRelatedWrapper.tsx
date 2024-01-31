import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedCalledBy } from "./ObservabilityRelatedCalledBy";
import { ObservabilityRelatedCalls } from "./ObservabilityRelatedCalls";
import { setUserPreference } from "./actions";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";

interface Props {
	accountId: number;
	currentRepoId: string;
	entityGuid: string;
}

export const ObservabilityRelatedWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const relatedServicesIsExpanded = preferences?.relatedServicesIsExpanded ?? true;

		return {
			relatedServicesIsExpanded,
		};
	});

	const handleRowOnClick = () => {
		const { relatedServicesIsExpanded } = derivedState;

		dispatch(
			setUserPreference({
				prefPath: ["relatedServicesIsExpanded"],
				value: !relatedServicesIsExpanded,
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
				{derivedState.relatedServicesIsExpanded && <Icon name="chevron-down-thin" />}
				{!derivedState.relatedServicesIsExpanded && <Icon name="chevron-right-thin" />}
				<span data-testid={`related-services-${props.entityGuid}`} style={{ marginLeft: "2px" }}>
					Related Services
				</span>
			</Row>
			{derivedState.relatedServicesIsExpanded && (
				<>
					<ObservabilityRelatedCalls
						accountId={props.accountId}
						currentRepoId={props.currentRepoId}
						entityGuid={props.entityGuid}
					/>
					<ObservabilityRelatedCalledBy
						accountId={props.accountId}
						currentRepoId={props.currentRepoId}
						entityGuid={props.entityGuid}
					/>
				</>
			)}
		</>
	);
});
