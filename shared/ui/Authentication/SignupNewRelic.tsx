import {
	RegisterNrUserRequestType,
	GetNewRelicSignupJwtTokenRequestType
} from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import React from "react";
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
import { completeSignup } from "./actions";

const FooterWrapper = styled.div`
	text-align: center;
`;

const ErrorMessageWrapper = styled.div`
	margin: 0 0 10px 0;'
`;

export const SignupNewRelic = () => {
	//Local state
	const [showErrorMessage, setShowErrorMessage] = React.useState(false);
	const [existingEmail, setExistingEmail] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [apiKey, setApiKey] = React.useState("");
	const [inviteConflict, setInviteConflict] = React.useState(false);

	//Redux declarations
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		console.log(state);
		return {
			ide: state.ide,
			webviewFocused: state.context.hasFocus,
			isProductionCloud: state.configs.isProductionCloud
		};
	});

	useDidMount(() => {
		if (derivedState.webviewFocused) {
			HostApi.instance.track("Page Viewed", { "Page Name": "Signup with NR" });
		}
	});

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setLoading(true);
		//@TODO: add eu support
		const apiRegion = derivedState.isProductionCloud ? "" : "staging";
		let data = { apiKey, apiRegion };

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
			HostApi.instance.track("NR Connected", {
				"Connection Location": "Onboard"
			});
			setLoading(false);

			switch (status) {
				// CompanyCreation should handle routing on success
				case LoginResult.Success:
				case LoginResult.NotInCompany:
				case LoginResult.NotOnTeam: {
					if (email && token) {
						dispatch(
							goToCompanyCreation({
								token,
								email,
								eligibleJoinCompanies,
								isWebmail,
								accountIsConnected
							})
						);
					}
					break;
				}
				case LoginResult.AlreadyConfirmed: {
					// already has an account
					if (notInviteRelated && email) {
						setShowErrorMessage(true);
						setExistingEmail(email);
					}
					// invited @TODO: this could be handled cleaner
					if (email && token && teamId) {
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
			logError(`Unexpected error during nr registration request: ${error}`);
		}
	};

	const handleGetApiKeyClick = async () => {
		const { token, baseLandingUrl } = await HostApi.instance.send(
			GetNewRelicSignupJwtTokenRequestType,
			{}
		);
		const url =
			`${baseLandingUrl}/codestream/signup` +
			`?token=${token}` +
			`&utm_source=codestream` +
			`&utm_medium=${derivedState.ide.name}` +
			`&utm_campaign=nr_getapikey`;
		void HostApi.instance.send(OpenUrlRequestType, { url });
	};

	return (
		<div className="standard-form vscroll">
			<fieldset className="form-body">
				<h3>Sign Up with New Relic</h3>
				<div id="controls">
					<div id="token-controls" className="control-group">
						<div className="control-group">
							{showErrorMessage && (
								<ErrorMessageWrapper>
									<div className="error-message">
										An account already exists for {existingEmail}.{" "}
										<Link
											onClick={e => {
												e.preventDefault();
												dispatch(goToLogin());
											}}
										>
											Sign In
										</Link>
									</div>
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
							<label>
								Enter your New Relic user API key.{" "}
								<Link
									onClick={e => {
										e.preventDefault();
										handleGetApiKeyClick();
									}}
								>
									Get your API key.
								</Link>
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
										type="text"
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
								{text => <Link href="https://codestream.com/privacy">{text}</Link>}
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
