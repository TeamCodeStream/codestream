"use strict";

export interface AzureDevOpsCreateCardRequest {
	title: string;
	description: string;
	boardId: number;
	listId: number;
	assignee: { id: string };
}

export interface AzureDevOpsProject {
	id: string;
	name: string;
}

export interface AzureDevOpsCard {
	id: string;
	name: string;
	[key: string]: string;
}

export interface AzureDevOpsTeam {
	id: string;
	name: string;
}

export interface AzureDevOpsUser {
	identity: {
		id: string;
		displayName: string;
		uniqueName: string;
	};
}

export interface AzureDevOpsCreateCardResponse {
	id: string;
	rev: number;
	fields: { [key: string]: string }[];
	_links?: {
		html?: {
			href: string;
		};
	};
	url?: string;
}

export interface AzureDevOpsFetchBoardsRequest {
	organizationId?: string;
}

export interface AzureDevOpsBoard {
	id: string;
	name: string;
	singleAssignee?: boolean;
}

export interface AzureDevOpsFetchBoardsResponse {
	boards: AzureDevOpsBoard[];
}
