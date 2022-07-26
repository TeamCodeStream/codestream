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

export const ChangeWorksOn = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return { currentIWorkOn: currentUser.iWorkOn || "" };
	});
	const [loading, setLoading] = useState(false);
	const [iWorkOn, setIWorkOn] = useState(derivedState.currentIWorkOn);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();

		setLoading(true);
		try {
			await HostApi.instance.send(UpdateUserRequestType, { iWorkOn });
			HostApi.instance.track("fullName Changed", {});
			dispatch(closeModal());
		} catch (error) {
			logError(error, { detail: `Unexpected error during change fullName`, iWorkOn });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setLoading(false);
	};

	return (
		<Dialog title="Change Works On" onClose={() => dispatch(closeModal())}>
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
							<CSText as="span">
								Let your teammates know what you usually work on. <br />
								<br />
							</CSText>
							<label>I Work On...</label>
							<TextInput name="iWorkOn" value={iWorkOn} autoFocus onChange={setIWorkOn} />
							<ButtonRow>
								<Button onClick={onSubmit} isLoading={loading}>
									Save Works On
								</Button>
							</ButtonRow>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
