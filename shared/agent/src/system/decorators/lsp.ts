"use strict";
import { ThirdPartyProviders } from "@codestream/protocols/agent";
import { RequestHandler0, RequestType } from "vscode-languageserver-protocol";

import { CodeStreamAgent } from "../../agent";
import { ThirdPartyProvider } from "../../providers/provider";
import { CodeStreamSession } from "../../session";

export interface LspHandler {
	type: RequestType<any, any, void, void>;
	unboundMethod: RequestHandler0<{}, {}>;
	method?: RequestHandler0<{}, {}>;
	target: any;
}

const handlerRegistry = new Map<any, LspHandler[]>();
export function registerDecoratedHandlers(agent: CodeStreamAgent): void {
	for (const [, handlers] of handlerRegistry) {
		for (const handler of handlers) {
			agent.registerHandler(handler.type, handler.method!);
		}
	}
}

export function lsp<T extends object>(target: T) {
	return new Proxy(target, {
		construct(target, args: any[]) {
			const instance = new (target as any)(...args);

			const handlers = handlerRegistry.get(target);
			if (handlers !== undefined) {
				for (const handler of handlers) {
					handler.method = handler.unboundMethod.bind(instance);
				}
			}

			return instance;
		},
	});
}

export function lspHandler(type: RequestType<any, any, void, void>): Function {
	return (target: any, key: string, descriptor: PropertyDescriptor) => {
		if (!descriptor || typeof descriptor.value !== "function") {
			throw new Error("Not supported");
		}

		const targetKey = target.constructor;

		let handlers = handlerRegistry.get(targetKey);
		if (handlers === undefined) {
			handlers = [];
			handlerRegistry.set(targetKey, handlers);
		}

		handlers.push({
			type: type,
			unboundMethod: descriptor.value,
			target: target.constructor,
		});
	};
}

const providerRegistry = new Map<string, ThirdPartyProvider>();
const providerTypeRegistry = new Map<string, any>();
export function getProvider(providerId: string) {
	return providerRegistry.get(providerId);
}

export function getRegisteredProviders() {
	return [...providerRegistry.values()];
}

export function lspProvider<T extends object>(name: string): Function {
	return (target: T) => {
		providerTypeRegistry.set(name, target);
		return target;
	};
}

function mergeLocalProviders(providers: ThirdPartyProviders): ThirdPartyProviders {
	const localProviders: ThirdPartyProviders = {};
	const newrelicProvider = providers?.["newrelic*com"];

	if (newrelicProvider) {
		const newrelicVulnProvider = {
			id: "newrelic-vulnerabilities*com",
			name: "newrelic-vulnerabilities",
			host: "", // Provided in apiCapabilities
		};
		localProviders[newrelicVulnProvider.id] = newrelicVulnProvider;
		newrelicProvider.subProviders = [newrelicVulnProvider];
	}

	return { ...providers, ...localProviders };
}

export function registerProviders(
	providers: ThirdPartyProviders,
	session: CodeStreamSession,
	clear: boolean = true
): void {
	if (clear) {
		providerRegistry.clear();
	}
	const mergedProviders = mergeLocalProviders(providers);
	for (const providerId in mergedProviders) {
		const provider = mergedProviders[providerId];
		const type = providerTypeRegistry.get(provider.name);
		if (type) {
			const providerConfig = new (lsp(type) as any)(session, provider);
			providerRegistry.set(providerId, providerConfig);
		}
	}
}
