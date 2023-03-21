"use strict";

import { LanguageId } from "./clmManager";
import {
	FileLevelTelemetryAverageDuration,
	FileLevelTelemetryErrorRate,
	FileLevelTelemetrySampleSize,
	GetFileLevelTelemetryRequest,
} from "@codestream/protocols/agent";
import { FLTNameInferenceJavaStrategy } from "./FLTNameInferenceJavaStrategy";
import { FLTCodeAttributeStrategy } from "./FLTCodeAttributeStrategy";
import { FLTNameInferenceKotlinStrategy } from "./FLTNameInferenceKotlinStrategy";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";

export type FLTResponse = {
	averageDuration: FileLevelTelemetryAverageDuration[];
	errorRate: FileLevelTelemetryErrorRate[];
	sampleSize: FileLevelTelemetrySampleSize[];
};

export interface FLTStrategy {
	execute(): Promise<FLTResponse>;
}

export class FLTStrategyFactory {
	createStrategies(
		entityGuid: string,
		accountId: number,
		languageId: LanguageId,
		relativeFilePath: string,
		request: GetFileLevelTelemetryRequest,
		resolutionMethod: "filePath" | "locator" | "hybrid",
		graphqlClient: NewRelicGraphqlClient
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
				graphqlClient
			)
		);

		if (languageId === "java") {
			strategies.push(
				new FLTNameInferenceJavaStrategy(
					entityGuid,
					accountId,
					relativeFilePath,
					request,
					graphqlClient
				)
			);
		}
		if (languageId === "kotlin") {
			strategies.push(
				new FLTNameInferenceKotlinStrategy(
					entityGuid,
					accountId,
					relativeFilePath,
					request,
					graphqlClient
				)
			);
		}

		return strategies;
	}
}
