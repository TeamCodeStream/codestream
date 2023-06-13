export interface ProviderDisplay {
	displayName: string;
	shortDisplayName?: string;
	hideDisplayName?: boolean;
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
	checkVersionUrl?: string;
	checkVersionHover?: string;
	invalidHosts?: Array<string>;

	helpPATUrl?: string;
	namePAT?: string;

	directPAT?: {
		path: string;
		scopesParam: string;
		descriptionParam?: string;
	};
}

export const PROVIDER_MAPPINGS: { [provider: string]: ProviderDisplay } = {
	asana: {
		displayName: "Asana",
		icon: "asana",
		boardLabel: "project",
		listLabel: "section",
		cardLabel: "task",
		hasFilters: true,
		supportsStartWork: true,
	},
	bitbucket: {
		displayName: "Bitbucket",
		icon: "bitbucket",
		boardLabel: "project",
		listLabel: "list",
		cardLabel: "issue",
		supportsStartWork: true,
		customFilterHelp:
			'See <a href="https://developer.atlassian.com/cloud/bitbucket/rest/intro/#filtering">bitbucket</a> for more information. ',
		customPullRequestFilterHelpLink:
			'See <a href="https://developer.atlassian.com/cloud/bitbucket/rest/intro/#filtering">bitbucket</a> for more information. ',
		customFilterExample: "Example: <code>q=id<3</code>",
		hasCustomFilters: true,
		customPullRequestFilterExample:
			'See <a href="https://developer.atlassian.com/cloud/bitbucket/rest/intro/#filtering">bitbucket</a> for more information.',
	},
	bitbucket_server: {
		displayName: "Bitbucket Server",
		shortDisplayName: "Bitbucket",
		icon: "bitbucket",
		urlPlaceholder: "https://bitbucket.myorg.com",
		helpUrl:
			"https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html",
		invalidHosts: ["bitbucket.org"],
	},
	shortcut: {
		displayName: "Shortcut",
		icon: "shortcut",
		helpUrl: "https://help.shortcut.com/hc/en-us/articles/205701199-Clubhouse-API-Tokens",
		supportsStartWork: true,
	},
	linear: {
		displayName: "Linear",
		icon: "linear",
		supportsStartWork: true,
	},
	codestream: {
		displayName: "CodeStream",
		icon: "codestream",
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
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">custom queries</a> for a detailed list of qualifiers. ',
		customPullRequestFilterHelpLink:
			//https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-issues-and-pull-requests
			"https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github",
		customPullRequestFilterExample:
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">custom queries</a> for a detailed list of qualifiers. ',
		supportsStartWork: true,
		supportsPRManagement: true,
		helpPATUrl:
			"https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
		directPAT: {
			path: "settings/tokens/new",
			descriptionParam: "description",
			scopesParam: "scopes",
		},
	},
	github_enterprise: {
		displayName: "GitHub Enterprise",
		shortDisplayName: "GitHub",
		icon: "mark-github",
		urlPlaceholder: "https://git.myorg.com",
		helpUrl:
			"https://docs.github.com/en/enterprise-server@3.4/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
		boardLabel: "repo",
		listLabel: "type",
		cardLabel: "issue",
		hasCustomFilters: true,
		customFilterExample: "Example: <code>is:open milestone:jan assignee:@me</code>",
		customFilterHelp:
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">custom queries</a> for a detailed list of qualifiers. ',
		customPullRequestFilterExample:
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">custom queries</a> for a detailed list of qualifiers. ',
		customPullRequestFilterHelpLink:
			"https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github",
		supportsStartWork: true,
		supportsPRManagement: true,
		//invalidHosts: ["github.com"],
		directPAT: {
			path: "settings/tokens/new",
			descriptionParam: "description",
			scopesParam: "scopes",
		},
		versionMinimum: "3.3",
		checkVersionHover:
			"Open any page in GitHub Enterprise and scroll to the bottom of the page. The version number can be found in the footer.",
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
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">this article</a> for search syntax and the available parameters. To search issues for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterExample:
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">this article</a> for search syntax and the available parameters. To search merge requests for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterHelpLink:
			"https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab",
		supportsStartWork: true,
		supportsPRManagement: true,
		helpPATUrl: "https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html",
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
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">this article</a> for search syntax and the available parameters. To search issues for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterExample:
			'See <a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">this article</a> for search syntax and the available parameters. To search merge requests for a project, use parameter <code>project_id=X</code>. Use an <code>&</code> between parameters in the query. ',
		customPullRequestFilterHelpLink:
			"https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab",
		supportsStartWork: true,
		supportsPRManagement: true,
		versionMinimum: "12.10",
		checkVersionUrl: "https://docs.newrelic.com/docs/codestream/troubleshooting/glsm-version/",
		invalidHosts: ["gitlab.com"],
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
		hasCardBasedWorkflow: true,
		namePAT: "API Token",
	},
	jiraserver: {
		displayName: "Jira Server",
		icon: "jira",
		urlPlaceholder: "https://mycompany.com/jira",
		boardLabel: "project",
		listLabel: "type",
		cardLabel: "ticket",
		supportsStartWork: true,
		hasCustomFilters: true,
		customFilterExample: "Example: assignee=currentuser() AND status!=Closed",
		customFilterHelp:
			'See <a href="https://confluence.atlassian.com/jirasoftwareserver/advanced-searching-939938733.html">Jira Advanced Searching</a> for documentation on JQL. ',
		hasCardBasedWorkflow: true,
		invalidHosts: ["atlassian.net"],
		versionMinimum: "8.14.0",
		checkVersionUrl:
			"https://docs.newrelic.com/docs/codestream/troubleshooting/jira-server-version/",
		helpUrl:
			"https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html",
	},
	trello: {
		displayName: "Trello",
		icon: "trello",
		boardLabel: "board",
		listLabel: "list",
		cardLabel: "card",
		hasFilters: true,
		supportsStartWork: true,
	},
	youtrack: {
		displayName: "YouTrack",
		icon: "youtrack",
		getUrl: "https://www.jetbrains.com/youtrack/download/get_youtrack.html",
		boardLabel: "project",
		listLabel: "type",
		cardLabel: "issue",
		supportsStartWork: true,
	},
	azuredevops: {
		displayName: "Azure DevOps",
		icon: "azuredevops",
		getUrl: "https://azure.microsoft.com/en-us/services/devops",
		boardLabel: "project",
		listLabel: "list",
		cardLabel: "work item",
		supportsStartWork: true,
	},
	slack: { displayName: "Slack", icon: "slack", groupName: "Workspace" },
	msteams: { displayName: "Microsoft Teams", icon: "msteams", groupName: "Organization" },
	//okta: { displayName: "Okta", icon: "okta" } -- suppress display under "Active Integrations"
	newrelic: {
		displayName: "New Relic",
		icon: "newrelic",
		getUrl: "https://newrelic.com",
	},
	circleci: {
		displayName: "CircleCI",
		icon: "circleci",
		getUrl: "https://circleci.com",
		helpUrl: "https://circleci.com/docs/managing-api-tokens",
	},
	fossa: {
		displayName: "FOSSA",
		icon: "fossa",
		getUrl: "https://fossa.com",
		helpUrl: "https://docs.fossa.com/docs/authentication",
		hideDisplayName: true,
	},
};

const ucFirst = (string = "") => string.charAt(0).toUpperCase() + string.slice(1);

Object.keys(PROVIDER_MAPPINGS).forEach(key => {
	PROVIDER_MAPPINGS[key].boardLabelCaps = ucFirst(PROVIDER_MAPPINGS[key].boardLabel);
	PROVIDER_MAPPINGS[key].listLabelCaps = ucFirst(PROVIDER_MAPPINGS[key].listLabel);
	PROVIDER_MAPPINGS[key].cardLabelCaps = ucFirst(PROVIDER_MAPPINGS[key].cardLabel);
});
