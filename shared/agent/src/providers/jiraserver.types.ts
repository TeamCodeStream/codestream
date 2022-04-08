import { JiraCard } from "../protocol/agent.protocol.jira";

export interface JiraPaginate {
	maxResults: number;
	startAt: number;
	total: number;
	isLast: boolean;
}

export interface JiraPaginateValues<T> extends JiraPaginate {
	values: T[];
}

export interface JiraServerOauthParams {
	consumerKey: string;
	privateKey: string;
}

export interface JiraProject {
	id: string;
	name: string;
	key: string;
}

export interface IssueTypeFields {
	[name: string]: { required: boolean; hasDefaultValue: boolean };
}

export interface IssueTypeDescriptor {
	name: string;
	iconUrl: string;
	fields: IssueTypeFields;
}

export interface JiraProjectMeta extends JiraProject {
	issuetypes: IssueTypeDescriptor[];
}

export interface JiraProjectsMetaResponse {
	projects: JiraProjectMeta[];
}

export interface CreateJiraIssueResponse {
	id: string;
	key: string;
	self: string;
}

export interface CardSearchResponse {
	issues: JiraCard[];
	nextPage?: string;
	isLast: boolean;
	total: number;
}

export interface IssueType {
	self: string;
	id: string;
	description: string;
	iconUrl: string;
	name: string;
	subtask: boolean;
}

export interface IssueTypeDetails {
	required: boolean;
	schema: {
		items: string;
		type: string;
		system: string;
	};
	name: string;
	fieldId: string;
	autocompleteUrl: string;
	hasDefaultValue: boolean;
	operations: string[];
}
