import { CSProviderInfos } from "../protocol/api.protocol.models";
import {
	ThirdPartyPostProvider,
	ThirdPartyProviderSupportsPosts,
	ThirdPartyProviderSupportsStatus
} from "./provider";
import { ThirdPartyProviderBase } from "./thirdPartyProviderBase";

export abstract class ThirdPartyPostProviderBase<
	TProviderInfo extends CSProviderInfos = CSProviderInfos
> extends ThirdPartyProviderBase<TProviderInfo> implements ThirdPartyPostProvider {
	supportsSharing(): this is ThirdPartyPostProvider & ThirdPartyProviderSupportsPosts {
		return ThirdPartyPostProvider.supportsSharing(this);
	}
	supportsStatus(): this is ThirdPartyPostProvider & ThirdPartyProviderSupportsStatus {
		return ThirdPartyPostProvider.supportsStatus(this);
	}
}
