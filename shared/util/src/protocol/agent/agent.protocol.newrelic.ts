"use strict";

export interface NewRelicId {
	accountId: number;
	domain: string;
	type: string;
	identifier: string;
}

export interface NewRelicConfigurationData {
	apiKey: string;
	accountId: string;
	apiUrl?: string;
}
