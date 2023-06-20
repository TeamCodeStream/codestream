import React, { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";

import { DispatchProp } from "../store/common";
import { goToLogin, goToSignup } from "../store/context/actions";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { HostApi } from "../webview-api";
import { SignupType, SSOAuthInfo, startSSOSignin } from "./actions";
import { TextInput } from "./TextInput";

const isHostUrlValid = (hostUrl: string) => hostUrl.length > 0;

interface ConnectedProps {
	fromSignup?: boolean;
	inviteCode?: string;
	email?: string;
}

export const OktaConfig = (connect() as any)((props: ConnectedProps & DispatchProp) => {
	const [hostUrl, setHostUrl] = useState("");
	const [hostUrlValidity, setHostUrlValidity] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	const onValidityChanged = useCallback(
		(_: string, validity: boolean) => setHostUrlValidity(validity),
		[]
	);

	const onCancel = useCallback((event: React.SyntheticEvent) => {
		event.preventDefault();
		if (props.fromSignup) {
			props.dispatch(goToSignup());
		} else {
			props.dispatch(goToLogin());
		}
	}, []);

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (hostUrl !== "" && hostUrlValidity) {
			setIsLoading(true);
			try {
				if (props.fromSignup) {
					HostApi.instance.track("Signup Method Selected", {
						Provider: "Okta",
						Email: props?.email,
					});
				}
				const info: SSOAuthInfo = props.fromSignup ? { fromSignup: true } : {};
				info.hostUrl = hostUrl;
				if (props.inviteCode) {
					info.type = SignupType.JoinTeam;
					info.inviteCode = props.inviteCode;
				} else {
					info.type = SignupType.CreateTeam;
				}
				props.dispatch(startSSOSignin("okta", info));
			} catch (error) {
				// TODO: communicate error
				if (props.fromSignup) {
					props.dispatch(goToSignup());
				} else {
					props.dispatch(goToLogin());
				}
			}
		}
	};

	return (
		<div className="onboarding-page">
			<form className="standard-form" onSubmit={onSubmit}>
				<fieldset className="form-body">
					<div className="border-bottom-box">
						<h3>
							<FormattedMessage id="oktaConfig.hostURL" defaultMessage="Host URL" />
						</h3>
						<p>
							<FormattedMessage
								id="oktaConfig.enterURL"
								defaultMessage="Enter the URL you use to access your Okta account."
							/>
						</p>
						<div id="controls">
							<div className="control-group">
								<div style={{ height: "20px" }} />
								<TextInput
									name="team"
									placeholder="https://myorg.okta.com"
									value={hostUrl}
									onChange={setHostUrl}
									validate={isHostUrlValid}
									onValidityChanged={onValidityChanged}
									required
								/>
								{!hostUrlValidity && (
									<small className="explainer error-message">
										<FormattedMessage id="oktaConfig.required" defaultMessage="Required" />
									</small>
								)}
							</div>
							<div className="button-group">
								<Button className="control-button" type="submit" loading={isLoading}>
									<FormattedMessage id="oktaConfig.submitButton" />
								</Button>
							</div>
						</div>
					</div>
					<div id="controls">
						<div className="footer">
							<Link onClick={onCancel}>
								<FormattedMessage id="oktaConfig.cancel" defaultMessage="Cancel" />
							</Link>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
});
