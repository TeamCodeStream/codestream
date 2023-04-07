import { RequestType } from "vscode-languageserver-protocol";

export interface GenerateMSTeamsConnectCodeRequest {}

export interface GenerateMSTeamsConnectCodeResponse {
	connectCode: string;
}

export const GenerateMSTeamsConnectCodeRequestType = new RequestType<
	GenerateMSTeamsConnectCodeRequest,
	GenerateMSTeamsConnectCodeResponse,
	void,
	void
>("codestream/msteams/generate-connect-code");
