"use strict";

export interface TelemetryService {
	setConsent: (hasConsented: boolean) => void;
	identify: (id: string, props?: { [key: string]: any }) => void;
	setSuperProps: (props: { [key: string]: string | number | boolean }) => void;
	addSuperProps: (props: { [key: string]: string | number | boolean }) => void;
	ready(): Promise<void>;
	track: (event: string, data?: { [key: string]: string | number | boolean }) => void;
	setAnonymousId: (id: string) => void;
	getAnonymousId(): string;
}
