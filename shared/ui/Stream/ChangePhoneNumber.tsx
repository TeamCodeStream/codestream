import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import CancelButton from "./CancelButton";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { ButtonRow } from "./ChangeUsername";
import { UpdateUserRequestType } from "../protocols/agent/agent.protocol.users";
import { logError } from "../logger";
import { FormattedMessage } from "react-intl";
import { CSMe } from "@codestream/protocols/api";
import cx from "classnames";
import { Link } from "./Link";
import { TextInput } from "../Authentication/TextInput";
import { CSText } from "../src/components/CSText";
import { Dialog } from "../src/components/Dialog";
import { closeModal } from "./actions";

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
			HostApi.instance.track("fullName Changed", {});
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
