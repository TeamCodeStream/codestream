"use strict";
import { CSOktaProviderInfo } from "../protocol/api.protocol";
import { lspProvider } from "../system";
import { ThirdPartyPostProviderBase } from "./thirdPartyPostProviderBase";

@lspProvider("okta")
export class OktaProvider extends ThirdPartyPostProviderBase<CSOktaProviderInfo> {
	get displayName() {
		return "Okta";
	}

	get name() {
		return "okta";
	}

	get headers() {
		return {
			Authorization: `Bearer ${this.accessToken}`
		};
	}

	canConfigure() {
		return true;
	}
}
