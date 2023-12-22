// "use strict";
//
// import { describe, expect, it } from "@jest/globals";
//
// import { NewRelicProvider } from "../../../../src/providers/newrelic";
// import {
// 	GraphqlNrqlError,
// 	GraphqlNrqlErrorResponse,
// 	GraphqlNrqlTimeoutError,
// 	isGetFileLevelTelemetryResponse,
// } from "../../../../src/providers/newrelic.types";
// import { CSMe } from "@codestream/protocols/api";
// import {
// 	Entity,
// 	GetEntityCountResponse,
// 	GetReposScmResponse,
// 	ObservabilityRepo,
// 	RelatedEntity,
// 	RelatedEntityByRepositoryGuidsResult,
// } from "@codestream/protocols/agent";
// import { MetricQueryRequest, Span } from "../../../../src/providers/newrelic/newrelic.types";
//
// describe("NewRelicProvider", () => {
// 	it("tryFormatStack", async () => {
// 		const data = {
// 			crash: null,
// 			entityType: "MOBILE_APPLICATION_ENTITY",
// 			exception: {
// 				stackTrace: {
// 					frames: [
// 						{
// 							filepath: "Logger.kt",
// 							formatted: "com.newrelic.common.Logger",
// 							line: 67,
// 							name: "wrapToBeTraceable",
// 						},
// 						{
// 							filepath: "Logger.kt",
// 							formatted: "com.newrelic.common.Logger",
// 							line: 28,
// 							name: "logError",
// 						},
// 						{
// 							filepath: "Logger.kt",
// 							formatted: "com.newrelic.common.Logger",
// 							line: 18,
// 							name: "logError$default",
// 						},
// 						{
// 							filepath: "RefreshTokenQuery.kt",
// 							formatted: "com.newrelic.login.api.query.RefreshTokenQuery",
// 							line: 62,
// 							name: "refreshToken",
// 						},
// 						{
// 							formatted: "com.newrelic.login.api.query.RefreshTokenQuery$refreshToken$1",
// 							line: 15,
// 							name: "invokeSuspend",
// 						},
// 						{
// 							filepath: "ContinuationImpl.kt",
// 							formatted: "kotlin.coroutines.jvm.internal.BaseContinuationImpl",
// 							line: 33,
// 							name: "resumeWith",
// 						},
// 						{
// 							filepath: "DispatchedTask.kt",
// 							formatted: "kotlinx.coroutines.DispatchedTask",
// 							line: 104,
// 							name: "run",
// 						},
// 						{
// 							filepath: "Handler.java",
// 							formatted: "android.os.Handler",
// 							line: 883,
// 							name: "handleCallback",
// 						},
// 						{
// 							filepath: "Handler.java",
// 							formatted: "android.os.Handler",
// 							line: 100,
// 							name: "dispatchMessage",
// 						},
// 						{
// 							filepath: "Looper.java",
// 							formatted: "android.os.Looper",
// 							line: 224,
// 							name: "loop",
// 						},
// 						{
// 							filepath: "ActivityThread.java",
// 							formatted: "android.app.ActivityThread",
// 							line: 7561,
// 							name: "main",
// 						},
// 						{
// 							filepath: "Method.java",
// 							formatted: "java.lang.reflect.Method",
// 							line: -2,
// 							name: "invoke",
// 						},
// 						{
// 							filepath: "RuntimeInit.java",
// 							formatted: "com.android.internal.os.RuntimeInit$MethodAndArgsCaller",
// 							line: 539,
// 							name: "run",
// 						},
// 						{
// 							filepath: "ZygoteInit.java",
// 							formatted: "com.android.internal.os.ZygoteInit",
// 							line: 995,
// 							name: "main",
// 						},
// 					],
// 				},
// 			},
// 			name: "Thing for Android - Production",
// 		};
//
// 		const results = new NewRelicProvider({} as any, {} as any).tryFormatStack(
// 			data.entityType,
// 			data.exception
// 		);
//
// 		expect(results?.stackTrace.frames.map(_ => _.formatted)).toEqual([
// 			"\tcom.newrelic.common.Logger(Logger.kt:67)",
// 			"\tcom.newrelic.common.Logger(Logger.kt:28)",
// 			"\tcom.newrelic.common.Logger(Logger.kt:18)",
// 			"\tcom.newrelic.login.api.query.RefreshTokenQuery(RefreshTokenQuery.kt:62)",
// 			"\tcom.newrelic.login.api.query.RefreshTokenQuery$refreshToken$1",
// 			"\tkotlin.coroutines.jvm.internal.BaseContinuationImpl(ContinuationImpl.kt:33)",
// 			"\tkotlinx.coroutines.DispatchedTask(DispatchedTask.kt:104)",
// 			"\tandroid.os.Handler(Handler.java:883)",
// 			"\tandroid.os.Handler(Handler.java:100)",
// 			"\tandroid.os.Looper(Looper.java:224)",
// 			"\tandroid.app.ActivityThread(ActivityThread.java:7561)",
// 			"\tjava.lang.reflect.Method",
// 			"\tcom.android.internal.os.RuntimeInit$MethodAndArgsCaller(RuntimeInit.java:539)",
// 			"\tcom.android.internal.os.ZygoteInit(ZygoteInit.java:995)",
// 		]);
// 	});
//
// 	xit("getFileLevelTelemetry", async () => {
// 		const serviceLocatorStub = {
// 			git: {
// 				getRepositoryByFilePath: function (path: string) {
// 					return {
// 						id: "123",
// 						path: "whatever",
// 						getWeightedRemotesByStrategy: function () {
// 							return [
// 								{
// 									name: "foo",
// 									repoPath: "foo/bar",
// 									remotes: [
// 										{
// 											rawUrl: "https://",
// 										},
// 									],
// 								},
// 							];
// 						},
// 					};
// 				},
// 			},
// 			users: {
// 				getMe: function () {
// 					return {
// 						id: "1234",
// 					};
// 				},
// 			},
// 			session: {
// 				newRelicApiUrl: "",
// 			},
// 		} as any;
// 		const provider = new NewRelicProviderStub({} as any, {} as any);
// 		provider.sessionServiceContainer = serviceLocatorStub;
//
// 		const results = await provider.getFileLevelTelemetry({
// 			fileUri: "/foo.py",
// 			languageId: "python",
// 			options: {
// 				includeAverageDuration: true,
// 				includeErrorRate: true,
// 				includeThroughput: true,
// 			},
// 		});
//
// 		if (!isGetFileLevelTelemetryResponse(results)) {
// 			throw Error(results?.error?.type);
// 		}
//
// 		expect(results?.sampleSize?.length).toEqual(2);
// 		expect(results?.sampleSize?.map(_ => _.functionName)).toEqual(["error", "hello_world"]);
// 	});
//
// 	xit("getFileLevelTelemetry2", async () => {
// 		const serviceLocatorStub = {
// 			git: {
// 				getRepositoryByFilePath: function (path: string) {
// 					return {
// 						id: "123",
// 						path: "whatever",
// 						getWeightedRemotesByStrategy: function () {
// 							return [
// 								{
// 									name: "foo",
// 									repoPath: "foo/bar",
// 									remotes: [
// 										{
// 											rawUrl: "https://",
// 										},
// 									],
// 								},
// 							];
// 						},
// 					};
// 				},
// 			},
// 			users: {
// 				getMe: function () {
// 					return {
// 						id: "1234",
// 					};
// 				},
// 			},
// 			session: {
// 				newRelicApiUrl: "",
// 			},
// 		} as any;
// 		const provider = new NewRelicProviderStub2({} as any, {} as any);
// 		provider.sessionServiceContainer = serviceLocatorStub;
//
// 		const results = await provider.getFileLevelTelemetry({
// 			fileUri: "/foo2.py",
// 			languageId: "python",
// 			options: {
// 				includeAverageDuration: true,
// 				includeErrorRate: true,
// 				includeThroughput: true,
// 			},
// 		});
//
// 		if (!isGetFileLevelTelemetryResponse(results)) {
// 			throw Error(results?.error?.type);
// 		}
//
// 		expect(results?.sampleSize?.length).toEqual(1);
// 		expect(results?.sampleSize?.map(_ => _.functionName)).toEqual([
// 			"create_bill_credit_payment_thing",
// 		]);
// 	});
//
// 	it("generateEntityQueryStatements", async () => {
// 		const provider = new NewRelicProvider({} as any, {} as any);
// 		expect(provider.generateEntityQueryStatement("foo-bar_baz")).toEqual(
// 			"name LIKE '%foo-bar_baz%'"
// 		);
// 	});
//
// 	it("getObservabilityRepos", async () => {
// 		const serviceLocatorStub = {
// 			scm: {
// 				getRepos: function (): Promise<GetReposScmResponse> {
// 					return new Promise(resolve => {
// 						resolve({
// 							repositories: [
// 								{
// 									id: "123",
// 									path: "",
// 									folder: { uri: "", name: "repo" },
// 									remotes: [
// 										{
// 											repoPath: "/Users/johndoe/code/johndoe_foo-account-persister",
// 											name: "origin",
// 											domain: "yoursourcecode.net",
// 											path: "johndoe/foo-account-persister",
// 											rawUrl: "git@yoursourcecode.net:johndoe/foo-account-persister.git",
// 											webUrl: "//yoursourcecode.net/johndoe/foo-account-persister",
// 										},
// 										{
// 											repoPath: "/Users/johndoe/code/johndoe_foo-account-persister",
// 											name: "upstream",
// 											domain: "yoursourcecode.net",
// 											path: "biz-enablement/foo-account-persister",
// 											rawUrl: "git@yoursourcecode.net:biz-enablement/foo-account-persister.git",
// 											webUrl: "//yoursourcecode.net/biz-enablement/foo-account-persister",
// 										},
// 									],
// 								},
// 							],
// 						});
// 					});
// 				},
// 			},
// 			session: {
// 				newRelicApiUrl: "https://api.newrelic.com",
// 			},
// 		} as any;
//
// 		const provider = new NewRelicProviderStub2({} as any, {} as any);
// 		provider.sessionServiceContainer = serviceLocatorStub;
//
// 		const results = await provider.getObservabilityRepos({});
//
// 		expect(results?.repos?.length).toEqual(1);
// 		expect(results?.repos![0].entityAccounts.length).toEqual(1);
// 		expect(results?.repos![0].repoRemote).toEqual(
// 			"git@yoursourcecode.net:biz-enablement/foo-account-persister.git"
// 		);
// 	});
//
// 	it("throws GraphqlNrqlTimeoutError for matching response", () => {
// 		const provider = new NewRelicProvider({} as any, {} as any);
// 		const responseBody: GraphqlNrqlErrorResponse = {
// 			errors: [
// 				{
// 					extensions: {
// 						errorClass: "TIMEOUT",
// 						nrOnly: {},
// 					},
// 					path: ["path"],
// 					message: "error happened",
// 				},
// 			],
// 		};
// 		// const error = expect(() => provider.checkGraphqlErrors(responseBody)).toThrow(GraphqlNrqlTimeoutError);
// 		try {
// 			provider.checkGraphqlErrors(responseBody);
// 		} catch (e: unknown) {
// 			expect(e instanceof GraphqlNrqlTimeoutError).toBe(true);
// 			const error = e as GraphqlNrqlTimeoutError;
// 			expect(error.errors.length).toBe(1);
// 			expect(error.errors[0].message).toBe("error happened");
// 			return;
// 		}
// 		// TODO use fail after fixed https://github.com/facebook/jest/issues/11698
// 		throw new Error("GraphqlNrqlTimeoutError not thrown");
// 	});
//
// 	it("throws GraphqlNrqlError for other gql errors", () => {
// 		const provider = new NewRelicProvider({} as any, {} as any);
// 		const responseBody: GraphqlNrqlErrorResponse = {
// 			errors: [
// 				{
// 					extensions: {
// 						errorClass: "SOMETHING_BAD",
// 						nrOnly: {},
// 					},
// 					path: ["path"],
// 				},
// 			],
// 		};
// 		try {
// 			provider.checkGraphqlErrors(responseBody);
// 		} catch (e: unknown) {
// 			expect(e instanceof GraphqlNrqlError).toBe(true);
// 			const error = e as GraphqlNrqlTimeoutError;
// 			expect(error.errors.length).toBe(1);
// 			return;
// 		}
// 		// TODO use fail after fixed https://github.com/facebook/jest/issues/11698
// 		throw new Error("GraphqlNrqlError not thrown");
// 	});
// });
//
// class NewRelicProviderStubBase extends NewRelicProvider {
// 	isConnected(user: CSMe): boolean {
// 		return true;
// 	}
//
// 	public async getEntityCount(): Promise<GetEntityCountResponse> {
// 		return { entityCount: 1 };
// 	}
//
// 	async getObservabilityEntityRepos(repoId: string): Promise<ObservabilityRepo | undefined> {
// 		return {
// 			repoId: "123",
// 			hasRepoAssociation: true,
// 			hasCodeLevelMetricSpanData: true,
// 			repoName: "foo",
// 			repoRemote: "https://example.com",
// 			entityAccounts: [
// 				{
// 					accountId: 123,
// 					accountName: "name",
// 					entityGuid: "123",
// 					entityName: "entity",
// 					tags: [
// 						{
// 							key: "url",
// 							values: ["cheese"],
// 						},
// 					],
// 					distributedTracingEnabled: true,
// 				},
// 			],
// 		};
// 	}
//
// 	async getMethodAverageDuration(request: MetricQueryRequest): Promise<any> {
// 		return {
// 			actor: {
// 				account: {
// 					metrics: {
// 						results: [],
// 					},
// 					extrapolations: {
// 						results: [],
// 					},
// 				},
// 			},
// 		};
// 	}
//
// 	async getMethodErrorCount(request: MetricQueryRequest): Promise<any> {
// 		return {
// 			actor: {
// 				account: {
// 					metrics: {
// 						results: [],
// 					},
// 					extrapolations: {
// 						results: [],
// 					},
// 				},
// 			},
// 		};
// 	}
//
// 	protected async findRepositoryEntitiesByRepoRemotes(remotes: string[]): Promise<any> {
// 		return {
// 			entities: [
// 				{
// 					guid: "123456",
// 					name: "my-entity",
// 					account: {
// 						id: 1,
// 						name: "name",
// 					},
// 					tags: [
// 						{
// 							key: "accountId",
// 							values: ["1"],
// 						},
// 						{
// 							key: "url",
// 							values: ["git@yoursourcecode.net:biz-enablement/foo-account-persister.git"],
// 						},
// 					],
// 				},
// 			] as Entity[],
// 			remotes: await this.buildRepoRemoteVariants(remotes),
// 		};
// 	}
//
// 	protected async findRelatedEntityByRepositoryGuids(
// 		repositoryGuids: string[]
// 	): Promise<RelatedEntityByRepositoryGuidsResult> {
// 		return {
// 			actor: {
// 				entities: [
// 					{
// 						relatedEntities: {
// 							results: [
// 								{
// 									source: {
// 										entity: {
// 											account: {
// 												id: 1,
// 												name: "name",
// 											},
// 											name: "src-entity",
// 											type: "APPLICATION",
// 											tags: [
// 												{
// 													key: "accountId",
// 													values: ["1"],
// 												},
// 											],
// 										},
// 									},
// 									target: {
// 										entity: {
// 											account: {
// 												id: 1,
// 												name: "name",
// 											},
// 											name: "target-entity",
// 											type: "REPOSITORY",
// 											tags: [
// 												{
// 													key: "accountId",
// 													values: ["1"],
// 												},
// 											],
// 										},
// 									},
// 								},
// 							] as RelatedEntity[],
// 						},
// 					},
// 				],
// 			},
// 		};
// 	}
// }
//
// class NewRelicProviderStub extends NewRelicProviderStubBase {
// 	async getSpans(request: MetricQueryRequest): Promise<Span[] | undefined> {
// 		return [
// 			{
// 				"code.lineno": 1892,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_request",
// 				timestamp: 1647612755718,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 1925,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_appcontext",
// 				timestamp: 1647612755718,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Response",
// 				timestamp: 1647612755718,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Finalize",
// 				timestamp: 1647612755718,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 464,
// 				"code.namespace": "werkzeug.wsgi.ClosingIterator",
// 				name: "Function/werkzeug.wsgi:ClosingIterator.close",
// 				timestamp: 1647612755718,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 1363,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.handle_user_exception",
// 				timestamp: 1647612755717,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 1395,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.handle_exception",
// 				timestamp: 1647612755717,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 1864,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.process_response",
// 				timestamp: 1647612755717,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 27,
// 				"code.namespace": "routes.app",
// 				name: "Function/routes.app:error",
// 				timestamp: 1647612755717,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Application",
// 				timestamp: 1647612755716,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask",
// 				timestamp: 1647612755716,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 1837,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.preprocess_request",
// 				timestamp: 1647612755716,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": null,
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/routes.app:error",
// 				timestamp: 1647612755716,
// 				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
// 				"transaction.name": "WebTransaction/Function/routes.app:error",
// 				transactionId: "eeaea27222ebc8bd",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Response",
// 				timestamp: 1647612669352,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Finalize",
// 				timestamp: 1647612669352,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 464,
// 				"code.namespace": "werkzeug.wsgi.ClosingIterator",
// 				name: "Function/werkzeug.wsgi:ClosingIterator.close",
// 				timestamp: 1647612669352,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 1925,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_appcontext",
// 				timestamp: 1647612669352,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 1892,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_request",
// 				timestamp: 1647612669351,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 1395,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.handle_exception",
// 				timestamp: 1647612669351,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 1864,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.process_response",
// 				timestamp: 1647612669351,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 1363,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.handle_user_exception",
// 				timestamp: 1647612669350,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/routes.app:error",
// 				timestamp: 1647612669350,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": "WebTransaction/Function/routes.app:error",
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Application",
// 				timestamp: 1647612669350,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask",
// 				timestamp: 1647612669350,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 1837,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.preprocess_request",
// 				timestamp: 1647612669350,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": 27,
// 				"code.namespace": "routes.app",
// 				name: "Function/routes.app:error",
// 				timestamp: 1647612669350,
// 				traceId: "f6162d7b5374c64014c41ab0629add6c",
// 				"transaction.name": null,
// 				transactionId: "f6162d7b5374c640",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Response",
// 				timestamp: 1647612515523,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Finalize",
// 				timestamp: 1647612515523,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 464,
// 				"code.namespace": "werkzeug.wsgi.ClosingIterator",
// 				name: "Function/werkzeug.wsgi:ClosingIterator.close",
// 				timestamp: 1647612515523,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 1925,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_appcontext",
// 				timestamp: 1647612515523,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 1892,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_request",
// 				timestamp: 1647612515522,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 1864,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.process_response",
// 				timestamp: 1647612515522,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 464,
// 				"code.namespace": "werkzeug.wsgi.ClosingIterator",
// 				name: "Function/werkzeug.wsgi:ClosingIterator.close",
// 				timestamp: 1647612515521,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Finalize",
// 				timestamp: 1647612515521,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": 40,
// 				"code.namespace": "routes.app",
// 				name: "Function/routes.app:external_source",
// 				timestamp: 1647612515520,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": 1864,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.process_response",
// 				timestamp: 1647612515520,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": 1892,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_request",
// 				timestamp: 1647612515520,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": 1925,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.do_teardown_appcontext",
// 				timestamp: 1647612515520,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Response",
// 				timestamp: 1647612515520,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": 1837,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.preprocess_request",
// 				timestamp: 1647612515519,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Application",
// 				timestamp: 1647612515519,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask",
// 				timestamp: 1647612515519,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/routes.app:external_source",
// 				timestamp: 1647612515518,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": "WebTransaction/Function/routes.app:external_source",
// 				transactionId: "793a543ef938a9fb",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "External/localhost:8000/requests/",
// 				timestamp: 1647612515514,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/routes.app:external_call",
// 				timestamp: 1647612515514,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": "WebTransaction/Function/routes.app:external_call",
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": null,
// 				"code.namespace": null,
// 				name: "Python/WSGI/Application",
// 				timestamp: 1647612515514,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 2086,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask",
// 				timestamp: 1647612515514,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 1837,
// 				"code.namespace": "flask.app.Flask",
// 				name: "Function/flask.app:Flask.preprocess_request",
// 				timestamp: 1647612515514,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 			{
// 				"code.lineno": 32,
// 				"code.namespace": "routes.app",
// 				name: "Function/routes.app:external_call",
// 				timestamp: 1647612515514,
// 				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
// 				"transaction.name": null,
// 				transactionId: "9ecccdf563986be9",
// 			},
// 		];
// 	}
//
// 	isConnected(user: CSMe): boolean {
// 		return true;
// 	}
//
// 	public async getEntityCount(): Promise<GetEntityCountResponse> {
// 		return { entityCount: 1 };
// 	}
//
// 	async getObservabilityEntityRepos(repoId: string): Promise<ObservabilityRepo | undefined> {
// 		return {
// 			repoId: "123",
// 			hasRepoAssociation: true,
// 			hasCodeLevelMetricSpanData: true,
// 			repoName: "foo",
// 			repoRemote: "https://example.com",
// 			entityAccounts: [
// 				{
// 					accountId: 123,
// 					accountName: "name",
// 					entityGuid: "123",
// 					entityName: "entity",
// 					tags: [
// 						{
// 							key: "url",
// 							values: ["cheese"],
// 						},
// 					],
// 					distributedTracingEnabled: true,
// 				},
// 			],
// 		};
// 	}
//
// 	async getMethodSampleSize(request: MetricQueryRequest) {
// 		return {
// 			actor: {
// 				account: {
// 					metrics: {
// 						results: [
// 							{
// 								facet: "Function/routes.app:error",
// 								metricTimesliceName: "Function/routes.app:error",
// 								requestsPerMinute: 0.2,
// 							},
// 							{
// 								facet: "Function/routes.app:hello_world",
// 								metricTimesliceName: "Function/routes.app:hello_world",
// 								requestsPerMinute: 0.06666666666666667,
// 							},
// 						],
// 					},
// 					spans: {
// 						results: [
// 							{
// 								facet: "Function/routes.app:error",
// 								metricTimesliceName: "Function/routes.app:error",
// 								requestsPerMinute: 0.2,
// 							},
// 							{
// 								facet: "Function/routes.app:hello_world",
// 								metricTimesliceName: "Function/routes.app:hello_world",
// 								requestsPerMinute: 0.06666666666666667,
// 							},
// 						],
// 					},
// 				},
// 			},
// 		};
// 	}
//
// 	async getMethodAverageDuration(request: MetricQueryRequest) {
// 		return {
// 			actor: {
// 				account: {
// 					metrics: {
// 						results: [
// 							{
// 								facet: "WebTransaction/Function/routes.app:error",
// 								averageDuration: 0.0025880090121565193,
// 								metricTimesliceName: "WebTransaction/Function/routes.app:error",
// 							},
// 							{
// 								facet: "WebTransaction/Function/routes.app:hello_world",
// 								averageDuration: 0.0015958845615386963,
// 								metricTimesliceName: "WebTransaction/Function/routes.app:hello_world",
// 							},
// 						],
// 					},
// 					spans: {
// 						results: [
// 							{
// 								facet: "WebTransaction/Function/routes.app:error",
// 								averageDuration: 0.0025880090121565193,
// 								metricTimesliceName: "WebTransaction/Function/routes.app:error",
// 							},
// 							{
// 								facet: "WebTransaction/Function/routes.app:hello_world",
// 								averageDuration: 0.0015958845615386963,
// 								metricTimesliceName: "WebTransaction/Function/routes.app:hello_world",
// 							},
// 						],
// 					},
// 				},
// 			},
// 		};
// 	}
//
// 	async getMethodErrorCount(request: MetricQueryRequest) {
// 		return {
// 			actor: {
// 				account: {
// 					metrics: {
// 						results: [
// 							{
// 								facet: "Errors/WebTransaction/Function/routes.app:error",
// 								errorsPerMinute: 0.48333333333333334,
// 								metricTimesliceName: "Errors/WebTransaction/Function/routes.app:error",
// 							},
// 						],
// 					},
// 					spans: {
// 						results: [
// 							{
// 								facet: "Errors/WebTransaction/Function/routes.app:error",
// 								errorsPerMinute: 0.48333333333333334,
// 								metricTimesliceName: "Errors/WebTransaction/Function/routes.app:error",
// 							},
// 						],
// 					},
// 				},
// 			},
// 		};
// 	}
// }
//
// class NewRelicProviderStub2 extends NewRelicProviderStubBase {
// 	async getSpans(request: MetricQueryRequest): Promise<Span[] | undefined> {
// 		return [
// 			{
// 				"code.function": "create_bill_credit_payment_thing",
// 				name: "Carrot/foo_bar.bills.tasks.create_bill_credit_payment_thing",
// 				timestamp: 1647631200451,
// 				"transaction.name":
// 					"OtherTransaction/Carrot/foo_bar.bills.tasks.create_bill_credit_payment_thing",
// 			},
// 		];
// 	}
//
// 	async getMethodSampleSize(request: MetricQueryRequest) {
// 		return {
// 			actor: {
// 				account: {
// 					metrics: {
// 						results: [
// 							{
// 								facet:
// 									"OtherTransaction/Carrot/foo_bar.bills.tasks.create_bill_credit_payment_thing",
// 								metricTimesliceName:
// 									"OtherTransaction/Carrot/foo_bar.bills.tasks.create_bill_credit_payment_thing",
// 								requestsPerMinute: 0.35,
// 							},
// 						],
// 					},
// 					spans: {
// 						results: [
// 							{
// 								facet:
// 									"OtherTransaction/Carrot/foo_bar.bills.tasks.create_bill_credit_payment_thing",
// 								metricTimesliceName:
// 									"OtherTransaction/Carrot/foo_bar.bills.tasks.create_bill_credit_payment_thing",
// 								requestsPerMinute: 0.35,
// 							},
// 						],
// 					},
// 				},
// 			},
// 		};
// 	}
// }
