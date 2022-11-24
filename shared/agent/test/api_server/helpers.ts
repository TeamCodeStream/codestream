import { AgentOptions } from "@codestream/protocols/agent";
import { Connection, Emitter, Event } from "vscode-languageserver";

import { CodeStreamAgent } from "../../src/agent";
import { CodeStreamSession } from "../../src/session";
import { xfs } from "../../src/xfs";

export class TestSlackWebClient {
	on() {}
	users = {};
}

export class TestSession extends CodeStreamSession {
	constructor(
		agent: CodeStreamAgent,
		connection: Connection,
		_options: AgentOptions,
		slackApiCall: any
	) {
		super(agent, connection, _options);
		this.slackApiCall = slackApiCall;
	}

	private slackApiCall: any;
}

export class TestAgent {
	_clientCapabilities = {};
	_connection = {};
	_disposable = {};
	_session = {};

	handlers = new Map<string, any>();
	registerHandler(type: any, handler: any): void {
		this.handlers.set(type.method, handler);
	}

	_onReady = new Emitter<void>();
	get onReady(): Event<void> {
		return this._onReady.event;
	}

	documents = {
		onDidChangeContent() {},
		onDidSave() {},
		onDidClose() {},
		onDidOpen() {},
	};

	sendNotification() {}
}

export class TestWorkspace {
	onDidChangeWorkspaceFolders() {}

	getWorkspaceFolders() {
		return [];
	}
}

export class TestConnection {
	console = {};
	tracer = {};
	telemetry = {};
	client = {};
	window = {};
	workspace = new TestWorkspace();

	onDidOpenTextDocument() {}
	listen() {}
	onRequest() {}
	sendRequest() {}
	onNotification() {}
	sendNotification() {}
	onInitialize() {}
	onInitialized() {}
	onShutdown() {}
	onExit() {}
	onDidChangeConfiguration() {}
	onDidChangeWatchedFiles() {}
	onDidChangeTextDocument() {}
	onDidCloseTextDocument() {}
	onWillSaveTextDocument() {}
	onWillSaveTextDocumentWaitUntil() {}
	onDidSaveTextDocument() {}
}

export interface TestData {
	agentOptions: AgentOptions;
	agentRequests: any[];
	csApiRequests: any[];
	slackApiRequests: any[];
}

export async function loadTestData(dir: string): Promise<TestData> {
	const fs = require("fs");
	const path = require("path");
	const dirPath = path.join(__dirname, dir);
	const files = fs.readdirSync(dirPath);
	const jsonFiles = files.sort().filter((file: string) => {
		return path.extname(file) === ".json";
	});

	let agentOptions: AgentOptions;
	const agentRequests = [];
	const csApiRequests = [];
	const slackApiRequests = [];

	for (const file of jsonFiles) {
		const [, , target] = file.replace(".json", "").split("-");
		const filePath = path.join(__dirname, dir, file);
		const data = await xfs.readJson(filePath);

		switch (target) {
			case "agent_options":
				agentOptions = data as any;
				break;
			case "agent":
				agentRequests.push(data);
				break;
			case "csapi":
				csApiRequests.push(data);
				break;
			case "slack":
				slackApiRequests.push(data);
				break;
		}
	}

	return {
		agentOptions: agentOptions!,
		agentRequests,
		csApiRequests,
		slackApiRequests,
	};
}

export function getRequest(url: string, requests: any[]): any {
	for (let i = 0; i < requests.length; i++) {
		const request = requests[i];
		if (request.url === url) {
			requests.splice(i, 1);
			return request;
		}
	}
	throw new Error("No request found for " + url);
}

export function trimUndefined(obj: any) {
	if (typeof obj !== "object") {
		return;
	}
	Object.keys(obj).forEach(key => {
		if (obj[key] && typeof obj[key] === "object") {
			trimUndefined(obj[key]);
		} else if (obj[key] === undefined) {
			delete obj[key];
		}
	});
}
