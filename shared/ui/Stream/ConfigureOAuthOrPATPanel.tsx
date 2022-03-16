import React, { MouseEventHandler, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import styled from "styled-components";
import { Button } from "../src/components/Button";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { Link } from "./Link";
import { PanelHeader } from "../src/components/PanelHeader";
import CancelButton from "./CancelButton";
import { connectProvider, configureProvider, ViewLocation } from "../store/providers/actions";
import { Separator } from "../src/components/Separator";
import Icon from "./Icon";

const Root = styled.div``;

const Provider = styled(Button)`
	width: 100%;
	justify-content: left;
	text-align: center;
	.icon {
		margin-right: 5px;
	}
	position: relative;
	font-size: 16px;
`;

export const ConfigureOAuthOrPATPanel = (props: {
	closePanel: MouseEventHandler<Element>;
	providerId: string;
	originLocation: ViewLocation;
}) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return { providers: state.providers };
	});

	const { providerId } = props;
	const { providers } = derivedState;
	const { name, scopes = [] } = providers[providerId] || {};
	const mapping = PROVIDER_MAPPINGS[name] || {};
	const {
		displayName = "",
		helpPATUrl = "",
		icon = "",
		namePAT = "Personal Access Token"
	} = mapping;

	const [accessToken, setAccessToken] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	const connectWithOAuth = async e => {
		e.preventDefault();
		dispatch(connectProvider(props.providerId, props.originLocation));
		props.closePanel(e);
	};

	const connectWithPAT = async e => {
		e.preventDefault();
		if (!accessToken) {
			setErrorMessage("Required");
			return;
		}
		dispatch(
			configureProvider(props.providerId, { token: accessToken }, true, props.originLocation)
		);
		props.closePanel(e);
	};

	return (
		<Root className="full-height-codemark-form">
			<h2 style={{ textAlign: "center" }}>Connect to {displayName}</h2>
			<CancelButton onClick={props.closePanel} />
			<div className="standard-form">
				<fieldset className="form-body">
					<div id="controls">
						<h3>Connect with {namePAT}</h3>
						<div>
							Provide a <Link href={helpPATUrl}>{namePAT.toLowerCase()}</Link> CodeStream can use to
							access your
							{displayName} projects. Your token should have the following scopes:{" "}
							<b>{scopes.join(",")}</b>
						</div>
						{errorMessage && <small className="error-message">{errorMessage}</small>}
						{!errorMessage && <small>&nbsp;</small>}
						<input
							name="accessToken"
							value={accessToken}
							className="input-text control"
							autoFocus
							type="text"
							onChange={e => {
								setErrorMessage("");
								setAccessToken(e.target.value);
							}}
						/>
						<Provider style={{ marginTop: "10px" }} onClick={connectWithPAT}>
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
