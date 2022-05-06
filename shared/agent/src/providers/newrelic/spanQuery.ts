export function generateSpanQuery(
	newRelicEntityGuid: string,
	codeFilePath?: string,
	codeNamespace?: string
) {
	codeFilePath = codeFilePath?.replace(/\\/g, "/");

	const equalsLookup = codeFilePath
		? `code.filepath='${codeFilePath}'`
		: `code.namespace like '${codeNamespace}%'`;

	const innerQueryEquals = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${equalsLookup}  SINCE 30 minutes AGO LIMIT 250`;

	const likeLookup = codeFilePath
		? `code.filepath like '%${codeFilePath}'`
		: `code.namespace like '${codeNamespace}%'`;

	const innerQueryLike = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${likeLookup}  SINCE 30 minutes AGO LIMIT 250`;

	const fuzzyLookup = codeFilePath
		? `code.filepath like '%/${codeFilePath
				.split("/")
				.slice(-2)
				.join("/")}%'`
		: `code.namespace like '${codeNamespace}%'`;

	const innerQueryFuzzy = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${fuzzyLookup}  SINCE 30 minutes AGO LIMIT 250`;

	return `query GetSpans($accountId:Int!) {
			actor {
				account(id: $accountId) {
					equals:nrql(query: "${innerQueryEquals}") {
						results
					}
					like:nrql(query: "${innerQueryLike}") {
						results
					}
					fuzzy:nrql(query: "${innerQueryFuzzy}") {
						results
					}
				}
			}
	  }`;
}
