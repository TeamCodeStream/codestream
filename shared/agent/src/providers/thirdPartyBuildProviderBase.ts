"use strict";

import { CSProviderInfos } from "../protocol/api.protocol.models";
import { ThirdPartyBuildProvider, ThirdPartyProviderSupportsBuilds } from "./provider";
import { ThirdPartyProviderBase } from "./thirdPartyProviderBase";

export abstract class ThirdPartyBuildProviderBase<
		TProviderInfo extends CSProviderInfos = CSProviderInfos
	>
	extends ThirdPartyProviderBase<TProviderInfo>
	implements ThirdPartyBuildProvider
{
	supportsBuilds(): this is ThirdPartyBuildProvider & ThirdPartyProviderSupportsBuilds {
		return ThirdPartyBuildProvider.supportsBuilds(this);
	}
}
