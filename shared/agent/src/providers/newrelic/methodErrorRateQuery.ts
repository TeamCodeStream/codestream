import { escapeNrql } from "./newRelicGraphqlClient";
import { LanguageId } from "./clm/clmManager";
import { getLanguageFilter } from "./metricsLanguageNrqlFilter";

export function generateMethodErrorRateQuery(
	languageId: LanguageId,
	newRelicEntityGuid: string,
	metricTimesliceNames?: string[],
	codeNamespace?: string
) {
	const spansLookup = metricTimesliceNames?.length
		? `name in (${metricTimesliceNames.map(metric => `'${metric}'`).join(",")})`
		: `name LIKE '${codeNamespace}%'`;
	const languageExtra = getLanguageFilter(languageId);
	const spansQuery = `FROM Span SELECT count(*) AS 'errorCount' WHERE \`entity.guid\` = '${newRelicEntityGuid}' ${languageExtra} AND \`error.group.guid\` IS NOT NULL AND ${spansLookup} FACET name, code.lineno, code.column as metricTimesliceName SINCE 30 minutes AGO LIMIT 100`;
	const metricsLookup = metricTimesliceNames?.length
		? `metricTimesliceName in (${metricTimesliceNames
				.map(z => `'Errors/WebTransaction/${z}'`)
				.join(",")})`
		: `metricTimesliceName LIKE '${codeNamespace}%'`;
	const metricsQuery = `SELECT count(apm.service.transaction.error.count) AS \`errorCount\` FROM Metric WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${metricsLookup} FACET metricTimesliceName SINCE 30 minutes AGO LIMIT 100`;

	return `query GetMethodErrorRate($accountId:Int!) {
			actor {
				account(id: $accountId) {
					metrics: nrql(query: "${escapeNrql(metricsQuery)}", timeout: 60) {
						results
						metadata {
							timeWindow {
								begin
								end
							}
						}
					}
					spans: nrql(query: "${escapeNrql(spansQuery)}", timeout: 60) {
						results
						metadata {
							timeWindow {
								begin
								end
							}
						}
					}
				}
			}
	  }`;
}
