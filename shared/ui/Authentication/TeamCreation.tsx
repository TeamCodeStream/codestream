import React, { useState, useCallback } from "react";
import { TextInput } from "./TextInput";
import { FormattedMessage } from "react-intl";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { connect } from "react-redux";
import { goToNewUserEntry, goToLogin } from "../store/context/actions";
import { DispatchProp } from "../store/common";
import { HostApi } from "../webview-api";
import { CreateTeamRequestType } from "@codestream/protocols/agent";
import { completeSignup } from "./actions";

const isTeamNameValid = (name: string) => name.length > 0;

interface ConnectedProps {
	token: string;
	email: string;
	loggedIn?: boolean;
	provider?: string;
}

export const TeamCreation = (connect() as any)((props: ConnectedProps & DispatchProp) => {
	const [teamName, setTeamName] = useState("");
	const [teamNameValidity, setTeamNameValidity] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	const onValidityChanged = useCallback(
		(_: string, validity: boolean) => setTeamNameValidity(validity),
		[]
	);

	const onCancel = useCallback((event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToNewUserEntry());
	}, []);

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (teamName !== "" && teamNameValidity) {
			setIsLoading(true);
			try {
				const { team } = await HostApi.instance.send(CreateTeamRequestType, { name: teamName });
				HostApi.instance.track("Team Created");
				props.dispatch(
					completeSignup(props.email, props.token, team.id, {
						createdTeam: true,
						provider: props.provider
					})
				);
			} catch (error) {
				// TODO: communicate error
				props.dispatch(goToLogin());
			}
		}
	};

	return (
		<div className="onboarding-page">
			<form className="standard-form" onSubmit={onSubmit}>
				<fieldset className="form-body">
					<div className="border-bottom-box">
						<h3>Team Name</h3>
						{props.loggedIn && (
							<h4>You don't belong to a team yet. Enter a name to create one now.</h4>
						)}
						<div id="controls">
							<div className="control-group">
								<div style={{ height: "20px" }} />
								<TextInput
									name="team"
									placeholder="Ex: Acme Frontend Devs"
									value={teamName}
									onChange={setTeamName}
									validate={isTeamNameValid}
									onValidityChanged={onValidityChanged}
									required
								/>
								{!teamNameValidity && <small className="explainer error-message">Required</small>}
							</div>
							<div className="button-group">
								<Button className="control-button" type="submit" loading={isLoading}>
									<FormattedMessage id="createTeam.submitButton" />
								</Button>
							</div>
						</div>
					</div>
					<div id="controls">
						<div className="footer">
							<Link onClick={onCancel}>Cancel</Link>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
});
