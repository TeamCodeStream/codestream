"use strict";
// tslint:disable-next-line:ordered-imports
// eslint-disable-next-line import/order
import "source-map-support/register";
import { AgentOptions, LogoutReason } from "@codestream/protocols/agent";
import {
	createConnection,
	InitializedParams,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocuments,
	TextDocumentSyncKind,
} from "vscode-languageserver";

import { CodeStreamAgent, FileLspLogger } from "./agent";
import { Logger } from "./logger";

export * from "./providers/asana";
export * from "./providers/azuredevops";
export * from "./providers/bitbucket";
export * from "./providers/bitbucketServer";
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

process.title = "CodeStream";

let logPath;
process.argv.forEach(function (val, index, array) {
	if (val && val.indexOf("--log=") === 0) {
		logPath = val.substring(6);
	}
});
const logger = logPath != null ? new FileLspLogger(logPath) : undefined;

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

let initializeParams: InitializeParams | undefined;

const documents = new TextDocuments();

const agentConfig = {
	documents: documents,
	logger: logger,
	onInitialize: async (e: InitializeParams) => {
		initializeParams = e;

		const agentOptions = e.initializationOptions! as AgentOptions;

		Logger.log(
			`Agent for CodeStream v${agentOptions.extension.versionFormatted} in ${agentOptions.ide.name} (v${agentOptions.ide.version}) initializing...`
		);

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
			},
			result: null,
		} as InitializeResult;
	},
	// This doesn't get called by Visual Studio, so just ignore it
	onInitialized: (e: InitializedParams) => {
		Logger.log("onInitialized");
	},
};

let agent = new CodeStreamAgent(connection, agentConfig);

connection.onRequest("codestream/onInitialized", async (agentOptions: AgentOptions) => {
	if (agent.signedIn) {
		restartAgent();
	}

	Logger.log(`Agent(${agentOptions.ide.name}) initializing...`);

	const params = {
		...initializeParams,
		initializationOptions: agentOptions,
	} as InitializeParams;

	let response;
	try {
		response = await agent.onInitialize(params);

		if (response.result!.error == null) {
			Logger.log("onInitialized...");
			await agent.onInitialized({});
			Logger.log(`Agent(${agentOptions.ide.name}) initialize`);
		}
	} catch (ex) {
		Logger.error(ex);

		response = {
			result: {
				error: ex.message,
			},
		};
	}

	return response;
});

connection.onRequest("codestream/logout", async _ => {
	await agent.logout(LogoutReason.Unknown);
	restartAgent();
});

function restartAgent() {
	Logger.log("Restarting agent...");

	if (agent != null) {
		agent.dispose();
	}
	agent = new CodeStreamAgent(connection, agentConfig);
}

connection.listen();
export { mapNRErrorResponse } from "./providers/newrelic/utils";
export { errorTypeMapper } from "./providers/newrelic/utils";
export { toFixedNoRounding } from "./providers/newrelic/utils";
export { ContextLogger } from "./providers/contextLogger";
