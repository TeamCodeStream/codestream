"use strict";

export interface YouTrackCreateCardRequest {
	boardId: string;
	name: string;
	description: string;
	assignees?: [{ id: string }];
}

export interface YouTrackCreateCardResponse {
	id: string;
	idReadable: string;
	url: string;
}

export interface YouTrackFetchBoardsRequest {}

export interface YouTrackBoard {
	id: string;
	name: string;
	shortName: string;
}

export interface YouTrackCard {
	id: string;
	name: string;
	[kay: string]: any;
}

export interface YouTrackFetchBoardsResponse {
	boards: YouTrackBoard[];
}

export interface YouTrackUser {
	id: string;
	name: string;
	fullName: string;
}

export interface YouTrackConfigurationData {
	baseUrl: string;
	token: string;
	host?: string;
}
