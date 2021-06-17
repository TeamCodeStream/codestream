export interface ProviderDisplay {
	displayName: string;
	shortDisplayName?: string;
	icon: string;
	getUrl?: string;
	urlPlaceholder?: string;
	helpUrl?: string;
	groupName?: string;
	boardLabel?: string;
	listLabel?: string;
	cardLabel?: string;
	boardLabelCaps?: string; // added programatically
	listLabelCaps?: string; // added programatically
	cardLabelCaps?: string; // added programatically

	// FIXME -- temp this should come from the server
	supportsStartWork?: boolean;
	hasCardBasedWorkflow?: boolean;
	hasFilters?: boolean;
	hasCustomFilters?: boolean;
	customFilterExample?: string;
	customFilterHelp?: string;

	customPullRequestFilterHelpLink?: string;
	customPullRequestFilterExample?: string;

	supportsPRManagement?: boolean;
	versionMinimum?: string;
}

export const PROVIDER_MAPPINGS: { [provider: string]: ProviderDisplay } = {
	asana: {
		displayName: "Asana",
		icon: "asana",
		boardLabel: "project",
		listLabel: "section",
		cardLabel: "task",
		hasFilters: true,
		supportsStartWork: true
	},
	bitbucket: {
		displayName: "Bitbucket",
		icon: "bitbucket",
		boardLabel: "project",
		listLabel: "list",
		cardLabel: "issue",
		supportsStartWork: true
	},
	bitbucket_server: {
		displayName: "Bitbucket Server",
		shortDisplayName: "Bitbucket",
		icon: "bitbucket",
		urlPlaceholder: "https://bitbucket.myorg.com",
		helpUrl:
			"https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html"
	},
	clubhouse: {
		displayName: "Clubhouse",
		icon: "clubhouse",
		helpUrl: "https://help.clubhouse.io/hc/en-us/articles/205701199-Clubhouse-API-Tokens",
		supportsStartWork: true
	},
	linear: {
		displayName: "Linear",
		icon: "linear",
		supportsStartWork: true
	},
	codestream: {
		displayName: "CodeStream",
		icon: "codestream"
	},
	github: {
		displayName: "GitHub",
		icon: "mark-github",
		boardLabel: "repo",
		listLabel: "type",
		cardLabel: "issue",
		// hasFilters: true,
		hasCustomFilters: true,
		customFilterExample: "Example: is:open milestone:jan assignee:@me",
		customFilterHelp:
			'See <a href="https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests">Searching issues</a> for a detailed list of qualifiers.',
		customPullRequestFilterHelpLink:
			"https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests",
		customPullRequestFilterExample:
			"The variable @me can be used to specify the logged in user within a search. ",
		supportsStartWork: true,
		supportsPRManagement: true
	},
	github_enterprise: {
		displayName: "GitHub Enterprise",
		icon: "mark-github",
		urlPlaceholder: "https://git.myorg.com",
		helpUrl:
			"https://help.github.com/en/enterprise/2.15/user/articles/creating-a-personal-access-token-for-the-command-line",
		boardLabel: "repo",
		listLabel: "type",
		cardLabel: "issue",
		hasCustomFilters: true,
		customFilterExample: "Example: is:open milestone:jan assignee:@me",
		customFilterHelp:
			'See <a href="https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests">Searching issues</a> for a detailed list of qualifiers.',
		customPullRequestFilterExample:
			"The variable @me can be used to specify the logged in user within a search. ",
		customPullRequestFilterHelpLink:
			"https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests",
		supportsStartWork: true,
		supportsPRManagement: true
	},
	gitlab: {
		displayName: "GitLab",
		icon: "gitlab",
		boardLabel: "repo",
		listLabel: "type",
		cardLabel: "issue",
		hasCustomFilters: true,
		customFilterExample: "Example: state=opened&labels=bug,duplicate ",
		customFilterHelp:
			'See <a href="https://docs.gitlab.com/ee/api/issues.html">this article</a> for a detailed list of qualifiers. By default, filters only return issues created by the current user (you). To get all issues, use parameter <code>scope=all</code>. Use an & between parameters in the query.',
		customPullRequestFilterExample: 'Example: "state:opened scope:created_by_me" ',
		customPullRequestFilterHelpLink: "https://docs.gitlab.com/ee/api/merge_requests.html",
		supportsStartWork: true,
		supportsPRManagement: true
	},
	gitlab_enterprise: {
		displayName: "GitLab Self-Managed",
		shortDisplayName: "GitLab",
		icon: "gitlab",
		urlPlaceholder: "https://gitlab.myorg.com",
		helpUrl: "https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html",
		boardLabel: "repo",
		listLabel: "type",
		cardLabel: "issue",
		hasCustomFilters: true,
		customFilterExample: "Example: state=opened&labels=bug,duplicate ",
		customFilterHelp:
			'See <a href="https://docs.gitlab.com/ee/api/issues.html">this article</a> for a detailed list of qualifiers. By default, filters only return issues created by the current user (you). To get all issues, use parameter <code>scope=all</code>. Use an & between parameters in the query.',
		customPullRequestFilterExample: 'Example: "state:opened scope:created_by_me" ',
		customPullRequestFilterHelpLink: "https://docs.gitlab.com/ee/api/merge_requests.html",
		supportsStartWork: true,
		supportsPRManagement: true,
		versionMinimum: "12.10"
	},
	jira: {
		displayName: "Jira",
		icon: "jira",
		boardLabel: "project",
		listLabel: "type",
		cardLabel: "ticket",
		supportsStartWork: true,
		hasCustomFilters: true,
		customFilterExample: "Example: assignee=currentuser() AND status!=Closed",
		customFilterHelp:
			'See <a href="https://confluence.atlassian.com/jirasoftwareserver/advanced-searching-939938733.html">Jira Advanced Searching</a> for documentation on JQL.',
		hasCardBasedWorkflow: true
	},
	jiraserver: {
		displayName: "Jira Server",
		icon: "jira",
		urlPlaceholder: "https://jira.myorg.com",
		boardLabel: "project",
		listLabel: "type",
		cardLabel: "ticket",
		supportsStartWork: true,
		hasCustomFilters: true,
		customFilterExample: "Example: assignee=currentuser() AND status!=Closed",
		customFilterHelp:
			'See <a href="https://confluence.atlassian.com/jirasoftwareserver/advanced-searching-939938733.html">Jira Advanced Searching</a> for documentation on JQL.',
		hasCardBasedWorkflow: true
	},
	trello: {
		displayName: "Trello",
		icon: "trello",
		boardLabel: "board",
		listLabel: "list",
		cardLabel: "card",
		hasFilters: true,
		supportsStartWork: true
	},
	youtrack: {
		displayName: "YouTrack",
		icon: "youtrack",
		getUrl: "https://www.jetbrains.com/youtrack/download/get_youtrack.html",
		boardLabel: "project",
		listLabel: "type",
		cardLabel: "issue",
		supportsStartWork: true
	},
	azuredevops: {
		displayName: "Azure DevOps",
		icon: "azuredevops",
		getUrl: "https://azure.microsoft.com/en-us/services/devops",
		boardLabel: "project",
		listLabel: "list",
		cardLabel: "work item",
		supportsStartWork: true
	},
	slack: { displayName: "Slack", icon: "slack", groupName: "Workspace" },
	msteams: { displayName: "Microsoft Teams", icon: "msteams", groupName: "Organization" }
	//okta: { displayName: "Okta", icon: "okta" } -- suppress display under "Active Integrations"
};

const ucFirst = (string = "") => string.charAt(0).toUpperCase() + string.slice(1);

Object.keys(PROVIDER_MAPPINGS).forEach(key => {
	PROVIDER_MAPPINGS[key].boardLabelCaps = ucFirst(PROVIDER_MAPPINGS[key].boardLabel);
	PROVIDER_MAPPINGS[key].listLabelCaps = ucFirst(PROVIDER_MAPPINGS[key].listLabel);
	PROVIDER_MAPPINGS[key].cardLabelCaps = ucFirst(PROVIDER_MAPPINGS[key].cardLabel);
});
