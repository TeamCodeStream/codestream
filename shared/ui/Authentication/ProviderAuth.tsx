import { LoginResult } from "@codestream/protocols/api";
import React, { useCallback, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { connect } from "react-redux";
import { DispatchProp } from "../store/common";
import { goToLogin, goToSignup, SupportedSSOProvider } from "../store/context/actions";
import { PROVIDER_MAPPINGS } from "../Stream/CrossPostIssueControls/types";
import { Link } from "../Stream/Link";
import { useAppDispatch, useInterval, useRetryingCallback, useTimeout } from "../utilities/hooks";
import { inMillis } from "../utils";
import { SignupType, startIDESignin, startSSOSignin, validateSignup } from "./actions";

const noop = () => Promise.resolve();

interface Props extends DispatchProp {
	type?: SignupType;
	inviteCode?: string;
	provider: SupportedSSOProvider;
	hostUrl?: string;
	fromSignup?: boolean;
	useIDEAuth?: boolean;
	gotError?: boolean | string;
}

export const ProviderAuth = (connect(undefined) as any)((props: Props) => {
	const [isWaiting, setIsWaiting] = useState(true);
	const [tryAgainDisabled, setTryAgainDisabled] = useState(true);
	const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
	const intl = useIntl();
	const dispatch = useAppDispatch();

	const providerName = PROVIDER_MAPPINGS[props.provider].displayName;

	const stopWaiting = useCallback(() => {
		setIsWaiting(false);
	}, [isWaiting]);

	const waitFor = inMillis(300, "sec"); // changed to hopefully avoid timeouts
	useTimeout(stopWaiting, waitFor);

	const stopTryAgainWaiting = () => {
		setTryAgainDisabled(false);
	};

	useEffect(() => {
		if (!tryAgainDisabled) {
			return;
		}
		const id = setTimeout(
			function () {
				stopTryAgainWaiting();
			},
			inMillis(5, "sec")
		);

		return () => clearTimeout(id);
	}, [tryAgainDisabled]);

	const onClickGoToSignup = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToSignup());
	};

	const onClickTryAgain = (event: React.SyntheticEvent) => {
		event.preventDefault();
		setTryAgainDisabled(true);
		if (false /*props.provider === "github" && props.useIDEAuth*/) {
			// per Unified Identity, IDE sign-in is deprecated
			props.dispatch(
				startIDESignin(
					props.provider,
					props.type !== undefined
						? {
								type: props.type,
								inviteCode: props.inviteCode,
								fromSignup: props.fromSignup,
								useIDEAuth: true,
						  }
						: undefined
				)
			);
		} else {
			props.dispatch(
				startSSOSignin(
					props.provider,
					props.type !== undefined
						? {
								type: props.type,
								inviteCode: props.inviteCode,
								hostUrl: props.hostUrl,
								fromSignup: props.fromSignup,
						  }
						: undefined
				)
			);
		}
		setIsWaiting(true);
	};

	const onClickGoBack = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			switch (props.fromSignup) {
				case true: {
					return dispatch(goToSignup());
				}
				default:
					return dispatch(goToLogin());
			}
		},
		[props.type]
	);

	const validate = useCallback(async () => {
		try {
			await props.dispatch(
				validateSignup(
					providerName,
					props.type !== undefined ? { type: props.type, fromSignup: props.fromSignup } : undefined
				)
			);
		} catch (error) {
			if (error !== LoginResult.TokenNotFound) {
				setIsWaiting(false);
			}
			if (error === LoginResult.AlreadyConfirmed) {
				setAlreadyConfirmed(true);
			}
		}
	}, [props.type]);

	useRetryingCallback(isWaiting ? validate : noop);

	// not i8n friendly!!!
	const aOrAn = ["a", "e", "i", "o", "u"].find(letter => props.provider.startsWith(letter))
		? "an"
		: "a";
	// HACK: this sucks ... we really should have access to the actual error info here
	// instead of doing string matching. Facts
	const ideAuthFailure =
		props.gotError &&
		typeof props.gotError === "string" &&
		props.gotError.match("PRVD-105") &&
		props.useIDEAuth;

	const tryAgainHoverContent = intl.formatMessage({
		id: "providerAuth.tryAgainHoverContent",
		defaultMessage: "Please check your browser and finish authenticating before trying again.",
	});

	return (
		<div className="onboarding-page">
			<form className="standard-form">
				<fieldset className="form-body">
					<div className="border-bottom-box">
						<h2>
							<FormattedMessage
								id="providerAuth.auth"
								defaultMessage={`${providerName} Authentication`}
							/>
						</h2>
						<p>
							<FormattedMessage
								id="providerAuth.message"
								defaultMessage={`Your web browser should have opened up to ${aOrAn} ${providerName} authentication page. Once you've completed the authentication process, return here to get started with CodeStream.`}
							/>
						</p>
						<br />
						<div>
							{isWaiting && !props.gotError ? (
								<strong>
									<FormattedMessage
										id="providerAuth.waiting"
										defaultMessage={`Waiting for ${providerName} authentication`}
									/>{" "}
									<LoadingEllipsis />
								</strong>
							) : alreadyConfirmed ? (
								<strong>Already signed up, please sign in.</strong>
							) : { ideAuthFailure } ? (
								<strong>
									<FormattedMessage
										id="providerAuth.accountNoFound"
										defaultMessage="Account not found."
									/>
								</strong>
							) : (
								<strong>
									{props.gotError ? (
										<FormattedMessage id="providerAuth.failed" defaultMessage="Login failed" />
									) : (
										<FormattedMessage id="providerAuth.timeOut" defaultMessage="Login timed out" />
									)}
									. <FormattedMessage id="providerAuth.please" defaultMessage="Please" />{" "}
									<Link onClick={onClickTryAgain}>
										<FormattedMessage id="providerAuth.tryAgain" defaultMessage="try again" />
									</Link>
									.
								</strong>
							)}
						</div>
					</div>
					<p>
						<FormattedMessage id="providerAuth.wrong" defaultMessage="Something went wrong? " />
						<Link href="https://one.newrelic.com/help-xp">
							<FormattedMessage id="providerAuth.contact" defaultMessage="Contact support" />
						</Link>{" "}
						<FormattedMessage id="providerAuth.or" defaultMessage="or " />
						<Link
							onClick={onClickTryAgain}
							disabled={tryAgainDisabled}
							disabledHover={tryAgainHoverContent}
						>
							<FormattedMessage id="providerAuth.tryAgain" defaultMessage="Try again" />
						</Link>
					</p>
					<Link onClick={onClickGoBack}>
						<p>
							<FormattedMessage id="providerAuth.back" defaultMessage={"< Back"} />
						</p>
					</Link>
				</fieldset>
			</form>
		</div>
	);
});

function LoadingEllipsis() {
	const [dots, setDots] = useState(".");
	useInterval(() => {
		switch (dots) {
			case ".":
				return setDots("..");
			case "..":
				return setDots("...");
			case "...":
				return setDots(".");
		}
	}, 500);

	return <React.Fragment>{dots}</React.Fragment>;
}
