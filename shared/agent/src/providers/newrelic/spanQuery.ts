import { Logger } from "../../logger";
import { FunctionLocator } from "../../protocol/agent.protocol.providers";
import { ResolutionMethod } from "./newrelic.types";

function functionLocatorQuery(
	newRelicEntityGuid: string,
	functionLocator: FunctionLocator
): string {
	const equalsQueryParts: string[] = [];
	if (functionLocator.namespace) {
		equalsQueryParts.push(`code.namespace='${functionLocator.namespace}'`);
	}
	if (functionLocator.functionName) {
		equalsQueryParts.push(`code.function='${functionLocator.functionName}'`);
	}
	const innerQueryEqualsClause = equalsQueryParts.join(" AND ");
	const innerQueryEquals = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${innerQueryEqualsClause} SINCE 30 minutes AGO LIMIT 250`;

	const likeQueryParts: string[] = [];
	if (functionLocator.namespace) {
		likeQueryParts.push(`code.namespace like '${functionLocator.namespace}%'`);
	}
	if (functionLocator.functionName) {
		likeQueryParts.push(`code.function like '${functionLocator.functionName}%'`);
	}
	const innerQueryLikeClause = likeQueryParts.join(" AND ");
	const innerQueryLike = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${innerQueryLikeClause} SINCE 30 minutes AGO LIMIT 250`;

	return `query GetSpans($accountId:Int!) {
			actor {
				account(id: $accountId) {
					equals:nrql(query: "${innerQueryEquals}") {
						results
					}
					like:nrql(query: "${innerQueryLike}") {
						results
					}
				}
			}
	  }`;
}

export function generateSpanQuery(
	newRelicEntityGuid: string,
	resolutionMethod: ResolutionMethod,
	codeFilePath?: string,
	locator?: FunctionLocator
) {
	if (resolutionMethod === "locator" && !locator) {
		Logger.warn("generateSpanQuery missing locator");
		throw new Error("ERR_INVALID_ARGS");
	}
	if (resolutionMethod === "filePath" && !codeFilePath) {
		Logger.warn("generateSpanQuery missing filePAth");
		throw new Error("ERR_INVALID_ARGS");
	}

	if (resolutionMethod === "locator") {
		return functionLocatorQuery(newRelicEntityGuid, locator!);
	}

	codeFilePath = codeFilePath?.replace(/\\/g, "/");

	const equalsLookup = `code.filepath='${codeFilePath}'`;

	const innerQueryEquals = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${equalsLookup}  SINCE 30 minutes AGO LIMIT 250`;

	const likeLookup = `code.filepath like '%${codeFilePath}'`;

	const innerQueryLike = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${likeLookup}  SINCE 30 minutes AGO LIMIT 250`;

	const fuzzyLookup = `code.filepath like '%/${codeFilePath!
		.split("/")
		.slice(-2)
		.join("/")}%'`;

	const innerQueryFuzzy = `SELECT name,\`transaction.name\`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${fuzzyLookup}  SINCE 30 minutes AGO LIMIT 250`;

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
