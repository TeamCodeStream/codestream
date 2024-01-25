import { RegisterNrUserRequestType } from "@codestream/protocols/agent";
import { LoginResult } from "@codestream/protocols/api";
import { CodeStreamState } from "@codestream/webview/store";
import { handleSelectedRegion, setSelectedRegion } from "@codestream/webview/store/session/thunks";
import React, { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";
import { logError } from "../logger";
import { goToCompanyCreation, goToLogin, goToNewUserEntry } from "../store/context/actions";
import Button from "../Stream/Button";
import Icon from "../Stream/Icon";
import { Link } from "../Stream/Link";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { completeSignup } from "./actions";
// TODO: BRIAN FIX (remove this dependency)...
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { Dropdown } from "../Stream/Dropdown";
import { ModalRoot } from "../Stream/Modal"; // HACK ALERT: including this component is NOT the right way
import Tooltip from "../Stream/Tooltip";
import { TooltipIconWrapper } from "./Signup";

const FooterWrapper = styled.div`
	text-align: center;
`;

const ErrorMessageWrapper = styled.div`
	margin: 0 0 10px 0;'
`;

export const SignupNewRelic = () => {
	//Local state
	const [showEmailErrorMessage, setShowEmailErrorMessage] = useState(false);
	const [showGenericErrorMessage, setShowGenericErrorMessage] = useState(false);
	const [existingEmail, setExistingEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [inviteConflict, setInviteConflict] = useState(false);

	//Redux declarations
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { environmentHosts } = state.configs;
		const { selectedRegion, forceRegion } = state.context.__teamless__ || {};
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");

		return {
			ide: state.ide,
			webviewFocused: state.context.hasFocus,
			isProductionCloud: state.configs.isProductionCloud,
			pendingProtocolHandlerQuerySource: state.context.pendingProtocolHandlerQuery?.src,
			environmentHosts,
			selectedRegion,
			forceRegion,
			supportsMultiRegion,
			machineId: state.session.machineId || "0",
		};
	});

	useDidMount(() => {
		if (derivedState.webviewFocused) {
			HostApi.instance.track("codestream/sign_in page_viewed", { event_type: "page_view" });
		}
	});

	const getApiKeyUrl = derivedState.isProductionCloud
		? "https://one.newrelic.com/launcher/api-keys-ui.api-keys-launcher"
		: "https://staging-one.newrelic.com/launcher/api-keys-ui.api-keys-launcher";

	const { environmentHosts, selectedRegion, forceRegion, supportsMultiRegion } = derivedState;

	useEffect(() => {
		dispatch(handleSelectedRegion());
	}, [environmentHosts, selectedRegion, forceRegion]);

	let regionItems, forceRegionName, selectedRegionName;
	if (supportsMultiRegion && environmentHosts && environmentHosts.length > 1) {
		regionItems = environmentHosts.map(host => ({
			key: host.shortName,
			label: host.name,
			action: () => {
				dispatch(setSelectedRegion(host.shortName));
			},
		}));

		if (forceRegion) {
			const forceHost = environmentHosts.find(host => host.shortName === forceRegion);
			if (forceHost) {
				forceRegionName = forceHost.name;
			}
		} else if (selectedRegion) {
			const selectedHost = environmentHosts.find(host => host.shortName === selectedRegion);
			if (selectedHost) {
				selectedRegionName = selectedHost.name;
			}
		} else {
			selectedRegionName = environmentHosts[0]?.name;
		}
	}

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setLoading(true);

		let data = { apiKey };
		try {
			const {
				teamId,
				token,
				status,
				email,
				notInviteRelated,
				eligibleJoinCompanies,
				isWebmail,
				accountIsConnected,
			} = await HostApi.instance.send(RegisterNrUserRequestType, data);

			setLoading(false);

			const sendTelemetry = () => {
				HostApi.instance.track("Account Created", {
					email: email,
					"Auth Provider": "New Relic",
					Source: derivedState.pendingProtocolHandlerQuerySource,
				});
				HostApi.instance.track("NR Connected", {
					"Connection Location": "Onboarding",
				});
			};

			switch (status) {
				// CompanyCreation should handle routing on success
				case LoginResult.Success:
					if (email && token && teamId) {
						sendTelemetry();
						dispatch(
							completeSignup(email, token!, teamId!, {
								createdTeam: false,
							})
						);
					}
					break;
				case LoginResult.NotInCompany:
				case LoginResult.NotOnTeam: {
					sendTelemetry();
					if (email && token) {
						dispatch(
							goToCompanyCreation({
								token,
								email,
								eligibleJoinCompanies,
								isWebmail,
								accountIsConnected,
								provider: "newrelic",
							})
						);
					}
					break;
				}
				case LoginResult.AlreadyConfirmed: {
					// already has an account
					if (notInviteRelated && email) {
						setShowEmailErrorMessage(true);
						setShowGenericErrorMessage(false);
						setExistingEmail(email);
					}
					break;
				}
				case LoginResult.InviteConflict: {
					setInviteConflict(true);
					break;
				}
				default:
					throw status;
			}
		} catch (error) {
			setShowGenericErrorMessage(true);
			setShowEmailErrorMessage(false);
			logError(error, {
				detail: `Unexpected error during nr registration request`,
			});
		}
	};

	return (
		<div className="standard-form vscroll">
			<ModalRoot />
			<fieldset className="form-body">
				<h3>Sign Up with New Relic</h3>
				<div id="controls">
					<div id="token-controls" className="control-group">
						<div className="control-group">
							{showEmailErrorMessage && (
								<ErrorMessageWrapper>
									<div className="error-message">
										An account already exists for {existingEmail}.
										<div>
											<Link
												onClick={e => {
													e.preventDefault();
													dispatch(goToLogin());
												}}
											>
												Sign In
											</Link>
										</div>
									</div>
								</ErrorMessageWrapper>
							)}
							{showGenericErrorMessage && (
								<ErrorMessageWrapper>
									<div className="error-message">Invalid API Key</div>
								</ErrorMessageWrapper>
							)}
							{inviteConflict && (
								<ErrorMessageWrapper>
									<div className="error-message">
										Invitation conflict.{" "}
										<FormattedMessage id="contactSupport" defaultMessage="Contact support">
											{text => <Link href="https://one.newrelic.com/help-xp">{text}</Link>}
										</FormattedMessage>
										.
									</div>
								</ErrorMessageWrapper>
							)}
							{regionItems && !forceRegionName && (
								<>
									Region:{" "}
									<Dropdown selectedValue={selectedRegionName} items={regionItems} noModal={true} />{" "}
									<Tooltip
										placement={"bottom"}
										title={`Select the region where your CodeStream data should be stored.`}
									>
										<TooltipIconWrapper>
											<Icon name="question" />
										</TooltipIconWrapper>
									</Tooltip>
								</>
							)}
							{forceRegionName && <>Region: {forceRegionName}</>}
							<br />
							<br />
							<label>
								Enter your New Relic user API key.{" "}
								<Link href={getApiKeyUrl}>Get your API key.</Link>
							</label>
							<div
								style={{
									width: "100%",
									display: "flex",
									alignItems: "stretch",
								}}
							>
								<div style={{ position: "relative", flexGrow: 10 }}>
									<input
										id="configure-provider-initial-input"
										className="input-text control"
										type="password"
										name="apiKey"
										tabIndex={1}
										autoFocus
										onChange={e => setApiKey(e.target.value)}
										required
									/>
								</div>
							</div>
							<div className="control-group" style={{ margin: "15px 0px" }}>
								<Button
									id="save-button"
									tabIndex={2}
									style={{ marginTop: "0px" }}
									className="row-button"
									onClick={onSubmit}
									loading={loading}
								>
									<Icon name="newrelic" />
									<div className="copy">Create Account</div>
									<Icon name="chevron-right" />
								</Button>
							</div>
						</div>
					</div>
				</div>
				<FooterWrapper>
					<div className="footer">
						<small className="fine-print">
							<FormattedMessage id="signUp.legal.start" />{" "}
							<FormattedMessage id="signUp.legal.terms">
								{text => <Link href="https://codestream.com/terms">{text}</Link>}
							</FormattedMessage>{" "}
							<FormattedMessage id="and" />{" "}
							<FormattedMessage id="signUp.legal.privacyPolicy">
								{text => <Link href="https://newrelic.com/termsandconditions/privacy">{text}</Link>}
							</FormattedMessage>
						</small>

						<div>
							<p>
								<Link
									onClick={e => {
										e.preventDefault();
										dispatch(goToNewUserEntry());
									}}
								>
									{"< Back"}
								</Link>
							</p>
						</div>
					</div>
				</FooterWrapper>
			</fieldset>
		</div>
	);
};
