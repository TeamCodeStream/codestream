import {
	AddEnterpriseProviderRequestType,
	ConfigureThirdPartyProviderRequestType,
	ConnectThirdPartyProviderRequestType,
	DisconnectThirdPartyProviderRequestType,
	ProviderConfigurationData,
	RemoveEnterpriseProviderRequestType,
	TelemetryRequestType,
} from "@codestream/protocols/agent";
import { getUserProviderInfo } from "@codestream/webview/store/providers/utils";
import {
	ConnectToIDEProviderRequestType,
	DisconnectFromIDEProviderRequestType,
} from "../../ipc/host.protocol";
import { logError } from "../../logger";
import { HostApi } from "../../webview-api";
import { deleteForProvider } from "../activeIntegrations/actions";
import { action } from "../common";
import { openPanel, setIssueProvider } from "../context/actions";
import { ProvidersActionsType, ProvidersState } from "./types";

export const reset = () => action("RESET");

export const updateProviders = (data: ProvidersState) => action(ProvidersActionsType.Update, data);

export const configureAndConnectProvider =
	(providerId: string, connectionLocation: ViewLocation, force?: boolean) =>
	async (dispatch, getState) => {
		const { providers, configs, ide, capabilities } = getState();
		const provider = providers[providerId];
		const {
			forEnterprise,
			isEnterprise,
			name,
			needsConfigure,
			needsConfigureForOnPrem,
			supportsOAuthOrPAT,
		} = provider;
		const onprem = configs.isOnPrem;
		//const isVSCGitHub = ide.name === "VSC" && name === "github" && capabilities.vsCodeGithubSignin;
		connectionLocation = connectionLocation || "Integrations Panel";
		if (name !== "jiraserver" && (needsConfigure || (onprem && needsConfigureForOnPrem))) {
			dispatch(
				openPanel(`configure-provider-${provider.name}-${provider.id}-${connectionLocation}`)
			);
		} else if (forEnterprise || isEnterprise) {
			dispatch(openPanel(`configure-enterprise-${name}-${provider.id}-${connectionLocation}`));
		} else if (supportsOAuthOrPAT /*&& !isVSCGitHub*/) {
			dispatch(
				openPanel(`oauthpat-provider-${provider.name}-${provider.id}-${connectionLocation}`)
			);
		} else {
			dispatch(connectProvider(provider.id, connectionLocation, force));
		}
	};

export const connectProvider =
	(providerId: string, connectionLocation: ViewLocation | string, force?: boolean) =>
	async (dispatch, getState) => {
		const { context, users, session, providers, ide, capabilities } = getState();
		const provider = providers[providerId];
		if (!provider) return;
		const user = users[session.userId];
		const { name, id, isEnterprise } = provider;
		let providerInfo = getUserProviderInfo(user, name, context.currentTeamId);
		if (providerInfo && isEnterprise) {
			providerInfo = (providerInfo.hosts || {})[id];
		}
		if (!force && providerInfo && providerInfo.accessToken) {
			if (provider.hasIssues) {
				dispatch(setIssueProvider(providerId));
			}
			return;
		}
		try {
			const api = HostApi.instance;
			if (ide.name === "VSC" && name === "github") {
				const result = await api.send(ConnectToIDEProviderRequestType, { provider: name });
				dispatch(
					configureProvider(
						providerId,
						{ accessToken: result.accessToken, data: { sessionId: result.sessionId } },
						{ setConnectedWhenConfigured: true, connectionLocation }
					)
				);
				return;
			} else {
				await api.send(ConnectThirdPartyProviderRequestType, { providerId });
			}
			if (provider.hasSharing) {
				dispatch(sendMessagingServiceConnected(providerId, connectionLocation));
			}
			if (provider.hasIssues) {
				dispatch(sendIssueProviderConnected(providerId, connectionLocation));
				dispatch(setIssueProvider(providerId));
				return;
			}
			if (provider.hasBuilds) {
				dispatch(sendBuildProviderConnected(providerId, connectionLocation));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : JSON.stringify(error);
			logError(`Failed to connect ${provider.name}: ${message}`, {
				error: error,
			});
		}
	};

export type ViewLocation =
	| "Global Nav"
	| "Compose Modal"
	| "PR Toggle"
	| "Integrations Panel"
	| "Status"
	| "Sidebar"
	| "Create Pull Request Panel"
	| "Issues Section"
	| "Provider Error Banner"
	| "Onboard"
	| "PRs Section"
	| "Open in IDE Flow"
	| "Open in IDE Pixie"
	| "Observability Section"
	| "Pixie Logging"
	| "CI/CD Section"
	| "Code Analyzers Section";

export const sendIssueProviderConnected =
	(providerId: string, connectionLocation: ViewLocation | string = "Compose Modal") =>
	async (dispatch, getState) => {
		const { providers } = getState();
		const provider = providers[providerId];
		if (!provider) return;
		const { name, host, isEnterprise } = provider;
		const api = HostApi.instance;
		api.send(TelemetryRequestType, {
			eventName: "codestream/integration/connection succeeded",
			properties: {
				meta_data: `service: ${name}`,
				meta_data_2: `connection_location: ${
					connectionLocation === "Integrations Panel"
						? "integrations_page"
						: connectionLocation === "Compose Modal"
						? "compose_modal"
						: connectionLocation === "Provider Error Banner"
						? "provider_error_banner"
						: ""
				}`,
				event_type: "response",
			},
		});
	};

export const sendBuildProviderConnected =
	(providerId: string, connectionLocation: ViewLocation | string = "Compose Modal") =>
	async (dispatch, getState) => {
		const { providers } = getState();
		const provider = providers[providerId];
		if (!provider) return;
		const { name, host, isEnterprise } = provider;
		const api = HostApi.instance;
		api.send(TelemetryRequestType, {
			eventName: "codestream/integration/connection succeeded",
			properties: {
				meta_data: `service: ${name}`,
				meta_data_2: `connection_location: ${
					connectionLocation === "Integrations Panel"
						? "integrations_page"
						: connectionLocation === "Compose Modal"
						? "compose_modal"
						: connectionLocation === "Provider Error Banner"
						? "provider_error_banner"
						: ""
				}`,
				event_type: "response",
			},
		});
	};

export const sendMessagingServiceConnected =
	(providerId: string, connectionLocation: string | ViewLocation = "Onboard") =>
	async (dispatch, getState) => {
		const { providers } = getState();
		const provider = providers[providerId];
		if (!provider) return;

		HostApi.instance.send(TelemetryRequestType, {
			eventName: "codestream/integration/connection succeeded",
			properties: {
				meta_data: `service: ${provider.name}`,
				meta_data_2: `connection_location: ${
					connectionLocation === "Integrations Panel"
						? "integrations_page"
						: connectionLocation === "Compose Modal"
						? "compose_modal"
						: connectionLocation === "Provider Error Banner"
						? "provider_error_banner"
						: ""
				}`,
				event_type: "response",
			},
		});
	};

export interface ConfigureProviderOptions {
	setConnectedWhenConfigured?: boolean;
	connectionLocation?: ViewLocation | string;
	throwOnError?: boolean;
	verify?: boolean;
}

export const configureProvider =
	(providerId: string, data: ProviderConfigurationData, options: ConfigureProviderOptions = {}) =>
	async (dispatch, getState) => {
		const { setConnectedWhenConfigured, connectionLocation, throwOnError, verify } = options;
		const { providers } = getState();
		const provider = providers[providerId];
		if (!provider) return;
		try {
			const api = HostApi.instance;
			await api.send(ConfigureThirdPartyProviderRequestType, { providerId, data, verify });

			// for some providers (YouTrack and enterprise providers with PATs), configuring is as good as connecting,
			// since we allow the user to set their own access token
			if (setConnectedWhenConfigured && provider.hasIssues) {
				dispatch(sendIssueProviderConnected(providerId, connectionLocation));
				dispatch(setIssueProvider(providerId));
			}
			if (setConnectedWhenConfigured && provider.hasBuilds) {
				dispatch(sendBuildProviderConnected(providerId, connectionLocation));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : JSON.stringify(error);
			logError(`Failed to connect ${provider.name}: ${message}`, {
				error: error,
			});
			if (throwOnError) {
				throw error;
			}
		}
	};

export const addEnterpriseProvider =
	(providerId: string, host: string, data: { [key: string]: any }) =>
	async (dispatch, getState) => {
		const { providers } = getState();
		const provider = providers[providerId];
		if (!provider) return;
		try {
			const api = HostApi.instance;
			const response = await api.send(AddEnterpriseProviderRequestType, { providerId, host, data });

			return response.providerId;
		} catch (error) {
			logError(error, { detail: `Failed to add enterprise provider for ${provider.name}` });
			return "";
		}
	};

export const removeEnterpriseProvider = (providerId: string) => async (dispatch, getState) => {
	const { providers } = getState();
	const provider = providers[providerId];
	if (!provider) return;
	try {
		HostApi.instance.send(RemoveEnterpriseProviderRequestType, {
			providerId,
		});
	} catch (error) {
		logError(error, { detail: `Failed to remove enterprise provider for ${providerId}` });
	}
};

export const disconnectProvider =
	(providerId: string, connectionLocation: ViewLocation | string, providerTeamId?: string) =>
	async (dispatch, getState) => {
		try {
			const { context, providers, ide } = getState();
			const provider = providers[providerId];
			if (!provider) return;
			const api = HostApi.instance;
			await api.send(DisconnectThirdPartyProviderRequestType, { providerId, providerTeamId });
			if (ide.name === "VSC" && provider.name === "github") {
				await api.send(DisconnectFromIDEProviderRequestType, { provider: provider.name });
			}
			dispatch(deleteForProvider(providerId, providerTeamId));
			if (context.issueProvider === providerId) {
				dispatch(setIssueProvider(undefined));
			}
		} catch (error) {
			logError("failed to disconnect service", { providerId, message: error.toString() });
		}
	};
