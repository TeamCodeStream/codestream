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
		customFilterExample: "Example: <code>is:open milestone:jan assignee:@me</code>",
		customFilterHelp:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries/">custom queries</a> for a detailed list of qualifiers. ',
		customPullRequestFilterHelpLink:
			//https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-issues-and-pull-requests
			"https://docs.codestream.com/userguide/faq/custom-queries/",
		customPullRequestFilterExample:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries/">custom queries</a> for a detailed list of qualifiers. ',
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
		customFilterExample: "Example: <code>is:open milestone:jan assignee:@me</code>",
		customFilterHelp:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries/">custom queries</a> for a detailed list of qualifiers. ',
		customPullRequestFilterExample:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries/">custom queries</a> for a detailed list of qualifiers. ',
		customPullRequestFilterHelpLink: "https://docs.codestream.com/userguide/faq/custom-queries/",
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
		customFilterExample: "Example: <code>scope=assigned_to_me&project_id=22</code> ",
		customFilterHelp:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries-gl">this article</a> for search syntax and the available parameters. To search issues for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterExample:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries-gl">this article</a> for search syntax and the available parameters. To search merge requests for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterHelpLink: "https://docs.codestream.com/userguide/faq/custom-queries-gl/",
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
		customFilterExample: "Example: <code>scope=assigned_to_me&project_id=22</code> ",
		customFilterHelp:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries-gl">this article</a> for search syntax and the available parameters. To search issues for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterExample:
			'See <a href="https://docs.codestream.com/userguide/faq/custom-queries-gl">this article</a> for search syntax and the available parameters. To search merge requests for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterHelpLink: "https://docs.codestream.com/userguide/faq/custom-queries-gl/",
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
			'See <a href="https://confluence.atlassian.com/jirasoftwareserver/advanced-searching-939938733.html">Jira Advanced Searching</a> for documentation on JQL. ',
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
			'See <a href="https://confluence.atlassian.com/jirasoftwareserver/advanced-searching-939938733.html">Jira Advanced Searching</a> for documentation on JQL. ',
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
