import {
	RegisterNrUserRequestType,
	GetNewRelicSignupJwtTokenRequestType
} from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import React, { useEffect } from "react";
import { HostApi } from "../webview-api";
import Icon from "../Stream/Icon";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import styled from "styled-components";
import { useDidMount } from "../utilities/hooks";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { logError } from "../logger";
import { CodeStreamState } from "@codestream/webview/store";
import { LoginResult } from "@codestream/protocols/api";
import { goToNewUserEntry, goToCompanyCreation, goToLogin } from "../store/context/actions";
import { handleSelectedRegion, setSelectedRegion } from "../store/session/actions";
import { completeSignup } from "./actions";
// TODO: BRIAN FIX (remove this dependency)...
import { ModalRoot } from "../Stream/Modal"; // HACK ALERT: including this component is NOT the right way
import Tooltip from "../Stream/Tooltip";
import { TooltipIconWrapper } from "./Signup";
import { Dropdown } from "../Stream/Dropdown";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";

const FooterWrapper = styled.div`
	text-align: center;
`;

const ErrorMessageWrapper = styled.div`
	margin: 0 0 10px 0;'
`;

export const SignupNewRelic = () => {
	//Local state
	const [showEmailErrorMessage, setShowEmailErrorMessage] = React.useState(false);
	const [showGenericErrorMessage, setShowGenericErrorMessage] = React.useState(false);
	const [existingEmail, setExistingEmail] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [apiKey, setApiKey] = React.useState("");
	const [inviteConflict, setInviteConflict] = React.useState(false);

	//Redux declarations
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
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
			supportsMultiRegion
		};
	});

	useDidMount(() => {
		if (derivedState.webviewFocused) {
			HostApi.instance.track("Page Viewed", { "Page Name": "Signup with NR" });
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
			}
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
				accountIsConnected
			} = await HostApi.instance.send(RegisterNrUserRequestType, data);

			setLoading(false);

			const sendTelemetry = () => {
				HostApi.instance.track("Account Created", {
					email: email,
					"Auth Provider": "New Relic",
					Source: derivedState.pendingProtocolHandlerQuerySource
				});
				HostApi.instance.track("NR Connected", {
					"Connection Location": "Onboarding"
				});
			};

			switch (status) {
				// CompanyCreation should handle routing on success
				case LoginResult.Success:
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
								provider: "newrelic"
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
					// invited @TODO: this could be handled cleaner
					if (email && token && teamId) {
						sendTelemetry();
						completeSignup(email, token!, teamId!, {
							createdTeam: false
						});
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
				detail: `Unexpected error during nr registration request`
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
											{text => <Link href="mailto:support@codestream.com">{text}</Link>}
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
									alignItems: "stretch"
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
