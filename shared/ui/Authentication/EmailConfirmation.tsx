import {
	ConfirmRegistrationRequestType,
	GenerateLoginCodeRequestType,
	RegisterUserRequest,
	RegisterUserRequestType,
} from "@codestream/protocols/agent";
import { LoginResult } from "@codestream/protocols/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";

import { CodeStreamState } from "@codestream/webview/store";
import { setEnvironment } from "@codestream/webview/store/session/thunks";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { DispatchProp } from "../store/common";
import {
	goToCompanyCreation,
	goToLogin,
	goToSignup,
	goToTeamCreation,
} from "../store/context/actions";
import Button from "../Stream/Button";
import Icon from "../Stream/Icon";
import { Link } from "../Stream/Link";
import { HostApi } from "../webview-api";
import { authenticate, completeSignup } from "./actions";
import { TextInput } from "./TextInput";

const errorToMessageId = {
	[LoginResult.InvalidToken]: "confirmation.invalid",
	[LoginResult.ExpiredToken]: "confirmation.expired",
	[LoginResult.AlreadyConfirmed]: "login.alreadyConfirmed",
	[LoginResult.ExpiredCode]: "confirmation.expired",
	[LoginResult.TooManyAttempts]: "confirmation.tooManyAttempts",
	[LoginResult.InvalidCode]: "confirmation.invalid",
	[LoginResult.Unknown]: "unexpectedError",
};

interface InheritedProps {
	confirmationType: "signup" | "login";
	email: string;
	teamId: string;
	registrationParams: RegisterUserRequest;
}

interface Props extends InheritedProps, DispatchProp {}
const defaultArrayLength = 6;
const array = new Array(defaultArrayLength);
const initialValues: string[] = [...array].fill("");

export const EmailConfirmation = (connect() as any)((props: Props) => {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { context } = state;
		const errorGroupGuid = context.pendingProtocolHandlerQuery?.errorGroupGuid;
		return { errorGroupGuid };
	});

	const inputs = useRef(array);
	const [emailSent, setEmailSent] = useState(false);
	const [digits, setValues] = useState(initialValues);
	const [pastedAt, setPastedAt] = useState<number | undefined>(undefined);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<LoginResult | undefined>();

	const onClickSendEmail = useCallback(
		async (event: React.MouseEvent) => {
			event.preventDefault();
			setEmailSent(false);
			if (props.confirmationType === "signup") {
				await HostApi.instance.send(RegisterUserRequestType, props.registrationParams);
			} else {
				await HostApi.instance.send(GenerateLoginCodeRequestType, { email: props.email });
			}
			setEmailSent(true);
		},
		[props.email]
	);

	useEffect(() => {
		if (!pastedAt) return;

		if (digits?.length) {
			const code = digits.join("");
			if (code.length < defaultArrayLength) {
				return;
			}

			setIsLoading(true);
			// make it seem a little more natural
			setTimeout(() => {
				onSubmit();
			}, 1000);
		}
	}, [pastedAt]);

	const onSubmit = async (event?: React.FormEvent) => {
		event && event.preventDefault();
		setError(undefined);
		const code = digits.join("");
		if (code.length < defaultArrayLength) {
			setIsLoading(false);
			return;
		}

		if (props.confirmationType === "login") {
			try {
				setIsLoading(true);
				await props.dispatch(authenticate({ code, email: props.email }));
			} catch (error) {
				setError(error);
				setIsLoading(false);
			}
		} else {
			const result = await HostApi.instance.send(ConfirmRegistrationRequestType, {
				email: props.email,
				errorGroupGuid: derivedState.errorGroupGuid,
				confirmationCode: code,
			});

			// as a result of confirmation, we may be told to switch environments (i.e., regions)
			if (result.setEnvironment) {
				const { environment, serverUrl } = result.setEnvironment;
				console.log(
					`Upon confirmation, received instruction to change environments to ${environment}:${serverUrl}`
				);
				props.dispatch(setEnvironment(environment, serverUrl));
			}
			switch (result.status) {
				case LoginResult.NotInCompany: {
					// HostApi.instance.track("Email Confirmed");
					props.dispatch(
						goToCompanyCreation({
							...result,
							userId: result.user?.id,
							eligibleJoinCompanies: result.user?.eligibleJoinCompanies,
							email: props.email,
							forceCreateCompany: result.forceCreateCompany,
						})
					);
					break;
				}
				case LoginResult.NotOnTeam: {
					// HostApi.instance.track("Email Confirmed");
					props.dispatch(goToTeamCreation({ token: result.token, email: props.email }));

					break;
				}
				case LoginResult.Success: {
					// HostApi.instance.track("Email Confirmed");
					try {
						props.dispatch(
							completeSignup(props.email, result.token!, props.teamId, {
								createdTeam: false,
								setEnvironment: result.setEnvironment,
							})
						);
					} catch (error) {
						// TODO?: communicate confirmation was successful
						// TODO: communicate error logging in
						props.dispatch(goToLogin());
					}
					break;
				}
				default: {
					setError(result.status);
					setIsLoading(false);
				}
			}
		}
	};

	const onClickChangeIt = (event: React.SyntheticEvent) => {
		event.preventDefault();
		if (props.confirmationType === "signup") {
			props.dispatch(goToSignup());
		} else {
			props.dispatch(goToLogin());
		}
	};

	const onClickGoToLogin = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToLogin());
	};

	const onClickGoToSignUp = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToSignup());
	};

	const nativeProps = {
		min: 0,
		maxLength: "1",
	};

	const handleChange = (value, digit, index) => {
		setError(undefined);

		let newDigit: string;
		if (value.match(/^\d\d\d\d\d\d$/)) {
			setValues(value.split(""));
			onSubmit();
			return;
		}

		// probably a backspace
		if (value === "") {
			newDigit = value;
		}
		// don't change the value
		else if (Number.isNaN(Number(value))) {
			newDigit = digit;
		}
		// make sure to take the last character in case of changing a value
		else {
			newDigit = value.charAt(value.length - 1);
		}

		const newDigits = digits.slice();
		newDigits.splice(index, 1, newDigit);
		setValues(newDigits);
		if (value === "") {
			return;
		}

		const nextInput = inputs.current[index + 1];
		if (nextInput) {
			nextInput.focus();
		} else {
			onSubmit();
		}
	};

	const handlePaste = event => {
		event.preventDefault();
		const string = event.clipboardData.getData("text").trim();

		if (string === "" || Number.isNaN(parseInt(string, 10))) {
			return;
		}
		if (string.length !== defaultArrayLength) {
			return;
		}

		setValues(string.split(""));
		setPastedAt(new Date().getTime());
	};

	return (
		<div className="onboarding-page">
			<form className="standard-form" onSubmit={onSubmit}>
				<fieldset className="form-body">
					<div className="border-bottom-box">
						<h3>
							<FormattedMessage id="confirmation.checkEmail" defaultMessage="Check Your Email" />
						</h3>
						<FormattedMessage id="confirmation.instructions" tagName="p" />
						<FormattedMessage id="confirmation.didNotReceive">
							{text => (
								<p>
									{text}{" "}
									<FormattedMessage id="confirmation.sendAnother">
										{text => <Link onClick={onClickSendEmail}>{text}</Link>}
									</FormattedMessage>
									. {emailSent && <strong>Email sent!</strong>}
								</p>
							)}
						</FormattedMessage>
						<p>
							<strong>{props.email}</strong> not correct?{" "}
							<Link onClick={onClickChangeIt}>Change it</Link>
						</p>
						<br />
						<div id="controls">
							{error && (
								<div className="form-error">
									<span className="error-message">
										<FormattedMessage
											id={errorToMessageId[error] || "unexpectedError"}
											defaultMessage="An unexpected error has occurred"
										/>
									</span>
								</div>
							)}
							<div className="control-group">
								<div className="confirmation-code">
									{digits.map((digit, index) => (
										<TextInput
											disabled={isLoading}
											autoFocus={index === 0}
											ref={element => (inputs.current[index] = element)}
											key={index}
											value={digit}
											type="number"
											nativeProps={nativeProps}
											onPaste={event => handlePaste(event)}
											onChange={value => handleChange(value, digit, index)}
											baseBorder={true}
										/>
									))}
								</div>
							</div>
							<div className="button-group">
								<Button className="row-button" type="submit" loading={isLoading}>
									<div className="copy">
										<FormattedMessage id="confirmation.submitButton" />
									</div>
									<Icon name="chevron-right" />
								</Button>
							</div>
						</div>
					</div>
					<div id="controls">
						<div className="footer">
							<div>
								{props.confirmationType === "signup" && (
									<p>
										<FormattedMessage
											id="emailConfirmation.alreadyAccount"
											defaultMessage="Already have an account?"
										/>{" "}
										<Link onClick={onClickGoToLogin}>
											<FormattedMessage id="emailConfirmation.signIn" defaultMessage="Sign In" />
										</Link>
									</p>
								)}
								{props.confirmationType === "login" && (
									<p>
										Don’t have an account? <Link onClick={onClickGoToSignUp}>Sign Up</Link>
									</p>
								)}
							</div>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
});
