import {
	AsanaBoard,
	AsanaList,
	AzureDevOpsBoard,
	BitbucketBoard,
	GitHubBoard,
	GitLabBoard,
	JiraBoard,
	LinearProject,
	LinearTeam,
	ShortcutProject,
	SlackChannel,
	ThirdPartyProviderBoard,
	ThirdPartyProviderCard,
	TrelloBoard,
	TrelloList,
	YouTrackBoard,
} from "@codestream/protocols/agent";
import { Index } from "@codestream/utils/types";

export interface ActiveIntegrationData<T = ThirdPartyProviderBoard> {
	isLoading?: boolean;
	cards: ThirdPartyProviderCard[];
	boards: T[];
	fetchCardsError: { message: string };
}

export type SlackV2IntegrationData = ActiveIntegrationData & {
	[slackTeamId: string]: {
		channels: { type: string; name: string; id: string }[];
		members?: { id: string; name: string }[];
		lastSelectedChannel?: { type: string; name: string; id: string };
	};
};

export interface SlackIntegrationData extends ActiveIntegrationData<SlackChannel> {
	currentBoard?: SlackChannel;
	//currentList?: TrelloList;
}

export interface TrelloIntegrationData extends ActiveIntegrationData<TrelloBoard> {
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

export interface AsanaIntegrationData extends ActiveIntegrationData<AsanaBoard> {
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

export interface ShortcutIntegrationData extends ActiveIntegrationData {
	projects?: ShortcutProject[];
	currentProject?: ShortcutProject;
}

export interface LinearIntegrationData extends ActiveIntegrationData {
	projects?: LinearProject[];
	currentProject?: LinearProject;
	teams?: LinearTeam[];
	currentTeam?: LinearTeam;
}

export interface NewRelicIntegrationData extends ActiveIntegrationData {}

export interface LoadingStatus {
	issuesLoading?: boolean;
	initialLoadComplete?: boolean;
}

export interface ActiveIntegrationsState {
	integrations: Index<ActiveIntegrationData>;
	issuesLoading: boolean;
	initialLoadComplete: boolean;
}

export enum ActiveIntegrationsActionType {
	UpdateForProvider = "@activeIntegrations/UpdateForProvider",
	DeleteForProvider = "@activeIntegrations/DeleteForProvider",
	SetIssuesLoading = "@activeIntegrations/IssuesLoading",
}
