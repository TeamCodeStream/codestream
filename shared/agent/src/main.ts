"use strict";
import { createConnection, ProposedFeatures } from "vscode-languageserver";
import { CodeStreamAgent, FileLspLogger } from "./agent";
import { Logger } from "./logger";

export * from "./providers/trello";
export * from "./providers/jira";
export * from "./providers/jiraserver";
export * from "./providers/github";
export * from "./providers/githubEnterprise";
export * from "./providers/gitlab";
export * from "./providers/gitlabEnterprise";
export * from "./providers/asana";
export * from "./providers/bitbucket";
export * from "./providers/bitbucketServer";
export * from "./providers/youtrack";
export * from "./providers/azuredevops";
export * from "./providers/slack";
export * from "./providers/msteams";
export * from "./providers/okta";
export * from "./providers/shortcut";
export * from "./providers/linear";
export * from "./providers/newrelic";

process.title = "CodeStream";

let logPath;
process.argv.forEach(function(val, index, array) {
	if (val && val.indexOf("--log=") === 0) {
		logPath = val.substring(6);
	}
});
const logger = logPath != null ? new FileLspLogger(logPath) : undefined;

const agentConfig = {
	logger: logger
};

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

new CodeStreamAgent(connection, agentConfig);

connection.listen();
