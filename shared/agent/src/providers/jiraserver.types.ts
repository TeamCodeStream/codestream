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
	issueTypes: IssueTypeDescriptor[];
}

export interface JiraProjectsMetaResponse {
	projects: JiraProjectMeta[];
}

export interface CreateJiraIssueResponse {
	id: string;
	key: string;
	self: string;
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

export interface JiraCardResponse extends JiraPaginate {
	expand: string;
	issues: IssuesEntity[];
	names: Names;
	nextPage?: string;
}

export interface IssuesEntity {
	id: string;
	self: string;
	key: string;
	fields: Fields;
	transitions?: TransitionsEntity[];
	expand?: string;
}

export interface Fields {
	summary: string;
	issuetype: Issuetype;
	subtasks?: IssuesEntity[];
	description: string;
	project: Project;
	assignee: Assignee;
	priority: Priority;
	updated: string;
	status: Status;
}

export interface Issuetype {
	self: string;
	id: string;
	description: string;
	iconUrl: string;
	name: string;
	subtask: boolean;
	avatarId?: number;
}

export interface Status {
	self: string;
	description: string;
	iconUrl: string;
	name: string;
	id: string;
	statusCategory: StatusCategory;
}

export interface StatusCategory {
	self: string;
	id: number;
	key: string;
	colorName: string;
	name: string;
}

export interface Priority {
	self: string;
	iconUrl: string;
	name: string;
	id: string;
}

export interface Project {
	self: string;
	id: string;
	key: string;
	name: string;
	projectTypeKey: string;
	avatarUrls: AvatarUrls;
}

export interface AvatarUrls {
	"48x48": string;
	"24x24": string;
	"16x16": string;
	"32x32": string;
}

export interface Assignee {
	self: string;
	name: string;
	key: string;
	avatarUrls: AvatarUrls;
	displayName: string;
	active: boolean;
	timeZone: string;
}

export interface TransitionsEntity {
	id: string;
	name: string;
	to: Status;
}

export interface Names {
	summary: string;
	issuetype: string;
	subtasks: string;
	description: string;
	project: string;
	assignee: string;
	priority: string;
	updated: string;
	status: string;
}
