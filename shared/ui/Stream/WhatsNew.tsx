import React from "react";
import styled from "styled-components";
import Icon from "../Stream/Icon";

const Main = styled.main``;

const TimelineWrapper = styled.div`
	padding: 1rem 3rem;
`;

const TimelineContent = styled.div`
	padding-left: 25.6px;
	border-left: 3px solid var(--base-border-color);

	&:last-child .tl-body {
		border-left: 3px solid transparent;
	}
`;

const TimelineHeader = styled.div`
	position: relative;
	display: grid;
`;

const TimelineTitle = styled.h2`
	font-weight: 600;
	border-bottom: 1px solid var(--base-border-color);
	padding-bottom: 2px;
	margin-bottom: 0.2em;
`;

const TimelineMarker = styled.span`
	display: block;
	position: absolute;
	width: 14px;
	height: 14px;
	border-radius: 50% / 50%;
	background: var(--base-border-color);
	left: -2.56rem;
	top: 50%;
	transform: translate(50%, -50%);
`;

const TimelineDate = styled.div`
	font-size: smaller;
	font-style: italic;
`;

const Update = styled.div``;
const UpdateTitle = styled.h3`
	margin-bottom: 6px;
`;
const UpdateItem = styled.div`
	margin-bottom: 4px;
`;

const ListContainer = styled.ul`
	margin-top: 2px;
	padding-left: 20px;
`;

export const WhatsNewPanel = () => {
	return (
		<TimelineWrapper>
			<h1>
				<Icon
					style={{
						transform: "scale(2)",
						display: "inline-block",
						marginRight: "15px",
						top: "15px",
					}}
					name="newrelic"
				/>
				What's New
			</h1>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.3.0</TimelineTitle>
					<TimelineDate>February 14, 2024</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Log Search</UpdateTitle>
						<UpdateItem>
							No need to slow down your investigation by context switching between your IDE and your
							browser to search logs. CodeStream brings the New Relic log-search experience right
							into your IDE!
						</UpdateItem>
						<UpdateItem>
							<img src="https://images.codestream.com/misc/WN-log-search.png" />
						</UpdateItem>
						<UpdateItem>
							Click on the "View Logs" entry for any service listed in the CodeStream pane, or on
							the "View Logs" icon in CodeStream's global navigation. You can also right-click on a
							log line in your code and select "Find in logs" to look for entries from that specific
							log line.
						</UpdateItem>
						<UpdateItem>
							CodeStream's log search is currently available for logs collected by a New Relic APM
							agent or the OTel integration.
						</UpdateItem>
					</Update>
					<Update>
						<UpdateTitle>Query Builder</UpdateTitle>
						<UpdateItem>
							The ability to run NRQL queries right from your IDE gives you powerful access to all
							of the performance data New Relic has about your services. Click on the "Query your
							data" icon in CodeStream's global navigation to access the query builder.
						</UpdateItem>
						<UpdateItem>
							<img src="https://images.codestream.com/misc/WN-query-builder.png" />
						</UpdateItem>
						<UpdateItem>
							Add a file with a `.nrql` extension to your repository to save and share queries. Just
							click the "Run" link in the CodeLense above each query to run the query.
						</UpdateItem>
						<UpdateItem>
							<img src="https://images.codestream.com/misc/WN-nrql-file.png" />
						</UpdateItem>
					</Update>
				</div>
			</TimelineContent>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.2.0</TimelineTitle>
					<TimelineDate>February 7, 2024</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>NRAI Apply Fix</UpdateTitle>
						<UpdateItem>
							A new "Apply Fix" button allows you to easily accept a suggested code fix when NRAI
							analyzes an error for you. Code fixes are also now presented in a diff view so that
							you can easily identify the changes.
						</UpdateItem>
					</Update>
				</div>
			</TimelineContent>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.1.0</TimelineTitle>
					<TimelineDate>January 23, 2024</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Added</UpdateTitle>
						<ListContainer>
							<li>
								Investigate errors being reported by your browser services, with the ability to step
								throught he stack traces, collaborate with teammates, and get suggested code fixes
								from NRAI.
							</li>
							<li>
								The Golden Metrics section now calls out significant increases in error rate or
								response time since your last release.
							</li>
							<li>
								Anomalies in the Code-Level Metrics section are now displayed in a hierarchy of
								transactions and metrics.
							</li>
							<li>Adds display of Golden Metrics, SLOs and Related Services for OTel services</li>
							<li>Adds display of Golden Metrics for Lambda functions</li>
						</ListContainer>
					</Update>
				</div>
			</TimelineContent>
		</TimelineWrapper>
	);
};
