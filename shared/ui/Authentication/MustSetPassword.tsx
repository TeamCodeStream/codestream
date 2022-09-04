import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useState, useCallback } from "react";
import { TextInput } from "./TextInput";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { HostApi } from "../webview-api";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { BoxedContent } from "../src/components/BoxedContent";
import { SetPasswordRequestType } from "@codestream/protocols/agent";
import { authenticate } from "./actions";
import { CodeStreamState } from "../store";
import { goToLogin } from "../store/context/actions";

export interface MustSetPasswordProps {
	email: string;
}

const isPasswordValid = (password: string) => password.length >= 6;

export const MustSetPassword = (props: MustSetPasswordProps) => {
	const dispatch = useAppDispatch();
	const serverUrl = useAppSelector((state: CodeStreamState) => state.configs.serverUrl);
	const [password, setPassword] = useState("");
	const [passwordIsValid, setPasswordIsValid] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	const onValidityChanged = useCallback((_, valid) => {
		setPasswordIsValid(valid);
	}, []);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (password === "" && !passwordIsValid) return;

		setIsLoading(true);
		const response = await HostApi.instance.send(SetPasswordRequestType, { password });
		try {
			// @ts-ignore - the await is necessary
			await dispatch(
				authenticate({
					token: { email: props.email || "", url: serverUrl, value: response.accessToken },
				})
			);
		} catch (error) {
			dispatch(goToLogin());
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="onboarding-page">
			<form className="standard-form" onSubmit={submit}>
				<fieldset className="form-body">
					<BoxedContent title="Set a password">
						<p>
							<FormattedMessage
								id="mustSetPassword.enterPassword"
								defaultMessage="Enter a password below."
							/>
						</p>
						<div id="controls">
							<div className="control-group">
								<br />
								{passwordIsValid ? (
									<small className="explainer">
										<FormattedMessage id="setPassword.help" />
									</small>
								) : (
									<small className="explainer error-message">
										<FormattedMessage id="signUp.email.invalid" />
									</small>
								)}
								<TextInput
									nativeProps={{ autoFocus: true }}
									name="password"
									type="password"
									onChange={setPassword}
									value={password}
									validate={isPasswordValid}
									onValidityChanged={onValidityChanged}
								/>
							</div>
							<div className="button-group">
								<Button
									className="control-button"
									loading={isLoading}
									disabled={!isPasswordValid(password)}
								>
									<FormattedMessage id="setPassword.setPassword" />
								</Button>
							</div>
						</div>
					</BoxedContent>
				</fieldset>
			</form>
		</div>
	);
};
