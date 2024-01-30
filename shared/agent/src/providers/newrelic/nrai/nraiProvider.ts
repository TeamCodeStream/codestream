import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { GetNewRelicAIEligibilityRequestType } from "@codestream/protocols/agent";
import { Logger } from "../../../logger";

@lsp
export class NraiProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetNewRelicAIEligibilityRequestType)
	@log({ timed: true })
	async getAIEligibility(): Promise<boolean> {
		const ffOverrideQuery = `query getAIFeatureFlag {
			currentUser {
				crossAccount {
					featureFlag(name: "Collaboration/ama") {
						value
					}
				}
			}
		}`;
		const programQuery = `query getAIPreReleaseOptIn {
			actor {
				preReleaseProgram {
					program(readableId: "nraiPreview") {
						submission {
							accepted
						}
					}
				}
			}
		}`;
		try {
			const ffOverrideResponse = await this.graphqlClient.query<{
				currentUser?: {
					crossAccount?: {
						featureFlag?: {
							value?: boolean;
						};
					};
				};
			}>(ffOverrideQuery);
			if (ffOverrideResponse.currentUser?.crossAccount?.featureFlag?.value) {
				return true;
			}
		} catch (ex) {
			Logger.warn(`Error fetching AI feature flag: ${ex.message}`);
		}
		try {
			const programResponse = await this.graphqlClient.query<{
				actor?: {
					preReleaseProgram?: {
						program?: {
							submission?: {
								accepted?: boolean;
							};
						};
					};
				};
			}>(programQuery);
			return !!programResponse.actor?.preReleaseProgram?.program?.submission?.accepted;
		} catch (ex) {
			return false;
		}
	}
}
