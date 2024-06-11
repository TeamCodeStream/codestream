import {
	DidChangeObservabilityDataNotificationType,
	GetNewRelicAssigneesRequestType,
} from "@codestream/protocols/agent";
import React, { useState } from "react";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
import { CodeStreamState } from "@codestream/webview/store";
import { api } from "@codestream/webview/store/codeErrors/thunks";
import { getTeamMembers, isCurrentUserInternal } from "@codestream/webview/store/users/reducer";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { invite } from "../actions";
import { BigTitle, Header, HeaderActions } from "../Codemark/BaseCodemark";
import { confirmPopup } from "../Confirm";
import { DropdownButton, DropdownButtonItems } from "../DropdownButton";
import Icon from "../Icon";
import { Link } from "../Link";
import Tooltip from "../Tooltip";
import {
	CodeErrorHeaderProps,
	STATES_TO_ACTION_STRINGS,
	ALERT_SEVERITY_COLORS,
	ApmServiceTitle,
	STATES_TO_DISPLAY_STRINGS,
} from "./CodeError.Types";
import { CodeErrorMenu } from "./CodeErrorMenu";

// if child props are passed in, we assume they are the action buttons/menu for the header

export const CodeErrorHeader = (props: CodeErrorHeaderProps) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const allTeamMembers = getTeamMembers(state);
		const teamMembers = allTeamMembers.filter(_ => _.username !== "AI");

		const user = state.users[state.session.userId!];
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];

		const eligibleJoinCompanies = user?.eligibleJoinCompanies;
		const eligibleCompany = eligibleJoinCompanies?.find(_ => team.companyId === _.id);

		const company = state.companies[team.companyId];

		return {
			isCurrentUserInternal: isCurrentUserInternal(state),
			ideName: encodeURIComponent(state.ide.name || ""),
			teamMembers: teamMembers,
			emailAddress: state.session.userId ? state.users[state.session.userId]?.email : "",
			hideCodeErrorInstructions: state.preferences.hideCodeErrorInstructions,
			isNonCsOrg: !company.codestreamOnly,
		};
	});

	const [items, setItems] = useState<DropdownButtonItems[]>([]);
	const [states, setStates] = useState<DropdownButtonItems[] | undefined>(undefined);
	const [isStateChanging, setIsStateChanging] = useState(false);
	const [isAssigneeChanging, setIsAssigneeChanging] = useState(false);

	const notify = (emailAddress?: string) => {
		// if no email address or it's you
		if (!emailAddress || derivedState.emailAddress.toLowerCase() === emailAddress.toLowerCase()) {
			HostApi.instance.emit(DidChangeObservabilityDataNotificationType.method, {
				type: "Assignment",
			});
		}
	};

	type AssigneeType = "Teammate" | "Invitee";

	const setAssignee = async (emailAddress: string, assigneeType: AssigneeType) => {
		if (!props.errorGroup) return;

		const _setAssignee = async (type: AssigneeType) => {
			HostApi.instance.track("codestream/errors/assignment succeeded", {
				meta_data: `error_group_id: ${props.errorGroup?.guid}`,
				account_id: props.errorGroup?.accountId,
				entity_guid: props.errorGroup?.entityGuid,
				event_type: "response",
			});

			setIsAssigneeChanging(true);

			await dispatch(
				api("setAssignee", {
					errorGroupGuid: props.errorGroup?.guid!,
					emailAddress: emailAddress,
				})
			);

			notify(emailAddress);
			setTimeout(_ => {
				setIsAssigneeChanging(false);
			}, 1);
		};
		// if it's me, or someone that is already on the team -- just assign them without asking to invite
		if (
			derivedState.emailAddress.toLowerCase() === emailAddress.toLowerCase() ||
			derivedState.teamMembers.find(_ => _.email.toLowerCase() === emailAddress.toLowerCase())
		) {
			_setAssignee(assigneeType);
			return;
		}

		confirmPopup({
			title: "Invite to CodeStream?",
			message: (
				<span>
					Assign the error to <b>{emailAddress}</b> and invite them to join CodeStream
				</span>
			),
			centered: true,
			buttons: [
				{
					label: "Cancel",
					className: "control-button btn-secondary",
				},
				{
					label: "Invite",
					className: "control-button",
					wait: true,
					action: () => {
						dispatch(
							invite({
								email: emailAddress,
								inviteType: "error",
							})
						);
						// HostApi.instance.track("Teammate Invited", {
						// 	"Invitee Email Address": emailAddress,
						// 	"Invitation Method": "Error Assignment",
						// });
						// "upgrade" them to an invitee
						_setAssignee("Invitee");
					},
				},
			],
		});
	};

	const removeAssignee = async (
		e: React.SyntheticEvent<Element, Event>,
		emailAddress: string | undefined,
		userId: number | undefined
	) => {
		if (!props.errorGroup) return;

		// dont allow this to bubble to the parent item which would call setAssignee
		e.stopPropagation();
		setIsAssigneeChanging(true);

		await dispatch(
			api("removeAssignee", {
				errorGroupGuid: props.errorGroup?.guid,
				emailAddress: emailAddress,
				userId: userId,
			})
		);

		notify(emailAddress);
		setTimeout(_ => {
			setIsAssigneeChanging(false);
		}, 1);
	};

	const buildStates = () => {
		if (props.isCollapsed) return;

		if (props.errorGroup?.states) {
			// only show states that aren't the current state
			setStates(
				props.errorGroup?.states
					.filter(_ => (props.errorGroup?.state ? _ !== props.errorGroup.state : true))
					.map(_ => {
						return {
							key: _,
							label: STATES_TO_ACTION_STRINGS[_],
							action: async e => {
								setIsStateChanging(true);
								//await dispatch(upgradePendingCodeError(props.codeError.entityGuid, "Status Change"));
								await dispatch(
									api("setState", {
										errorGroupGuid: props.errorGroup?.guid!,
										state: _,
									})
								);
								notify();
								setIsStateChanging(false);

								HostApi.instance.track("codestream/errors/status_change succeeded", {
									meta_data: `error_group_id: ${props.errorGroup?.guid}`,
									account_id: props.errorGroup?.accountId,
									entity_guid: props.errorGroup?.entityGuid,
									meta_data_2: `error_status: ${STATES_TO_ACTION_STRINGS[_]}`,
									event_type: "response",
								});
							},
						};
					}) as DropdownButtonItems[]
			);
		}
	};

	const buildAssignees = async () => {
		if (props.isCollapsed) return;

		let assigneeItems: DropdownButtonItems[] = [
			{ type: "search", label: "", placeholder: "Search...", key: "search" },
		];

		let assigneeEmail;
		if (props.errorGroup && props.errorGroup.assignee) {
			const a = props.errorGroup.assignee;
			const label = a.name || a.email;
			assigneeEmail = a.email;
			assigneeItems.push({ label: "-", key: "sep-assignee" });
			assigneeItems.push({
				label: (
					<span style={{ fontSize: "10px", fontWeight: "bold", opacity: 0.7 }}>
						CURRENT ASSIGNEE
					</span>
				),
				noHover: true,
				disabled: true,
			});
			assigneeItems.push({
				icon: <Headshot size={16} display="inline-block" person={{ email: a.email }} />,
				key: a.email,
				label: label,
				subtext: label === a.email ? undefined : a.email,
				floatRight: {
					label: (
						<Icon
							name="x"
							onClick={e => {
								removeAssignee(e, a.email, a.id);
							}}
						/>
					),
				},
			});
		}

		let { users } = await HostApi.instance.send(GetNewRelicAssigneesRequestType, {});
		if (assigneeEmail) {
			users = users.filter(_ => _.email !== assigneeEmail);
		}

		let usersFromGitNotOnTeam = users.filter(ufg => {
			return !derivedState.teamMembers.some(tm => tm.email === ufg.email) && ufg.group === "GIT";
		});

		if (usersFromGitNotOnTeam.length && !derivedState.isNonCsOrg) {
			// take no more than 5
			usersFromGitNotOnTeam = usersFromGitNotOnTeam.slice(0, 5);
			assigneeItems.push({ label: "-", key: "sep-git" });
			assigneeItems.push({
				label: (
					<span style={{ fontSize: "10px", fontWeight: "bold", opacity: 0.7 }}>
						SUGGESTIONS FROM GIT
					</span>
				),
				noHover: true,
				disabled: true,
			});
			assigneeItems = assigneeItems.concat(
				usersFromGitNotOnTeam.map(_ => {
					const label = _.displayName || _.email;
					return {
						icon: <Headshot size={16} display="inline-block" person={{ email: _.email }} />,
						key: _.id || `git-${_.email}`,
						label: label,
						searchLabel: _.displayName || _.email,
						subtext: label === _.email ? undefined : _.email,
						action: () => setAssignee(_.email, "Teammate"),
					};
				})
			);
		}

		let usersFromCodeStream = derivedState.teamMembers;

		if (assigneeEmail) {
			// if we have an assignee don't re-include them here
			usersFromCodeStream = usersFromCodeStream.filter(_ => _.email !== assigneeEmail);
		}

		if (usersFromCodeStream.length) {
			assigneeItems.push({ label: "-", key: "sep-nr" });
			assigneeItems.push({
				label: (
					<span style={{ fontSize: "10px", fontWeight: "bold", opacity: 0.7 }}>
						MY ORGANIZATION
					</span>
				),
				noHover: true,
				disabled: true,
			});
			assigneeItems = assigneeItems.concat(
				usersFromCodeStream.map(_ => {
					const label = _.fullName || _.email;
					return {
						icon: <Headshot size={16} display="inline-block" person={{ email: _.email }} />,
						key: _.id,
						label: _.fullName || _.email,
						searchLabel: _.fullName || _.username,
						subtext: label === _.email ? undefined : _.email,
						action: () => setAssignee(_.email, "Teammate"),
					};
				})
			);
		}
		setItems(assigneeItems);
	};

	useDidMount(() => {
		if (props.isCollapsed) return;

		buildStates();
		buildAssignees();
	});

	const title = (props.codeError?.title || "").split(/(\.)/).map(part => (
		<>
			{part}
			<wbr />
		</>
	));

	const resolutionDropdownOptionsWrapperOpacity = () => {
		if (
			(!derivedState.hideCodeErrorInstructions && props.resolutionTip) ||
			derivedState.hideCodeErrorInstructions
		) {
			return "1";
		}

		return ".25";
	};

	const errorGroupHasNoAssignee = () => {
		return (
			props.errorGroup &&
			(!props.errorGroup.assignee ||
				(!props.errorGroup.assignee.email && !props.errorGroup.assignee.id))
		);
	};

	const handleEntityLinkClick = (e, url) => {
		e.preventDefault();
		e.stopPropagation();
		HostApi.instance.track("codestream/newrelic_link clicked", {
			entity_guid: props.errorGroup?.entityGuid,
			account_id: props.errorGroup?.accountId,
			meta_data: "destination: apm_service_summary",
			meta_data_2: `codestream_section: error`,
			event_type: "click",
		});
		HostApi.instance.send(OpenUrlRequestType, {
			url,
		});
	};

	return (
		<>
			{!props.isCollapsed && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							paddingTop: "2px",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							marginBottom: "10px",
						}}
					>
						<HealthIcon
							color={ALERT_SEVERITY_COLORS[props.errorGroup?.entityAlertingSeverity || ""]}
						/>

						<ApmServiceTitle>
							<Tooltip title="Open Entity on New Relic" placement="bottom" delay={1}>
								<span style={{ opacity: derivedState.hideCodeErrorInstructions ? "1" : ".25" }}>
									<>
										{props.errorGroup && (
											<>
												<Link
													onClick={e => {
														handleEntityLinkClick(e, props.errorGroup?.entityUrl);
													}}
												>
													<span className="subtle">{props.errorGroup.entityName}</span>{" "}
													<Icon name="link-external" className="open-external"></Icon>
												</Link>
											</>
										)}
									</>
								</span>
							</Tooltip>
						</ApmServiceTitle>
					</div>

					<div style={{ marginLeft: "auto", alignItems: "center", whiteSpace: "nowrap" }}>
						<DropdownButton
							title="Assignee"
							items={items}
							variant="secondary"
							size="compact"
							noChevronDown={!errorGroupHasNoAssignee()}
						>
							<div
								style={{
									display: "inline-block",
									opacity: derivedState.hideCodeErrorInstructions ? "1" : ".25",
								}}
							>
								<>
									{props.errorGroup && (
										<>
											{isAssigneeChanging ? (
												<Icon name="sync" className="spin" />
											) : (
												<>
													{errorGroupHasNoAssignee() ? (
														<Icon name="person" />
													) : (
														<Headshot
															size={16}
															display="inline-block"
															className="no-right-margin"
															person={{
																fullName: props.errorGroup.assignee?.name,
																email: props.errorGroup.assignee?.email,
															}}
														/>
													)}
												</>
											)}
										</>
									)}
								</>
							</div>
						</DropdownButton>

						{states && (
							<>
								<div style={{ display: "inline-block", width: "5px" }} />

								<DropdownButton
									items={states}
									selectedKey={props.errorGroup?.state || "UNKNOWN"}
									isLoading={isStateChanging}
									variant="secondary"
									size="compact"
									onButtonClicked={_e => {}}
									wrap
								>
									<div
										style={{
											display: "inline-block",
											opacity: resolutionDropdownOptionsWrapperOpacity(),
										}}
									>
										{STATES_TO_DISPLAY_STRINGS[props.errorGroup?.state || "UNKNOWN"]}
									</div>
								</DropdownButton>
							</>
						)}

						<>
							{props.codeError && (
								<>
									<div style={{ display: "inline-block", width: "5px" }} />
									<div
										style={{
											display: "inline-block",
											opacity: derivedState.hideCodeErrorInstructions ? "1" : ".25",
										}}
									>
										<CodeErrorMenu
											codeError={props.codeError}
											errorGroup={props.errorGroup}
											isCollapsed={props.isCollapsed}
										/>
									</div>
								</>
							)}
						</>
					</div>
				</div>
			)}
			<Header>
				<Icon name="alert" className="type" />
				<BigTitle>
					<HeaderActions></HeaderActions>
					<ApmServiceTitle>
						<Tooltip
							title={
								derivedState.isCurrentUserInternal
									? props.codeError?.entityGuid
									: props.errorGroup?.errorGroupUrl && props.codeError?.title
									? "Open Error on New Relic"
									: ""
							}
							placement="bottom"
							delay={1}
						>
							{props.errorGroup?.errorGroupUrl && props.codeError.title ? (
								<span data-testid="code-error-title">
									<Link
										onClick={e => {
											e.preventDefault();
											HostApi.instance.track("codestream/newrelic_link clicked", {
												entity_guid: props.errorGroup?.entityGuid,
												account_id: props.errorGroup?.accountId,
												meta_data: "destination: error_group",
												meta_data_2: `codestream_section: error`,
												event_type: "click",
											});
											HostApi.instance.send(OpenUrlRequestType, {
												url: `${props.errorGroup
													?.errorGroupUrl!}&utm_source=codestream&utm_medium=ide-${
													derivedState.ideName
												}&utm_campaign=error_group_link`,
											});
										}}
									>
										{title} <Icon name="link-external" className="open-external"></Icon>
									</Link>
								</span>
							) : (
								<span data-testid="code-error-title">{title}</span>
							)}
						</Tooltip>
					</ApmServiceTitle>
				</BigTitle>
			</Header>
		</>
	);
};
