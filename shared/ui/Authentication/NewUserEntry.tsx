import React from "react";
import Button from "../Stream/Button";
import Icon from "../Stream/Icon";
import { connect } from "react-redux";
import { CodeStreamState } from "../store";
import { goToLogin, goToJoinTeam, goToSignup } from "../store/context/actions";
import { DispatchProp } from "../store/common";
import { HostApi } from "../webview-api";
import { SignupType } from "./actions";
import { JoinTeam } from "./JoinTeam";

interface ConnectedProps {
	pluginVersion: string;
	whichServer: string;
	onPrem: boolean;
}

interface Props extends ConnectedProps, DispatchProp {}

const mapStateToProps = (state: CodeStreamState) => {
	let whichServer = state.configs.serverUrl;
	const serverMatch = whichServer.match(/^https:\/\/(.*?)\.codestream\.(us|com)(:[0-9]+)?\/?$/);
	let onPrem = true;
	if (serverMatch && serverMatch[1] !== "oppr" && serverMatch[1] !== "opbeta") {
		onPrem = false;
		whichServer = "CodeStream's cloud service";
		if (serverMatch[1]) {
			if (serverMatch[1] === "localhost") {
				whichServer += ` (local)`;
			} else {
				const parts = serverMatch[1].split("-");
				if (parts[0] !== "api") {
					whichServer += ` (${parts[0].toUpperCase()})`;
				}
			}
		}
	}
	return { pluginVersion: state.pluginVersion, whichServer, onPrem };
};

export const NewUserEntry = (connect(mapStateToProps) as any)((props: Props) => {
	const onClickCreateTeam = (event: React.SyntheticEvent) => {
		event.preventDefault();
		HostApi.instance.track("Reg Path Selected", {
			"Reg Path": "Create Team"
		});
		props.dispatch(goToSignup({ type: SignupType.CreateTeam }));
	};

	const onClickJoinTeam = (event: React.SyntheticEvent) => {
		event.preventDefault();
		HostApi.instance.track("Reg Path Selected", {
			"Reg Path": "Join Team"
		});
		props.dispatch(goToJoinTeam());
	};

	const onClickLogin = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToLogin());
	};

	return (
		<div className="onboarding-page">
			<form className="standard-form">
				<fieldset className="form-body">
					<div className="border-bottom-box">
						<h3>Try CodeStream with your team, for free</h3>
						<p>Create a brand-new team for you and your teammates.</p>
						<Button className="row-button no-top-margin" onClick={onClickCreateTeam}>
							<Icon name="plus" />
							<div className="copy">Sign Up and Create a Team</div>
						</Button>
					</div>
					<JoinTeam />
					<div className="border-bottom-box">
						<h3>Already have an account?</h3>
						<Button className="row-button no-top-margin" onClick={onClickLogin}>
							<Icon name="sign-in" />
							<div className="copy">Sign In</div>
						</Button>
					</div>
					<div className="border-bottom-box">
						<h3>
							<Icon name="light-bulb" /> &nbsp;What’s a CodeStream team?
						</h3>
						<p>
							Each organization that uses CodeStream has teams of their own. Teams are where all of
							their code discussions are kept, and they can only be joined by invitation.
						</p>
					</div>
					<div id="controls">
						<div className="footer">
							<div>
								<p style={{ opacity: 0.5, fontSize: ".9em", textAlign: "center" }}>
									CodeStream Version {props.pluginVersion}
									<br />
									Connected to {props.whichServer}.
								</p>
								<p style={{ opacity: 1, fontSize: ".9em", textAlign: "center" }}>
									{!props.onPrem && (
										<a href="https://docs.codestream.com/userguide/faq/on-prem/">
											Looking for on-prem?
										</a>
									)}
								</p>
							</div>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
});
