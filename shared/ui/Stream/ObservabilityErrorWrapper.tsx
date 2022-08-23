import { forEach as _forEach } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityErrorDropdown } from "./ObservabilityErrorDropdown";
import { ObservabilityAssignmentsDropdown } from "./ObservabilityAssignmentsDropdown";
import { any } from "prop-types";
import { Link } from "./Link";

interface Props {
	observabilityErrors: any;
	observabilityRepo: any;
	observabilityAssignments: any;
	entityGuid: string;
	noAccess?: string;
}

export const ObservabilityErrorWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);

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
				<span style={{ marginLeft: "2px" }}>Errors</span>
			</Row>
			{expanded &&
				(props.noAccess ? (
					<Row
						style={{
							padding: "2px 10px 2px 40px"
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
										href="https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring#code-level"
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
