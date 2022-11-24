"use strict";

export interface ShortcutCreateCardRequest {
	projectId: string;
	name: string;
	description: string;
	assignees?: [{ id: string }];
}

export interface ShortcutCreateCardResponse {
	id: string;
	app_url: string;
}

export interface ShortcutFetchBoardsRequest {
	organizationId?: string;
}

export interface ShortcutProject {
	id: string;
	name: string;
	description: string;
}

export interface ShortcutFetchListsRequest {
	boardId: string;
}

export interface ShortcutList {
	id: string;
	name: string;
	closed: boolean;
	idBoard: string;
	pos: number;
	subscribed: boolean;
}

export interface ShortcutStory {
	id: string;
	name: string;
	description: string;
	app_url: string;
	updated_at: number;
}

export interface ShortcutFetchListsResponse {
	lists: ShortcutList[];
}

export interface ShortcutSelf {
	id: string;
	mention_name: string;
	name: string;
	email?: string;
}

export interface ShortcutProfile {
	deactivated: boolean;
	mention_name: string;
	name: string;
	email_address?: string;
}

export interface ShortcutMember {
	id: string;
	profile: ShortcutProfile;
}

export interface ShortcutConfigurationData {
	token: string;
}
