import {
	CreateCompanyRequestType,
	EnvironmentHost,
	JoinCompanyRequest,
	JoinCompanyRequestType,
	JoinCompanyResponse,
} from "@codestream/protocols/agent";
import { CSCompany, CSEligibleJoinCompany, CSUser } from "@codestream/protocols/api";
import { isUndefined as _isUndefined } from "lodash-es";
import React, { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";

import { CodeStreamState } from "@codestream/webview/store";
import { updateConfigs } from "@codestream/webview/store/configs/slice";
import { changeRegistrationEmail, setEnvironment } from "@codestream/webview/store/session/thunks";
import { HostApi } from "@codestream/webview/webview-api";
import { logError } from "../logger";
import { goToLogin } from "../store/context/actions";
import Button from "../Stream/Button";
import Icon from "../Stream/Icon";
import { Link } from "../Stream/Link";
import { ModalRoot } from "../Stream/Modal";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { completeSignup, ProviderNames } from "./actions";
import { ReloadAllWindows } from "./ReloadAllWindows";

export const CheckboxRow = styled.div`
	padding: 5px 0 5px 0;
`;

const JoinHeader = styled.h3`
	margin: 0 0 5px 0;
`;

const CreateOrgWrapper = styled.div`
	margin: 10px 0 5px 0;
`;

const InlineLoadingWrapper = styled.div`
	margin: 20px 0 0 0;
`;

const NrUserButtonCopy = styled.b`
	font-size: 14px !important;
`;

const NrUserButtonWrapper = styled.div`
	margin: 10px 0 20px 0;
`;

const isTeamNameValid = (name: string) => name.length > 0;

interface EnhancedCSCompany {
	id: string;
	memberCount?: number;
	name: string;
	_type: "Domain" | "Invite Detected";
	host?: EnvironmentHost;
	byInvite?: boolean;
}

export function CompanyCreation(props: {
	userId?: string;
	user?: CSUser;
	email?: string;
	token?: string;
	domain?: string;
	provider?: string;
	isWebmail?: boolean;
	onComplete?: Function;
	companies?: CSCompany[];
	eligibleJoinCompanies?: CSEligibleJoinCompany[];
	accountIsConnected?: boolean;
	nrSignupTestUi?: boolean;
	forceCreateCompany?: boolean;
}) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { configs } = state;
		return {
			serverUrl: configs.serverUrl,
			isProductionCloud: state.configs.isProductionCloud,
		};
	});
	const providerName = props.provider
		? ProviderNames[props.provider.toLowerCase()] || props.provider
		: "Email";

	const onClickTryAnother = useCallback(async (event: React.FormEvent) => {
		event.preventDefault();

		HostApi.instance.track("Try Another Email", {
			"Discarded Email": props.email,
			"Auth Provider": providerName,
		});
		dispatch(changeRegistrationEmail(props.userId!));
	}, []);

	const [organizationsDomain, setOrganizationsDomain] = React.useState<EnhancedCSCompany[]>([]);
	const [organizationsInvite, setOrganizationsInvite] = React.useState<EnhancedCSCompany[]>([]);
	const [hasOrganizations, setHasOrganizations] = React.useState<boolean>(false);

	const [isLoading, setIsLoading] = React.useState(false);
	const [isCreatingOrg, setIsCreatingOrg] = React.useState(false);
	const [initialLoad, setInitialLoad] = React.useState(true);
	const [showReloadAllWindows, setShowReloadAllWindows] = React.useState(false);
	const [isLoadingJoinTeam, setIsLoadingJoinTeam] = React.useState<string | undefined>(undefined);
	const initialCompanyName =
		props.email && !props.isWebmail && !_isUndefined(props.isWebmail)
			? props.email.split("@")[1].split(".")[0]
			: "My Organization";
	const initialAllowDomainJoining = _isUndefined(props.isWebmail) ? false : true;
	const [organizationSettings, setOrganizationSettings] = React.useState<{
		companyName?: string;
		allowDomainJoining?: boolean;
	}>({
		allowDomainJoining: initialAllowDomainJoining,
		companyName: initialCompanyName
			? initialCompanyName.charAt(0).toUpperCase() + initialCompanyName.slice(1)
			: "",
	});
	const [teamNameValidity, setTeamNameValidity] = useState(true);

	useDidMount(() => {
		if (!_isUndefined(props.isWebmail)) {
			dispatch(updateConfigs({ isWebmail: props.isWebmail }));
		}

		let companiesToJoin: EnhancedCSCompany[] | undefined = undefined;
		let organizationsByDomain = [] as EnhancedCSCompany[];
		let organizationsByInvite = [] as EnhancedCSCompany[];
		if (!props.forceCreateCompany && (props.eligibleJoinCompanies || props.companies)) {
			setIsLoading(true);
			let obj = {};
			if (props.eligibleJoinCompanies) {
				props.eligibleJoinCompanies.forEach(_ => {
					obj[_.id] = { ..._, _type: "Domain" };
				});
			}
			if (props.companies) {
				props.companies.forEach(_ => {
					obj[_.id] = { ..._, _type: "Invite Detected" };
				});
			}
			companiesToJoin = Object.keys(obj).map(_ => {
				return obj[_];
			}) as EnhancedCSCompany[];

			if (companiesToJoin.length > 0) setHasOrganizations(true);

			companiesToJoin.forEach(_ => {
				if (_.byInvite) {
					organizationsByInvite.push(_);
				} else {
					organizationsByDomain.push(_);
				}
			});

			setOrganizationsDomain(organizationsByDomain);
			setOrganizationsInvite(organizationsByInvite);
			setIsLoading(false);
		}

		if (!companiesToJoin || !companiesToJoin.length) {
			createOrganization();
		} else {
			HostApi.instance.track("Organization Options Presented", {
				"Domain Orgs": organizationsByDomain && organizationsByDomain.length ? true : false,
				"Invite Orgs": organizationsByInvite && organizationsByInvite.length ? true : false,
				"Auth Provider": providerName,
			});
			setInitialLoad(false);
		}
	});

	const domain = React.useMemo(() => {
		return props.email?.split("@")[1].toLowerCase();
	}, [props.email]);

	const onClickCreateOrganization = async event => {
		event.preventDefault();
		createOrganization();
	};

	const createOrganization = async () => {
		if (
			organizationSettings.companyName != null &&
			organizationSettings.companyName !== "" &&
			teamNameValidity
		) {
			setIsCreatingOrg(true);
			setInitialLoad(false);
			try {
				const { team, accessToken } = await HostApi.instance.send(CreateCompanyRequestType, {
					name: organizationSettings.companyName!,
				});
				HostApi.instance.track("New Organization Created", {
					"Domain Joining": props.isWebmail ? "Not Available" : "Off",
					"Auth Provider": providerName,
				});

				dispatch(
					completeSignup(props.email!, accessToken || props.token!, team.id, {
						createdTeam: true,
						provider: props.provider,
						nrSignupTestUi: props.nrSignupTestUi,
					})
				);
			} catch (error) {
				const errorMessage = typeof error === "string" ? error : error.message;
				logError(`Unexpected error during company creation: ${errorMessage}`, {
					companyName: organizationSettings.companyName,
				});
				dispatch(goToLogin());
			}
		}
	};

	const onClickJoinOrganization = async (organization: EnhancedCSCompany) => {
		setIsLoadingJoinTeam(organization.id);

		try {
			if (organization.host) {
				// now switch environments (i.e., host, region, etc) to join this organization
				console.log(
					`Joining company ${organization.name} requires switching host to ${organization.host.name} at ${organization.host.publicApiUrl}`
				);
				dispatch(setEnvironment(organization.host.shortName, organization.host.publicApiUrl));
			}

			const request: JoinCompanyRequest = {
				companyId: organization.id,
			};
			if (organization.host) {
				// explicitly add the environment to the request, since the switch-over may still be in progress
				// NOTE: we also add the server we are switching TO, since the call to set environments, above,
				// may not have actually sync'd through to the agent
				// isn't this fun???
				request.fromEnvironment = {
					serverUrl: derivedState.serverUrl,
					userId: props.userId!,
					toServerUrl: organization.host.publicApiUrl,
				};
			}
			const result = (await HostApi.instance.send(
				JoinCompanyRequestType,
				request
			)) as JoinCompanyResponse;

			const availabilityType = organization?.byInvite ? "Invite" : organization._type;

			HostApi.instance.track("Joined Organization", {
				Availability: availabilityType,
				"Auth Provider": providerName,
				Location: "Signup",
			});
			dispatch(
				completeSignup(
					props.email!,
					result.accessToken || props.token!,
					result.teamId || result?.team?.id,
					{
						createdTeam: false,
						provider: props.provider,
						byDomain: true,
						nrSignupTestUi: props.nrSignupTestUi,
						setEnvironment: organization.host
							? {
									environment: organization.host.shortName,
									serverUrl: organization.host.publicApiUrl,
							  }
							: undefined,
					}
				)
			);
		} catch (error) {
			const errorMessage = typeof error === "string" ? error : error.message;
			logError(`Unexpected error during company join: ${errorMessage}`, {
				companyId: organization.id,
			});
			setIsLoadingJoinTeam(undefined);
			dispatch(goToLogin());
		}
	};

	const orgCallIsLoading = () => {
		return isLoading || isCreatingOrg;
	};

	const isNewRelicStaffOnProductionEnvironment = () => {
		return props.email && /@newrelic\.com$/.test(props.email) && derivedState.isProductionCloud;
	};

	const handleClickSwitchStagingEnvironment = (event: React.SyntheticEvent) => {
		event.preventDefault();
		setShowReloadAllWindows(true);
	};

	const handleCloseReloadAllWindows = (event: React.SyntheticEvent) => {
		event.preventDefault();
		setShowReloadAllWindows(false);
	};

	return (
		<div id="organization-page" className="onboarding-page">
			<ModalRoot />
			{showReloadAllWindows && (
				<ReloadAllWindows
					email={props.email}
					userId={props.userId}
					handleClose={handleCloseReloadAllWindows}
				/>
			)}
			<div className="standard-form">
				<fieldset className="form-body">
					<div id="controls">
						<div className="border-bottom-box">
							{!isCreatingOrg && initialLoad && (
								<div>
									<Icon name="sync" loading={true} /> Looking for possible organizations to join...
								</div>
							)}
							{isCreatingOrg && !initialLoad && (
								<div>
									<Icon name="sync" loading={true} /> Creating organization...
								</div>
							)}
							{!isCreatingOrg && !initialLoad && (
								<>
									{/* 
									{!isNewRelicStaffOnProductionEnvironment() && (
									*/}
									<>
										<JoinHeader>
											<FormattedMessage
												id="signUp.joinOrganization"
												defaultMessage="Join your teammates on CodeStream"
											/>
										</JoinHeader>
									</>
									{/* 
									)}
									/*}

									{/* 
									{isNewRelicStaffOnProductionEnvironment() && (
										<>
											<JoinHeader>Relics, are you using the correct environment?</JoinHeader>
											<div>
												You are signing up in CodeStream's production environment, which is great
												for demos and testing. Join one of the organizations below, or create your
												own. But if you're a developer you should be using the "New Relic Product
												Org" in CodeStream's staging environment
											</div>
											<NrUserButtonWrapper>
												<Button
													onClick={e => handleClickSwitchStagingEnvironment(e)}
													className="control-button"
												>
													<div className="copy">
														<NrUserButtonCopy>Switch to the Staging Environment</NrUserButtonCopy>
													</div>
												</Button>
											</NrUserButtonWrapper>
										</>
									)}
									*/}

									{isLoading && (
										<InlineLoadingWrapper>
											<Icon name="sync" loading={true} /> Loading organizations...
										</InlineLoadingWrapper>
									)}
									{isCreatingOrg && (
										<InlineLoadingWrapper>
											<Icon name="sync" loading={true} /> Creating organization...
										</InlineLoadingWrapper>
									)}
									<div>
										{!orgCallIsLoading() && (
											<>
												{organizationsInvite.length > 0 && (
													<>
														<div style={{ marginTop: "10px" }}>
															<FormattedMessage
																id="signUp.joinOrganizationHelp"
																defaultMessage="Organizations you've been invited to."
															/>
														</div>
														{organizationsInvite.map(_ => {
															return (
																<div className="key-value-actions pt-3">
																	<div className="key-value-key">
																		{_.name} <br />
																		{_.memberCount} member{_.memberCount == 1 ? "" : "s"}
																	</div>
																	<div className="key-value-value">
																		<Button
																			onClick={e => onClickJoinOrganization(_)}
																			className="control-button"
																			loading={isLoadingJoinTeam === _.id}
																		>
																			<div className="copy">
																				<b>Join</b>
																			</div>
																		</Button>
																	</div>
																</div>
															);
														})}
													</>
												)}

												{organizationsDomain.length > 0 && (
													<>
														<div style={{ marginTop: "20px" }}>
															<FormattedMessage
																id="signUp.joinOrganizationHelp"
																defaultMessage="Organizations you can join based on email domain."
															/>
														</div>
														{organizationsDomain.map(_ => {
															return (
																<div className="key-value-actions pt-3">
																	<div className="key-value-key">
																		{_.name} <br />
																		{_.memberCount} member{_.memberCount == 1 ? "" : "s"}
																	</div>
																	<div className="key-value-value">
																		<Button
																			onClick={e => onClickJoinOrganization(_)}
																			className="control-button"
																			loading={isLoadingJoinTeam === _.id}
																		>
																			<div className="copy">
																				<b>Join</b>
																			</div>
																		</Button>
																	</div>
																</div>
															);
														})}
													</>
												)}

												{!hasOrganizations && props.accountIsConnected && (
													<div>
														Some people from your account on New Relic are already in an
														organization on CodeStream. Ask them to invite you.
													</div>
												)}
												{!hasOrganizations && !props.accountIsConnected && (
													<div>
														We didn't find any organizations for you to join based on email domain.
														<br />
														{props.isWebmail ? (
															<Link onClick={onClickTryAnother}>
																Try using your work email address
															</Link>
														) : (
															<Link onClick={onClickTryAnother}>
																Try using a different email address
															</Link>
														)}
													</div>
												)}
											</>
										)}
									</div>
								</>
							)}
							{!initialLoad && !isCreatingOrg && (
								<CreateOrgWrapper>
									Or, you{" "}
									<Link onClick={onClickCreateOrganization}>can create your own organization.</Link>
								</CreateOrgWrapper>
							)}
						</div>
					</div>
				</fieldset>
			</div>
		</div>
	);
}
