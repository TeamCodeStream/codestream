"use strict";

export interface TrelloCreateCardRequest {
	listId: string;
	name: string;
	description: string;
	assignees?: [{ id: string }];
}

export interface TrelloCreateCardResponse {
	id: string;
	url: string;
}

export interface TrelloFetchBoardsRequest {
	organizationId?: string;
}

export interface TrelloBoard {
	id: string;
	name: string;
	desc: string;
	descData: string;
	closed: boolean;
	idOrganization: string;
	pinned: boolean;
	url: string;
	labelNames: { [color: string]: string };
	starred: boolean;
	lists: TrelloList[];
}

export interface TrelloFetchBoardsResponse {
	boards: TrelloBoard[];
}

export interface TrelloFetchListsRequest {
	boardId: string;
}

export interface TrelloList {
	id: string;
	name: string;
	closed: boolean;
	idBoard: string;
	pos: number;
	subscribed: boolean;
}

export interface TrelloCard {
	id: string;
	tokenId: string;
	name: string;
	desc: string;
	url: string;
	idList: string;
	idBoard: string;
	idOrganization: string;
	shortLink: string;
	dateLastActivity: string;
	modifiedAt: number;
}

export interface TrelloFetchListsResponse {
	lists: TrelloList[];
}

export interface TrelloMember {
	id: string;
	username: string;
	email: string;
	fullName: string;
}
