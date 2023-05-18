"use strict";

import { FLTNameInferenceStrategy, FLTNameInferenceSymbol } from "./FLTNameInferenceStrategy";

export class FLTNameInferenceKotlinStrategy extends FLTNameInferenceStrategy {
	getMetricLookup(): string {
		const namespace = this.getNamespace();
		return `metricTimesliceName LIKE 'Java/%${namespace}/%' OR metricTimesliceName LIKE 'Custom/%${namespace}/%'`;
	}

	getSpanLookup(): string {
		return `name LIKE '%/${this.getNamespace()}/%'`;
	}

	getMetricErrorLookup(): string {
		const namespace = this.getNamespace();
		return `metricTimesliceName LIKE 'Errors/%${namespace}/%'`;
	}

	extractSymbol(spanName: string) {
		const parts = spanName.split("/");
		const method = parts[parts.length - 1];
		const clazz = parts[parts.length - 2];
		return new FLTNameInferenceKotlinSymbol(clazz, clazz, method);
	}

	private getNamespace() {
		return (this.request.locator?.namespaces || [])[0] || this.request.locator?.namespace;
	}
}

export class FLTNameInferenceKotlinSymbol implements FLTNameInferenceSymbol {
	namespace?: string;
	className?: string;
	functionName: string;
	constructor(namespace: string, className: string, functionName: string) {
		this.namespace = namespace;
		this.className = className;
		this.functionName = functionName;
	}

	equals(symbol: FLTNameInferenceSymbol): boolean {
		return this.className === symbol.className && this.functionName === symbol.functionName;
	}
}
