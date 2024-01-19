import {
	TelemetryRequest,
	TelemetryRequestType,
	TelemetrySetAnonymousIdRequest,
	TelemetrySetAnonymousIdRequestType,
	GetAnonymousIdRequestType,
} from "@codestream/protocols/agent";

import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { debug, lsp, lspHandler } from "../system";
import { TelemetryService } from "../telemetry/telemetryService";
import { SegmentTelemetryService } from "../telemetry/segmentTelemetry";
import { NewRelicTelemetryService } from "../telemetry/newRelicTelemetry";
import UUID from "uuid";

@lsp
export class TelemetryManager {
	private readonly _providers: TelemetryService[];
	private _lastEventTime: number = 0;
	private _sessionId: string | undefined;

	constructor(session: CodeStreamSession) {
		this._providers = [
			new SegmentTelemetryService(session, false),
			new NewRelicTelemetryService(session, false),
		];
	}

	setConsent(hasConsented: boolean) {
		this._providers.forEach(provider => provider.setConsent(hasConsented));
	}

	identify(id: string, props: { [key: string]: any }) {
		this._providers.forEach(provider => provider.identify(id, props));
	}

	setSuperProps(props: { [key: string]: string | number | boolean }) {
		this._providers.forEach(provider => provider.setSuperProps(props));
	}

	addSuperProps(props: { [key: string]: string | number | boolean }) {
		this._providers.forEach(provider => provider.addSuperProps(props));
	}

	ready(): Promise<void[]> {
		return Promise.all(
			this._providers.map(provider => {
				return provider.ready();
			})
		);
	}

	@debug()
	@lspHandler(TelemetryRequestType)
	track(request: TelemetryRequest) {
		const cc = Logger.getCorrelationContext();
		const now = Date.now();

		// session ID times out after 30 minutes since last event
		if (!this._sessionId || !this._lastEventTime || now - this._lastEventTime > 30 * 60 * 1000) {
			this._sessionId = UUID();
		}
		this._lastEventTime = now;
		request.properties = request.properties || {};
		request.properties["session_id"] = this._sessionId;

		this._providers.forEach(provider => {
			try {
				void provider.track(request.eventName, request.properties);
			} catch (ex) {
				Logger.error(ex, cc);
			}
		});
	}

	@lspHandler(GetAnonymousIdRequestType)
	getAnonymousId() {
		// all providers have the same anonymousId
		return this._providers && this._providers.length
			? this._providers[0].getAnonymousId()
			: undefined;
	}

	@lspHandler(TelemetrySetAnonymousIdRequestType)
	setAnonymousId(request: TelemetrySetAnonymousIdRequest) {
		const cc = Logger.getCorrelationContext();
		this._providers.forEach(provider => {
			try {
				void provider.setAnonymousId(request.anonymousId);
			} catch (ex) {
				Logger.error(ex, cc);
			}
		});
	}
}
