"use strict";
import { Agent as HttpsAgent } from "https";
import * as url from "url";
import HttpsProxyAgent from "https-proxy-agent";
// import * as vscode from "vscode";
import fetch, { RequestInit } from "node-fetch";
import { ProtocolHandler } from "./protocolHandler";
import { AbortController } from "node-abort-controller";
import {
	env,
	ExtensionContext,
	extensions,
	version as vscodeVersion,
	window,
	workspace
} from "vscode";
import { WebviewLike } from "./webviews/webviewLike";
import { CodeStreamWebviewSidebar } from "./webviews/webviewSidebar";

import { GitExtension } from "./@types/git";

import { SessionStatusChangedEvent } from "./api/session";
import { ContextKeys, GlobalState, setContext, WorkspaceState } from "./common";
import { Config, configuration, Configuration } from "./configuration";
import { extensionQualifiedId } from "./constants";
import { Container, TelemetryOptions } from "./container";
import { Logger, TraceLevel } from "./logger";
import { FileSystem, Strings, Versions } from "./system";
import * as TokenManager from "./api/tokenManager";
import { SaveTokenReason } from "./api/tokenManager";

const extension = extensions.getExtension(extensionQualifiedId);
export const extensionVersion = extension?.packageJSON?.version ?? "1.0.0";

interface BuildInfoMetadata {
	buildNumber: string;
	assetEnvironment: string;
}

export const IDE_NAME = "VS Code";

const serverUrlMigrations: { [url: string]: string } = {
	"https://staging-api.codestream.us": "https://codestream-stg.staging-service.newrelic.com",
	"https://api.codestream.com": "https://codestream-us1.service.newrelic.com",
	"https://eu-api.codestream.com": "https://codestream-eu1.service.eu.newrelic.com"
};

export async function activate(context: ExtensionContext) {
	const start = process.hrtime();
	Configuration.configure(context);
	Logger.configure(context, configuration.get<TraceLevel>(configuration.name("traceLevel").value));

	let info = await FileSystem.loadJsonFromFile<BuildInfoMetadata>(
		context.asAbsolutePath(`codestream-${extensionVersion}.info`)
	);
	if (info === undefined) {
		info = { buildNumber: "", assetEnvironment: "dev" };
	}

	const edition = env.appName;
	const editionFormat = `${edition.indexOf(" Insiders") > -1 ? " (Insiders)" : ""}`;
	const formattedVersion = `${extensionVersion}${info.buildNumber ? `-${info.buildNumber}` : ""}${
		info.assetEnvironment && info.assetEnvironment !== "prod" ? ` (${info.assetEnvironment})` : ""
	}`;
	Logger.log(
		`CodeStream${editionFormat} v${formattedVersion} in VS Code (v${vscodeVersion}) starting${
			Logger.isDebugging ? " in debug mode" : ""
		}...`
	);

	const git = await gitPath();

	let cfg = configuration.get<Config>();

	if (cfg.serverUrl[cfg.serverUrl.length - 1] === "/") {
		await configuration.updateEffective(
			configuration.name("serverUrl").value,
			cfg.serverUrl.substr(0, cfg.serverUrl.length - 1)
		);

		cfg = configuration.get<Config>();
	}
	let updatedServerUrl;
	for (const key of Object.keys(serverUrlMigrations)) {
		if (cfg.serverUrl === key) {
			try {
				await configuration.updateEffective(
					configuration.name("serverUrl").value,
					serverUrlMigrations[key]
				);
				updatedServerUrl = true;

				const teamId = Container.context.workspaceState.get(WorkspaceState.TeamId, undefined);
				if (teamId) {
					const oldToken = await TokenManager.get(cfg.serverUrl, cfg.email, teamId);
					if (oldToken) {
						await TokenManager.addOrUpdate(
							SaveTokenReason.SERVER_MIGRATION,
							serverUrlMigrations[key],
							oldToken.email,
							oldToken.teamId,
							oldToken
						);
					}
				}
			} catch (ex) {
				Logger.warn(`FAILED to update ${key}  - ${ex.message}`);
			}
		}
	}
	if (updatedServerUrl) {
		cfg = configuration.get<Config>();
	}
	let telemetryOptions: TelemetryOptions | undefined = undefined;
	try {
		const proxyAgent = getHttpsProxyAgent(getInitializationOptions());
		const requestInit: RequestInit | undefined = {
			agent: proxyAgent,
			headers: {
				"X-CS-Plugin-IDE": IDE_NAME
			}
		};

		// 5s failsafe
		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, 5000);
		requestInit.signal = controller.signal;

		const response = await fetch(`${cfg.serverUrl.trim()}/no-auth/nr-ingest-key`, requestInit);

		clearTimeout(timeout);

		telemetryOptions = await response.json();
	} catch (ex) {
		Logger.warn(`no NewRelic telemetry - ${ex.message}`);
	}

	let webviewSidebar: (WebviewLike & CodeStreamWebviewSidebar) | undefined = undefined;
	// this plumping lives here rather than the WebviewController as it needs to get activated here
	webviewSidebar = new CodeStreamWebviewSidebar(Container.session, context.extensionUri);

	context.subscriptions.push(
		window.registerWebviewViewProvider(CodeStreamWebviewSidebar.viewType, webviewSidebar, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		})
	);

	// const codelensProvider = new CodelensProvider();

	// languages.registerCodeLensProvider("*", codelensProvider);

	await Container.initialize(
		context,
		cfg,
		{
			extension: {
				build: info.buildNumber,
				buildEnv: info.assetEnvironment,
				version: extensionVersion,
				versionFormatted: formattedVersion
			},
			gitPath: git,
			ide: {
				name: IDE_NAME,
				version: vscodeVersion,
				// Visual Studio Code or Visual Studio Code - Insiders
				detail: edition
			},
			isDebugging: Logger.isDebugging,
			serverUrl: cfg.serverUrl,
			disableStrictSSL: cfg.disableStrictSSL,
			extraCerts: cfg.extraCerts,
			traceLevel: Logger.level,
			machineId: env.machineId
		},
		webviewSidebar,
		telemetryOptions
	);

	context.subscriptions.push(Container.session.onDidChangeSessionStatus(onSessionStatusChanged));
	context.subscriptions.push(new ProtocolHandler());

	const previousVersion = context.globalState.get<string>(GlobalState.Version);
	showStartupUpgradeMessage(extensionVersion, previousVersion);
	if (previousVersion === undefined) {
		// show CS on initial install
		await Container.sidebar.show();
	}

	context.globalState.update(GlobalState.Version, extensionVersion);

	Logger.log(
		`CodeStream${editionFormat} v${formattedVersion} started \u2022 ${Strings.getDurationMilliseconds(
			start
		)} ms`
	);
}

export async function deactivate(): Promise<void> {
	Container.agent.dispose();
}

function onSessionStatusChanged(e: SessionStatusChangedEvent) {
	const status = e.getStatus();
	setContext(ContextKeys.Status, status);
}

let _gitPath: string | undefined;
export async function gitPath(): Promise<string> {
	if (_gitPath === undefined) {
		try {
			const gitExtension = extensions.getExtension("vscode.git");
			if (gitExtension !== undefined) {
				const gitApi = (
					(gitExtension.isActive
						? gitExtension.exports
						: await gitExtension.activate()) as GitExtension
				).getAPI(1);
				_gitPath = gitApi.git.path;
			}
		} catch {}

		if (_gitPath === undefined) {
			_gitPath = workspace.getConfiguration("git").get<string>("path") || "git";
		}
	}
	return _gitPath;
}

// Add any versions here that we want to skip for blog posts
const skipVersions = [Versions.from(1, 2)];

async function showStartupUpgradeMessage(version: string, previousVersion: string | undefined) {
	// if this is the first install, there is no previous message... don't show
	if (!previousVersion) return;

	if (previousVersion !== version) {
		Logger.log(
			`CodeStream upgraded ${
				previousVersion === undefined ? "" : `from v${previousVersion} `
			}to v${version}`
		);
	}

	const [major, minor] = version.split(".");

	const [prevMajor, prevMinor] = previousVersion.split(".");
	if (
		(major === prevMajor && minor === prevMinor) ||
		// Don't notify on downgrades
		major < prevMajor ||
		(major === prevMajor && minor < prevMinor)
	) {
		return;
	}

	const compareTo = Versions.from(major, minor);
	if (skipVersions.some(v => Versions.compare(compareTo, v) === 0)) return;

	// only show for new releases that are in the X.0 format
	// blog going away...

	// if (major > prevMajor && minor === "0") {
	// 	const actions: MessageItem[] = [{ title: "What's New" } /* , { title: "Release Notes" } */];

	// 	const result = await window.showInformationMessage(
	// 		`CodeStream has been updated to v${version} — check out what's new!`,
	// 		...actions
	// 	);

	// 	if (result != null) {
	// 		if (result === actions[0]) {
	// 			await env.openExternal(
	// 				Uri.parse(
	// 					`https://www.codestream.com/blog/codestream-v${major}-${minor}?utm_source=ext_vsc&utm_medium=popup&utm_campaign=v${major}-${minor}`
	// 				)
	// 			);
	// 		}
	// 	}
	// }
}

export function getHttpsProxyAgent(options: {
	proxySupport?: string;
	proxy?: {
		url: string;
		strictSSL?: boolean;
	};
}) {
	let _httpsAgent: HttpsAgent | HttpsProxyAgent | undefined = undefined;
	const redactProxyPasswdRegex = /(http:\/\/.*:)(.*)(@.*)/gi;
	if (
		options.proxySupport === "override" ||
		(options.proxySupport == null && options.proxy != null)
	) {
		if (options.proxy != null) {
			const redactedUrl = options.proxy.url.replace(redactProxyPasswdRegex, "$1*****$3");
			Logger.log(
				`Proxy support is in override with url=${redactedUrl}, strictSSL=${options.proxy.strictSSL}`
			);
			_httpsAgent = new HttpsProxyAgent({
				...url.parse(options.proxy.url),
				rejectUnauthorized: options.proxy.strictSSL
			} as any);
		} else {
			Logger.log("Proxy support is in override, but no proxy settings were provided");
		}
	} else if (options.proxySupport === "on") {
		const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
		if (proxyUrl) {
			const strictSSL = options.proxy ? options.proxy.strictSSL : true;
			const redactedUrl = proxyUrl.replace(redactProxyPasswdRegex, "$1*****$3");
			Logger.log(`Proxy support is on with url=${redactedUrl}, strictSSL=${strictSSL}`);

			let proxyUri;
			try {
				proxyUri = url.parse(proxyUrl);
			} catch {}

			if (proxyUri) {
				_httpsAgent = new HttpsProxyAgent({
					...proxyUri,
					rejectUnauthorized: options.proxy ? options.proxy.strictSSL : true
				} as any);
			}
		} else {
			Logger.log("Proxy support is on, but no proxy url was found");
		}
	} else {
		Logger.log("Proxy support is off");
	}
	return _httpsAgent;
}

export function getInitializationOptions(
	options: { proxy?: any; proxySupport?: string; newRelicTelemetryEnabled?: boolean } = {}
) {
	if (Container.config.proxySupport !== "off") {
		const httpSettings = workspace.getConfiguration("http");
		const proxy = httpSettings.get<string | undefined>("proxy", "");
		if (proxy) {
			options.proxy = {
				url: proxy,
				strictSSL: httpSettings.get<boolean>("proxyStrictSSL", true)
			};
			options.proxySupport = "override";
		} else {
			options.proxySupport = "on";
		}
	} else {
		options.proxySupport = "off";
	}

	return options;
}
