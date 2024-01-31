"use strict";

import { TelemetryData, TelemetryEventName } from "@codestream/protocols/agent";

export interface TelemetryService {
	setConsent: (hasConsented: boolean) => void;
	identify: (id: string, props?: { [key: string]: any }) => void;
	setSuperProps: (props: { [key: string]: string | number | boolean }) => void;
	addSuperProps: (props: { [key: string]: string | number | boolean }) => void;
	ready(): Promise<void>;
	track: (event: TelemetryEventName, data?: TelemetryData) => void;
	setAnonymousId: (id: string) => void;
	getAnonymousId(): string;
}
