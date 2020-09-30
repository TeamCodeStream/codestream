import React, { useState, useCallback } from "react";
import { Link } from "../Stream/Link";
import { connect } from "react-redux";
import { goToSignup, SupportedSSOProvider } from "../store/context/actions";
import { useInterval, useRetryingCallback, useTimeout } from "../utilities/hooks";
import { DispatchProp } from "../store/common";
import { inMillis } from "../utils";
import { SignupType, startSSOSignin, validateSignup } from "./actions";
import { capitalize } from "@codestream/webview/utils";
import { LoginResult } from "@codestream/protocols/api";

const noop = () => Promise.resolve();

interface Props extends DispatchProp {
	type?: SignupType;
	inviteCode?: string;
	provider: SupportedSSOProvider;
	hostUrl?: string;
	fromSignup?: boolean;
}

export const ProviderAuth = (connect(undefined) as any)((props: Props) => {
	const [isWaiting, setIsWaiting] = useState(true);

	const stopWaiting = useCallback(() => {
		setIsWaiting(false);
	}, [isWaiting]);

	const waitFor = inMillis(300, "sec"); // changed to hopefully avoid timeouts
	useTimeout(stopWaiting, waitFor);

	const onClickGoToSignup = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToSignup());
	};

	const onClickTryAgain = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(
			startSSOSignin(
				props.provider,
				props.type !== undefined
					? {
							type: props.type,
							inviteCode: props.inviteCode,
							hostUrl: props.hostUrl,
							fromSignup: props.fromSignup
					  }
					: undefined
			)
		);
		setIsWaiting(true);
	};

	const validate = useCallback(async () => {
		try {
			await props.dispatch(
				validateSignup(
					capitalize(props.provider),
					props.type !== undefined ? { type: props.type, fromSignup: props.fromSignup } : undefined
				)
			);
		} catch (error) {
			if (error !== LoginResult.TokenNotFound) {
				setIsWaiting(false);
			}
		}
	}, [props.type]);

	useRetryingCallback(isWaiting ? validate : noop);

	// not i8n friendly!!!
	const providerCapitalized = capitalize(props.provider);
	const aOrAn = ["a", "e", "i", "o", "u"].find(letter => props.provider.startsWith(letter))
		? "an"
		: "a";
	return (
		<div className="onboarding-page">
			<form className="standard-form">
				<fieldset className="form-body">
					<div className="border-bottom-box">
						<h2>{providerCapitalized} Authentication</h2>
						<p>
							Your web browser should have opened up to {aOrAn} {providerCapitalized} authentication
							page. Once you've completed the authentication process, return here to get started
							with CodeStream.
						</p>
						<br />
						<div>
							{isWaiting ? (
								<strong>
									Waiting for {providerCapitalized} authentication <LoadingEllipsis />
								</strong>
							) : (
								<strong>
									Login timed out. Please <Link onClick={onClickTryAgain}>try again</Link>
								</strong>
							)}
						</div>
					</div>
					<p>
						Something went wrong? <Link href="mailto:support@codestream.com">Contact support</Link>{" "}
						or <Link onClick={onClickTryAgain}>Try again</Link>
					</p>
					<p>
						Don't want to use {providerCapitalized}?{" "}
						<Link onClick={onClickGoToSignup}>Sign up with CodeStream</Link> instead.
					</p>
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
