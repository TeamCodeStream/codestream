export function generateMethodErrorRateQuery(
	newRelicEntityGuid: string,
	metricTimesliceNames?: string[],
	codeNamespace?: string
) {
	const timesliceClause = metricTimesliceNames?.length
		? `metricTimesliceName in (${metricTimesliceNames
				.map(z => `'Errors/WebTransaction/${z}'`)
				.join(",")})`
		: `metricTimesliceName LIKE '${codeNamespace}%'`;

	const innerQuery = `SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS \`errorsPerMinute\` FROM Metric WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${timesliceClause} FACET metricTimesliceName SINCE 30 minutes AGO LIMIT 100`;

	return `query GetMethodErrorRate($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${innerQuery}") {
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
