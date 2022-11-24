"use strict";

export interface GitHubCreateCardRequest {
	repoName: string;
	title: string;
	description: string;
	assignees?: [{ login: string }];
}

export interface GitHubCreateCardResponse {
	id: string;
	html_url: string;
}

export interface GitHubFetchBoardsRequest {
	organizationId?: string;
}

export interface GitHubBoard {
	id: string;
	name: string;
	path?: string;
	apiIdentifier: string;
}

export interface GitHubFetchBoardsResponse {
	boards: GitHubBoard[];
}

export interface GitHubFetchListsRequest {
	boardId: string;
}

export interface GitHubList {
	id: string;
	name: string;
	closed: boolean;
	idBoard: string;
	pos: number;
	subscribed: boolean;
}

export interface GitHubFetchListsResponse {
	lists: GitHubList[];
}

export interface GitHubUser {
	id: string;
	login: string;
	avatar_url: string;
}
