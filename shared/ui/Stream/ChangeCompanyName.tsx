import { UpdateCompanyRequestType } from "@codestream/protocols/agent";
import React, { useCallback, useState } from "react";
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

export const ChangeCompanyName = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const team = state.teams[state.context.currentTeamId] || {};
		return {
			company: state.companies[team.companyId] || {},
		};
	});
	const [loading, setLoading] = useState(false);
	const [companyName, setCompanyName] = useState(derivedState.company.name);
	const [companyNameValidity, setCompanyNameValidity] = useState(true);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "companyName":
				setCompanyNameValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();
		onValidityChanged("companyName", isNotEmpty(companyName));
		if (!companyNameValidity) return;

		setLoading(true);
		try {
			await HostApi.instance.send(UpdateCompanyRequestType, {
				companyId: derivedState.company.id,
				name: companyName,
			});

			// HostApi.instance.track("companyName Changed", {});
			dispatch(closeModal());
		} catch (error) {
			logError(error, { detail: `Unexpected error during change companyName`, companyName });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setLoading(false);
	};

	return (
		<Dialog title="Change Organization Name" onClose={() => dispatch(closeModal())}>
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
							<label>Organization Name</label>
							<TextInput
								name="companyName"
								value={companyName}
								autoFocus
								onChange={setCompanyName}
								onValidityChanged={onValidityChanged}
								validate={isNotEmpty}
							/>
							{!companyNameValidity && <small className="explainer error-message">Required</small>}
							<ButtonRow>
								<Button onClick={onSubmit} isLoading={loading}>
									Save Organization Name
								</Button>
							</ButtonRow>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
