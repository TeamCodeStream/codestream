"use strict";
// keep this as the first import
// tslint:disable-next-line:ordered-imports
// eslint-disable-next-line import/order
import "source-map-support/register";
import { createConnection, ProposedFeatures } from "vscode-languageserver";

import { CodeStreamAgent, FileLspLogger } from "./agent";
import fs from "fs/promises";
import path from "path";
import os from "os";

export * from "./providers/asana";
export * from "./providers/azuredevops";
export * from "./providers/bitbucket";
export * from "./providers/bitbucketServer";
export * from "./providers/circleci";
export * from "./providers/newrelic/vuln/nrVulnerability";
export * from "./providers/fossa";
export * from "./providers/github";
export * from "./providers/githubEnterprise";
export * from "./providers/gitlab";
export * from "./providers/gitlabEnterprise";
export * from "./providers/jira";
export * from "./providers/jiraserver";
export * from "./providers/linear";
export * from "./providers/msteams";
export * from "./providers/okta";
export * from "./providers/shortcut";
export * from "./providers/slack";
export * from "./providers/trello";
export * from "./providers/trunk";
export * from "./providers/youtrack";

export * from "./providers/newrelic/clm/clmProvider";
export * from "./providers/newrelic/logs/nrLogsProvider";
export * from "./providers/newrelic/slo/sloProvider";
export * from "./providers/newrelic/anomalies/anomaliesProvider";
export * from "./providers/newrelic/errors/observabilityErrorsProvider";
export * from "./providers/newrelic/entity/entityProvider";
export * from "./providers/newrelic/repos/reposProvider";
export * from "./providers/newrelic/deployments/deploymentsProvider";
export * from "./providers/newrelic/goldenSignals/goldenSignalsProvider";
export * from "./providers/newrelic/orgs/nrOrgProvider";
export * from "./providers/newrelic/clm/entityAccountResolver";
export * from "./providers/newrelic/newRelicGraphqlClient";
export * from "./api/httpClient";

function dumpError(err: Error | string): Promise<void> {
	return new Promise(resolve => {
		const destFile = path.join(os.homedir(), ".codestream", "agent-crash.txt");
		const content = err instanceof Error ? `${err.message}\n${err.stack}\n${err.cause ?? ""}` : err;
		fs.writeFile(destFile, content)
			.then(resolve)
			.catch(e => {
				console.error("Unable to make dump file", e);
				resolve();
			});
	});
}

function handleFatalError(err: Error) {
	console.error("===--- fatal error ---===");
	console.error(err);
	dumpError(err).then(() => {
		process.exit(1);
	});
}

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

process.title = "CodeStream";

try {
	let logPath;
	process.argv.forEach(function (val, index, array) {
		if (val && val.indexOf("--log=") === 0) {
			logPath = val.substring(6);
		}
	});
	const logger = logPath != null ? new FileLspLogger(logPath) : undefined;

	const agentConfig = {
		logger: logger,
	};

	// Create a connection for the server. The connection uses Node's IPC as a transport.
	// Also include all preview / proposed LSP features.
	const connection = createConnection(ProposedFeatures.all);

	new CodeStreamAgent(connection, agentConfig);

	connection.listen();
} catch (error) {
	handleFatalError(error);
}
