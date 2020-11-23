import { Index } from "../common";
import {
	TrelloList,
	TrelloBoard,
	ClubhouseProject,
	JiraBoard,
	GitHubBoard,
	BitbucketBoard,
	AsanaBoard,
	AsanaList,
	GitLabBoard,
	SlackChannel,
	AzureDevOpsBoard,
	YouTrackBoard,
	TrelloCard
} from "@codestream/protocols/agent";

export interface ActiveIntegrationData {
	isLoading?: boolean;
}

export type SlackV2IntegrationData = ActiveIntegrationData & {
	[slackTeamId: string]: {
		channels: { type: string; name: string; id: string }[];
		lastSelectedChannel?: { type: string; name: string; id: string };
	};
};

export interface SlackIntegrationData extends ActiveIntegrationData {
	boards?: SlackChannel[];
	currentBoard?: SlackChannel;
	//currentList?: TrelloList;
}

export interface TrelloIntegrationData extends ActiveIntegrationData {
	boards?: TrelloBoard[];
	cards?: TrelloCard[];
	currentBoard?: TrelloBoard;
	currentList?: TrelloList;
}

export interface JiraIntegrationData extends ActiveIntegrationData {
	projects?: JiraBoard[];
	currentProject?: JiraBoard;
	currentIssueType?: string;
}

export interface GitHubIntegrationData extends ActiveIntegrationData {
	repos?: GitHubBoard[];
	currentRepo?: GitHubBoard;
}

export interface GitLabIntegrationData extends ActiveIntegrationData {
	repos?: GitLabBoard[];
	currentRepo?: GitLabBoard;
}

export interface BitbucketIntegrationData extends ActiveIntegrationData {
	repos?: BitbucketBoard[];
	currentRepo?: BitbucketBoard;
}

export interface AsanaIntegrationData extends ActiveIntegrationData {
	boards?: AsanaBoard[];
	currentBoard?: AsanaBoard;
	currentList?: AsanaList;
}

export interface AzureDevOpsIntegrationData extends ActiveIntegrationData {
	projects?: AzureDevOpsBoard[];
	currentProject?: AzureDevOpsBoard;
}

export interface YouTrackIntegrationData extends ActiveIntegrationData {
	projects?: YouTrackBoard[];
	currentProject?: YouTrackBoard;
}

export interface ClubhouseIntegrationData extends ActiveIntegrationData {
	projects?: ClubhouseProject[];
	currentProject?: ClubhouseProject;
}

export interface ActiveIntegrationsState extends Index<ActiveIntegrationData> {}

export enum ActiveIntegrationsActionType {
	UpdateForProvider = "@activeIntegrations/UpdateForProvider",
	DeleteForProvider = "@activeIntegrations/DeleteForProvider"
}
