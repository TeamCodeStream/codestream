function mapRubyTimesliceName(name: string): string {
	if (name.startsWith("Nested/Controller")) {
		return name.replace("Nested/", "");
	} else {
		return name;
	}
}

export function generateMethodAverageDurationQuery(
	languageId: string,
	newRelicEntityGuid: string,
	metricTimesliceNames?: string[],
	codeNamespace?: string
) {
	const mappedTimesliceNames =
		languageId === "ruby"
			? metricTimesliceNames?.map(mapRubyTimesliceName)
			: metricTimesliceNames?.map(metric => `WebTransaction/${metric}`);

	const lookup = mappedTimesliceNames?.length
		? `metricTimesliceName in (${mappedTimesliceNames.map(metric => `'${metric}'`).join(",")})`
		: `metricTimesliceName LIKE '${codeNamespace}%'`;

	const innerQuery = `SELECT average(newrelic.timeslice.value) * 1000 AS 'averageDuration' FROM Metric WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${lookup} FACET metricTimesliceName SINCE 30 minutes AGO LIMIT 100`;
	return `query GetMethodAverageDuration($accountId:Int!) {
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
