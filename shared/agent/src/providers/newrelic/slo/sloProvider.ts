import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	GetServiceLevelObjectivesRequest,
	GetServiceLevelObjectivesRequestType,
	GetServiceLevelObjectivesResponse,
	ServiceLevelObjectiveResult,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import {
	ServiceLevelIndicatorQueryResult,
	ServiceLevelObjectiveQueryResult,
} from "../newrelic.types";
import { Logger } from "../../../logger";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { NrOrgProvider } from "../orgs/nrOrgProvider";
import { mapNRErrorResponse, toFixedNoRounding } from "../utils";
import { ContextLogger } from "../../contextLogger";

@lsp
export class SloProvider {
	constructor(
		private graphqlClient: NewRelicGraphqlClient,
		private nrOrgProvider: NrOrgProvider
	) {}
	@lspHandler(GetServiceLevelObjectivesRequestType)
	@log()
	async getServiceLevelObjectives(
		request: GetServiceLevelObjectivesRequest
	): Promise<GetServiceLevelObjectivesResponse | undefined> {
		try {
			const sliQuery = `{
			  actor {
				entity(guid: "${request.entityGuid}") {
				  serviceLevel {
					indicators {
					  name
					  objectives {
						target
						timeWindow {
						  rolling {
							count
							unit
						  }
						}
					  }
					  guid
					  resultQueries {
						indicator {
						  nrql
						}
					  }  
					}
				  }
				}
			  }
			}`;

			const sliResults = await this.graphqlClient.query<ServiceLevelIndicatorQueryResult>(sliQuery);

			const indicators = sliResults?.actor?.entity?.serviceLevel?.indicators;

			if (!indicators || indicators?.length === 0) {
				Logger.log("getServiceLevelObjectives No indicators found");
				return undefined;
			}

			let sloQuery = `{
				actor {
	    	`;

			indicators.forEach(v => {
				const indicatorObjective = v.objectives[0].timeWindow.rolling;
				const sinceQuery = `SINCE ${indicatorObjective.count} ${indicatorObjective.unit} AGO`;
				sloQuery += `
				${v.guid}: entity(guid: "${v.guid}") {
					nrdbQuery(nrql: "${v.resultQueries.indicator.nrql} ${sinceQuery}", timeout: 60, async: true) {
						results
					}
				}`;
			});

			sloQuery += `}
			}`;

			const sloResults = await this.graphqlClient.query<ServiceLevelObjectiveQueryResult>(sloQuery);

			let objectiveResults: ServiceLevelObjectiveResult[] = indicators
				?.sort((a, b) => a.name.localeCompare(b.name))
				?.map(v => {
					const objective = v.objectives.at(0);
					const sliEntityGuid = v.guid;
					const sliName = v.name;
					const sliTarget = objective?.target || 0;

					const actual = sloResults?.actor[sliEntityGuid]?.nrdbQuery?.results?.at(0);
					const actualKeys = actual && Object.keys(actual);
					const actualValue = (actualKeys && actual[actualKeys[0]]) || 0;

					return {
						guid: sliEntityGuid,
						name: sliName,
						target: toFixedNoRounding(sliTarget, 2) ?? "Unknown",
						timeWindow: this.formatSLOTimeWindow(
							objective?.timeWindow?.rolling?.count,
							objective?.timeWindow?.rolling?.unit
						),
						actual: toFixedNoRounding(actualValue, 2) ?? "Unknown",
						result: actualValue < sliTarget ? "UNDER" : "OVER",
						summaryPageUrl: this.nrOrgProvider.productEntityRedirectUrl(sliEntityGuid),
					};
				});

			return {
				serviceLevelObjectives: objectiveResults,
			};
		} catch (ex) {
			ContextLogger.warn("getServiceLevelObjectives failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex) };
		}
	}

	private formatSLOTimeWindow(count: number | undefined, unit: string | undefined): string {
		if (count === undefined || unit === undefined) {
			return "Unknown Time Window";
		}

		return `${count}${unit
			?.toLocaleLowerCase()
			.replace("day", "d")
			.replace("month", "m")
			.replace("year", "y")}`;
	}
}
