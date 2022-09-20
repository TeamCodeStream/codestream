"use strict";

export interface LinearCreateCardRequest {
	projectId: string;
	name: string;
	description: string;
	assignees?: [{ id: string }];
}

export interface LinearCreateCardResponse {
	id: string;
	app_url: string;
}

export interface LinearFetchBoardsRequest {
	organizationId?: string;
}

export interface LinearTeam {
	id: string;
	name: string;
	archivedAt?: null | string;
	teamId: string;
	projects?: {
		nodes: LinearProject[];
	};
}

export interface LinearProject {
	id: string;
	name: string;
	archivedAt?: null | string;
	singleAssignee?: boolean;
}

export interface LinearFetchListsRequest {
	boardId: string;
}

export interface LinearList {
	id: string;
	name: string;
	closed: boolean;
	idBoard: string;
	pos: number;
	subscribed: boolean;
}

export interface LinearIssue {
	id: string;
	title: string;
	description: string;
	url: string;
	updatedAt: string;
	archivedAt?: null | string;
	identifier: string;
	branchName: string;
	state: {
		name: string;
	};
}

export interface LinearFetchListsResponse {
	lists: LinearList[];
}

export interface LinearUser {
	id: string;
	name: string;
	email?: string;
	archivedAt?: null | string;
}

export interface LinearConfigurationData {
	token: string;
}
