"use strict";

import { LanguageId } from "./clmManager";
import {
	FileLevelTelemetryAverageDuration,
	FileLevelTelemetryErrorRate,
	FileLevelTelemetrySampleSize,
	GetFileLevelTelemetryRequest,
} from "@codestream/protocols/agent";
import { FLTNameInferenceJavaStrategy } from "./FLTNameInferenceJavaStrategy";
import { INewRelicProvider } from "../../newrelic";
import { FLTCodeAttributeStrategy } from "./FLTCodeAttributeStrategy";
import { FLTNameInferenceKotlinStrategy } from "./FLTNameInferenceKotlinStrategy";

export interface FLTStrategy {
	execute(): Promise<{
		averageDuration: FileLevelTelemetryAverageDuration[];
		errorRate: FileLevelTelemetryErrorRate[];
		sampleSize: FileLevelTelemetrySampleSize[];
	}>;
}

export class FLTStrategyFactory {
	createStrategies(
		entityGuid: string,
		accountId: number,
		languageId: LanguageId,
		relativeFilePath: string,
		request: GetFileLevelTelemetryRequest,
		resolutionMethod: "filePath" | "locator" | "hybrid",
		provider: INewRelicProvider
	): FLTStrategy[] {
		const strategies: FLTStrategy[] = [];
		strategies.push(
			new FLTCodeAttributeStrategy(
				entityGuid,
				accountId,
				languageId,
				relativeFilePath,
				request,
				resolutionMethod,
				provider
			)
		);

		if (languageId === "java") {
			strategies.push(
				new FLTNameInferenceJavaStrategy(entityGuid, accountId, relativeFilePath, request, provider)
			);
		}
		if (languageId === "kotlin") {
			strategies.push(
				new FLTNameInferenceKotlinStrategy(
					entityGuid,
					accountId,
					relativeFilePath,
					request,
					provider
				)
			);
		}

		return strategies;
	}
}
