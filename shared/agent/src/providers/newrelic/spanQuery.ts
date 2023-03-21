import { FunctionLocator } from "@codestream/protocols/agent";

import { Logger } from "../../logger";
import { ResolutionMethod } from "./newrelic.types";
import { LanguageId } from "./clm/clmManager";
import { escapeNrql } from "./newRelicGraphqlClient";

export const spanQueryTypes = ["equals", "like", "fuzzy", "desperate"] as const;
export type SpanQueryType = (typeof spanQueryTypes)[number];
const LIMIT = 250;

const removableExtensions = new Set<string>(["tsx", "jsx", "js", "ts", "cjs", "mjs", "mts", "cts"]);

function isJavascriptIsh(languageId: LanguageId) {
	return (
		languageId === "javascript" ||
		languageId === "typescript" ||
		languageId === "javascriptreact" ||
		languageId === "typescriptreact"
	);
}

function functionLocatorQuery(
	newRelicEntityGuid: string,
	functionLocator: FunctionLocator,
	spanQueryType: SpanQueryType
): string {
	let query: string;
	if (spanQueryType === "equals") {
		const equalsQueryParts: string[] = [];
		if (functionLocator.namespaces) {
			const joinedNamespaces = functionLocator.namespaces.map(_ => `'${_}'`).join(",");
			equalsQueryParts.push(`code.namespace IN (${joinedNamespaces})`);
		}
		if (functionLocator.namespace) {
			equalsQueryParts.push(`code.namespace='${functionLocator.namespace}'`);
		}
		if (functionLocator.functionName) {
			equalsQueryParts.push(`code.function='${functionLocator.functionName}'`);
		}
		const innerQueryEqualsClause = equalsQueryParts.join(" AND ");
		query = `SELECT name, \`transaction.name\`, code.lineno, code.column, tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${innerQueryEqualsClause} SINCE 30 minutes AGO LIMIT ${LIMIT}`;
	} else {
		const likeQueryParts: string[] = [];
		if (functionLocator.namespaces) {
			const likes = functionLocator.namespaces.map(_ => `code.namespace LIKE '${_}%'`).join(" OR ");
			likeQueryParts.push(`(${likes})`);
		}
		if (functionLocator.namespace) {
			likeQueryParts.push(`code.namespace like '${functionLocator.namespace}%'`);
		}
		if (functionLocator.functionName) {
			likeQueryParts.push(`code.function like '${functionLocator.functionName}%'`);
		}
		const innerQueryLikeClause = likeQueryParts.join(" AND ");
		query = `SELECT name, \`transaction.name\`, code.lineno, code.column, tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${innerQueryLikeClause} SINCE 30 minutes AGO LIMIT ${LIMIT}`;
	}
	return `query GetSpans($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${escapeNrql(query)}", timeout: 60) {
						results
					}
				}
			}
	  }`;
}

function hybridQuery(
	newRelicEntityGuid: string,
	codeFilePath: string,
	functionLocator: FunctionLocator | undefined,
	spanQueryType: SpanQueryType
) {
	let query: string;
	if (spanQueryType === "equals") {
		let searchClause;
		if (functionLocator) {
			const equalsQueryParts: string[] = [];
			if (functionLocator.namespaces) {
				const joinedNamespaces = functionLocator.namespaces.map(_ => `'${_}'`).join(",");
				equalsQueryParts.push(`code.namespace IN (${joinedNamespaces})`);
			}
			if (functionLocator.namespace) {
				equalsQueryParts.push(`code.namespace='${functionLocator.namespace}'`);
			}
			if (functionLocator.functionName) {
				equalsQueryParts.push(`code.function='${functionLocator.functionName}'`);
			}
			searchClause = equalsQueryParts.join(" AND ");
		} else {
			searchClause = `code.filepath='${codeFilePath}'`;
		}
		query = `SELECT name, \`transaction.name\`, code.lineno, code.column, tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${searchClause} SINCE 30 minutes AGO LIMIT ${LIMIT}`;
	} else {
		let searchClause;
		if (functionLocator) {
			const likeQueryParts: string[] = [];
			if (functionLocator.namespaces) {
				const likes = functionLocator.namespaces
					.map(_ => `code.namespace LIKE '${_}%'`)
					.join(" OR ");
				likeQueryParts.push(`(${likes})`);
			}
			if (functionLocator.namespace) {
				likeQueryParts.push(`code.namespace like '${functionLocator.namespace}%'`);
			}
			if (functionLocator.functionName) {
				likeQueryParts.push(`code.function like '${functionLocator.functionName}%'`);
			}
			searchClause = likeQueryParts.join(" AND ");
		} else {
			searchClause = `code.filepath='${codeFilePath}'`;
		}
		query = `SELECT name, \`transaction.name\`, code.lineno, code.column, tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${searchClause} SINCE 30 minutes AGO LIMIT ${LIMIT}`;
	}
	return `query GetSpans($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${escapeNrql(query)}", timeout: 60) {
						results
					}
				}
			}
	  }`;
}

export function generateSpanQuery(
	newRelicEntityGuid: string,
	resolutionMethod: ResolutionMethod,
	spanQueryType: SpanQueryType,
	languageId: LanguageId,
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

	if (resolutionMethod === "locator" || (resolutionMethod === "hybrid" && locator)) {
		return functionLocatorQuery(newRelicEntityGuid, locator!, spanQueryType);
	}

	codeFilePath = codeFilePath?.replace(/\\/g, "/");

	// if (resolutionMethod === "hybrid") {
	// 	return hybridQuery(newRelicEntityGuid, codeFilePath!, locator, spanQueryType);
	// }

	if (!codeFilePath) {
		// Technically never happens due to check on resolutionMethod but this allows following code to avoid using unsafe nulls
		throw new Error("No codeFilePath provided for span query");
	}

	let query: string;

	switch (spanQueryType) {
		case "equals": {
			const equalsLookup = `code.filepath='${codeFilePath}'`;
			query = `SELECT name, \`transaction.name\`, code.lineno, code.column, tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${equalsLookup}  SINCE 30 minutes AGO LIMIT ${LIMIT}`;
			break;
		}
		case "like": {
			const likeLookup = `code.filepath like '%${codeFilePath}'`;
			query = `SELECT name, \`transaction.name\`, code.lineno, code.column, tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${likeLookup}  SINCE 30 minutes AGO LIMIT ${LIMIT}`;
			break;
		}
		case "fuzzy": {
			if (isJavascriptIsh(languageId) && codeFilePath.includes(".")) {
				const split = codeFilePath.split(".");
				const extension = split[1];
				if (removableExtensions.has(extension)) {
					codeFilePath = split[0];
				}
			}
			const fuzzyLookup = `code.filepath like '%${codeFilePath.split("/").slice(-2).join("/")}%'`;
			query = `SELECT name, \`transaction.name\`, code.lineno, code.column, tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${fuzzyLookup} SINCE 30 minutes AGO LIMIT ${LIMIT}`;
			break;
		}

		case "desperate": {
			if (isJavascriptIsh(languageId) && codeFilePath.includes(".")) {
				const split = codeFilePath.split(".");
				const extension = split[1];
				if (removableExtensions.has(extension)) {
					codeFilePath = split[0];
				}
			}
			const fuzzierLookup = `code.filepath like '%${codeFilePath.split("/").slice(-1).join("/")}%'`;
			query = `SELECT name, \`transaction.name\`, code.lineno,code.column,tags.commit, code.namespace, code.function, traceId, transactionId from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${fuzzierLookup} SINCE 30 minutes AGO LIMIT ${LIMIT}`;
			break;
		}
	}

	return `query GetSpans($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${query}", timeout: 60) {
						results
					}
				}
			}
	  }`;
}

export function generateClmSpanDataExistsQuery(newRelicEntityGuid: string) {
	const query = `query GetSpans($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "SELECT name,code.function,\`entity.guid\` from Span WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND code.function is not NULL SINCE 30 minutes AGO LIMIT 1", timeout: 60) {
						results
					}				 
				}
			}
	  }`;
	return query;
}
