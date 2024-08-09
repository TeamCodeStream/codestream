import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import {
	GetNewRelicAIEligibilityRequest,
	GetNewRelicAIEligibilityRequestType,
} from "@codestream/protocols/agent";
import { Logger } from "../../../logger";
import { Disposable } from "vscode-languageserver";
import { CapabilityScopeType } from "../newrelic.types";

const COMPUTE_ENTITLEMENT = "nr_queries_ccu";
const OVERRIDE_FEATURE_FLAG = "Collaboration/ama";
const GA_FEATURE_FLAG = "Collaboration/nrai_ga";
const NRAI_CAPABILITY = "newrelic_ai.ask.any";
enum TRIAL_STATUS {
	NONE = "NONE",
	IN_TRIAL = "IN_TRIAL",
	EXPIRED = "EXPIRED",
}

@lsp
export class NraiProvider implements Disposable {
	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "PreReleaseProgram");
	}

	@lspHandler(GetNewRelicAIEligibilityRequestType)
	@log()
	async getAIEligibility({ accountId }: GetNewRelicAIEligibilityRequest): Promise<boolean> {
		// mirrors logic from https://source.datanerd.us/collaboration/shared-component-ai-bot/blob/master/shared-component/hooks/useCanUseNrai.tsx
		let hasFeatureFlagOverride: boolean;
		let hasGaFeatureFlag: boolean;
		try {
			const ffData = await this.graphqlClient.getFeatureFlags([
				OVERRIDE_FEATURE_FLAG,
				GA_FEATURE_FLAG,
			]);

			hasFeatureFlagOverride = ffData[OVERRIDE_FEATURE_FLAG] === true;
			hasGaFeatureFlag = ffData[GA_FEATURE_FLAG] === true;
		} catch (ex) {
			Logger.warn(`Error fetching AI feature flags: ${ex.message}`);
			hasFeatureFlagOverride = false;
			hasGaFeatureFlag = false;
		}

		let hasNraiCapability: boolean;
		try {
			const capabilityData = hasGaFeatureFlag
				? await this.graphqlClient.getCapabilities(
						[NRAI_CAPABILITY],
						CapabilityScopeType.ACCOUNT,
						accountId
				  )
				: ({} as Record<typeof NRAI_CAPABILITY, boolean>);
			hasNraiCapability = capabilityData[NRAI_CAPABILITY] === true;
		} catch (ex) {
			Logger.warn(`Error fetching AI capability: ${ex.message}`);
			hasNraiCapability = false;
		}

		let hasComputeEntitlement: boolean;
		try {
			const entitlementData = hasGaFeatureFlag
				? await this.graphqlClient.getEntitlements([COMPUTE_ENTITLEMENT])
				: ({} as Record<typeof COMPUTE_ENTITLEMENT, boolean>);
			hasComputeEntitlement = entitlementData[COMPUTE_ENTITLEMENT] === true;
		} catch (ex) {
			Logger.warn(`Error fetching AI entitlement: ${ex.message}`);
			hasComputeEntitlement = false;
		}

		const hasPreview =
			hasFeatureFlagOverride || hasGaFeatureFlag ? false : await this.getPreviewData();

		const hasTrial =
			hasGaFeatureFlag && (!hasNraiCapability || hasComputeEntitlement)
				? false
				: await this.getTrialData();

		if (hasGaFeatureFlag) {
			if (!hasNraiCapability) return false;
			if (hasComputeEntitlement) return true;
			return hasTrial;
		}
		return hasFeatureFlagOverride || hasPreview;
	}

	async getPreviewData(): Promise<boolean> {
		try {
			const data = await this.graphqlClient.query<{
				actor?: {
					preReleaseProgram?: {
						program?: {
							submission?: {
								accepted?: any;
							};
						};
					};
				};
			}>(
				`query PreReleaseProgramQuery($readableId: String!) {
					actor {
						preReleaseProgram {
							program(readableId: $readableId) {
								submission {
									accepted
								}
							}
						}
					}
				}`,
				{
					readableId: "nraiPreview",
				}
			);
			return !!data?.actor?.preReleaseProgram?.program?.submission?.accepted;
		} catch (ex) {
			Logger.warn(`Error fetching AI preview: ${ex.message}`);
			return false;
		}
	}

	async getTrialData(): Promise<boolean> {
		try {
			const data = await this.graphqlClient.query<{
				actor?: {
					preReleaseProgram?: {
						trialStatus?: {
							status?: TRIAL_STATUS;
						};
					};
				};
			}>(
				`query NrAiTrialQuery($readableId: String!) {
					actor {
						preReleaseProgram {
							trialStatus(id: $readableId) {
								status
							}
						}
					}
				}`,
				{
					readableId: "nraiTrial",
				}
			);
			return data?.actor?.preReleaseProgram?.trialStatus?.status === TRIAL_STATUS.IN_TRIAL;
		} catch (ex) {
			Logger.warn(`Error fetching AI trial: ${ex.message}`);
			return false;
		}
	}

	dispose(): void {}
}
