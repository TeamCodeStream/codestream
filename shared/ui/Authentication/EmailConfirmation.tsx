import React, { useState, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { FormattedMessage } from "react-intl";
import { Link } from "../Stream/Link";
import { goToSignup, goToTeamCreation, goToLogin } from "../store/context/actions";
import { TextInput } from "./TextInput";
import Button from "../Stream/Button";
import { DispatchProp } from "../store/common";
import { HostApi } from "../webview-api";
import {
	ConfirmRegistrationRequestType,
	RegisterUserRequestType,
	RegisterUserRequest
} from "@codestream/protocols/agent";
import { LoginResult } from "@codestream/protocols/api";
import { completeSignup } from "./actions";

const errorToMessageId = {
	[LoginResult.InvalidToken]: "confirmation.invalid",
	[LoginResult.ExpiredToken]: "confirmation.expired",
	[LoginResult.AlreadyConfirmed]: "login.alreadyConfirmed",
	[LoginResult.Unknown]: "unexpectedError"
};

interface InheritedProps {
	email: string;
	teamId: string;
	registrationParams: RegisterUserRequest;
}

interface Props extends InheritedProps, DispatchProp {}
const defaultArrayLength = 6;
const array = new Array(defaultArrayLength);
const initialValues: string[] = [...array].fill("");

export const EmailConfirmation = (connect() as any)((props: Props) => {
	const inputs = useRef(array);
	const [emailSent, setEmailSent] = useState(false);
	const [digits, setValues] = useState(initialValues);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<LoginResult | undefined>();

	const onClickSendEmail = useCallback(
		async (event: React.MouseEvent) => {
			event.preventDefault();
			setEmailSent(false);
			await HostApi.instance.send(RegisterUserRequestType, props.registrationParams);
			setEmailSent(true);
		},
		[props.email]
	);

	const onSubmit = async (event?: React.FormEvent) => {
		event && event.preventDefault();
		setError(undefined);
		const code = digits.join("");
		if (code.length < defaultArrayLength) return;

		setIsLoading(true);

		const result = await HostApi.instance.send(ConfirmRegistrationRequestType, {
			email: props.email,
			confirmationCode: code
		});

		switch (result.status) {
			case LoginResult.NotOnTeam: {
				HostApi.instance.track("Email Confirmed");
				props.dispatch(goToTeamCreation({ token: result.token, email: props.email }));
				break;
			}
			case LoginResult.Success: {
				HostApi.instance.track("Email Confirmed");
				try {
					props.dispatch(
						completeSignup(props.email, result.token!, props.teamId, { createdTeam: false })
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
	};

	const onClickChangeIt = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToSignup());
	};

	const onClickGoToLogin = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToLogin());
	};

	const nativeProps = {
		min: 0,
		maxLength: "1"
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
											id={errorToMessageId[error]}
											defaultMessage="An unexpected error has occurred"
										/>
									</span>
								</div>
							)}
							<div className="control-group">
								<div className="confirmation-code">
									{digits.map((digit, index) => (
										<TextInput
											autoFocus={index === 0}
											ref={element => (inputs.current[index] = element)}
											key={index}
											value={digit}
											type="number"
											nativeProps={nativeProps}
											onPaste={event => {
												event.preventDefault();
												const string = event.clipboardData.getData("text").trim();
												if (string === "" || Number.isNaN(parseInt(string, 10))) return;
												if (string.length !== defaultArrayLength) return;

												setValues(string.split(""));
											}}
											onChange={value => {
												setError(undefined);
												let newDigit: string;
												if (value.match(/^\d\d\d\d\d\d$/)) {
													setValues(value.split(""));
													onSubmit();
													return;
												}
												// probably a backspace
												if (value === "") newDigit = value;
												// don't change the value
												else if (Number.isNaN(Number(value))) newDigit = digit;
												// make sure to take the last character in case of changing a value
												else newDigit = value.charAt(value.length - 1);

												const newDigits = digits.slice();
												newDigits.splice(index, 1, newDigit);
												setValues(newDigits);
												if (value === "") return;
												const nextInput = inputs.current[index + 1];
												if (nextInput) nextInput.focus();
												else onSubmit();
											}}
										/>
									))}
								</div>
							</div>
							<div className="button-group">
								<Button className="control-button" type="submit" loading={isLoading}>
									<FormattedMessage id="confirmation.submitButton" />
								</Button>
							</div>
						</div>
					</div>
					<div id="controls">
						<div className="footer">
							<div>
								<p>
									Already have an account? <Link onClick={onClickGoToLogin}>Sign In</Link>
								</p>
							</div>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
});
