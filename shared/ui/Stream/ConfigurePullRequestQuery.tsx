import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import { PRHeadshot } from "../src/components/Headshot";
import Tooltip from "./Tooltip";
import { GetMyPullRequestsResponse, ThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { Button } from "../src/components/Button";
import { getMyPullRequests } from "../store/providerPullRequests/actions";
import Tag from "./Tag";
import { Modal } from "./Modal";
import { Dialog, ButtonRow } from "../src/components/Dialog";
import { Link } from "./Link";
import { PullRequestTooltip } from "./OpenPullRequests";
import styled from "styled-components";
import { PullRequestQuery } from "../protocols/agent/api.protocol.models";
import { CodeStreamState } from "../store";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { getPRLabel } from "../store/providers/reducer";

const PRTestResults = styled.div`
	margin: 20px -20px 0 -20px;
	padding-top: 20px;
	border-top: 1px solid var(--base-border-color);
	i {
		display: block;
		text-align: center;
	}
`;

const EMPTY_QUERY: PullRequestQuery = {
	providerId: "",
	name: "",
	query: "",
	hidden: false
};
interface Props {
	query?: PullRequestQuery;
	openReposOnly: boolean;
	save: Function;
	onClose: Function;
	prConnectedProviders: ThirdPartyProviderConfig[];
}

export function ConfigurePullRequestQuery(props: Props) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences, providers } = state;

		return {
			prLabel: getPRLabel(state),
			providers,
			allRepos:
				preferences.pullRequestQueryShowAllRepos == null
					? true
					: preferences.pullRequestQueryShowAllRepos
		};
	});

	const defaultProviderId = React.useMemo(() => {
		if (props.query && props.query.providerId) return props.query.providerId;
		if (props.prConnectedProviders[0]) return props.prConnectedProviders[0].id;
		return "";
	}, [props]);

	const { query = EMPTY_QUERY } = props;
	const [providerIdField, setProviderIdField] = React.useState(defaultProviderId);
	const [nameField, setNameField] = React.useState(query.name);
	const [queryField, setQueryField] = React.useState(query.query);
	const [validGHQueries, setvalidGHQueries] = React.useState(
		new Set([
			"user",
			"org",
			"repo",
			"author",
			"assignee",
			"mentions",
			"team",
			"commenter",
			"involves",
			"reviewed-by",
			"review-requested",
			"team-review-requested",
			"project"
		])
	);
	const [validGLQueries, setvalidGLQueries] = React.useState(
		new Set([
			"project_id",
			"group_id",
			"assignee_username",
			"assignee_id",
			"author_username",
			"author_id",
			"reviewer_username",
			"reviewer_id",
			"created_by_me",
			"my_reaction_emoji",
			"assigned_to_me"
		])
	);
	const [validQuery, setValidQuery] = React.useState(true);
	const [errorQuery, setErrorQuery] = React.useState(false);
	const [testPRSummaries, setTestPRSummaries] = React.useState<
		GetMyPullRequestsResponse[] | undefined
	>(undefined);
	const [isLoading, setIsLoading] = React.useState(false);

	const providerDisplayName = React.useMemo(() => {
		if (derivedState.providers[providerIdField]) {
			const { name } = derivedState.providers[providerIdField];
			return PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].displayName : "";
		} else {
			return "";
		}
	}, [providerIdField]);

	const customPullRequestFilterHelpLink = React.useMemo(() => {
		if (derivedState.providers[providerIdField]) {
			const { name } = derivedState.providers[providerIdField];
			return PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].customPullRequestFilterHelpLink : "";
		} else {
			return "";
		}
	}, [providerIdField]);

	const customPullRequestFilterExample = React.useMemo(() => {
		if (derivedState.providers[providerIdField]) {
			const { name } = derivedState.providers[providerIdField];
			return PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].customPullRequestFilterExample : "";
		} else {
			return "";
		}
	}, [providerIdField]);

	const isValidQuery = query => {
		if (providerIdField === "github*com" || providerIdField === "github/enterprise") {
			// Verify if valid query for Github
			const queryStr = query.replace(/:/g, " ").split(/\s+/);
			for (let word of queryStr) {
				if (validGHQueries.has(word)) {
					setValidQuery(true);
					return true;
				}
			}
			setValidQuery(false);
			return false;
		} else if (providerIdField === "gitlab*com" || providerIdField === "gitlab/enterprise") {
			// Verify if valid query for Gitlab
			const queryStr = query
				.replace(/[=&]/g, " ")
				.replace(/[:]/g, " ")
				.split(/\s+/);
			for (let word of queryStr) {
				if (validGLQueries.has(word)) {
					setValidQuery(true);
					return true;
				}
			}
			setValidQuery(false);
			return false;
		}
		setValidQuery(true);
		return true;
	};

	const fetchTestPRs = async query => {
		if (isValidQuery(query)) {
			setIsLoading(true);
			setTestPRSummaries(undefined);
			try {
				// FIXME hardcoded github
				const response: any = await dispatch(
					getMyPullRequests(
						providerIdField,
						[query],
						props.openReposOnly,
						{ force: true },
						true,
						true
					)
				);
				if (response && response.length) {
					setErrorQuery(false);
					setTestPRSummaries(response[0]);
				}
			} catch (ex) {
				if (ex && ex.indexOf('"message":"Bad credentials"') > -1) {
					// show message about re-authing?
				}
				setErrorQuery(true);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const title = query.query
		? `Edit ${derivedState.prLabel.PullRequest} Query`
		: `New ${derivedState.prLabel.PullRequest} Query`;
	return (
		<Modal translucent>
			<Dialog
				title={title}
				narrow
				onClose={() => {
					setValidQuery(true);
					setErrorQuery(false);
					props.onClose();
				}}
			>
				<div className="standard-form">
					<fieldset className="form-body">
						<span dangerouslySetInnerHTML={{ __html: customPullRequestFilterExample || "" }} />
						<div id="controls">
							<div style={{ margin: "20px 0" }}>
								{!query.providerId && props.prConnectedProviders.length > 1 && (
									<>
										<label>PR Provider: &nbsp;</label>
										<InlineMenu
											items={props.prConnectedProviders.map(provider => {
												const providerDisplay = PROVIDER_MAPPINGS[provider.name];
												return {
													key: provider.id,
													label: providerDisplay.displayName,
													action: () => setProviderIdField(provider.id)
												};
											})}
										>
											{providerDisplayName}
										</InlineMenu>
										<div style={{ height: "10px" }} />
									</>
								)}
								<input
									autoFocus
									placeholder="Name Your Custom Query (optional)"
									name="query-name"
									value={nameField}
									className="input-text control"
									type="text"
									onChange={e => {
										setNameField(e.target.value);
									}}
								/>
								<div style={{ height: "10px" }} />
								{!validQuery ? (
									<ErrorMessage>
										<small className="error-message">
											Missing required qualifier.{" "}
											{providerIdField === "github*com" ||
											providerIdField === "github/enterprise" ? (
												<Link href="https://docs.codestream.com/userguide/faq/custom-queries/">
													Learn more.
												</Link>
											) : (
												<Link href="https://docs.codestream.com/userguide/faq/custom-queries-gl/">
													Learn more.
												</Link>
											)}
										</small>
									</ErrorMessage>
								) : (
									errorQuery && (
										<ErrorMessage>
											<small className="error-message">
												Invalid query.{" "}
												{providerIdField === "github*com" ||
												providerIdField === "github/enterprise" ? (
													<Link href="https://docs.codestream.com/userguide/faq/custom-queries/">
														Learn more.
													</Link>
												) : (
													<Link href="https://docs.codestream.com/userguide/faq/custom-queries-gl/">
														Learn more.
													</Link>
												)}
											</small>
										</ErrorMessage>
									)
								)}
								<input
									placeholder="Query"
									name="query"
									value={queryField}
									className="input-text control"
									type="text"
									onChange={e => {
										setQueryField(e.target.value);
									}}
								/>
								<div style={{ height: "10px" }} />
								{!derivedState.allRepos && (
									<Tooltip
										title="You can change this setting by closing the dialog and clicking the gear icon"
										placement="bottom"
										delay={1}
									>
										<span className="explainer">
											Queries are limited to repos you have open in your editor.
										</span>
									</Tooltip>
								)}
							</div>
						</div>
						<ButtonRow>
							<Button
								isLoading={isLoading}
								disabled={queryField.length === 0}
								variant="secondary"
								onClick={() => fetchTestPRs(queryField)}
							>
								Test Query
							</Button>
							<Button
								disabled={queryField.length === 0}
								onClick={() => {
									if (isValidQuery(queryField)) props.save(providerIdField, nameField, queryField);
								}}
							>
								Save Query
							</Button>
						</ButtonRow>
					</fieldset>
					{testPRSummaries !== undefined && (
						<PRTestResults>
							{testPRSummaries.length === 0 && (
								<i>No {derivedState.prLabel.PRs} match this query</i>
							)}
							{testPRSummaries.map(pr => {
								return (
									<Tooltip
										key={"pr-tt-" + pr.id}
										title={<PullRequestTooltip pr={pr} />}
										delay={1}
										placement="top"
									>
										<Row key={"pr-" + pr.id}>
											<div>
												<PRHeadshot person={pr.author} />
											</div>
											<div>
												<span>
													{pr.title} #{pr.number}
												</span>
												{pr.labels && pr.labels.nodes && pr.labels.nodes.length > 0 && (
													<span className="cs-tag-container">
														{pr.labels.nodes.map((_, index) => (
															<Tag key={index} tag={{ label: _.name, color: `#${_.color}` }} />
														))}
													</span>
												)}
												<span className="subtle">{pr.bodyText || pr.body}</span>
											</div>
										</Row>
									</Tooltip>
								);
							})}
						</PRTestResults>
					)}
				</div>
			</Dialog>
		</Modal>
	);
}

export const ErrorMessage = styled.div`
	text-align: right;
`;
