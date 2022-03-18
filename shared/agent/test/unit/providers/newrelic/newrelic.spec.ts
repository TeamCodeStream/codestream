"use strict";

import { expect } from "chai";
import { ObservabilityRepo } from "../../../../src/protocol/agent.protocol";
import { CSMe } from "../../../../src/protocol/api.protocol.models";

require("mocha").describe;
require("mocha").it;
import { MetricQueryRequest, NewRelicProvider, Span } from "../../../../src/providers/newrelic";

describe("NewRelicProvider", async () => {
	it("tryFormatStack", async () => {
		const data = {
			crash: null,
			entityType: "MOBILE_APPLICATION_ENTITY",
			exception: {
				stackTrace: {
					frames: [
						{
							filepath: "Logger.kt",
							formatted: "com.newrelic.common.Logger",
							line: 67,
							name: "wrapToBeTraceable"
						},
						{
							filepath: "Logger.kt",
							formatted: "com.newrelic.common.Logger",
							line: 28,
							name: "logError"
						},
						{
							filepath: "Logger.kt",
							formatted: "com.newrelic.common.Logger",
							line: 18,
							name: "logError$default"
						},
						{
							filepath: "RefreshTokenQuery.kt",
							formatted: "com.newrelic.login.api.query.RefreshTokenQuery",
							line: 62,
							name: "refreshToken"
						},
						{
							formatted: "com.newrelic.login.api.query.RefreshTokenQuery$refreshToken$1",
							line: 15,
							name: "invokeSuspend"
						},
						{
							filepath: "ContinuationImpl.kt",
							formatted: "kotlin.coroutines.jvm.internal.BaseContinuationImpl",
							line: 33,
							name: "resumeWith"
						},
						{
							filepath: "DispatchedTask.kt",
							formatted: "kotlinx.coroutines.DispatchedTask",
							line: 104,
							name: "run"
						},
						{
							filepath: "Handler.java",
							formatted: "android.os.Handler",
							line: 883,
							name: "handleCallback"
						},
						{
							filepath: "Handler.java",
							formatted: "android.os.Handler",
							line: 100,
							name: "dispatchMessage"
						},
						{
							filepath: "Looper.java",
							formatted: "android.os.Looper",
							line: 224,
							name: "loop"
						},
						{
							filepath: "ActivityThread.java",
							formatted: "android.app.ActivityThread",
							line: 7561,
							name: "main"
						},
						{
							filepath: "Method.java",
							formatted: "java.lang.reflect.Method",
							line: -2,
							name: "invoke"
						},
						{
							filepath: "RuntimeInit.java",
							formatted: "com.android.internal.os.RuntimeInit$MethodAndArgsCaller",
							line: 539,
							name: "run"
						},
						{
							filepath: "ZygoteInit.java",
							formatted: "com.android.internal.os.ZygoteInit",
							line: 995,
							name: "main"
						}
					]
				}
			},
			name: "Thing for Android - Production"
		};

		const results = new NewRelicProvider({} as any, {} as any).tryFormatStack(
			data.entityType,
			data.exception
		);

		expect(results?.stackTrace.frames.map(_ => _.formatted)).to.deep.equal([
			"\tcom.newrelic.common.Logger(Logger.kt:67)",
			"\tcom.newrelic.common.Logger(Logger.kt:28)",
			"\tcom.newrelic.common.Logger(Logger.kt:18)",
			"\tcom.newrelic.login.api.query.RefreshTokenQuery(RefreshTokenQuery.kt:62)",
			"\tcom.newrelic.login.api.query.RefreshTokenQuery$refreshToken$1",
			"\tkotlin.coroutines.jvm.internal.BaseContinuationImpl(ContinuationImpl.kt:33)",
			"\tkotlinx.coroutines.DispatchedTask(DispatchedTask.kt:104)",
			"\tandroid.os.Handler(Handler.java:883)",
			"\tandroid.os.Handler(Handler.java:100)",
			"\tandroid.os.Looper(Looper.java:224)",
			"\tandroid.app.ActivityThread(ActivityThread.java:7561)",
			"\tjava.lang.reflect.Method",
			"\tcom.android.internal.os.RuntimeInit$MethodAndArgsCaller(RuntimeInit.java:539)",
			"\tcom.android.internal.os.ZygoteInit(ZygoteInit.java:995)"
		]);
	});

	it("addMethodName", async () => {
		const provider = new NewRelicProviderStub({} as any, {} as any);
		const results = provider.addMethodName(
			{
				"Function/routes.app:hello_world": [
					{
						traceId: "123",
						transactionId: "abc",
						"code.lineno": 1,
						"code.namespace": null,
						"transaction.name": "a"
					}
				],
				"Function/routes.app:MyClass.my_method": [
					{
						traceId: "456",
						transactionId: "def",
						"code.lineno": 4,
						"code.namespace": null,
						"transaction.name": "d"
					}
				]
			},
			[
				{ metricTimesliceName: "Function/routes.app:hello_world" },
				{ metricTimesliceName: "Function/routes.app:MyClass.my_method" }
			]
		);

		expect(results).to.deep.eq([
			{
				className: undefined,
				metricTimesliceName: "Function/routes.app:hello_world",
				metadata: {
					"code.lineno": 1,
					traceId: "123",
					transactionId: "abc",
					"code.namespace": null
				},
				functionName: "hello_world"
			},
			{
				className: "MyClass",
				metricTimesliceName: "Function/routes.app:MyClass.my_method",
				metadata: {
					"code.lineno": 4,
					traceId: "456",
					transactionId: "def",
					"code.namespace": null
				},
				functionName: "my_method"
			}
		]);
	});

	it("getFileLevelTelemetry", async () => {
		const serviceLocatorStub = {
			git: {
				getRepositoryByFilePath: function(path: string) {
					return {
						id: "123",
						path: "whatever",
						getWeightedRemotesByStrategy: function() {
							return [
								{
									name: "foo",
									repoPath: "foo/bar",
									remotes: [
										{
											rawUrl: "https://"
										}
									]
								}
							];
						}
					};
				}
			},
			users: {
				getMe: function() {
					return {
						id: "1234"
					};
				}
			},
			session: {
				newRelicApiUrl: ""
			}
		} as any;
		const provider = new NewRelicProviderStub({} as any, {} as any);
		provider.sessionServiceContainer = serviceLocatorStub;

		const results = await provider.getFileLevelTelemetry({
			filePath: "/foo.py",
			languageId: "python",
			options: {
				includeAverageDuration: true,
				includeErrorRate: true,
				includeThroughput: true
			}
		});

		expect(results?.throughput?.length).to.eq(2);
		expect(results?.throughput?.map(_ => _.functionName)).to.deep.eq(["error", "hello_world"]);
	});
});

class NewRelicProviderStub extends NewRelicProvider {
	async getSpans(request: MetricQueryRequest): Promise<Span[] | undefined> {
		return [
			{
				"code.lineno": 1892,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_request",
				timestamp: 1647612755718,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 1925,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_appcontext",
				timestamp: 1647612755718,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Response",
				timestamp: 1647612755718,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Finalize",
				timestamp: 1647612755718,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 464,
				"code.namespace": "werkzeug.wsgi.ClosingIterator",
				name: "Function/werkzeug.wsgi:ClosingIterator.close",
				timestamp: 1647612755718,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 1363,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.handle_user_exception",
				timestamp: 1647612755717,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 1395,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.handle_exception",
				timestamp: 1647612755717,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 1864,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.process_response",
				timestamp: 1647612755717,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 27,
				"code.namespace": "routes.app",
				name: "Function/routes.app:error",
				timestamp: 1647612755717,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Application",
				timestamp: 1647612755716,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask",
				timestamp: 1647612755716,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 1837,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.preprocess_request",
				timestamp: 1647612755716,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": null,
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/routes.app:error",
				timestamp: 1647612755716,
				traceId: "eeaea27222ebc8bd9620532a39eba2ee",
				"transaction.name": "WebTransaction/Function/routes.app:error",
				transactionId: "eeaea27222ebc8bd"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Response",
				timestamp: 1647612669352,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Finalize",
				timestamp: 1647612669352,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 464,
				"code.namespace": "werkzeug.wsgi.ClosingIterator",
				name: "Function/werkzeug.wsgi:ClosingIterator.close",
				timestamp: 1647612669352,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 1925,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_appcontext",
				timestamp: 1647612669352,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 1892,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_request",
				timestamp: 1647612669351,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 1395,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.handle_exception",
				timestamp: 1647612669351,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 1864,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.process_response",
				timestamp: 1647612669351,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 1363,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.handle_user_exception",
				timestamp: 1647612669350,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/routes.app:error",
				timestamp: 1647612669350,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": "WebTransaction/Function/routes.app:error",
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Application",
				timestamp: 1647612669350,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask",
				timestamp: 1647612669350,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 1837,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.preprocess_request",
				timestamp: 1647612669350,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": 27,
				"code.namespace": "routes.app",
				name: "Function/routes.app:error",
				timestamp: 1647612669350,
				traceId: "f6162d7b5374c64014c41ab0629add6c",
				"transaction.name": null,
				transactionId: "f6162d7b5374c640"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Response",
				timestamp: 1647612515523,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Finalize",
				timestamp: 1647612515523,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 464,
				"code.namespace": "werkzeug.wsgi.ClosingIterator",
				name: "Function/werkzeug.wsgi:ClosingIterator.close",
				timestamp: 1647612515523,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 1925,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_appcontext",
				timestamp: 1647612515523,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 1892,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_request",
				timestamp: 1647612515522,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 1864,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.process_response",
				timestamp: 1647612515522,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 464,
				"code.namespace": "werkzeug.wsgi.ClosingIterator",
				name: "Function/werkzeug.wsgi:ClosingIterator.close",
				timestamp: 1647612515521,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Finalize",
				timestamp: 1647612515521,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": 40,
				"code.namespace": "routes.app",
				name: "Function/routes.app:external_source",
				timestamp: 1647612515520,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": 1864,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.process_response",
				timestamp: 1647612515520,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": 1892,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_request",
				timestamp: 1647612515520,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": 1925,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.do_teardown_appcontext",
				timestamp: 1647612515520,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Response",
				timestamp: 1647612515520,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": 1837,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.preprocess_request",
				timestamp: 1647612515519,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Application",
				timestamp: 1647612515519,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask",
				timestamp: 1647612515519,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/routes.app:external_source",
				timestamp: 1647612515518,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": "WebTransaction/Function/routes.app:external_source",
				transactionId: "793a543ef938a9fb"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "External/localhost:8000/requests/",
				timestamp: 1647612515514,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/routes.app:external_call",
				timestamp: 1647612515514,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": "WebTransaction/Function/routes.app:external_call",
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": null,
				"code.namespace": null,
				name: "Python/WSGI/Application",
				timestamp: 1647612515514,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 2086,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask",
				timestamp: 1647612515514,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 1837,
				"code.namespace": "flask.app.Flask",
				name: "Function/flask.app:Flask.preprocess_request",
				timestamp: 1647612515514,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			},
			{
				"code.lineno": 32,
				"code.namespace": "routes.app",
				name: "Function/routes.app:external_call",
				timestamp: 1647612515514,
				traceId: "9ecccdf563986be9ae6c00b834b90a3e",
				"transaction.name": null,
				transactionId: "9ecccdf563986be9"
			}
		];
	}

	isConnected(user: CSMe): boolean {
		return true;
	}

	protected async getEntityCount(): Promise<number> {
		return 1;
	}

	protected async getObservabilityEntityRepos(
		repoId: string
	): Promise<ObservabilityRepo | undefined> {
		return {
			repoId: "123",
			hasRepoAssociation: true,
			repoName: "foo",
			repoRemote: "https://example.com",
			entityAccounts: [
				{
					accountId: 123,
					accountName: "name",
					entityGuid: "123",
					entityName: "entity",
					tags: [
						{
							key: "url",
							values: ["cheese"]
						}
					]
				}
			]
		};
	}
	async getMethodThroughput(request: MetricQueryRequest) {
		return {
			actor: {
				account: {
					nrql: {
						results: [
							{
								facet: "Function/routes.app:error",
								metricTimesliceName: "Function/routes.app:error",
								requestsPerMinute: 0.2
							},
							{
								facet: "Function/routes.app:hello_world",
								metricTimesliceName: "Function/routes.app:hello_world",
								requestsPerMinute: 0.06666666666666667
							}
						]
					}
				}
			}
		};
	}
	async getMethodAverageDuration(request: MetricQueryRequest) {
		return {
			actor: {
				account: {
					nrql: {
						results: [
							{
								facet: "WebTransaction/Function/routes.app:error",
								averageDuration: 0.0025880090121565193,
								metricTimesliceName: "WebTransaction/Function/routes.app:error"
							},
							{
								facet: "WebTransaction/Function/routes.app:hello_world",
								averageDuration: 0.0015958845615386963,
								metricTimesliceName: "WebTransaction/Function/routes.app:hello_world"
							}
						]
					}
				}
			}
		};
	}
	async getMethodErrorRate(request: MetricQueryRequest) {
		return {
			actor: {
				account: {
					nrql: {
						results: [
							{
								facet: "Errors/WebTransaction/Function/routes.app:error",
								errorsPerMinute: 0.48333333333333334,
								metricTimesliceName: "Errors/WebTransaction/Function/routes.app:error"
							}
						]
					}
				}
			}
		};
	}
}
