import { RequestType } from "vscode-languageserver-protocol";
import { AccessToken, AgentState } from "./agent.protocol";
import {
	CSConfirmRegistrationRequest,
	CSEligibleJoinCompany,
	CSGetInviteInfoRequest,
	CSGetInviteInfoResponse,
	CSLoginResponse,
	CSRegisterRequest,
	CSSetPasswordResponse,
	LoginResult
} from "./api.protocol";
import { CSCompany } from "./api.protocol.models";

export function isLoginFailResponse(
	response: LoginSuccessResponse | LoginFailResponse
): response is LoginFailResponse {
	return (response as any).error !== undefined;
}

export interface LoginFailResponse {
	error: LoginResult;
	extra?: any;
}

export interface LoginSuccessResponse {
	loginResponse: CSLoginResponse;
	state: AgentState;
}

export type LoginResponse = LoginSuccessResponse | LoginFailResponse;

export interface PasswordLoginRequest {
	email: string;
	password: string;
	teamId?: string;
	team?: string;
}

export const PasswordLoginRequestType = new RequestType<
	PasswordLoginRequest,
	LoginResponse,
	void,
	void
>("codestream/login/password");

export interface TokenLoginRequest {
	token: AccessToken;
	teamId?: string;
	team?: string;
	codemarkId?: string;
	reviewId?: string;
	codeErrorId?: string;
}

export const TokenLoginRequestType = new RequestType<TokenLoginRequest, LoginResponse, void, void>(
	"codestream/login/token"
);

export interface OtcLoginRequest {
	code: string;
	teamId?: string;
	team?: string;
	errorGroupGuid?: string;
}

export const OtcLoginRequestType = new RequestType<OtcLoginRequest, LoginResponse, void, void>(
	"codestream/login/otc"
);

export interface RegisterUserRequest extends CSRegisterRequest {
	checkForWebmail?: boolean;
}

export interface RegisterUserResponse {
	status: LoginResult;
	token?: string;
}

export const RegisterUserRequestType = new RequestType<
	RegisterUserRequest,
	RegisterUserResponse,
	void,
	void
>("codestream/registration");

export interface RegisterNrUserRequest {
	apiRegion: string;
	apiKey: string;
}

export interface RegisterNrUserResponse {
	token?: string;
	email?: string;
	info?: {
		message: string;
	};
}

export const RegisterNrUserRequestType = new RequestType<
	RegisterNrUserRequest,
	RegisterNrUserResponse,
	void,
	void
>("codestream/nr-registration");

export interface ConfirmRegistrationRequest extends CSConfirmRegistrationRequest {}

export interface ConfirmRegistrationResponse {
	user?: {
		id: string;
	};
	status: LoginResult;
	token?: string;
	eligibleJoinCompanies?: CSEligibleJoinCompany[];
	accountIsConnected?: boolean;
	isWebmail?: boolean;
	companies?: CSCompany[];
}

export const ConfirmRegistrationRequestType = new RequestType<
	ConfirmRegistrationRequest,
	ConfirmRegistrationResponse,
	void,
	void
>("codestream/registration/confirm");

export interface GetInviteInfoRequest extends CSGetInviteInfoRequest {}

export interface GetInviteInfoResponse {
	status: LoginResult;
	info?: CSGetInviteInfoResponse;
}

export const GetInviteInfoRequestType = new RequestType<
	GetInviteInfoRequest,
	GetInviteInfoResponse,
	void,
	void
>("codestream/registration/invite-info");

export interface SendPasswordResetEmailRequest {
	email: string;
}

export const SendPasswordResetEmailRequestType = new RequestType<
	SendPasswordResetEmailRequest,
	void,
	void,
	void
>("codestream/sendPasswordResetEmail");

export interface SetPasswordRequest {
	password: string;
}

export const SetPasswordRequestType = new RequestType<
	SetPasswordRequest,
	CSSetPasswordResponse,
	void,
	void
>("codestream/setPassword");

interface GetAccessTokenRequest {}

interface GetAccessTokenResponse {
	accessToken: string;
}

export const GetAccessTokenRequestType = new RequestType<
	GetAccessTokenRequest,
	GetAccessTokenResponse,
	void,
	void
>("codestream/accessToken");
