"use strict";

export interface ClubhouseCreateCardRequest {
	projectId: string;
	name: string;
	description: string;
	assignees?: [{ id: string }];
}

export interface ClubhouseCreateCardResponse {
	id: string;
	app_url: string;
}

export interface ClubhouseFetchBoardsRequest {
	organizationId?: string;
}

export interface ClubhouseProject {
	id: string;
	name: string;
	description: string;
}

export interface ClubhouseFetchListsRequest {
	boardId: string;
}

export interface ClubhouseList {
	id: string;
	name: string;
	closed: boolean;
	idBoard: string;
	pos: number;
	subscribed: boolean;
}

export interface ClubhouseStory {
	id: string;
	name: string;
	description: string;
	app_url: string;
	updated_at: number;
}

export interface CLubhouseFetchListsResponse {
	lists: ClubhouseList[];
}

export interface ClubhouseSelf {
	id: string;
	mention_name: string;
	name: string;
	email?: string;
}

export interface ClubhouseProfile {
	deactivated: boolean;
	mention_name: string;
	name: string;
	email_address?: string;
}

export interface ClubhouseMember {
	id: string;
	profile: ClubhouseProfile;
}

export interface ClubhouseConfigurationData {
	token: string;
}
