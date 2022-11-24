"use strict";

export interface BitbucketCreateCardRequest {
	repoName: string;
	title: string;
	description: string;
	assignee?: { uuid: string };
}

export interface BitbucketCard {
	id: string;
	links: {
		self: {
			href: string;
		};
		html?: {
			href: string;
		};
	};
	url: string;
}

export interface BitbucketCreateCardResponse extends BitbucketCard {}

export interface BitbucketBoard {
	id: string;
	name: string;
	path: string;
	apiIdentifier: string;
}

export interface BitbucketFetchBoardsResponse {
	boards: BitbucketBoard[];
}

export interface BitbucketList {
	id: string;
	name: string;
	closed: boolean;
	idBoard: string;
	pos: number;
	subscribed: boolean;
}

export interface BitbucketFetchListsResponse {
	lists: BitbucketList[];
}
