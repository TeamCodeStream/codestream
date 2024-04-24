import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedCalledBy } from "./ObservabilityRelatedCalledBy";
import { ObservabilityRelatedCalls } from "./ObservabilityRelatedCalls";

interface Props {
	accountId: number;
	currentRepoId: string;
	entityGuid: string;
}

export const ObservabilityRelatedWrapper = React.memo((props: Props) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	const handleRowOnClick = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 40px",
				}}
				className={"pr-row"}
				onClick={() => handleRowOnClick()}
			>
				{isExpanded && <Icon name="chevron-down-thin" />}
				{!isExpanded && <Icon name="chevron-right-thin" />}
				<span data-testid={`related-services-${props.entityGuid}`} style={{ marginLeft: "2px" }}>
					Related Services
				</span>
			</Row>
			{isExpanded && (
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
