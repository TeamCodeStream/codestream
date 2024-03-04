import { FetchCodeErrorsResponse } from "@codestream/protocols/agent";
import {
	createdAt,
	modifiedAt,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";

// Can this be blank? First time opening an error it doesn't return the error we're looking for
export function getCodeErrorsResponse(
	postId: string,
	streamId: string,
	codeErrorId: string,
	repoId: string
): FetchCodeErrorsResponse {
	return {
		codeErrors: [
			{
				version: 2,
				deactivated: false,
				numReplies: 1,
				createdAt: createdAt,
				modifiedAt: modifiedAt,
				accountId: 11879688,
				objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
				objectType: "errorGroup",
				title: "java.lang.NullPointerException",
				text: 'Cannot invoke "acme.storefront.action.report.UserDataManager$Phone.getCountryCode()" because the return value of "acme.storefront.action.report.UserDataManager$User.getPhone()" is null',
				stackTraces: [
					{
						text: "\tacme.storefront.action.report.UserDataManager.getUserViewByState(UserDataManager.java:240)\n\tacme.storefront.MyMain.runApp(MyMain.java:38)\n\tacme.storefront.MyMain.lambda$main$0(MyMain.java:16)\n\tjava.base/java.lang.Thread.run(Thread.java:840)",
						lines: [
							{
								method: "getUserViewByState",
								namespace: "acme.storefront.action.report.UserDataManager",
								fullMethod: "acme.storefront.action.report.UserDataManager.getUserViewByState",
								fileFullPath:
									"/Users/dsellars/workspace/telco-microservices/WebPortal/Java/src/main/java/acme/storefront/action/report/UserDataManager.java",
								line: 240,
								fileRelativePath:
									"WebPortal/Java/src/main/java/acme/storefront/action/report/UserDataManager.java",
								warning: "Missing sha",
							},
							{
								method: "invoke",
								namespace: "sun.reflect.GeneratedMethodAccessor156",
								fullMethod: "sun.reflect.GeneratedMethodAccessor156.invoke",
								error: "Unable to find matching file for path undefined",
							},
							{
								method: "invoke",
								namespace: "sun.reflect.DelegatingMethodAccessorImpl",
								fullMethod: "sun.reflect.DelegatingMethodAccessorImpl.invoke",
								fileFullPath: "sun/reflect/DelegatingMethodAccessorImpl.java",
								line: 43,
								error:
									"Unable to find matching file for path sun/reflect/DelegatingMethodAccessorImpl.java",
							},
							{
								method: "invoke",
								namespace: "java.lang.reflect.Method",
								fullMethod: "java.lang.reflect.Method.invoke",
								fileFullPath: "java/lang/reflect/Method.java",
								line: 498,
								error: "Unable to find matching file for path java/lang/reflect/Method.java",
							},
							{
								method: "invokeActionMethod",
								namespace: "jodd.madvoc.ActionRequest",
								fullMethod: "jodd.madvoc.ActionRequest.invokeActionMethod",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 355,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.ActionRequest$2",
								fullMethod: "jodd.madvoc.ActionRequest$2.invoke",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 241,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.ActionRequest",
								fullMethod: "jodd.madvoc.ActionRequest.invoke",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 345,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "invokeRequest",
								namespace: "acme.storefront.InsightsInterceptor",
								fullMethod: "acme.storefront.InsightsInterceptor.invokeRequest",
								fileFullPath:
									"/Users/dsellars/workspace/telco-microservices/WebPortal/Java/src/main/java/acme/storefront/InsightsInterceptor.java",
								line: 43,
								fileRelativePath:
									"WebPortal/Java/src/main/java/acme/storefront/InsightsInterceptor.java",
							},
							{
								method: "intercept",
								namespace: "acme.storefront.InsightsInterceptor",
								fullMethod: "acme.storefront.InsightsInterceptor.intercept",
								fileFullPath:
									"/Users/dsellars/workspace/telco-microservices/WebPortal/Java/src/main/java/acme/storefront/InsightsInterceptor.java",
								line: 39,
								fileRelativePath:
									"WebPortal/Java/src/main/java/acme/storefront/InsightsInterceptor.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.interceptor.BaseActionInterceptor",
								fullMethod: "jodd.madvoc.interceptor.BaseActionInterceptor.invoke",
								fileFullPath: "jodd/madvoc/interceptor/BaseActionInterceptor.java",
								line: 38,
								error:
									"Unable to find matching file for path jodd/madvoc/interceptor/BaseActionInterceptor.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.ActionRequest",
								fullMethod: "jodd.madvoc.ActionRequest.invoke",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 345,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "invokeRequest",
								namespace: "acme.storefront.NewRelicInterceptor",
								fullMethod: "acme.storefront.NewRelicInterceptor.invokeRequest",
								fileFullPath:
									"/Users/dsellars/workspace/telco-microservices/WebPortal/Java/src/main/java/acme/storefront/NewRelicInterceptor.java",
								line: 43,
								fileRelativePath:
									"WebPortal/Java/src/main/java/acme/storefront/NewRelicInterceptor.java",
							},
							{
								method: "intercept",
								namespace: "acme.storefront.NewRelicInterceptor",
								fullMethod: "acme.storefront.NewRelicInterceptor.intercept",
								fileFullPath:
									"/Users/dsellars/workspace/telco-microservices/WebPortal/Java/src/main/java/acme/storefront/NewRelicInterceptor.java",
								line: 26,
								fileRelativePath:
									"WebPortal/Java/src/main/java/acme/storefront/NewRelicInterceptor.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.interceptor.BaseActionInterceptor",
								fullMethod: "jodd.madvoc.interceptor.BaseActionInterceptor.invoke",
								fileFullPath: "jodd/madvoc/interceptor/BaseActionInterceptor.java",
								line: 38,
								error:
									"Unable to find matching file for path jodd/madvoc/interceptor/BaseActionInterceptor.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.ActionRequest",
								fullMethod: "jodd.madvoc.ActionRequest.invoke",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 345,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "intercept",
								namespace: "jodd.madvoc.interceptor.ServletConfigInterceptor",
								fullMethod: "jodd.madvoc.interceptor.ServletConfigInterceptor.intercept",
								fileFullPath: "jodd/madvoc/interceptor/ServletConfigInterceptor.java",
								line: 71,
								error:
									"Unable to find matching file for path jodd/madvoc/interceptor/ServletConfigInterceptor.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.interceptor.BaseActionInterceptor",
								fullMethod: "jodd.madvoc.interceptor.BaseActionInterceptor.invoke",
								fileFullPath: "jodd/madvoc/interceptor/BaseActionInterceptor.java",
								line: 38,
								error:
									"Unable to find matching file for path jodd/madvoc/interceptor/BaseActionInterceptor.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.ActionRequest",
								fullMethod: "jodd.madvoc.ActionRequest.invoke",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 345,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.ActionRequest$1",
								fullMethod: "jodd.madvoc.ActionRequest$1.invoke",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 222,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.ActionRequest",
								fullMethod: "jodd.madvoc.ActionRequest.invoke",
								fileFullPath: "jodd/madvoc/ActionRequest.java",
								line: 345,
								error: "Unable to find matching file for path jodd/madvoc/ActionRequest.java",
							},
							{
								method: "invoke",
								namespace: "jodd.madvoc.component.MadvocController",
								fullMethod: "jodd.madvoc.component.MadvocController.invoke",
								fileFullPath: "jodd/madvoc/component/MadvocController.java",
								line: 164,
								error:
									"Unable to find matching file for path jodd/madvoc/component/MadvocController.java",
							},
							{
								method: "doFilter",
								namespace: "jodd.madvoc.MadvocServletFilter",
								fullMethod: "jodd.madvoc.MadvocServletFilter.doFilter",
								fileFullPath: "jodd/madvoc/MadvocServletFilter.java",
								line: 111,
								error: "Unable to find matching file for path jodd/madvoc/MadvocServletFilter.java",
							},
							{
								method: "internalDoFilter",
								namespace: "org.apache.catalina.core.ApplicationFilterChain",
								fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
								fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
								line: 192,
								error:
									"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
							},
							{
								method: "doFilter",
								namespace: "org.apache.catalina.core.ApplicationFilterChain",
								fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
								fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
								line: 165,
								error:
									"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
							},
							{
								method: "invoke",
								namespace: "org.apache.catalina.core.StandardWrapperValve",
								fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
								fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
								line: 198,
								error:
									"Unable to find matching file for path org/apache/catalina/core/StandardWrapperValve.java",
							},
							{
								method: "invoke",
								namespace: "org.apache.catalina.core.StandardContextValve",
								fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
								fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
								line: 108,
								error:
									"Unable to find matching file for path org/apache/catalina/core/StandardContextValve.java",
							},
							{
								method: "invoke",
								namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
								fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
								fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
								line: 472,
								error:
									"Unable to find matching file for path org/apache/catalina/authenticator/AuthenticatorBase.java",
							},
							{
								method: "invoke",
								namespace: "org.apache.catalina.core.StandardHostValve",
								fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
								fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
								line: 140,
								error:
									"Unable to find matching file for path org/apache/catalina/core/StandardHostValve.java",
							},
							{
								method: "invoke",
								namespace: "org.apache.catalina.valves.ErrorReportValve",
								fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
								fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
								line: 79,
								error:
									"Unable to find matching file for path org/apache/catalina/valves/ErrorReportValve.java",
							},
							{
								method: "invoke",
								namespace: "org.apache.catalina.valves.AbstractAccessLogValve",
								fullMethod: "org.apache.catalina.valves.AbstractAccessLogValve.invoke",
								fileFullPath: "org/apache/catalina/valves/AbstractAccessLogValve.java",
								line: 620,
								error:
									"Unable to find matching file for path org/apache/catalina/valves/AbstractAccessLogValve.java",
							},
							{
								method: "invoke",
								namespace: "org.apache.catalina.core.StandardEngineValve",
								fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
								fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
								line: 87,
								error:
									"Unable to find matching file for path org/apache/catalina/core/StandardEngineValve.java",
							},
							{
								method: "service",
								namespace: "org.apache.catalina.connector.CoyoteAdapter",
								fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
								fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
								line: 349,
								error:
									"Unable to find matching file for path org/apache/catalina/connector/CoyoteAdapter.java",
							},
							{
								method: "service",
								namespace: "org.apache.coyote.http11.Http11Processor",
								fullMethod: "org.apache.coyote.http11.Http11Processor.service",
								fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
								line: 784,
								error:
									"Unable to find matching file for path org/apache/coyote/http11/Http11Processor.java",
							},
							{
								method: "process",
								namespace: "org.apache.coyote.AbstractProcessorLight",
								fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
								fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
								line: 66,
								error:
									"Unable to find matching file for path org/apache/coyote/AbstractProcessorLight.java",
							},
							{
								method: "process",
								namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
								fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
								fileFullPath: "org/apache/coyote/AbstractProtocol.java",
								line: 802,
								error:
									"Unable to find matching file for path org/apache/coyote/AbstractProtocol.java",
							},
							{
								method: "doRun",
								namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
								fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
								fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
								line: 1410,
								error:
									"Unable to find matching file for path org/apache/tomcat/util/net/NioEndpoint.java",
							},
							{
								method: "run",
								namespace: "org.apache.tomcat.util.net.SocketProcessorBase",
								fullMethod: "org.apache.tomcat.util.net.SocketProcessorBase.run",
								fileFullPath: "org/apache/tomcat/util/net/SocketProcessorBase.java",
								line: 49,
								error:
									"Unable to find matching file for path org/apache/tomcat/util/net/SocketProcessorBase.java",
							},
							{
								method: "runWorker",
								namespace: "java.util.concurrent.ThreadPoolExecutor",
								fullMethod: "java.util.concurrent.ThreadPoolExecutor.runWorker",
								fileFullPath: "java/util/concurrent/ThreadPoolExecutor.java",
								line: 1149,
								error:
									"Unable to find matching file for path java/util/concurrent/ThreadPoolExecutor.java",
							},
							{
								method: "run",
								namespace: "java.util.concurrent.ThreadPoolExecutor$Worker",
								fullMethod: "java.util.concurrent.ThreadPoolExecutor$Worker.run",
								fileFullPath: "java/util/concurrent/ThreadPoolExecutor.java",
								line: 624,
								error:
									"Unable to find matching file for path java/util/concurrent/ThreadPoolExecutor.java",
							},
							{
								method: "run",
								namespace: "org.apache.tomcat.util.threads.TaskThread$WrappingRunnable",
								fullMethod: "org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run",
								fileFullPath: "org/apache/tomcat/util/threads/TaskThread.java",
								line: 61,
								error:
									"Unable to find matching file for path org/apache/tomcat/util/threads/TaskThread.java",
							},
							{
								method: "run",
								namespace: "java.lang.Thread",
								fullMethod: "java.lang.Thread.run",
								fileFullPath: "java/lang/Thread.java",
								line: 750,
								error: "Unable to find matching file for path java/lang/Thread.java",
							},
						],
						language: "java",
						repoId: repoId,
						// sha: "release-22",
						occurrenceId: "9bef4b5d-d0fb-11ee-91b3-faf14c8b1a88_38244_40016",
					},
				],
				objectInfo: {
					repoId: repoId,
					remote: "https://source.datanerd.us/codestream/clm-demo-js-node",
					accountId: "11879688",
					entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNzQ5NjQy",
					entityName: "clm-demo-js-node (staging.stg-red-car)",
					hasRelatedRepos: true,
				},
				postId: postId,
				teamId: "651ed16ac2f7dee11c938922",
				streamId: streamId,
				creatorId: "652db11a7c271413e88b4ae3",
				followerIds: ["652db11a7c271413e88b4ae3"],
				permalink:
					"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/EjOgI79MSwC2JWYROgOBBw",
				lastActivityAt: 1708549069594,
				id: codeErrorId,
			},
		],
	};
}
