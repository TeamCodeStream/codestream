import { UpdateUserRequestType } from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import React, { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import { TextInput } from "../Authentication/TextInput";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import { closeModal } from "./actions";
import { ButtonRow } from "./ChangeUsername";
import { Link } from "./Link";

const isNotEmpty = s => s.length > 0;

export const ChangePhoneNumber = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return { currentPhoneNumber: currentUser.phoneNumber || "" };
	});
	const [loading, setLoading] = useState(false);
	const [phoneNumber, setPhoneNumber] = useState(derivedState.currentPhoneNumber);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();

		setLoading(true);
		try {
			await HostApi.instance.send(UpdateUserRequestType, { phoneNumber });
			// HostApi.instance.track("fullName Changed", {});
			dispatch(closeModal());
		} catch (error) {
			logError(error, { detail: `Unexpected error during change fullName`, phoneNumber });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setLoading(false);
	};

	return (
		<Dialog title="Change Phone Number" onClose={() => dispatch(closeModal())}>
			<form className="standard-form">
				<fieldset className="form-body" style={{ width: "18em" }}>
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
							<label>Phone Number</label>
							<TextInput
								name="phoneNumber"
								value={phoneNumber}
								autoFocus
								onChange={setPhoneNumber}
							/>
							<ButtonRow>
								<Button onClick={onSubmit} isLoading={loading}>
									Save Phone Number
								</Button>
							</ButtonRow>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
