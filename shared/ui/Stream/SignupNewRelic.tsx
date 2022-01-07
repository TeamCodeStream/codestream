import {
	RegisterNrUserRequestType,
	GetNewRelicSignupJwtTokenRequestType
} from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import React, { Component } from "react";
import { HostApi } from "../webview-api";
import Button from "./Button";
import Icon from "./Icon";
import { Link } from "./Link";
import styled from "styled-components";
import { useDidMount } from "../utilities/hooks";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { goToLogin, goToNewUserEntry } from "../store/context/actions";
import { configureProvider } from "../store/providers/actions";
import { ThunkDispatch } from "redux-thunk";
import { logError } from "../logger";
import { Action } from "redux";
import { CodeStreamState } from "@codestream/webview/store";

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

	//Redux declarations
	const dispatch = useDispatch<ThunkDispatch<any, any, Action>>();
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

	const buildApiUrl = () => {
		return derivedState.isProductionCloud
			? "https://api.newrelic.com"
			: "https://staging-api.newrelic.com";
	};

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setLoading(true);
		const apiRegion = derivedState.isProductionCloud ? "" : "staging";
		let data = { apiKey, apiRegion };
		let providerId = "newrelic*com";
		let apiUrl = buildApiUrl();

		try {
			const response = await HostApi.instance.send(RegisterNrUserRequestType, data);
			setLoading(false);
			if (response?.info?.message === "This user is already registered and confirmed") {
				setShowErrorMessage(true);
				setExistingEmail("bob@builder.com");
			}
			HostApi.instance.track("NR Connected", {
				"Connection Location": "Onboard"
			});
		} catch (error) {
			setLoading(false);
			logError(`Error configuring NR: ${error}`);
		}

		// try {
		// 	switch (status) {
		// 		case LoginResult.Success: {
		// 			sendTelemetry();
		// 			dispatch(
		// 				goToEmailConfirmation({
		// 					email: attributes.email,
		// 					teamId: props.teamId,
		// 					registrationParams: attributes
		// 				})
		// 			);
		// 			break;
		// 		}
		// 		case LoginResult.NotInCompany: {
		// 			sendTelemetry();
		// 			dispatch(goToCompanyCreation({ token, email: attributes.email }));
		// 			break;
		// 		}
		// 		case LoginResult.NotOnTeam: {
		// 			sendTelemetry();
		// 			dispatch(goToTeamCreation({ token, email: attributes.email }));
		// 			break;
		// 		}
		// 		case LoginResult.AlreadyConfirmed: {
		// 			// because user was invited
		// 			sendTelemetry();
		// 			dispatch(
		// 				completeSignup(attributes.email, token!, props.teamId!, {
		// 					createdTeam: false
		// 				})
		// 			);
		// 			break;
		// 		}
		// 		case LoginResult.InviteConflict: {
		// 			setInviteConflict(true);
		// 			setIsSubmitting(false);
		// 			break;
		// 		}
		// 		default:
		// 			throw status;
		// 	}
		// } catch (error) {
		// 	logError(`Unexpected error during registration request: ${error}`, {
		// 		email,
		// 		inviteCode: props.inviteCode
		//
		// 	});
		// 	setUnexpectedError(true);
		// 	setIsSubmitting(false);
		// }
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
										An account already exists for {existingEmail}.
										<Link
											onClick={e => {
												e.preventDefault();
												dispatch(goToLogin());
											}}
										>
											{" "}
											Sign In
										</Link>
									</div>
								</ErrorMessageWrapper>
							)}
							<label>
								Enter your New Relic user API key.
								<Link
									onClick={e => {
										e.preventDefault();
										handleGetApiKeyClick();
									}}
								>
									{" "}
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
