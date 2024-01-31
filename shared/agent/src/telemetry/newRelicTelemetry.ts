"use strict";
import * as NewRelic from "newrelic";
import uuid from "uuid/v4";
import { Logger } from "../logger";
import { CodeStreamSession, SessionStatusChangedEvent } from "../session";
import { SessionStatus } from "../types";
import { debug } from "../system";
import { TelemetryData, TelemetryEventName } from "@codestream/protocols/agent";

export class NewRelicTelemetryService {
	private _superProps: { [key: string]: any };
	private _distinctId?: string;
	private _anonymousId: string;
	private _hasOptedOut: boolean;
	private _session: CodeStreamSession;
	private _readyPromise: Promise<void>;
	private _enabled?: boolean;

	private _onReady: () => void = () => {};

	/**
	 * @param {boolean} hasOptedOut - Has the user opted out of tracking?
	 * @param {{ [key: string]: string | number }} [opts] - Additional options
	 */
	constructor(
		session: CodeStreamSession,
		hasOptedOut: boolean,
		opts?: { [key: string]: string | number | boolean }
	) {
		Logger.debug(`Telemetry[NewRelic] created`);
		this._session = session;
		this._superProps = {};
		this._hasOptedOut = false;

		session.ready().then(() => this.initialize());

		const props = {
			...opts,
			Endpoint: session.versionInfo.ide.name,
			"Endpoint Detail": session.versionInfo.ide.detail,
		};
		this._superProps = props;
		this._hasOptedOut = hasOptedOut;
		this._anonymousId = uuid();

		session.onDidChangeSessionStatus(this.onSessionStatusChanged);

		this._readyPromise = new Promise<void>(resolve => {
			this._onReady = () => {
				this._enabled = this._session?.agent?.agentOptions?.newRelicTelemetryEnabled;
				if (this._enabled) {
					Logger.debug("Telemetry[NewRelic] is ready");
				} else {
					Logger.debug("Telemetry[NewRelic] is disabled");
				}
				resolve();
			};
		});
	}

	async ready() {
		return this._readyPromise;
	}

	async initialize() {
		Logger.debug("Telemetry[NewRelic] initialized");
		this._onReady();
	}

	private onSessionStatusChanged = async (event: SessionStatusChangedEvent) => {
		if (event.getStatus() === SessionStatus.SignedOut) return;

		const { preferences } = await this._session.api.getPreferences();

		// legacy consent
		if ("telemetryConsent" in preferences) {
			this.setConsent(preferences.telemetryConsent!);
		} else {
			this.setConsent(!Boolean(preferences.telemetryOptOut));
		}
	};

	identify(id: string, props?: { [key: string]: any }) {
		this._distinctId = id;
	}

	setAnonymousId(id: string) {
		this._anonymousId = id;
	}
	getAnonymousId() {
		return this._anonymousId;
	}

	setConsent(hasConsented: boolean) {
		this._hasOptedOut = !hasConsented;
	}

	setSuperProps(props: { [key: string]: string | number | boolean }) {
		this._superProps = props;
	}

	addSuperProps(props: { [key: string]: string | number | boolean }) {
		this._superProps = {
			...this._superProps,
			...props,
		};
	}

	@debug()
	track(event: TelemetryEventName, data?: TelemetryData) {
		if (!this._enabled) return;
		if (!event) {
			Logger.debug(`Tracking event missing`);
			return;
		}

		const cc = Logger.getCorrelationContext();

		if (this._hasOptedOut || !this._session?.agent?.agentOptions?.newRelicTelemetryEnabled) {
			Logger.debug("Cannot track, user has opted out");
			return;
		}

		let payload: { [key: string]: any } = { ...data, ...this._superProps };

		if (this._distinctId != null) {
			payload["distinct_id"] = this._distinctId;
		}

		Logger.debug(
			`Tracking userId=${this._distinctId} anonymousId=${this._anonymousId}:`,
			event,
			payload
		);
		try {
			// New Relic doesn't support nested objects as values... try to flatten them out (1-level only),
			// transforming foo = { bar: 1} into foo.bar = 1
			const toAdd = this.flatten(payload);
			payload = { ...payload, ...toAdd };

			NewRelic.recordCustomEvent(`CodeStream_Events`, {
				EventName: event.replace(/ /g, ""),
				Email: payload["$email"],
				"Company Name": payload["Company Name"],
				"NR Organization ID": payload["NR Organization ID"],
				"NR User ID": payload["NR User ID"],
				"Meta Data 1": JSON.stringify({
					EndPoint: payload["Endpoint"],
					"Endpoint Detail": payload["Endpoint Detail"],
					"IDE Version": payload["IDE Version"],
					"Plugin Version": payload["Plugin Version"],
				}),
			});
		} catch (ex) {
			Logger.error(ex, cc);
		}
	}

	private flatten(payload: any): any {
		const toAdd: any = {};
		try {
			const keys = Object.keys(payload);
			keys.forEach(k => {
				const data = payload[k];
				if (typeof data === "object") {
					Object.keys(data).forEach(_ => {
						const newKey = `${k}.${_}`;
						if (typeof data[_] !== "object") {
							toAdd[newKey] = data[_];
						} else {
							Logger.debug(`Ignoring nested object: ${newKey}`);
						}
					});
					delete payload[k];
				}
			});
		} catch (ex) {
			Logger.warn("Unable to flatten", ex);
		}
		return toAdd;
	}
}
