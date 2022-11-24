"use strict";
import { ApiVersionCompatibility, VersionCompatibility } from "@codestream/protocols/agent";
import { CSApiCapabilities, CSApiCapability } from "@codestream/protocols/api";
import { Disposable, Emitter, Event } from "vscode-languageserver";

import { Logger } from "../../logger";
import { log, Versions } from "../../system";
import {
	ApiProvider,
	CodeStreamApiMiddleware,
	CodeStreamApiMiddlewareContext,
} from "../apiProvider";
import { APIServerVersionInfo } from "../codestream/apiServerVersionInfo";

export interface VersionCompatibilityChangedEvent {
	compatibility: VersionCompatibility;
	downloadUrl: string;
	version: string | undefined;
}

export interface ApiVersionCompatibilityChangedEvent {
	compatibility: ApiVersionCompatibility;
	version: string;
	missingCapabilities?: CSApiCapabilities;
}

export class VersionMiddlewareManager implements Disposable {
	private _onDidChangeCompatibility = new Emitter<VersionCompatibilityChangedEvent>();
	get onDidChangeCompatibility(): Event<VersionCompatibilityChangedEvent> {
		return this._onDidChangeCompatibility.event;
	}

	private _onDidChangeApiCompatibility = new Emitter<ApiVersionCompatibilityChangedEvent>();
	get onDidChangeApiCompatibility(): Event<ApiVersionCompatibilityChangedEvent> {
		return this._onDidChangeApiCompatibility.event;
	}

	private readonly _disposable: Disposable;
	private _compatibility: VersionCompatibility | undefined;
	private _apiVersion: string = "";

	constructor(private readonly _api: ApiProvider) {
		this._disposable = this._api.useMiddleware(new VersionMiddleware(this));
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	@log()
	async notify(compatibility: VersionCompatibility, url: string, version: string | undefined) {
		if (this._compatibility === compatibility) return;

		this._compatibility = compatibility;
		this._onDidChangeCompatibility.fire({
			compatibility: compatibility,
			downloadUrl: url,
			version: version,
		});
	}

	@log()
	async apiVersionNotify(
		compatibility: ApiVersionCompatibility,
		version: string,
		missingCapabilities: CSApiCapabilities
	) {
		this._onDidChangeApiCompatibility.fire({
			compatibility,
			version,
			missingCapabilities,
		});
	}

	async setApiVersion(version: string) {
		if (version === this._apiVersion) return;
		Logger.log(
			`VersionMiddlewareManager: API version changed from ${this._apiVersion} to ${version}`
		);

		this._apiVersion = version;

		let compatibility = ApiVersionCompatibility.ApiCompatible;
		if (Versions.compare(version, APIServerVersionInfo.minimumRequired) === -1) {
			compatibility = ApiVersionCompatibility.ApiUpgradeRequired;
		} else if (Versions.compare(version, APIServerVersionInfo.minimumPreferred) === -1) {
			compatibility = ApiVersionCompatibility.ApiUpgradeRecommended;
		}

		const preferredCapabilities: { [id: string]: CSApiCapability } =
			APIServerVersionInfo.preferredCapabilities;
		const missingCapabilities = Object.keys(preferredCapabilities).reduce((capabilities, id) => {
			const capability = preferredCapabilities[id];
			if (capability.version && Versions.compare(version, capability.version) < 0) {
				(capabilities as CSApiCapabilities)[id] = capability;
			}
			return capabilities;
		}, {}) as CSApiCapabilities;

		this.apiVersionNotify(compatibility, version, missingCapabilities);
	}

	get apiVersion() {
		return this._apiVersion;
	}
}

export class VersionMiddleware implements CodeStreamApiMiddleware {
	constructor(private _manager: VersionMiddlewareManager) {}

	get name() {
		return "Version";
	}

	async onResponse<R>(context: Readonly<CodeStreamApiMiddlewareContext>, responseJson: Promise<R>) {
		if (context.response === undefined) return;

		const apiVersion = context.response.headers.get("X-CS-API-Version") || "";
		this._manager.setApiVersion(apiVersion);

		const compatibility = context.response.headers.get(
			"X-CS-Version-Disposition"
		) as VersionCompatibility | null;

		if (
			compatibility == null ||
			compatibility === VersionCompatibility.Compatible ||
			compatibility === VersionCompatibility.Unknown
		) {
			return;
		}

		if (
			(!context.response.ok && compatibility === VersionCompatibility.UnsupportedUpgradeRequired) ||
			(context.response.ok &&
				compatibility === VersionCompatibility.CompatibleUpgradeRecommended &&
				!context.url.endsWith("/login") &&
				context.url.indexOf("no-auth") === -1)
		) {
			// url checks are for trying not to fire this during the auth process
			const url =
				context.response.headers.get("X-CS-Latest-Asset-Url") || "https://www.codestream.com/";
			const version = context.response.headers.get("X-CS-Current-Version");
			void this._manager.notify(compatibility, url, version == null ? undefined : version);
		}
	}
}
