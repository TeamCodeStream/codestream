import {
	FetchThirdPartyCodeAnalyzersRequest,
	FetchThirdPartyCodeAnalyzersResponse,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { log, lspProvider } from "../system";
import { CodeStreamSession } from "session";

import { ThirdPartyCodeAnalyzerProviderBase } from "./thirdPartyCodeAnalyzerProviderBase";
import { CSFossaProviderInfo } from "@codestream/protocols/api";

@lspProvider("fossa")
export class FossaProvider extends ThirdPartyCodeAnalyzerProviderBase<CSFossaProviderInfo> {
	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {
		super(session, providerConfig);
	}

	get displayName() {
		return "Fossa.com";
	}

	get name() {
		return "fossa";
	}

	get headers() {
		return {
			Accept: "application/json",
			Authorization: `Bearer ${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	get apiPath() {
		return "/api/v2";
	}

	get apiUrl() {
		return "https://fossa.com";
	}

	get appUrl() {
		return "https://app.fossa.com";
	}

	get baseUrl() {
		return `${this.apiUrl}/${this.apiPath}`;
	}

	@log()
	async fetchCodeAnalysis(
		request: FetchThirdPartyCodeAnalyzersRequest
	): Promise<FetchThirdPartyCodeAnalyzersResponse> {
		return {
			issues: [
				{
					id: 3523803,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+DotNetBrowser32$1.20.0",
						name: "DotNetBrowser32",
						url: "https://www.teamdev.com/dotnetbrowser",
						version: "1.20.0",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523805,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+DotNetBrowser64$1.20.0",
						name: "DotNetBrowser64",
						url: "https://www.teamdev.com/dotnetbrowser",
						version: "1.20.0",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523807,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+Microsoft.VisualStudio.CommandBars$8.0.0.1",
						name: "Microsoft.VisualStudio.CommandBars",
						url: "https://aka.ms/vsextensibility",
						version: "8.0.0.1",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523806,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+Microsoft.VisualStudio.LanguageServer.Client$16.2.1079",
						name: "Microsoft.VisualStudio.LanguageServer.Client",
						url: "https://aka.ms/vslsp",
						version: "16.2.1079",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523810,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+Microsoft.VisualStudio.LanguageServer.Protocol$17.2.8",
						name: "Microsoft.VisualStudio.LanguageServer.Protocol",
						url: "https://aka.ms/vslsp",
						version: "17.2.8",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523804,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+Microsoft.VisualStudio.LanguageServer.Protocol$16.2.1079",
						name: "Microsoft.VisualStudio.LanguageServer.Protocol",
						url: "https://aka.ms/vslsp",
						version: "16.2.1079",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523808,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+Microsoft.VisualStudio.SDK$16.0.206",
						name: "Microsoft.VisualStudio.SDK",
						url: "https://aka.ms/vsextensibility",
						version: "16.0.206",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523824,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+Microsoft.VSSDK.BuildTools$17.2.2186",
						name: "Microsoft.VSSDK.BuildTools",
						url: "https://aka.ms/vsextensibility",
						version: "17.2.2186",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-only",
				},
				{
					id: 3523809,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "nuget+Nerdbank.Streams$2.1.37",
						name: "Nerdbank.Streams",
						url: "https://github.com/AArnott/Nerdbank.Streams",
						version: "2.1.37",
						packageManager: "nuget",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "unlicensed_dependency",
					license: null,
				},
				{
					id: 3523825,
					createdAt: "2023-06-23T19:32:05.784Z",
					source: {
						id: "npm+newrelic$9.8.1",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.8.1",
						packageManager: "npm",
					},
					depths: {
						direct: 2,
						deep: 0,
					},
					statuses: {
						active: 2,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream-server",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream-server.git",
						},
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-only",
				},
				{
					id: 3523822,
					createdAt: "2023-06-23T19:32:05.784Z",
					source: {
						id: "npm+newrelic$9.8.1",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.8.1",
						packageManager: "npm",
					},
					depths: {
						direct: 2,
						deep: 0,
					},
					statuses: {
						active: 2,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream-server",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream-server.git",
						},
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-or-later",
				},
				{
					id: 3523814,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.14.1",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.14.1",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-only",
				},
				{
					id: 3523815,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.15.0",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.15.0",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-or-later",
				},
				{
					id: 3523816,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.15.0",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.15.0",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-only",
				},
				{
					id: 3523817,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.7.1",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.7.1",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-or-later",
				},
				{
					id: 3523818,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.7.1",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.7.1",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-only",
				},
				{
					id: 3523819,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.7.4",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.7.4",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-or-later",
				},
				{
					id: 3523820,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.7.5",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.7.5",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-or-later",
				},
				{
					id: 3523821,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.7.4",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.7.4",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-only",
				},
				{
					id: 3523811,
					createdAt: "2023-06-23T19:06:36.425Z",
					source: {
						id: "npm+newrelic$9.13.0",
						name: "newrelic",
						url: "https://www.npmjs.com/package/newrelic",
						version: "9.13.0",
						packageManager: "npm",
					},
					depths: {
						direct: 1,
						deep: 0,
					},
					statuses: {
						active: 1,
						ignored: 0,
					},
					projects: [
						{
							id: "custom+38453/github.com/TeamCodeStream/codestream",
							status: "active",
							depth: 1,
							title: "https://github.com/TeamCodeStream/codestream.git",
						},
					],
					type: "policy_flag",
					details:
						"Requires you to (effectively) disclose your source code if the library is statically linked to your project. Not triggered if dynamically linked or a separate process.",
					license: "LGPL-3.0-or-later",
				},
			],
		};
	}
}
