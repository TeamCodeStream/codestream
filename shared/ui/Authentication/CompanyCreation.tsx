import React, { useState, useCallback } from "react";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { FormattedMessage } from "react-intl";
import { goToLogin } from "../store/context/actions";
import { updateConfigs } from "../store/configs/actions";
import { useDispatch } from "react-redux";
import Icon from "../Stream/Icon";
import { useDidMount } from "../utilities/hooks";
import styled from "styled-components";
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

export const CheckboxRow = styled.div`
	padding: 5px 0 5px 0;
`;

const JoinHeader = styled.h3`
	margin: 0 0 5px 0;
`;

const CreateOrgWrapper = styled.div`
	margin: 10px 0 5px 0;
`;
const isTeamNameValid = (name: string) => name.length > 0;

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
	const [isLoadingJoinTeam, setIsLoadingJoinTeam] = React.useState(false);
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
			setIsLoading(true);
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
				// TODO: communicate error
				dispatch(goToLogin());
			}
		}
	};

	const onClickJoinOrganization = async (organization: EnhancedCSCompany) => {
		setIsLoadingJoinTeam(true);

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
		} catch (ex) {
			console.error(ex);
			dispatch(goToLogin());
		}
	};

	return (
		<div id="organization-page" className="onboarding-page">
			<div className="standard-form">
				<fieldset className="form-body">
					<div id="controls">
						<div className="border-bottom-box">
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
							{isLoading && (
								<div>
									<Icon name="sync" loading={true} /> Loading organizations...
								</div>
							)}
							<div>
								{!isLoading && (
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
															loading={isLoadingJoinTeam}
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
												Some people from your account on New Relic are already in an organization on
												CodeStream. Ask them to invite you.
											</div>
										)}
										{!organizations.length && !props.accountIsConnected && (
											<div>
												We didn't find any organizations for you to join based on email domain.
												<br />
												{props.isWebmail ? (
													<Link onClick={onClickTryAnother}>Try using your work email address</Link>
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
							<CreateOrgWrapper>
								Or, you{" "}
								<Link onClick={onClickCreateOrganization}>can create your own organization.</Link>
							</CreateOrgWrapper>
						</div>
					</div>
				</fieldset>
			</div>
		</div>
	);
}
