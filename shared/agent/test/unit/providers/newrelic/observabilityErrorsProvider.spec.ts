import { ObservabilityErrorsProvider } from "../../../../src/providers/newrelic/errors/observabilityErrorsProvider";
import { ReposProvider } from "../../../../src/providers/newrelic/repos/reposProvider";
import { NewRelicGraphqlClient } from "../../../../src/providers/newrelic/newRelicGraphqlClient";
import { NrApiConfig } from "../../../../src/providers/newrelic/nrApiConfig";
import { describe, expect, it } from "@jest/globals";
import { CSNewRelicProviderInfo } from "@codestream/protocols/api";

describe("ObservabilityErrorsProvider", () => {
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
							name: "wrapToBeTraceable",
						},
						{
							filepath: "Logger.kt",
							formatted: "com.newrelic.common.Logger",
							line: 28,
							name: "logError",
						},
						{
							filepath: "Logger.kt",
							formatted: "com.newrelic.common.Logger",
							line: 18,
							name: "logError$default",
						},
						{
							filepath: "RefreshTokenQuery.kt",
							formatted: "com.newrelic.login.api.query.RefreshTokenQuery",
							line: 62,
							name: "refreshToken",
						},
						{
							formatted: "com.newrelic.login.api.query.RefreshTokenQuery$refreshToken$1",
							line: 15,
							name: "invokeSuspend",
						},
						{
							filepath: "ContinuationImpl.kt",
							formatted: "kotlin.coroutines.jvm.internal.BaseContinuationImpl",
							line: 33,
							name: "resumeWith",
						},
						{
							filepath: "DispatchedTask.kt",
							formatted: "kotlinx.coroutines.DispatchedTask",
							line: 104,
							name: "run",
						},
						{
							filepath: "Handler.java",
							formatted: "android.os.Handler",
							line: 883,
							name: "handleCallback",
						},
						{
							filepath: "Handler.java",
							formatted: "android.os.Handler",
							line: 100,
							name: "dispatchMessage",
						},
						{
							filepath: "Looper.java",
							formatted: "android.os.Looper",
							line: 224,
							name: "loop",
						},
						{
							filepath: "ActivityThread.java",
							formatted: "android.app.ActivityThread",
							line: 7561,
							name: "main",
						},
						{
							filepath: "Method.java",
							formatted: "java.lang.reflect.Method",
							line: -2,
							name: "invoke",
						},
						{
							filepath: "RuntimeInit.java",
							formatted: "com.android.internal.os.RuntimeInit$MethodAndArgsCaller",
							line: 539,
							name: "run",
						},
						{
							filepath: "ZygoteInit.java",
							formatted: "com.android.internal.os.ZygoteInit",
							line: 995,
							name: "main",
						},
					],
				},
			},
			name: "Thing for Android - Production",
		};

		const mockReposProvider = {} as ReposProvider;
		const mockNewRelicGraphqlClient = {} as NewRelicGraphqlClient;
		const mockNrApiConfig = {} as NrApiConfig;
		const mockNewRelicProviderInfo = {} as CSNewRelicProviderInfo;

		const observabilityErrorsProvider = new ObservabilityErrorsProvider(
			mockReposProvider,
			mockNewRelicGraphqlClient,
			mockNrApiConfig,
			mockNewRelicProviderInfo,
		);

		const results = observabilityErrorsProvider.tryFormatStack(data.entityType, data.exception);

		expect(results?.stackTrace.frames.map(_ => _.formatted)).toEqual([
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
			"\tcom.android.internal.os.ZygoteInit(ZygoteInit.java:995)",
		]);
	});
});
