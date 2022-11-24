"use strict";

export interface AsanaCreateCardRequest {
	name: string;
	description: string;
	boardId: number;
	listId: number;
	assignee: { id: string };
}

export interface AsanaWorkspace {
	id: number;
	gid: string;
}

export interface AsanaTeam {
	id: number;
	gid: string;
}

export interface AsanaProject {
	id: number;
	gid: string;
	layout: string;
	name: string;
	sections: AsanaSection[];
	workspace: AsanaWorkspace;
	team?: AsanaTeam;
}

export interface AsanaSection {
	id: number;
	gid: string;
	name: string;
}

export interface AsanaUser {
	id: number;
	gid: string;
	name: string;
	email: string;
	workspaces: AsanaWorkspace[];
}

export interface AsanaCreateCardResponse {
	data: {
		gid: string;
		url: string;
		projects: AsanaProject[];
		[key: string]: any;
	};
}

export interface AsanaFetchBoardsRequest {
	organizationId?: string;
}

export interface AsanaBoard {
	id: string;
	name: string;
	lists: AsanaList[];
	singleAssignee?: boolean;
}

export interface AsanaFetchBoardsResponse {
	boards: AsanaBoard[];
}

export interface AsanaList {
	id: string;
	name: string;
}

export interface AsanaCard {
	id: string;
	[key: string]: any;
}
