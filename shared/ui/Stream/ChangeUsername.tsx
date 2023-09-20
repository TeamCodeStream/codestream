import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HostApi } from "../webview-api";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { TextInput } from "../Authentication/TextInput";
import { isUsernameValid } from "../Authentication/Signup";
import { logError } from "../logger";
import { FormattedMessage } from "react-intl";
import cx from "classnames";
import { CodeStreamState } from "../store";
import { CSMe } from "@codestream/protocols/api";
import { Link } from "./Link";
import { UpdateUserRequestType } from "@codestream/protocols/agent";
import { Dialog } from "../src/components/Dialog";
import { closeModal } from "./actions";

export const ButtonRow = styled.div`
	text-align: center;
	margin-top: 20px;
	button {
		width: 100%;
	}
`;

export const ChangeUsername = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return { currentUsername: currentUser.username };
	});
	const [loading, setLoading] = useState(false);
	const [username, setUsername] = useState(derivedState.currentUsername);
	const [usernameValidity, setUsernameValidity] = useState(true);
	const [unexpectedError, setUnexpectedError] = useState(false);
	const [formInvalid, setFormInvalid] = useState(false);

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "username":
				setUsernameValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();
		onValidityChanged("username", isUsernameValid(username));
		if (!usernameValidity) return;

		setLoading(true);
		try {
			await HostApi.instance.send(UpdateUserRequestType, { username });
			dispatch(closeModal());
		} catch (error) {
			logError(error, { detail: `Unexpected error during change username`, username });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setLoading(false);
	};

	return (
		<Dialog title="Change Username" onClose={() => dispatch(closeModal())}>
			<form className="standard-form">
				<fieldset className="form-body" style={{ width: "18em", padding: "20px 0" }}>
					<div id="controls">
						<div className="small-spacer" />
						{unexpectedError && (
							<div className="error-message form-error">
								<FormattedMessage
									id="error.unexpected"
									defaultMessage="Something went wrong! Please try again, or "
								/>
								<FormattedMessage id="contactSupport" defaultMessage="contact support">
									{text => <Link href="https://docs.newrelic.com/docs/codestream/">{text}</Link>}
								</FormattedMessage>
								.
							</div>
						)}
						<div className="control-group">
							<label>Username</label>
							<TextInput
								name="username"
								value={username}
								autoFocus
								onChange={setUsername}
								onValidityChanged={onValidityChanged}
								validate={isUsernameValid}
							/>
							<small className={cx("explainer", { "error-message": !usernameValidity })}>
								<FormattedMessage id="signUp.username.help" />
							</small>
						</div>
						<ButtonRow>
							<Button onClick={onSubmit} isLoading={loading}>
								Save Username
							</Button>
						</ButtonRow>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
