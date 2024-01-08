import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import {
	GetNewRelicAIEligibilityRequest,
	GetNewRelicAIEligibilityRequestType,
} from "@codestream/protocols/agent";

@lsp
export class NraiProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetNewRelicAIEligibilityRequestType)
	@log({ timed: true })
	async getAIEligibility(request: GetNewRelicAIEligibilityRequest): Promise<boolean> {
		const query = `query getFeatureFlag($accountId: ID!) {
			actor {
				capabilities(filter: {names: "grok.ask.any"}, scopeId: $accountId, scopeType: ACCOUNT) {
					name
				}
				${
					/* this is not available yet
					preReleaseProgram {
					program(readableId: "grokPreview") {
						submission {
							status
						}
					}
				}*/ ""
				}
			}
			currentUser {
				crossAccount {
					featureFlag(name: "Collaboration/ama") {
						value
					}
				}
			}
		}`;
		const response = await this.graphqlClient.query<{
			actor?: {
				capabilities?: {
					name?: string;
				}[];
				preReleaseProgram?: {
					program?: {
						submission?: {
							status?: string;
						};
					};
				};
			};
			currentUser?: {
				crossAccount?: {
					featureFlag?: {
						value?: boolean;
					};
				};
			};
		}>(query, { accountId: request.accountId });
		const featureFlagEnabled = response.currentUser?.crossAccount?.featureFlag?.value || false;
		const preReleaseProgramActive =
			response.actor?.preReleaseProgram?.program?.submission?.status === "active";
		const hasCapability = (response.actor?.capabilities || []).length > 0;

		return featureFlagEnabled || preReleaseProgramActive || hasCapability;
	}
}
