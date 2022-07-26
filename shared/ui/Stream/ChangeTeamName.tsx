import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import { Button } from "../src/components/Button";
import { ButtonRow } from "./ChangeUsername";
import { logError } from "../logger";
import { FormattedMessage } from "react-intl";
import { Link } from "./Link";
import { TextInput } from "../Authentication/TextInput";
import { Dialog } from "../src/components/Dialog";
import { closeModal } from "./actions";
import { UpdateTeamRequestType } from "@codestream/protocols/agent";

const isNotEmpty = s => s.length > 0;

export const ChangeTeamName = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return { team: state.teams[state.context.currentTeamId] };
	});
	const [loading, setLoading] = useState(false);
	const [teamName, setTeamName] = useState(derivedState.team.name);
	const [teamNameValidity, setTeamNameValidity] = useState(true);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "teamName":
				setTeamNameValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();
		onValidityChanged("teamName", isNotEmpty(teamName));
		if (!teamNameValidity) return;

		setLoading(true);
		try {
			await HostApi.instance.send(UpdateTeamRequestType, {
				teamId: derivedState.team.id,
				name: teamName
			});

			HostApi.instance.track("teamName Changed", {});
			dispatch(closeModal());
		} catch (error) {
			logError(error, { detail: `Unexpected error during change teamName`, teamName });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setLoading(false);
	};

	return (
		<Dialog title="Change Team Name" onClose={() => dispatch(closeModal())}>
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
							<label>Team Name</label>
							<TextInput
								name="teamName"
								value={teamName}
								autoFocus
								onChange={setTeamName}
								onValidityChanged={onValidityChanged}
								validate={isNotEmpty}
							/>
							{!teamNameValidity && <small className="explainer error-message">Required</small>}
							<ButtonRow>
								<Button onClick={onSubmit} isLoading={loading}>
									Save Team Name
								</Button>
							</ButtonRow>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
