import {
	DeleteMeUserRequestType,
	EnvironmentHost,
	GetAccessTokenRequestType,
	isLoginFailResponse,
	LoginResponse,
	LoginSuccessResponse,
	TokenLoginRequestType,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { isEmpty } from "lodash-es";

import { LogoutRequestType, UpdateServerUrlRequestType } from "@codestream/protocols/webview";
import { SignupType, onLogin, startSSOSignin } from "@codestream/webview/Authentication/actions";
import { logError } from "@codestream/webview/logger";
import { CodeStreamState } from "@codestream/webview/store";
import { setBootstrapped } from "@codestream/webview/store/bootstrapped/actions";
import { BootstrapActionType } from "@codestream/webview/store/bootstrapped/types";
import { goToSignup, setTeamlessContext } from "@codestream/webview/store/context/actions";
import { createAppAsyncThunk } from "@codestream/webview/store/helper";
import { reset, setTOS } from "@codestream/webview/store/session/actions";
import { setUserPreference } from "@codestream/webview/Stream/actions";
import { HostApi } from "@codestream/webview/webview-api";

export const logout = createAppAsyncThunk<void, void>(
	"session/logout",
	async (_request, { dispatch }) => {
		dispatch(setBootstrapped(false));

		// if (ide.name === "VSC") {
		// 	await HostApi.instance.send(DisconnectFromIDEProviderRequestType, { provider: "github" });
		// }

		await HostApi.instance.send(LogoutRequestType, {});
		dispatch(reset());
		dispatch(setBootstrapped(true));
	}
);

export interface SwitchToTeamRequest {
	teamId: string;
	options?: { codemarkId?: string; reviewId?: string };
	accessTokenFromEligibleCompany?: string;
}

export interface SwitchToTeamSSORequest {
	loginUrl?: string;
	nrUserId?: number;
	email?: string;
	authDomainId?: string;
}

export const switchToTeam = createAppAsyncThunk<
	LoginResponse | LoginSuccessResponse | { type: BootstrapActionType } | void,
	SwitchToTeamRequest
>("session/switchToTeam", async (request, { dispatch, getState }) => {
	const { teamId, options, accessTokenFromEligibleCompany } = request;
	let accessToken;
	if (!accessTokenFromEligibleCompany) {
		accessToken = { accessToken } = await HostApi.instance.send(GetAccessTokenRequestType, {});
	} else {
		accessToken = accessTokenFromEligibleCompany;
	}

	const { configs, context, users, session } = getState(); // TODO restore codemarks
	const user = users[session.userId!] as CSMe;

	dispatch(setBootstrapped(false));
	dispatch(reset());

	await HostApi.instance.send(LogoutRequestType, {});
	const response = await HostApi.instance.send(TokenLoginRequestType, {
		token: {
			email: user.email,
			value: accessToken,
			url: configs.serverUrl,
			teamId: teamId,
			providerAccess: context.chatProviderAccess as any,
		},
		teamId: teamId,
		codemarkId: options?.codemarkId,
		reviewId: options?.reviewId,
	});

	if (isLoginFailResponse(response)) {
		logError("Failed to switch teams", { ...response, userId: user.id, email: user.email });
		return dispatch(setBootstrapped(true));
	}

	dispatch(setUserPreference({ prefPath: ["lastTeamId"], value: teamId }));

	return dispatch(onLogin(response));
});

export const switchToTeamSSO = createAppAsyncThunk<
	LoginResponse | LoginSuccessResponse | { type: BootstrapActionType } | void,
	SwitchToTeamSSORequest
>("session/switchToTeamSSO", async (request, { dispatch, getState }) => {
	const { nrUserId, email, authDomainId } = request;
	const { configs, context, users, session } = getState(); // TODO restore codemarks
	const user = users[session.userId!] as CSMe;

	await dispatch(logout());

	console.warn(SignupType.CreateTeam, nrUserId);
	return dispatch(
		startSSOSignin("newrelicidp", {
			type: SignupType.CreateTeam,
			fromSignup: false,
			nrUserId,
			email,
			authDomainId,
		})
	);
});

export const setEnvironment = (environment: string, serverUrl: string) => async dispatch => {
	await HostApi.instance.send(UpdateServerUrlRequestType, {
		serverUrl,
		environment,
	});
	dispatch(setTeamlessContext({ selectedRegion: environment }));
};

export const switchToForeignCompany = createAppAsyncThunk<any, string>(
	"session/switchToForeignCompany",
	async (companyId, { dispatch, getState }) => {
		const { companies, session, users } = getState();

		const user = users[session.userId!] as CSMe;
		const company = user?.eligibleJoinCompanies?.find(_ => _.id === companyId);
		const teamId = company?.teamId;

		let error;
		if (!company) {
			error = "Failed to switch to foreign company, companyId not found";
			return;
		} else if (!company.host) {
			error = "Failed to switch to organization, not a foreign company";
			return;
		} else if (!company.accessToken) {
			error = "Failed to switch to organization, no access token";
		} else if (!company.teamId) {
			error = "Failed to switch to organization, no team ID";
		}
		if (error) {
			console.error(error, companyId);
			logError(error, { companyId, userId: user.id, email: user.email });
			return;
		}

		// must switch environments (i.e., host, region, etc) to join this organization
		console.log(
			`Joining company ${company.name} requires switching host to ${company.host.name} at ${company.host.publicApiUrl}`
		);

		dispatch(setBootstrapped(false));
		dispatch(reset());

		await HostApi.instance.send(LogoutRequestType, {
			newServerUrl: company.host.publicApiUrl,
			newEnvironment: company.host.shortName,
		});
		await dispatch(setEnvironment(company.host.shortName, company.host.publicApiUrl));
		const response = await HostApi.instance.send(TokenLoginRequestType, {
			token: {
				email: user.email,
				value: company.accessToken!,
				url: company.host.publicApiUrl,
				teamId: teamId || "",
			},
			setEnvironment: {
				environment: company.host.shortName,
				serverUrl: company.host.publicApiUrl,
			},
			teamId,
		});

		if (isLoginFailResponse(response)) {
			logError("Failed to switch to foreign company", {
				...response,
				userId: user.id,
				email: user.email,
			});
			return dispatch(setBootstrapped(true));
		}

		dispatch(setUserPreference({ prefPath: ["lastTeamId"], value: teamId }));
		return dispatch(onLogin(response));
	}
);

export const changeRegistrationEmail = (userId: string) => async dispatch => {
	await HostApi.instance.send(DeleteMeUserRequestType, { userId: userId });
	return dispatch(goToSignup({}));
};

export const setSelectedRegion = region => async (dispatch, getState: () => CodeStreamState) => {
	const { environmentHosts } = getState().configs;
	if (environmentHosts) {
		const host = environmentHosts!.find(host => host.shortName === region);
		if (host) {
			dispatch(setEnvironment(host.shortName, host.publicApiUrl));
		}
	}
};

// based on the currently "forced" region, or the selected region, or default region,
// make sure our environment settings and serverUrl settings are in sync
export const handleSelectedRegion = createAppAsyncThunk<any, void>(
	"session/handleSelectedRegion",
	async (_, { dispatch, getState }) => {
		const { environmentHosts, serverUrl } = getState().configs;
		const { selectedRegion, forceRegion } = getState().context.__teamless__ || {};
		let currentHost: EnvironmentHost | undefined;

		// if no environment hosts, we are in a single environment setup, nothing to do
		if (!environmentHosts || isEmpty(environmentHosts)) {
			return;
		}

		if (forceRegion) {
			// if forcing a region, meaning we're making the user sign-in to particular region without
			// giving them a choice of selecting another region, then get us to the host info for that region
			currentHost = environmentHosts.find(host => host.shortName === forceRegion);
		} else if (selectedRegion) {
			// otherwise if a current region is selected (in one of the sign-up or sign-in modals),
			// get us to the host info for that region
			currentHost = environmentHosts.find(host => host.shortName === selectedRegion);
			if (currentHost) {
				if (serverUrl !== currentHost.publicApiUrl) {
					// currently connected server doesn't match the selected host ... in this case,
					// the connected server overrides the selection, and we force the selection to
					// match the connected server
					const connectedHost = environmentHosts.find(host => host.publicApiUrl === serverUrl);
					if (connectedHost) {
						return dispatch(
							setTeamlessContext({
								selectedRegion: connectedHost.shortName,
							})
						);
					}
				}
			}
		}

		// if no current host found yet, look for a host that matches "US", otherwise just pick the first one
		if (!currentHost) {
			currentHost = environmentHosts.find(host =>
				host.shortName.match(/(^|[^a-zA-Z\d\s:])us($|[^a-zA-Z\d\s:])/)
			);
			if (!currentHost) {
				currentHost = environmentHosts[0];
			}
		}

		// finally set our environment "short name" (appears in status bar), and serverUrl
		if (currentHost) {
			dispatch(setEnvironment(currentHost.shortName, currentHost.publicApiUrl));
		}
		return;
	}
);

export const acceptTOS = () => async (dispatch, getState: () => CodeStreamState) => {
	const session = getState().session;

	if (session.userId) {
		await dispatch(setUserPreference({ prefPath: ["acceptedTOS"], value: true }));
	}

	dispatch(setTOS(true));
};
