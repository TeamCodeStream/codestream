"use strict";

import { CSProviderInfos } from "@codestream/protocols/api";

import {
	ThirdPartyCodeAnalyzerProvider,
	ThirdPartyProviderSupportsCodeAnalyzers,
} from "./provider";
import { ThirdPartyProviderBase } from "./thirdPartyProviderBase";

export abstract class ThirdPartyCodeAnalyzerProviderBase<
		TProviderInfo extends CSProviderInfos = CSProviderInfos
	>
	extends ThirdPartyProviderBase<TProviderInfo>
	implements ThirdPartyCodeAnalyzerProvider
{
	supportsCodeAnalysis(): this is ThirdPartyCodeAnalyzerProvider &
		ThirdPartyProviderSupportsCodeAnalyzers {
		return ThirdPartyCodeAnalyzerProvider.supportsCodeAnalysis(this);
	}
}
