import React, { MouseEventHandler, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import styled from "styled-components";
import Button from "./Button";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { Link } from "./Link";
import CancelButton from "./CancelButton";
import {
	connectProvider,
	configureProvider,
	disconnectProvider,
	ViewLocation
} from "../store/providers/actions";
import { isConnected } from "../store/providers/reducer";
import { getUserProviderInfoFromState } from "../store/providers/utils";
import Icon from "./Icon";
import { CSProviderInfo } from "@codestream/protocols/api";
import { closePanel } from "./actions";

const Root = styled.div``;

const Provider = styled(Button)`
	width: 100%;
	justify-content: left;
	text-align: center;
	.icon {
		margin-right: 5px;
	}
	position: relative;
	font-size: 14px !important;
`;

export const ConfigureOAuthOrPATPanel = (props: {
	providerId: string;
	originLocation: ViewLocation | string;
}) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;
		const provider = providers[props.providerId];
		const userProviderInfo = getUserProviderInfoFromState(provider.name, state) as CSProviderInfo;
		const accessTokenError = { accessTokenError: undefined };
		const didConnect =
			isConnected(state, { name: provider.name }, undefined, accessTokenError) &&
			!accessTokenError.accessTokenError &&
			!userProviderInfo.pendingVerification;
		return {
			providers: state.providers,
			userProviderInfo,
			verificationError: accessTokenError.accessTokenError,
			didConnect
		};
	});

	const { providerId } = props;
	const { providers } = derivedState;
	const provider = providers[providerId];
	const { name, scopes = [] } = providers[providerId] || {};
	const mapping = PROVIDER_MAPPINGS[name] || {};
	const {
		displayName = "",
		helpPATUrl = "",
		icon = "",
		namePAT = "Personal Access Token",
		directPAT
	} = mapping;

	const [accessToken, setAccessToken] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [loading, setLoading] = useState(false);

	let providerUrl = helpPATUrl;
	if (directPAT) {
		providerUrl = `https://${provider.host}/${directPAT.path}?`;
		if (directPAT.descriptionParam) {
			providerUrl += `${directPAT.descriptionParam}=CodeStream`;
		}
		providerUrl += `&${directPAT.scopesParam}=${(scopes || []).join(",")}`;
	}

	const { didConnect, verificationError, userProviderInfo } = derivedState;
	useEffect(() => {
		if (didConnect) {
			dispatch(closePanel());
		} else if (verificationError) {
			const message =
				(derivedState.verificationError as any).providerMessage ||
				(derivedState.verificationError as any).error?.info?.error?.message ||
				"Access token invalid";
			console.warn(message);
			setErrorMessage("Could not connect. Please verify your personal access token.");
			setLoading(false);
		}
	}, [didConnect, verificationError, userProviderInfo]);

	const connectWithOAuth = async e => {
		e.preventDefault();
		await dispatch(connectProvider(props.providerId, props.originLocation, true));
		dispatch(closePanel());
	};

	const connectWithPAT = async e => {
		e.preventDefault();
		if (!accessToken) {
			setErrorMessage("Required");
			return;
		}
		setErrorMessage("");
		setLoading(true);
		await dispatch(
			configureProvider(
				props.providerId,
				{ accessToken },
				{ setConnectedWhenConfigured: true, connectionLocation: props.originLocation, verify: true }
			)
		);
	};

	const onCancel = () => {
		dispatch(disconnectProvider(props.providerId, props.originLocation));
		dispatch(closePanel());
	};

	return (
		<Root className="full-height-codemark-form">
			<h2 style={{ textAlign: "center" }}>Connect to {displayName}</h2>
			<CancelButton onClick={() => onCancel()} />
			<div className="standard-form">
				<fieldset className="form-body">
					<div id="controls">
						<h3>Connect with {namePAT}</h3>
						<div>
							Provide a <Link href={providerUrl}>{namePAT.toLowerCase()}</Link> with the following
							scopes so that CodeStream can access your pull requests and issues:{" "}
							<b>{scopes.join(",")}</b>
						</div>
						{errorMessage && <small className="error-message">{errorMessage}</small>}
						{!errorMessage && <small>&nbsp;</small>}
						<input
							name="accessToken"
							value={accessToken}
							className="input-text control"
							autoFocus
							type="password"
							onChange={e => {
								setErrorMessage("");
								setAccessToken(e.target.value);
							}}
						/>
						<Provider style={{ marginTop: "10px" }} onClick={connectWithPAT} loading={loading}>
							{icon && <Icon name={icon} />} Connect to {displayName}
						</Provider>
						<div className="border-bottom-box">
							<div className="separator-label">
								<span className="app-or">or</span>
							</div>
						</div>
						<h3 style={{ marginTop: "20px" }}>Connect with OAuth</h3>
						<Provider onClick={connectWithOAuth}>
							{icon && <Icon name={icon} />}Connect to {displayName}
						</Provider>
					</div>
				</fieldset>
			</div>
		</Root>
	);
};
