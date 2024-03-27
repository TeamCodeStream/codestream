import React, { useEffect, useState } from "react";
import { logout } from "@codestream/webview/store/session/thunks";
import RoadBlock from "@codestream/webview/Stream/RoadBlock";
import { Link } from "@codestream/webview/Stream/Link";
import Dismissable from "@codestream/webview/Stream/Dismissable";
import { errorDismissed } from "@codestream/webview/store/connectivity/actions";
import { HostApi } from "@codestream/webview/webview-api";
import { RestartRequestType } from "@codestream/protocols/webview";
import { SessionTokenStatus } from "@codestream/protocols/agent";
import { Button } from "@codestream/webview/src/components/Button";
import { VersioningActionsType } from "@codestream/webview/store/versioning/types";
import { Loading } from "@codestream/webview/Container/Loading";
import { ApiVersioningActionsType } from "@codestream/webview/store/apiVersioning/types";
import { UnauthenticatedRoutes } from "@codestream/webview/Authentication";
import { upgradeRecommendedDismissed } from "@codestream/webview/store/versioning/actions";
import { apiUpgradeRecommendedDismissed } from "@codestream/webview/store/apiVersioning/actions";
import Stream from "@codestream/webview/Stream";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
import { shallowEqual } from "react-redux";
import { CSApiCapability } from "@codestream/protocols/api";

const ideSpecificInstructions = {
	VSC: (
		<p>
			Go to the Extensions view via the activity bar and then look for the Update button in the
			CodeStream entry.
		</p>
	),
	JETBRAINS: (
		<p>
			Look for the menu corresponding to your IDE name (e.g., IntelliJ) and select “Check for
			Updates” (or under the Help menu on Windows/Linux).
		</p>
	),
	VS: (
		<p>
			Go to Extensions &gt; Manage Extensions and then select Updates in the left pane. Select
			CodeStream in the middle pane, and then click Update.
		</p>
	),
};

const getIdeInstallationInstructions = (ide: string) => ideSpecificInstructions[ide];

export function Root() {
	const dispatch = useAppDispatch();

	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const team = state.teams[state.context.currentTeamId];

		return {
			bootstrapped: state.bootstrapped,
			connectivityError: state.connectivity.error,
			loggedIn: Boolean(state.session.userId),
			inMaintenanceMode: Boolean(state.session.inMaintenanceMode),
			company: team ? state.companies[team.companyId] : undefined,
			versioning: state.versioning,
			apiVersioning: state.apiVersioning,
			ide: state.ide && state.ide.name ? state.ide.name : undefined,
			serverUrl: state.configs.serverUrl,
			isOnPrem: state.configs.isOnPrem,
			offline: state.connectivity.offline,
			acceptedTOS: state.session.userId ? state.preferences.acceptedTOS : state.session.acceptedTOS,
			configChangeReloadRequired: state.configs.configChangeReloadRequired,
			sessionTokenStatus: state.session.sessionTokenStatus,
		};
	}, shallowEqual);

	useEffect(() => {
		if (derivedState.sessionTokenStatus === SessionTokenStatus.Expired) {
			setIsLoggingOut(true);
			dispatch(logout());
		}
	}, [derivedState.sessionTokenStatus]);

	if (derivedState.inMaintenanceMode)
		return (
			<RoadBlock title="Pardon the Interruption">
				<p>
					CodeStream is undergoing an update. Check{" "}
					<Link href="https://twitter.com/newrelic">@newrelic</Link> for status updates.
				</p>
			</RoadBlock>
		);
	if (derivedState.connectivityError) {
		return (
			<Dismissable
				title="Can't connect"
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							dispatch(errorDismissed());
						},
					},
					{
						text: "Retry",
						onClick: () => {
							HostApi.instance.send(RestartRequestType, void {});
						},
					},
				]}
			>
				<p>
					We are unable to connect to CodeStream's backend. Please check your connectivity and try
					again.
				</p>
				<p>
					If you are behind a network proxy,{" "}
					<a href="https://docs.newrelic.com/docs/codestream/troubleshooting/proxy-support/">
						turn on CodeStream's proxy support
					</a>
					.
				</p>
				<p>Error: {derivedState.connectivityError.message}</p>
			</Dismissable>
		);
	}

	if (derivedState.sessionTokenStatus === SessionTokenStatus.Expired) {
		return (
			<RoadBlock title="Session Expired">
				<div>
					<p>Your CodeStream session has expired. Please login again.</p>
					<Button isLoading={isLoggingOut}>OK</Button>
				</div>
			</RoadBlock>
		);
	}

	if (derivedState.configChangeReloadRequired) {
		if (derivedState.ide === "VSC") {
			HostApi.instance.send(RestartRequestType, void {});
			return (
				<RoadBlock title="Reload Required">
					<p>This configuration change requires your IDE to reload.</p>
					<p>Please click "Reload" when prompted by your IDE.</p>
				</RoadBlock>
			);
		} else if (derivedState.ide === "VS") {
			return (
				<RoadBlock title="Reload Required">
					<p>This configuration change requires CodeStream to reload.</p>
					<p>CodeStream will reload when you click OK.</p>
					<Button
						onClick={e => {
							e.preventDefault();
							HostApi.instance.send(RestartRequestType, void {});
						}}
					>
						OK
					</Button>
				</RoadBlock>
			);
		}
	}

	if (
		derivedState.versioning &&
		derivedState.versioning.type === VersioningActionsType.UpgradeRequired
	)
		return (
			<RoadBlock title="Update Required">
				<p>
					Please update to the latest version of CodeStream to continue. You may need to update your
					IDE as well if it isn't recent.
				</p>
				{derivedState.ide && getIdeInstallationInstructions(derivedState.ide)}
			</RoadBlock>
		);
	if (!derivedState.bootstrapped) return <Loading />;
	if (
		derivedState.apiVersioning &&
		derivedState.apiVersioning.type === ApiVersioningActionsType.ApiUpgradeRequired
	)
		return (
			<RoadBlock title="API Server Out of Date">
				<p>
					Your on-prem installation of CodeStream is running an outdated version of the API server
					that is incompatible with this version of the CodeStream extension. Please ask your admin
					to update the API server.
				</p>
			</RoadBlock>
		);
	// if (!props.acceptedTOS) return <PresentTOS />;
	if (!derivedState.loggedIn) return <UnauthenticatedRoutes />;
	if (derivedState.company && derivedState.company.plan === "TRIALEXPIRED") {
		const upgradeLink = `${derivedState.serverUrl}/web/subscription/upgrade/${derivedState.company.id}`;
		return (
			<RoadBlock title="Trial Expired">
				{derivedState.isOnPrem ? (
					<p>
						Your free-trial period is over. If you would like to purchase CodeStream for your team,
						- please contact <a href="mailto:sales@codestream.com">sales@codestream.com</a> to
						discuss - service plans and pricing options.{" "}
					</p>
				) : (
					<p>
						Your free-trial period is over. <a href={upgradeLink}>Upgrade your plan</a> if you'd
						like to continue to use CodeStream.
					</p>
				)}
			</RoadBlock>
		);
	}
	if (
		derivedState.versioning &&
		derivedState.versioning.type === VersioningActionsType.UpgradeRecommended
	)
		return (
			<Dismissable
				title="Update Suggested"
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							dispatch(upgradeRecommendedDismissed());
						},
					},
				]}
			>
				<p>
					Your version of CodeStream is getting a little long in the tooth! We suggest that you
					update to the latest version.
				</p>
				{derivedState.ide && getIdeInstallationInstructions(derivedState.ide)}
			</Dismissable>
		);
	if (
		derivedState.apiVersioning &&
		derivedState.apiVersioning.type === ApiVersioningActionsType.ApiUpgradeRecommended
	) {
		const { missingCapabilities } = derivedState.apiVersioning;
		let haveFeatures = "new features.";
		let missingFeatures: CSApiCapability[] = [];
		if (Object.keys(missingCapabilities).length > 0) {
			haveFeatures = "these features:";
			missingFeatures = Object.values(missingCapabilities);
		}
		return (
			<Dismissable
				title="API Server Update Suggested"
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							dispatch(apiUpgradeRecommendedDismissed());
						},
					},
				]}
			>
				<p>
					Your on-prem installation of CodeStream has an API server that seems to be getting a bit
					long in the tooth. Please ask your admin to upgrade to the latest version to get access to{" "}
					{haveFeatures}
				</p>
				{missingFeatures.map(feature => {
					return (
						<p>
							&middot; {feature.description}
							{feature.url && " ("}
							{feature.url && (
								<a href="{feature.url}" target="_blank">
									{feature.url}
								</a>
							)}
							{feature.url && ")"}
						</p>
					);
				})}
			</Dismissable>
		);
	}

	return <Stream />;
}
