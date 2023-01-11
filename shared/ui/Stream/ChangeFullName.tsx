import { UpdateUserRequestType } from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import React, { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { TextInput } from "../Authentication/TextInput";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { UpdateAzureFullNameRequestType } from "@codestream/protocols/agent";

import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import { closeModal } from "./actions";
import { ButtonRow } from "./ChangeUsername";
import { Link } from "./Link";

const isNotEmpty = s => s.length > 0;

export const ChangeFullName = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return { currentFullName: currentUser.fullName };
	});
	const [loading, setLoading] = useState(false);
	const [fullName, setFullName] = useState(derivedState.currentFullName);
	const [fullNameValidity, setFullNameValidity] = useState(true);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "fullName":
				setFullNameValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();
		onValidityChanged("fullName", isNotEmpty(fullName));
		if (!fullNameValidity) return;

		setLoading(true);
		try {
			await HostApi.instance.send(UpdateAzureFullNameRequestType, { fullName });
			await HostApi.instance.send(UpdateUserRequestType, { fullName });
			HostApi.instance.track("fullName Changed", {});
			dispatch(closeModal());
		} catch (error) {
			logError(error, { detail: `Unexpected error during change fullName`, fullName });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setLoading(false);
	};

	return (
		<Dialog title="Change Full Name" onClose={() => dispatch(closeModal())}>
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
									{text => <Link href="https://docs.newrelic.com/docs/codestream/m">{text}</Link>}
								</FormattedMessage>
								.
							</div>
						)}
						<div className="control-group">
							<label>Full Name</label>
							<TextInput
								name="fullName"
								value={fullName}
								autoFocus
								onChange={setFullName}
								onValidityChanged={onValidityChanged}
								validate={isNotEmpty}
							/>
							{!fullNameValidity && <small className="explainer error-message">Required</small>}
							<ButtonRow>
								<Button onClick={onSubmit} isLoading={loading}>
									Save Full Name
								</Button>
							</ButtonRow>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
