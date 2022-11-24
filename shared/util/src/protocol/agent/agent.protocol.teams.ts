"use strict";
import { RequestType } from "vscode-languageserver-protocol";
import {
	CSCreateTeamRequest,
	CSCreateTeamResponse,
	CSTeam,
	CSTeamTagRequest,
	CSTeamTagResponse,
} from "./api.protocol";

export interface FetchTeamsRequest {
	mine?: boolean;
	teamIds?: string[];
}

export interface FetchTeamsResponse {
	teams: CSTeam[];
}

export const FetchTeamsRequestType = new RequestType<
	FetchTeamsRequest,
	FetchTeamsResponse,
	void,
	void
>("codestream/teams");

export interface GetTeamRequest {
	teamId: string;
}

export interface GetTeamResponse {
	team: CSTeam;
}

export const GetTeamRequestType = new RequestType<GetTeamRequest, GetTeamResponse, void, void>(
	"codestream/team"
);

export type CreateTeamRequest = CSCreateTeamRequest;

export interface CreateTeamResponse extends CSCreateTeamResponse {}

export const CreateTeamRequestType = new RequestType<
	CreateTeamRequest,
	CreateTeamResponse,
	void,
	void
>("codestream/team/create");

export const CreateTeamTagRequestType = new RequestType<
	CSTeamTagRequest,
	CSTeamTagResponse,
	void,
	void
>("codestream/team/tag/create");

export const DeleteTeamTagRequestType = new RequestType<
	CSTeamTagRequest,
	CSTeamTagResponse,
	void,
	void
>("codestream/team/tag/deleete");

export const UpdateTeamTagRequestType = new RequestType<
	CSTeamTagRequest,
	CSTeamTagResponse,
	void,
	void
>("codestream/team/tag/update");

export interface UpdateTeamAdminRequest {
	teamId: string;
	add?: string;
	remove?: string;
}

export interface UpdateTeamAdminResponse {
	team: CSTeam;
}

export const UpdateTeamAdminRequestType = new RequestType<
	UpdateTeamAdminRequest,
	UpdateTeamAdminResponse,
	void,
	void
>("codestream/team/admin/update");

export interface UpdateTeamRequest {
	teamId: string;
	name?: string;
}

export interface UpdateTeamResponse {
	team: CSTeam;
}

export const UpdateTeamRequestType = new RequestType<
	UpdateTeamRequest,
	UpdateTeamResponse,
	void,
	void
>("codestream/team/update");

export interface UpdateTeamSettingsRequest {
	teamId: string;
	settings: { [key: string]: any };
}

export interface UpdateTeamSettingsResponse {
	team: CSTeam;
}

export const UpdateTeamSettingsRequestType = new RequestType<
	UpdateTeamSettingsRequest,
	UpdateTeamSettingsResponse,
	void,
	void
>("codestream/team/settings/update");

export interface AddBlameMapRequest {
	teamId: string;
	email: string;
	userId: string;
}

export interface AddBlameMapResponse {
	team: CSTeam;
}

export const AddBlameMapRequestType = new RequestType<
	AddBlameMapRequest,
	AddBlameMapResponse,
	void,
	void
>("codestream/team/add-blame-map");

export interface DeleteBlameMapRequest {
	teamId: string;
	email: string;
}

export interface DeleteBlameMapResponse {
	team: CSTeam;
}

export const DeleteBlameMapRequestType = new RequestType<
	DeleteBlameMapRequest,
	DeleteBlameMapResponse,
	void,
	void
>("codestream/team/delete-blame-map");
