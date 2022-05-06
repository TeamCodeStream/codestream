export function generateMethodThroughputQuery(
	newRelicEntityGuid: string,
	metricTimesliceNames?: string[],
	codeNamespace?: string
): string {
	const lookup = metricTimesliceNames?.length
		? `(metricTimesliceName in ( ${metricTimesliceNames
				.map(mtsn => `'${mtsn}'`)
				.join(",")}) OR metricTimesliceName in (${metricTimesliceNames
				.map(mtsn => `'OtherTransactions/${mtsn}'`)
				.join(",")}))`
		: `metricTimesliceName LIKE '${codeNamespace}%'`;

	const innerQuery = `SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'requestsPerMinute' FROM Metric WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${lookup} FACET metricTimesliceName SINCE 30 minutes AGO LIMIT 100`;

	return `query GetMethodThroughput($accountId:Int!) {
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
