import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { Link } from "./Link";
import { ObservabilityAssignmentsDropdown } from "./ObservabilityAssignmentsDropdown";
import { ObservabilityErrorDropdown } from "./ObservabilityErrorDropdown";

interface Props {
	observabilityErrors: any;
	observabilityRepo: any;
	observabilityAssignments: any;
	entityGuid: string;
	noAccess?: string;
	errorMsg?: string;
	errorInboxError?: string;
}

export const ObservabilityErrorWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const { errorMsg } = props;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ margin: "0 5px 0 2px" }}>Errors</span>
				{errorMsg && (
					<Icon
						style={{ transform: "scale(0.8)" }}
						name="alert"
						className="clickable"
						placement="bottom"
						title={`Last request failed: ${errorMsg}`}
						delay={1}
					/>
				)}
			</Row>
			{expanded &&
				(props.noAccess ? (
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
						onClick={() => setExpanded(!expanded)}
					>
						<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>
							{props.noAccess === "403" ? (
								<>
									Your New Relic account doesn’t have access to the errors integration with
									CodeStream. Contact your New Relic admin to upgrade your account or{" "}
									<Link
										useStopPropagation={true}
										href="https://docs.newrelic.com/docs/accounts/original-accounts-billing/original-users-roles/user-migration"
									>
										migrate to New Relic’s new user model
									</Link>{" "}
									in order to see errors in CodeStream.
								</>
							) : (
								props.noAccess
							)}
						</span>
					</Row>
				) : (
					<>
						<ObservabilityAssignmentsDropdown
							observabilityAssignments={props.observabilityAssignments}
							entityGuid={props.entityGuid}
							errorInboxError={props.errorInboxError}
						/>
						<ObservabilityErrorDropdown
							observabilityErrors={props.observabilityErrors}
							observabilityRepo={props.observabilityRepo}
							entityGuid={props.entityGuid}
						/>
					</>
				))}
		</>
	);
});
