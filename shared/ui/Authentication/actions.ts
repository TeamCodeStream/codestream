import {
	BootstrapRequestType,
	ConfirmLoginCodeRequest,
	ConfirmLoginCodeRequestType,
	GenerateLoginCodeRequestType,
	isLoginFailResponse,
	LoginSuccessResponse,
	OtcLoginRequestType,
	PasswordLoginRequest,
	PasswordLoginRequestType,
	TokenLoginRequest,
	TokenLoginRequestType,
	UpdateNewRelicOrgIdRequestType,
} from "@codestream/protocols/agent";
import { CodemarkType, LoginResult } from "@codestream/protocols/api";
import { LogoutRequestType } from "@codestream/protocols/webview";
import { setBootstrapped } from "@codestream/webview/store/bootstrapped/actions";
import { withExponentialConnectionRetry } from "@codestream/webview/store/common";
import { reset } from "@codestream/webview/store/session/actions";
import { BootstrapInHostRequestType, OpenUrlRequestType } from "../ipc/host.protocol";
import { GetActiveEditorContextRequestType } from "../ipc/host.protocol.editor";
import { logError } from "../logger";
import { CodeStreamState } from "../store";
import { bootstrap } from "../store/actions";
import { getCodemark } from "../store/codemarks/reducer";
import {
	clearForceRegion,
	clearPendingProtocolHandlerUrl,
	goToCompanyCreation,
	goToEmailConfirmation,
	goToLogin,
	goToSetPassword,
	goToSignup,
	goToSSOAuth,
	goToTeamCreation,
	handlePendingProtocolHandlerUrl,
	setContext,
	setCurrentCodeError,
	setCurrentCodemark,
	setCurrentReview,
	SupportedSSOProvider,
} from "../store/context/actions";
import { ChatProviderAccess } from "../store/context/types";
import { setMaintenanceMode, setSession } from "../store/session/actions";
import { fetchCodemarks, setUserPreference, setUserPreferences } from "../Stream/actions";
import { moveCursorToLine } from "../Stream/api-functions";
import { localStore } from "../utilities/storage";
import { emptyObject, uuid } from "../utils";
import { HostApi } from "../webview-api";
import { WebviewPanels } from "@codestream/protocols/api";
import { UpdateServerUrlRequestType } from "../ipc/host.protocol";
export enum SignupType {
	JoinTeam = "joinTeam",
	CreateTeam = "createTeam",
}
import { isEmpty as _isEmpty } from "lodash-es";

export interface SSOAuthInfo {
	fromSignup?: boolean;
	type?: SignupType;
	inviteCode?: string;
	hostUrl?: string;
	useIDEAuth?: boolean;
	gotError?: boolean;
	repoInfo?: {
		teamId: string;
		repoId: string;
		commitHash: string;
	};
	joinCompanyId?: string;
	loginUrl?: string;
	domain?: string;
	nrUserId?: string | number;
	email?: string;
	authDomainId?: string;
}

export const ProviderNames = {
	github: "GitHub",
	gitlab: "GitLab",
	bitbucket: "Bitbucket",
	newrelic: "New Relic",
};

export const startSSOSignin =
	(provider: SupportedSSOProvider, info?: SSOAuthInfo, access?: ChatProviderAccess) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const { context, configs, session } = getState();
		if (access == undefined) {
			access = context.chatProviderAccess;
		}

		const query: { [key: string]: string } = {};
		if (!info || !info.fromSignup) {
			query.noSignup = "1";
		}
		if (session.otc) {
			query.signupToken = session.otc;
		}
		if (access === "strict") {
			query.access = "string";
		}
		if (info && info.inviteCode) {
			query.inviteCode = info.inviteCode;
		}
		if (info && info.repoInfo) {
			query.repoInfo = `${info.repoInfo.teamId}|${info.repoInfo.repoId}|${info.repoInfo.commitHash}`;
		}
		if (info && info.hostUrl) {
			query.hostUrl = info.hostUrl;
		}
		if (session.machineId) {
			query.machineId = session.machineId;
		}
		if (info && info.joinCompanyId) {
			query.joinCompanyId = info.joinCompanyId;
		}
		if (info && info.domain) {
			query.domain = info.domain;
		}
		if (info && info.nrUserId) {
			const stringifiedNrUserId = info.nrUserId.toString();
			query.nrUserId = stringifiedNrUserId;
		}
		if (info && info.email) {
			query.email = info.email;
		}
		if (info && info.authDomainId) {
			query.authDomainId = info.authDomainId;
		}

		query.enableUId = "1"; // operating under Unified Identity

		const anonymousId = await HostApi.instance.getAnonymousId();
		if (!_isEmpty(anonymousId)) {
			query.anonUserId = anonymousId;
		}

		const queryString = Object.keys(query)
			.map(key => `${key}=${encodeURIComponent(query[key])}`)
			.join("&");

		try {
			await HostApi.instance.send(OpenUrlRequestType, {
				url: info?.loginUrl
					? info.loginUrl
					: `${configs.serverUrl}/web/provider-auth/${provider}?${queryString}`,
			});
			return dispatch(goToSSOAuth(provider, { ...(info || emptyObject), mode: access }));
		} catch (error) {
			logError(error, { detail: `Unable to start ${provider} sign in` });
		}
	};

// NOTE - this functionality is deprecated per Unified Identity
export const startIDESignin =
	(provider: SupportedSSOProvider, info?: SSOAuthInfo) =>
	async (dispatch, getState: () => CodeStreamState) => {
		try {
			throw new Error("IDE sign-in is deprecated");
			/*
			const { session } = getState();
			const result = await HostApi.instance.send(ConnectToIDEProviderRequestType, { provider });
			const request: ProviderTokenRequest = {
				provider,
				token: result.accessToken,
				inviteCode: info && info.inviteCode,
				repoInfo: info && info.repoInfo,
				noSignup: !info || !info.fromSignup,
				data: {
					sessionId: result.sessionId,
				},
			};
			if (session.otc) {
				request.signupToken = session.otc;
			}
			info = info || {};
			info.useIDEAuth = true;
			try {
				const fail = error => {
					info!.gotError = error;
					return dispatch(goToSSOAuth(provider, { ...(info || emptyObject) }));
				};
				HostApi.instance.send(ProviderTokenRequestType, request, { alternateReject: fail });
				return dispatch(goToSSOAuth(provider, { ...(info || emptyObject) }));
			} catch (tokenError) {
				info.gotError = true;
				return dispatch(goToSSOAuth(provider, { ...(info || emptyObject) }));
			}
			*/
		} catch (error) {
			logError(error, { detail: `Unable to start VSCode ${provider} sign in` });
		}
	};

export type PasswordLoginParams = Pick<PasswordLoginRequest, "email" | "password">;

export const authenticate =
	(params: PasswordLoginParams | TokenLoginRequest | ConfirmLoginCodeRequest) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const api = HostApi.instance;
		const { context } = getState();

		let response;
		if ((params as any).password) {
			response = await api.send(PasswordLoginRequestType, {
				...(params as PasswordLoginParams),
				team: getState().configs.team,
			});
		} else if ((params as any).code) {
			response = await api.send(ConfirmLoginCodeRequestType, {
				...(params as ConfirmLoginCodeRequest),
				team: getState().configs.team,
			});
		} else {
			response = await api.send(TokenLoginRequestType, {
				...(params as TokenLoginRequest),
				team: getState().configs.team,
			});
		}

		if (isLoginFailResponse(response)) {
			if (getState().session.inMaintenanceMode && response.error !== LoginResult.MaintenanceMode) {
				dispatch(setMaintenanceMode(false));
			}

			switch (response.error) {
				case LoginResult.MaintenanceMode:
					return dispatch(setMaintenanceMode(true, params));
				case LoginResult.MustSetPassword:
					return dispatch(goToSetPassword({ email: (params as PasswordLoginParams).email }));
				case LoginResult.NotInCompany:
					return dispatch(
						goToCompanyCreation({
							loggedIn: true,
							// since we're sure the error is NotInCompany, params below must be email/password because token
							// login is for resuming previous sessions and this error means you haven't ever fully signed into the extension
							email: (params as PasswordLoginParams).email,
							token: response.extra.token,
							userId: response.extra.userId,
							eligibleJoinCompanies: response.extra.eligibleJoinCompanies,
							accountIsConnected: response.extra.accountIsConnected,
						})
					);
				case LoginResult.NotOnTeam:
					return dispatch(
						goToTeamCreation({
							loggedIn: true,
							// since we're sure the error is NotOnTeam, params below must be email/password because token
							// login is for resuming previous sessions and this error means you haven't ever fully signed into the extension
							email: (params as PasswordLoginParams).email,
							token: response.extra.token,
						})
					);
				default:
					throw response.error;
			}
		}

		api.track("Signed In", {
			Source: context.pendingProtocolHandlerQuery?.src,
		});

		return dispatch(onLogin(response));
	};

export const generateLoginCode =
	(email: string) => async (dispatch, getState: () => CodeStreamState) => {
		const api = HostApi.instance;
		const response = await api.send(GenerateLoginCodeRequestType, { email });
		if (response.status === LoginResult.Success) {
			dispatch(
				goToEmailConfirmation({
					confirmationType: "login",
					email: email,
					registrationParams: {
						email: email,
						username: "",
						password: "",
					},
				})
			);
		} else {
			throw response.status;
		}
	};

const _bootstrap = () => {};

export const onLogin =
	(response: LoginSuccessResponse, isFirstPageview?: boolean, teamCreated?: boolean) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const api = HostApi.instance;

		const { bootstrapData, editorContext, bootstrapCore } = await withExponentialConnectionRetry(
			dispatch,
			async () => {
				const [bootstrapData, { editorContext }, bootstrapCore] = await Promise.all([
					api.send(BootstrapRequestType, {}),
					api.send(GetActiveEditorContextRequestType, undefined),
					api.send(BootstrapInHostRequestType, undefined),
				]);
				return {
					bootstrapData,
					editorContext,
					bootstrapCore,
				};
			},
			"bootstrap"
		);

		await dispatch(
			bootstrap({
				...bootstrapCore,
				...bootstrapData,
				editorContext,
				session: {
					...bootstrapCore.session,
					userId: response.state.userId,
					eligibleJoinCompanies: response.loginResponse.user.eligibleJoinCompanies || [],
				},
				capabilities: response.state.capabilities,
				context: {
					currentTeamId: response.state.teamId,
					isFirstPageview,
					currentCodemarkId: response.state.codemarkId,
				},
			})
		);

		const { context } = getState();

		if (response.state.codemarkId) {
			let { codemarks } = getState();
			if (Object.keys(codemarks).length === 0) {
				await dispatch(fetchCodemarks());
				codemarks = getState().codemarks;
			}
			const codemark = getCodemark(codemarks, response.state.codemarkId);
			if (codemark && codemark.type === CodemarkType.Link && codemark.markerIds?.length) {
				moveCursorToLine(codemark!.markerIds![0]);
			} else {
				dispatch(setCurrentCodemark(response.state.codemarkId));
			}
		} else if (response.state.reviewId) {
			dispatch(setCurrentReview(response.state.reviewId));
		} else if (response.state.codeErrorId) {
			dispatch(setCurrentCodeError(response.state.codeErrorId));
		}

		if (context.pendingProtocolHandlerUrl && !teamCreated) {
			await dispatch(handlePendingProtocolHandlerUrl(context.pendingProtocolHandlerUrl));
			dispatch(clearPendingProtocolHandlerUrl());
			dispatch(clearForceRegion());
		}
	};

export const completeSignup =
	(
		email: string,
		token: string,
		teamId: string,
		extra: {
			createdTeam: boolean;
			provider?: string;
			byDomain?: boolean;
			setEnvironment?: { environment: string; serverUrl: string };
		}
	) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const tokenUrl =
			(extra.setEnvironment && extra.setEnvironment.serverUrl) || getState().configs.serverUrl;
		const response = await HostApi.instance.send(TokenLoginRequestType, {
			token: {
				value: token,
				email,
				url: tokenUrl,
				teamId,
			},
			teamId,
			setEnvironment: extra.setEnvironment,
		});

		if (extra.provider === "newrelic") {
			await HostApi.instance.send(UpdateNewRelicOrgIdRequestType, { teamId });
		}

		if (isLoginFailResponse(response)) {
			logError("There was an error completing signup", response);
			dispatch(goToLogin());
			throw response.error;
		}

		dispatch(setUserPreference({ prefPath: ["reviewCreateOnCommit"], value: false }));

		dispatch(
			setUserPreferences([
				{
					prefPath: ["sidebarPanes", WebviewPanels.OpenReviews, "removed"],
					value: true,
				},
				{
					prefPath: ["sidebarPanes", WebviewPanels.Tasks, "removed"],
					value: true,
				},
				{
					prefPath: ["sidebarPanes", WebviewPanels.CICD, "removed"],
					value: true,
				},
			])
		);

		const providerName = extra.provider
			? ProviderNames[extra.provider.toLowerCase()] || extra.provider
			: "Email";
		HostApi.instance.track("Signup Completed", {
			"Signup Type": extra.byDomain ? "Domain" : extra.createdTeam ? "Organic" : "Viral",
			"Auth Provider": providerName,
		});
		dispatch(onLogin(response, true, extra.createdTeam));
	};

export const completeAcceptInvite =
	(
		email: string,
		token: string,
		teamId: string,
		extra: {
			createdTeam: boolean;
			provider?: string;
			byDomain?: boolean;
			setEnvironment?: { environment: string; serverUrl: string };
		}
	) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const tokenUrl =
			(extra.setEnvironment && extra.setEnvironment.serverUrl) || getState().configs.serverUrl;

		dispatch(setBootstrapped(false));
		dispatch(reset());

		await HostApi.instance.send(LogoutRequestType, {});

		const response = await HostApi.instance.send(TokenLoginRequestType, {
			token: {
				value: token,
				email,
				url: tokenUrl,
				teamId,
			},
			teamId,
			setEnvironment: extra.setEnvironment,
		});

		if (isLoginFailResponse(response)) {
			logError("There was an error completing signup", response);
			dispatch(goToLogin());
			throw response.error;
		}

		dispatch(setUserPreference({ prefPath: ["reviewCreateOnCommit"], value: false }));

		dispatch(
			setUserPreferences([
				{
					prefPath: ["sidebarPanes", WebviewPanels.OpenReviews, "removed"],
					value: true,
				},
				{
					prefPath: ["sidebarPanes", WebviewPanels.Tasks, "removed"],
					value: true,
				},
				{
					prefPath: ["sidebarPanes", WebviewPanels.CICD, "removed"],
					value: true,
				},
			])
		);

		const providerName = extra.provider
			? ProviderNames[extra.provider.toLowerCase()] || extra.provider
			: "Email";
		HostApi.instance.track("Signup Completed", {
			"Signup Type": extra.byDomain ? "Domain" : extra.createdTeam ? "Organic" : "Viral",
			"Auth Provider": providerName,
		});
		dispatch(onLogin(response, true, extra.createdTeam));
	};

export const validateSignup =
	(provider: string, authInfo?: SSOAuthInfo) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const { context, session } = getState();
		const response = await HostApi.instance.send(OtcLoginRequestType, {
			code: session.otc!,
			errorGroupGuid: context.pendingProtocolHandlerQuery?.errorGroupGuid,
		});

		const providerName = provider ? ProviderNames[provider.toLowerCase()] || provider : "Email";

		if (isLoginFailResponse(response)) {
			if (session.inMaintenanceMode && response.error !== LoginResult.MaintenanceMode) {
				dispatch(setMaintenanceMode(false));
			}
			switch (response.error) {
				case LoginResult.MaintenanceMode:
					return dispatch(setMaintenanceMode(true));
				case LoginResult.MustSetPassword:
					return dispatch(goToSetPassword(response.extra));
				case LoginResult.SignupRequired:
					return dispatch(goToSignup({ type: SignupType.CreateTeam }));
				case LoginResult.SignInRequired:
					return dispatch(goToLogin());
				case LoginResult.AlreadySignedIn:
					return dispatch(bootstrap());
				case LoginResult.NotInCompany:
					HostApi.instance.track("Account Created", {
						email: response.extra.email,
						"Auth Provider": providerName,
						Source: context.pendingProtocolHandlerQuery?.src,
					});
					return dispatch(
						goToCompanyCreation({
							email: response.extra && response.extra.email,
							token: response.extra && response.extra.token,
							userId: response.extra && response.extra.userId,
							eligibleJoinCompanies: response.extra && response.extra.eligibleJoinCompanies,
							accountIsConnected: response.extra && response.extra.accountIsConnected,
							isWebmail: response.extra.isWebmail,
							provider,
						})
					);
				case LoginResult.NotOnTeam:
					HostApi.instance.track("Account Created", {
						email: response.extra.email,
						"Auth Provider": providerName,
						Source: context.pendingProtocolHandlerQuery?.src,
					});
					return dispatch(
						goToTeamCreation({
							email: response.extra && response.extra.email,
							token: response.extra && response.extra.token,
							provider,
						})
					);
				case LoginResult.ProviderConnectFailed:
				// @ts-ignore - reset the otc and cascade to the default case
				case LoginResult.ExpiredToken:
					dispatch(setSession({ otc: uuid() }));
				default:
					if (
						response.error === LoginResult.Unknown &&
						response?.extra?.url &&
						response?.extra?.code &&
						response?.extra?.code === "USRC-1032"
					) {
						HostApi.instance.send(UpdateServerUrlRequestType, {
							serverUrl: response?.extra?.url,
						});
						return;
					} else {
						throw response.error;
					}
			}
		}

		if (authInfo && authInfo.fromSignup) {
			HostApi.instance.track("Account Created", {
				email: response.loginResponse.user.email,
				"Auth Provider": providerName,
				Source: context.pendingProtocolHandlerQuery?.src,
			});

			HostApi.instance.track("Signup Completed", {
				// i don't think there's any way of reaching here unless user is already on a company/team by invite
				"Signup Type": "Viral", // authInfo.type === SignupType.CreateTeam ? "Organic" : "Viral",
				"Auth Provider": providerName,
			});

			return await dispatch(onLogin(response, true));
		} else {
			const signupStatus = response.loginResponse?.signupStatus;

			let trackingInfo = {
				"Org Created": false,
				"User Created": false,
				"Open in IDE Flow": false,
				Source: context.pendingProtocolHandlerQuery?.src,
			};
			if (signupStatus === "teamCreated") {
				trackingInfo["Org Created"] = true;
				trackingInfo["User Created"] = true;
			}
			if (signupStatus === "userCreated") trackingInfo["User Created"] = true;
			if (!_isEmpty(context.pendingProtocolHandlerUrl)) trackingInfo["Open in IDE Flow"] = true;
			HostApi.instance.track("Signed In", trackingInfo);
			if (localStore.get("enablingRealTime") === true) {
				localStore.delete("enablingRealTime");
				HostApi.instance.track("Slack Chat Enabled");
				const result = await dispatch(onLogin(response));
				dispatch(setContext({ chatProviderAccess: "permissive" }));
				return result;
			}
		}
	};
