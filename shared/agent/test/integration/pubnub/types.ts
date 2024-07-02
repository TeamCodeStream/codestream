"use strict";

export interface RegisterRequest {
	email: string;
	username: string;
	password: string;
	_confirmationCheat?: string;
}

export interface RegisterResponse {
	user: {
		email: string;
		confirmationCode: string;
	};
}

export interface ConfirmRequest {
	email: string;
	confirmationCode: string;
}

export interface UserData {
	_id: string;
	email: string;
}

export interface UserResponse {
	user: UserData;
}

export interface LoginResponse {
	user: UserData;
	accessToken: string;
	pubnubKey: string;
	broadcasterToken: string;
}

export interface InviteUserRequest {
	teamId: string;
	email: string;
}

export interface CreateTeamRequest {
	name: string;
}

export interface TeamData {
	_id: string;
	name: string;
}

export interface CreateTeamResponse {
	team: TeamData;
}

export interface CreateStreamRequest {
	teamId: string;
	type: "channel" | "direct";
	name?: string;
	memberIds?: string[];
}

export interface StreamData {
	_id: string;
	name?: string;
	type: string;
	memberIds?: string[];
}

export interface CreateStreamResponse {
	stream: StreamData;
}

export interface CreatePostRequest {
	streamId: string;
	text: string;
}

export interface PostData {
	_id: string;
	text: string;
}

export interface CreatePostResponse {
	post: PostData;
}
