"use strict";

import {
	CodeAttributes,
	EntityAccount,
	NameValue,
	SpanWithCodeAttrs,
} from "@codestream/protocols/agent";

export async function getLanguageSupport(
	entityAccount: EntityAccount
): Promise<LanguageSupport | undefined> {
	const tags = entityAccount.tags || [];
	const languageTag = tags.find(tag => tag.key === "language");
	const languageValue = languageTag?.values[0].toLowerCase();

	if (languageValue === "java") {
		return new JavaLanguageSupport();
	}
	if (languageValue === "nodejs") {
		return new JavaScriptLanguageSupport();
	}
	if (languageValue === "ruby") {
		return new RubyLanguageSupport();
	}
	if (languageValue === "dotnet") {
		return new CSharpLanguageSupport();
	}
	if (languageValue === "python") {
		return new PythonLanguageSupport();
	}
	if (languageValue === "go") {
		return new GoLanguageSupport();
	}
	if (languageValue === "php") {
		return new PhpLanguageSupport();
	}

	return undefined;
}

export interface LanguageSupport {
	get language(): string;

	filterMetrics(data: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[];

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes | undefined;

	displayName(codeAttrs: CodeAttributes | undefined, name: string): string;

	get metricNrqlPrefixes(): string[];

	get spanNrqlPrefixes(): string[];
}

class JavaLanguageSupport implements LanguageSupport {
	get language() {
		return "java";
	}

	get metricNrqlPrefixes() {
		return [
			"Datastore/statement",
			"External",
			"Java",
			"OtherTransaction",
			"Spring",
			"SpringController",
			"SpringView",
			"WebTransaction",
		];
	}

	get spanNrqlPrefixes() {
		return [
			"Custom",
			"Datastore/statement",
			"External",
			"Java",
			"OtherTransaction",
			"Spring",
			"SpringController",
			"SpringView",
			"WebTransaction",
		];
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		return metrics;
		// const javaRE = /^Java\/(.+)\.(.+)\/(.+)/;
		// const customRE = /^Custom\/(.+)\.(.+)\/(.+)/;
		// const errorsRE = /^Errors\/(.+)\.(.+)\/(.+)/;
		// return metrics.filter(
		//   m =>
		//     benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
		//     javaRE.test(m.name) ||
		//     customRE.test(m.name) ||
		//     errorsRE.test(m.name)
		// );
	}

	// codeAttrsFromName(name: string): CodeAttributes {
	//   const parts = name.split("/");
	//   const codeFunction = parts[parts.length - 1];
	//   const codeNamespace = parts[parts.length - 2];
	//   return {
	//     codeNamespace,
	//     codeFunction,
	//   };
	// }

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]) {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return undefined;
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		return name;
		// if (!codeAttrs?.codeFunction) return name;
		// const parts = [];
		// if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		// parts.push(codeAttrs.codeFunction);
		// return parts.join("/");
	}
}

class RubyLanguageSupport implements LanguageSupport {
	get language() {
		return "ruby";
	}

	get metricNrqlPrefixes() {
		return [
			"ActiveJob",
			"Controller",
			"Datastore/statement",
			"Errors",
			"External",
			"DotNet",
			"Nested/Controller",
			"OtherTransaction",
			"WebTransaction",
		];
	}

	get spanNrqlPrefixes() {
		return [];
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		// const controllerRE = /^Controller\/(.+)\/(.+)/;
		// const nestedControllerRE = /^Nested\/Controller\/(.+)\/(.+)/;
		// const errorsRE = /^Errors\/(.+)\/(.+)/;
		return metrics.filter(
			m =>
				!(
					m.name.indexOf("Nested/Controller/") === 0 &&
					metrics.find(another => "Nested/" + another.name === m.name)
				) &&
				!(m.name.indexOf("Nested/Controller/Rack/") === 0) &&
				!(m.name.indexOf("Controller/Sinatra/") === 0) &&
				!(m.name.indexOf("Nested/Controller/Sinatra/") === 0) &&
				!(m.name.indexOf("ActiveJob/Async/Queue/Produce/") === 0)
			// &&
			// (benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
			//   controllerRE.test(m.name) ||
			//   nestedControllerRE.test(m.name) ||
			//   errorsRE.test(m.name))
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];

		if (
			(parts[0] === "Nested" && parts[1] === "Controller") ||
			(parts[0] === "Errors" && parts[1] === "Controller") ||
			parts[0] === "Controller"
		) {
			const parts = codeNamespace.split("_");
			const camelCaseParts = parts.map(_ => _.charAt(0).toUpperCase() + _.slice(1));
			const controllerName = camelCaseParts.join("") + "Controller";
			return {
				codeNamespace: controllerName,
				codeFunction,
			};
		} else {
			return {
				codeNamespace,
				codeFunction,
			};
		}
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs?.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("#");
	}
}

class PythonLanguageSupport implements LanguageSupport {
	get language() {
		return "python";
	}

	get metricNrqlPrefixes() {
		return [
			"Datastore/statement",
			"Errors",
			"External",
			"Function",
			"OtherTransaction",
			"WebTransaction",
		];
	}

	get spanNrqlPrefixes() {
		return [];
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		return metrics.filter(m => {
			const name = m.name.replace(errorPrefixRe, "");
			return (
				!name.startsWith("Function/flask.app:Flask.") &&
				benchmarkSpans.find(
					s =>
						s.name === name &&
						s.name.endsWith(s.codeFunction) &&
						s.codeFunction &&
						s.codeFilepath != "<builtin>"
				)
			);
		});
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const [prefix, classMethod] = name.split(":");
		const parts = classMethod.split(".");
		const codeFunction = parts.pop() || "";
		const namespacePrefix = prefix.replace("Function/", "");
		const className = parts.join(".");
		const codeNamespaceParts = [namespacePrefix];
		if (className.length) {
			codeNamespaceParts.push(className);
		}
		const codeNamespace = codeNamespaceParts.join(":");
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		name = name.replace(errorPrefixRe, "");
		const span = benchmarkSpans.find(_ => _.name === name && _.name.endsWith(_.codeFunction));
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		const errorPrefixRe = /^Errors\/WebTransaction\/Function\//;
		const functionRe = /^Function\//;
		return name.replace(errorPrefixRe, "").replace(functionRe, "");
	}
}

class GoLanguageSupport implements LanguageSupport {
	get language() {
		return "go";
	}

	get metricNrqlPrefixes() {
		return [
			"Datastore/statement",
			"Errors",
			"External",
			"DotNet",
			"OtherTransaction",
			"WebTransaction/Go",
		];
	}

	get spanNrqlPrefixes() {
		return ["Datastore/statement", "External", "DotNet", "OtherTransaction", "WebTransaction/Go"];
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const errorPrefixRe = /^Errors\//;
		return metrics.filter(m => {
			const name = m.name.replace(errorPrefixRe, "");
			return benchmarkSpans.find(s => s.name === name && s.codeFunction);
		});
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const errorPrefixRe = /^Errors\//;
		const normalizedName = name.replace(errorPrefixRe, "");
		return {
			codeNamespace: "",
			codeFunction: normalizedName,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		name = name.replace(errorPrefixRe, "");
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		const errorPrefixRe = /^Errors\/WebTransaction\/Function\//;
		const functionRe = /^Function\//;
		return name.replace(errorPrefixRe, "").replace(functionRe, "");
	}
}

class PhpLanguageSupport implements LanguageSupport {
	get language() {
		return "php";
	}

	get metricNrqlPrefixes() {
		return [
			"Datastore/statement",
			"Errors",
			"External",
			"DotNet",
			"OtherTransaction",
			"WebTransaction",
		];
	}

	get spanNrqlPrefixes() {
		return [
			"Custom",
			"Datastore/statement",
			"Errors",
			"External",
			"DotNet",
			"OtherTransaction",
			"WebTransaction",
		];
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		return metrics;
		// const errorPrefixRe = /^Errors\//;
		// const webTransactionPrefixRe = /^WebTransaction\/Action\//;
		// const otherTransactionPrefixRe = /^OtherTransaction\/Action\//;
		// const customPrefix = "Custom/";
		// return metrics.filter(m => {
		//   const spanName = m.name
		//     .replace(errorPrefixRe, "")
		//     .replace(webTransactionPrefixRe, customPrefix)
		//     .replace(otherTransactionPrefixRe, customPrefix)
		//     .replace("->", "::");
		//
		//   return benchmarkSpans.find(s => s.name === m.name || (s.name === spanName && s.codeFunction));
		// });
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const errorPrefixRe = /^Errors\//;
		const normalizedName = name.replace(errorPrefixRe, "");
		return {
			codeNamespace: "",
			codeFunction: normalizedName,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		name = name.replace(errorPrefixRe, "");
		const webTransactionPrefixRe = /^WebTransaction\/Action\//;
		const otherTransactionPrefixRe = /^OtherTransaction\/Action\//;
		const customPrefix = "Custom/";
		const spanName = name
			.replace(webTransactionPrefixRe, customPrefix)
			.replace(otherTransactionPrefixRe, customPrefix)
			.replace("->", "::");
		const span = benchmarkSpans.find(_ => _.name === spanName);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		const webTransactionPrefixRe = /^WebTransaction\/Action\//;
		const otherTransactionPrefixRe = /^OtherTransaction\/Action\//;
		return name.replace(webTransactionPrefixRe, "").replace(otherTransactionPrefixRe, "");
	}
}

class CSharpLanguageSupport implements LanguageSupport {
	get language() {
		return "csharp";
	}

	get metricNrqlPrefixes() {
		return [
			"Datastore/statement",
			"Errors",
			"External",
			"DotNet",
			"OtherTransaction",
			"WebTransaction",
		];
	}

	get spanNrqlPrefixes() {
		return ["Datastore/statement", "External", "DotNet", "OtherTransaction", "WebTransaction"];
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const dotNetRE = /^DotNet\/(.+)\.(.+)\/(.+)/;
		const customRE = /^Custom\/(.+)\.(.+)\/(.+)/;
		const errorsRE = /^Errors\/(.+)\.(.+)\/(.+)/;
		return metrics.filter(
			m =>
				benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
				dotNetRE.test(m.name) ||
				customRE.test(m.name) ||
				errorsRE.test(m.name)
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("/");
	}
}

class JavaScriptLanguageSupport implements LanguageSupport {
	get language() {
		return "javascript";
	}

	get metricNrqlPrefixes() {
		return ["Datastore/statement", "Errors", "External", "OtherTransaction", "WebTransaction"];
	}

	get spanNrqlPrefixes() {
		return [];
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		return metrics;
		// const customRE = /^Custom\/(.+)/;
		// const webTransactionRE = /^WebTransaction\/(.+)/;
		// const errorsRE = /^Errors\/(.+)/;
		// return metrics.filter(
		//   m =>
		//     benchmarkSpans.find(s => m.name.endsWith(s.name)) ||
		//     customRE.test(m.name) ||
		//     webTransactionRE.test(m.name) ||
		//     errorsRE.test(m.name)
		// );
	}

	// codeAttrsFromName(name: string): CodeAttributes {
	//   const errorPrefixRe = /^Errors\//;
	//   const normalizedName = name.replace(errorPrefixRe, "");
	//   return {
	//     codeNamespace: "",
	//     codeFunction: normalizedName,
	//   };
	// }

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]) {
		const span = benchmarkSpans.find(_ => name.endsWith(_.name) && _.codeFunction);
		if (span) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return undefined;
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		return name;
	}
}
