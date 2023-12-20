import { MetricTimesliceNameMapping } from "@codestream/protocols/agent";
import { INewRelicProvider, NewRelicProvider } from "../newrelic";
import { Strings } from "../../system";
import { xfs } from "../../xfs";
import writeTextAtomic = xfs.writeTextAtomic;

export class CriticalPathCalculator {
	constructor(private _provider: INewRelicProvider) {}

	async getCriticalPath(
		entityGuid: string,
		metricTimesliceNames: MetricTimesliceNameMapping
	): Promise<any> {
		const parsedId = NewRelicProvider.parseId(entityGuid)!;

		// entityGuid = 'WebTransaction/SpringController/api/v2/{accountId}/violation/summary/search (GET)'
		const slowestTransactionsQuery =
			`SELECT name, duration, traceId FROM Transaction ` +
			`WHERE name = '${metricTimesliceNames.duration}' ` +
			`AND traceId IN ( ` +
			`  FROM Span SELECT uniques(traceId) WHERE entity.guid = '${entityGuid}' SINCE 30 minutes ago LIMIT MAX ` +
			`) ORDER BY duration DESC LIMIT 10`;

		const slowestTransactions = await this._provider.runNrql<{
			name: string;
			duration: number;
			traceId: string;
		}>(parsedId.accountId, Strings.escapeNrql(slowestTransactionsQuery));

		const traceIds = slowestTransactions.map(_ => `'${_.traceId}'`);
		const traceIdsClause = traceIds.join(", ");

		const spansQuery =
			`SELECT name, id, parentId, traceId, duration ` +
			`FROM Span WHERE trace.id IN (${traceIdsClause}) LIMIT MAX`;

		const spans = await this._provider.runNrql<{
			name: string;
			id: string;
			parentId: string;
			traceId: string;
			duration: number;
			timestamp: number;
		}>(parsedId.accountId, Strings.escapeNrql(spansQuery));

		console.log(spans);

		let output = "";

		interface Span {
			duration: number;
			name: string;
			id: string;
			parentId: string;
			traceId: string;
			timestamp: number;
		}

		interface SpanNode extends Span {
			children: SpanNode[];
			exclusiveDuration: number;
		}

		function computeExclusiveDuration(
			node: SpanNode,
			exclusiveDurationBySpanName: Map<string, number>
		) {
			let childrenDuration: number = 0;
			node.children.forEach(a => (childrenDuration += a.duration));
			node.exclusiveDuration = node.duration - childrenDuration;
			const current = exclusiveDurationBySpanName.get(node.name) || 0;
			exclusiveDurationBySpanName.set(node.name, current + node.exclusiveDuration);
			for (const child of node.children) {
				computeExclusiveDuration(child, exclusiveDurationBySpanName);
			}
		}

		function printSpanNode(spanNode: SpanNode, depth: number) {
			const ident = buildIdent(depth);
			// console.log(ident + spanNode.name);
			output = output + "\n" + (ident + spanNode.name);
			const sortedChildren = spanNode.children.sort((a, b) => a.timestamp - b.timestamp);
			for (const child of sortedChildren) {
				printSpanNode(child, depth + 1);
			}
		}

		function buildIdent(depth: number) {
			const spaces = [];
			for (let i = 0; i < depth; i++) {
				spaces.push(" ");
			}
			return spaces.join("");
		}

		function buildSpanTree(spanArray: Span[]): SpanNode[] {
			// Creating a map of id -> span.
			const spanMap = new Map<string, SpanNode>();

			for (const span of spanArray) {
				spanMap.set(span.id, {
					...span,
					children: [],
					exclusiveDuration: 0,
				});
			}

			// Building the tree structures within the span map.
			spanMap.forEach((spanNode, id) => {
				// If the parentId is set and there is a span with that id,
				// add it to the parent's children array.
				if (spanNode.parentId && spanMap.has(spanNode.parentId)) {
					const parent = spanMap.get(spanNode.parentId)!!;
					parent.children.push(spanNode);
				}
			});

			// Filtering and returning the spans that don't have a parent
			// or whose parent doesn't exist in span array.
			return Array.from(spanMap.values()).filter(
				spanNode => !spanNode.parentId || !spanMap.has(spanNode.parentId)
			);
		}

		const spansByTraceId = new Map<string, Span[]>();
		for (const span of spans) {
			if (!spansByTraceId.has(span.traceId)) {
				spansByTraceId.set(span.traceId, []);
			}
			const traceSpans = spansByTraceId.get(span.traceId)!!;
			traceSpans.push(span);
		}

		const exclusiveDurationBySpanName = new Map<string, number>();

		spansByTraceId.forEach((traceSpans, traceId) => {
			// console.log("\n" + traceId + ": " + traceSpans.length + " spans");
			output = output + "\n" + ("\n" + traceId + ": " + traceSpans.length + " spans");
			const rootSpanNodes = buildSpanTree(traceSpans);
			for (const node of rootSpanNodes) {
				printSpanNode(node, 0);
				computeExclusiveDuration(node, exclusiveDurationBySpanName);
			}
		});

		const sorted = new Map(
			Array.from(exclusiveDurationBySpanName.entries()).sort((a, b) => b[1] - a[1])
		);
		let i = 5;
		// console.log("\nTop 5 spans:")
		output = output + "\n" + "\nTop 5 spans:";
		for (const entry of Array.from(sorted.entries())) {
			// console.log(entry[0] + ": " + entry[1]);
			output = output + "\n" + (entry[0] + ": " + entry[1]);
			i--;
			if (i <= 0) break;
		}

		await writeTextAtomic(output, "/Users/mfarias/Desktop/criticalpath" + Date.now() + ".txt");

		return slowestTransactions;
	}
}
