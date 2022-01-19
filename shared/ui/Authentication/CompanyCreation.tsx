import React, { useState, useCallback } from "react";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { FormattedMessage } from "react-intl";
import { goToLogin } from "../store/context/actions";
import { updateConfigs } from "../store/configs/actions";
import { logError } from "../logger";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../Stream/Icon";
import { useDidMount } from "../utilities/hooks";
import styled from "styled-components";
import { Loading } from "../Container/Loading";
import { HostApi } from "..";
import { completeSignup, ProviderNames } from "./actions";
import {
	CreateCompanyRequestType,
	JoinCompanyRequestType,
	JoinCompanyResponse
} from "@codestream/protocols/agent";
import { changeRegistrationEmail } from "../store/session/actions";
import { CSCompany, CSEligibleJoinCompany } from "@codestream/protocols/api";
import { isUndefined as _isUndefined } from "lodash-es";
import { ReloadAllWindows } from "./ReloadAllWindows";
import { ModalRoot } from "../Stream/Modal";
import { CodeStreamState } from "@codestream/webview/store";

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

const PRODUCTION_SERVER_URL = "https://api.codestream.com";

interface EnhancedCSCompany {
	id: string;
	memberCount?: number;
	name: string;
	_type: "Domain" | "Invite Detected";
}

export function CompanyCreation(props: {
	userId?: string;
	email?: string;
	token?: string;
	domain?: string;
	provider?: string;
	isWebmail?: boolean;
	onComplete?: Function;
	companies?: CSCompany[];
	eligibleJoinCompanies?: CSEligibleJoinCompany[];
	accountIsConnected?: boolean;
}) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			serverUrl: state.configs.serverUrl
		};
	});
	const providerName = props.provider
		? ProviderNames[props.provider.toLowerCase()] || props.provider
		: "CodeStream";

	const onClickTryAnother = useCallback(async (event: React.FormEvent) => {
		event.preventDefault();

		HostApi.instance.track("Try Another Email", {
			"Discarded Email": props.email,
			"Auth Provider": providerName
		});
		dispatch(changeRegistrationEmail(props.userId!));
	}, []);

	const [organizations, setOrganizations] = React.useState<EnhancedCSCompany[]>([]);
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
			: ""
	});
	const [teamNameValidity, setTeamNameValidity] = useState(true);
	const [requiresHelpText, setRequiresHelpText] = useState(false);

	useDidMount(() => {
		if (!_isUndefined(props.isWebmail)) {
			dispatch(updateConfigs({ isWebmail: props.isWebmail }));
		}

		let companiesToJoin: EnhancedCSCompany[] | undefined = undefined;
		if (props.eligibleJoinCompanies || props.companies) {
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
			setOrganizations(companiesToJoin);

			setIsLoading(false);
		}

		if (!companiesToJoin || !companiesToJoin.length) {
			createOrganization();
		} else {
			HostApi.instance.track("Organization Options Presented", {
				"Domain Orgs":
					props.eligibleJoinCompanies && props.eligibleJoinCompanies.length ? true : false,
				"Auth Provider": providerName
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
				const { team } = await HostApi.instance.send(CreateCompanyRequestType, {
					name: organizationSettings.companyName!
				});
				HostApi.instance.track("New Organization Created", {
					"Domain Joining": props.isWebmail ? "Not Available" : "Off",
					"Auth Provider": providerName
				});

				dispatch(
					completeSignup(props.email!, props.token!, team.id, {
						createdTeam: true,
						provider: props.provider
					})
				);
			} catch (error) {
				const errorMessage = typeof error === "string" ? error : error.message;
				logError(`Unexpected error during company creation: ${errorMessage}`, {
					companyName: organizationSettings.companyName
				});
				dispatch(goToLogin());
			}
		}
	};

	const onClickJoinOrganization = async (organization: EnhancedCSCompany) => {
		setIsLoadingJoinTeam(organization.id);

		try {
			const result = (await HostApi.instance.send(JoinCompanyRequestType, {
				companyId: organization.id
			})) as JoinCompanyResponse;

			HostApi.instance.track("Joined Organization", {
				Availability: organization._type,
				"Auth Provider": providerName
			});
			dispatch(
				completeSignup(props.email!, props.token!, result.team.id, {
					createdTeam: false,
					provider: props.provider,
					byDomain: true
				})
			);
		} catch (error) {
			const errorMessage = typeof error === "string" ? error : error.message;
			logError(`Unexpected error during company join: ${errorMessage}`, {
				companyId: organization.id
			});
			setIsLoadingJoinTeam(undefined);
			dispatch(goToLogin());
		}
	};

	const orgCallIsLoading = () => {
		return isLoading || isCreatingOrg;
	};

	const isNewRelicStaffOnProductionEnvironment = () => {
		return (
			props.email &&
			/@newrelic\.com$/.test(props.email) &&
			derivedState.serverUrl === PRODUCTION_SERVER_URL
		);
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
									{!isNewRelicStaffOnProductionEnvironment() && (
										<>
											<JoinHeader>
												<FormattedMessage
													id="signUp.joinOrganization"
													defaultMessage="Join your teammates on CodeStream"
												/>
											</JoinHeader>
											<div>
												<FormattedMessage
													id="signUp.joinOrganizationHelp"
													defaultMessage="These organizations are available based on your email domain."
												/>
											</div>
										</>
									)}

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
												{organizations.map(_ => {
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
												{!organizations.length && props.accountIsConnected && (
													<div>
														Some people from your account on New Relic are already in an
														organization on CodeStream. Ask them to invite you.
													</div>
												)}
												{!organizations.length && !props.accountIsConnected && (
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
