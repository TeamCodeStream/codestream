"use strict";
import { RequestType } from "vscode-languageserver-protocol";

export interface ReadTextFileRequest {
	path: string;
	baseDir?: string;
}

export interface ReadTextFileResponse {
	contents?: string;
}

export const ReadTextFileRequestType = new RequestType<
	ReadTextFileRequest,
	ReadTextFileResponse,
	void,
	void
>("codestream/text-files/read");

export interface WriteTextFileRequest {
	path: string;
	contents: string;
}

export interface WriteTextFileResponse {
	success?: boolean;
}

export const WriteTextFileRequestType = new RequestType<
	WriteTextFileRequest,
	WriteTextFileResponse,
	void,
	void
>("codestream/text-files/write");

export interface DeleteTextFileRequest {
	path: string;
}

export interface DeleteTextFileResponse {
	success?: boolean;
}
