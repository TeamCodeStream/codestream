import { FetchCodeErrorsResponse } from "@codestream/protocols/agent";

export const codeErrorsResponse: FetchCodeErrorsResponse = {
	codeErrors: [
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1708052576128,
			modifiedAt: 1708052576287,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
			objectType: "errorGroup",
			title: "TypeError",
			text: "Cannot read properties of undefined (reading 'get')",
			stackTraces: [
				{
					text: "TypeError: Cannot read properties of undefined (reading 'get')\n    at /app/src/data/usersRepository.js:56:23\n    at Array.reduce (<anonymous>)\n    at countUsersByState (/app/src/data/usersRepository.js:55:19)\n    at userStateReport (/app/src/data/usersRepository.js:62:10)\n    at fetchUserStateReport (/app/src/controllers/usersController.js:11:16)\n    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1322:22)\n    at AsyncLocalStorage.run (node:async_hooks:330:14)\n    at AsyncLocalContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js:65:36)\n    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1312:25)\n    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:954:20)",
					lines: [
						{
							fileFullPath:
								"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/data/usersRepository.js",
							method: "<unknown>",
							fullMethod: "<unknown>",
							arguments: [],
							line: 56,
							column: 23,
							fileRelativePath: "app/src/data/usersRepository.js",
						},
						{
							fileFullPath: "<anonymous>",
							method: "reduce",
							namespace: "Array",
							fullMethod: "Array.reduce",
							arguments: [],
							error: "Unable to find matching file for path <anonymous>",
						},
						{
							fileFullPath:
								"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/data/usersRepository.js",
							method: "countUsersByState",
							fullMethod: "countUsersByState",
							arguments: [],
							line: 55,
							column: 19,
							fileRelativePath: "app/src/data/usersRepository.js",
						},
						{
							fileFullPath:
								"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/data/usersRepository.js",
							method: "userStateReport",
							fullMethod: "userStateReport",
							arguments: [],
							line: 62,
							column: 10,
							fileRelativePath: "app/src/data/usersRepository.js",
						},
						{
							fileFullPath:
								"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/controllers/usersController.js",
							method: "fetchUserStateReport",
							fullMethod: "fetchUserStateReport",
							arguments: [],
							line: 11,
							column: 16,
							fileRelativePath: "app/src/controllers/usersController.js",
						},
						{
							fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
							method: "runInContextCb",
							fullMethod: "runInContextCb",
							arguments: [],
							line: 1322,
							column: 22,
							error:
								"Unable to find matching file for path /app/node_modules/newrelic/lib/shim/shim.js",
						},
						{
							fileFullPath: "node:async_hooks",
							method: "run",
							namespace: "AsyncLocalStorage",
							fullMethod: "AsyncLocalStorage.run",
							arguments: [],
							line: 330,
							column: 14,
							error: "Unable to find matching file for path node:async_hooks",
						},
						{
							fileFullPath:
								"/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js",
							method: "runInContext",
							namespace: "AsyncLocalContextManager",
							fullMethod: "AsyncLocalContextManager.runInContext",
							arguments: [],
							line: 65,
							column: 36,
							error:
								"Unable to find matching file for path /app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js",
						},
						{
							fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
							method: "applySegment",
							namespace: "WebFrameworkShim",
							fullMethod: "WebFrameworkShim.applySegment",
							arguments: [],
							line: 1312,
							column: 25,
							error:
								"Unable to find matching file for path /app/node_modules/newrelic/lib/shim/shim.js",
						},
						{
							fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
							method: "_applyRecorderSegment",
							fullMethod: "_applyRecorderSegment",
							arguments: [],
							line: 954,
							column: 20,
							error:
								"Unable to find matching file for path /app/node_modules/newrelic/lib/shim/shim.js",
						},
					],
					language: "javascript",
					header: "TypeError: Cannot read properties of undefined (reading 'get')",
					error: "Cannot read properties of undefined (reading 'get')",
					repoId: "653af0a540cfc303405ca056",
					sha: "release-22",
					occurrenceId: "be67a99e-cc77-11ee-894b-068eae1a6a25_0_1834",
				},
			],
			objectInfo: {
				repoId: "653af0a540cfc303405ca056",
				remote: "https://source.datanerd.us/codestream/clm-demo-js-node",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNzQ5NjQy",
				entityName: "clm-demo-js-node (staging.stg-red-car)",
			},
			postId: "65ced0602c7e177956da21b5",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65ba9c96d7cf39c22dff434f",
			creatorId: "652db11a7c271413e88b4ae3",
			followerIds: ["652db11a7c271413e88b4ae3"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/vkm5XveFS3in6CTyECwzzg",
			lastActivityAt: 1708052576287,
			id: "65ced0602c7e177956da21b6",
		},
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1707867549221,
			modifiedAt: 1707867549428,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxlNTlmNDRhYy1jYmNhLTM0ZTUtYTNjOS05YWMwMDUwNDY5NjY",
			objectType: "errorGroup",
			title: "org.springframework.web.util.NestedServletException",
			text: "Handler dispatch failed; nested exception is java.lang.OutOfMemoryError: Java heap space",
			stackTraces: [
				{
					lines: [
						{
							method: "doDispatch",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doDispatch",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 1087,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "doService",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doService",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 965,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1006,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 898,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 529,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 883,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 623,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 209,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 153,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 51,
							error:
								"Unable to find matching file for path org/apache/tomcat/websocket/server/WsFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 178,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 153,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.servlet.resource.ResourceUrlEncodingFilter",
							fullMethod:
								"org.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter",
							fileFullPath:
								"org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
							line: 67,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 178,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 153,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
							error:
								"Unable to find matching file for path org/springframework/web/filter/RequestContextFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 178,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 153,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
							error:
								"Unable to find matching file for path org/springframework/web/filter/FormContentFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 178,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 153,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter",
							fullMethod:
								"org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal",
							fileFullPath:
								"org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
							line: 96,
							error:
								"Unable to find matching file for path org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 178,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 153,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
							error:
								"Unable to find matching file for path org/springframework/web/filter/CharacterEncodingFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 178,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 153,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 168,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardWrapperValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 90,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardContextValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 481,
							error:
								"Unable to find matching file for path org/apache/catalina/authenticator/AuthenticatorBase.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 130,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardHostValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 93,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/ErrorReportValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 74,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardEngineValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 765,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/RemoteIpValve.java",
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 342,
							error:
								"Unable to find matching file for path org/apache/catalina/connector/CoyoteAdapter.java",
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 390,
							error:
								"Unable to find matching file for path org/apache/coyote/http11/Http11Processor.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 63,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProcessorLight.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 928,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProtocol.java",
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1794,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/net/NioEndpoint.java",
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.net.SocketProcessorBase",
							fullMethod: "org.apache.tomcat.util.net.SocketProcessorBase.run",
							fileFullPath: "org/apache/tomcat/util/net/SocketProcessorBase.java",
							line: 52,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/net/SocketProcessorBase.java",
						},
						{
							method: "runWorker",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
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
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
							error: "Unable to find matching file for path java/base/java/lang/Thread.java",
						},
					],
					language: "java",
					repoId: "652ef6c3661efa9c92050e24",
					sha: "release-11",
					occurrenceId: "0bc46634-cac9-11ee-91b3-faf14c8b1a88_18008_23533",
					text: "\torg.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1087)\n\torg.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:965)\n\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:898)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:529)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:623)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:209)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:153)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:51)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:153)\n\torg.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter(ResourceUrlEncodingFilter.java:67)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:153)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:153)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:153)\n\torg.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:96)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:153)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:153)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:168)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:90)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:481)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:130)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:93)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:74)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:765)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:342)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:390)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:63)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:928)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1794)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:52)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)\n \n caused by java.lang.OutOfMemoryError: Java heap space",
				},
			],
			objectInfo: {
				repoId: "652ef6c3661efa9c92050e24",
				remote: "https://source.datanerd.us/codestream/clm-demo-java-spring",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNTQ5NzMx",
				entityName: "clm-demo-java-spring (staging.stg-red-car)",
			},
			postId: "65cbfd9d651cbf932dfc7c6a",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65cbfd9d651cbf932dfc7c6c",
			creatorId: "652db11a7c271413e88b4ae3",
			followerIds: ["652db11a7c271413e88b4ae3"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/D64-jqQ7TPihaceXIVQBYQ",
			lastActivityAt: 1707867549428,
			id: "65cbfd9d651cbf932dfc7c6b",
		},
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1707859972584,
			modifiedAt: 1707859972817,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxiYTIxYjQ5Mi01OTY3LTMxNTgtOTBlNS04ODQyNjYyZGVhNjY",
			objectType: "errorGroup",
			title: "Error",
			text: "Exception 'Error' with message 'Class \"App\\Controller\\Exception\" not found' in /var/www/html/test_app/src/Controller/ProductController.php:44",
			stackTraces: [
				{
					lines: [
						{
							method: "App\\Controller\\ProductController::throwsException",
							fileFullPath: "/Users/dhersh/src/php-clm/ProductController.php",
							line: 25,
							fileRelativePath: "ProductController.php",
							warning: "Missing sha",
						},
						{
							method: "App\\Controller\\ProductController::createProduct",
							fileFullPath: "/var/www/html/test_app/vendor/symfony/http-kernel/HttpKernel.php",
							line: 181,
							error:
								"Unable to find matching file for path /var/www/html/test_app/vendor/symfony/http-kernel/HttpKernel.php",
						},
						{
							method: "Symfony\\Component\\HttpKernel\\HttpKernel::handleRaw",
							fileFullPath: "/var/www/html/test_app/vendor/symfony/http-kernel/HttpKernel.php",
							line: 76,
							error:
								"Unable to find matching file for path /var/www/html/test_app/vendor/symfony/http-kernel/HttpKernel.php",
						},
						{
							method: "Symfony\\Component\\HttpKernel\\HttpKernel::handle",
							fileFullPath: "/var/www/html/test_app/vendor/symfony/http-kernel/Kernel.php",
							line: 197,
							error:
								"Unable to find matching file for path /var/www/html/test_app/vendor/symfony/http-kernel/Kernel.php",
						},
						{
							method: "Symfony\\Component\\HttpKernel\\Kernel::handle",
							fileFullPath:
								"/var/www/html/test_app/vendor/symfony/runtime/Runner/Symfony/HttpKernelRunner.php",
							line: 35,
							error:
								"Unable to find matching file for path /var/www/html/test_app/vendor/symfony/runtime/Runner/Symfony/HttpKernelRunner.php",
						},
						{
							method: "Symfony\\Component\\Runtime\\Runner\\Symfony\\HttpKernelRunner::run",
							fileFullPath: "/var/www/html/test_app/vendor/autoload_runtime.php",
							line: 29,
							error:
								"Unable to find matching file for path /var/www/html/test_app/vendor/autoload_runtime.php",
						},
						{
							method: "require_once",
							fileFullPath: "/var/www/html/test_app/public/index.php",
							line: 5,
							error:
								"Unable to find matching file for path /var/www/html/test_app/public/index.php",
						},
					],
					language: "php",
					repoId: "65cbdf91cdfbbcc904d4ca95",
					occurrenceId: "6f7ba2a8-cab6-11ee-894b-068eae1a6a25_18065_20017",
					text: " in App\\Controller\\ProductController::throwsException called at /var/www/html/test_app/src/Controller/ProductController.php (25)\n in App\\Controller\\ProductController::createProduct called at /var/www/html/test_app/vendor/symfony/http-kernel/HttpKernel.php (181)\n in Symfony\\Component\\HttpKernel\\HttpKernel::handleRaw called at /var/www/html/test_app/vendor/symfony/http-kernel/HttpKernel.php (76)\n in Symfony\\Component\\HttpKernel\\HttpKernel::handle called at /var/www/html/test_app/vendor/symfony/http-kernel/Kernel.php (197)\n in Symfony\\Component\\HttpKernel\\Kernel::handle called at /var/www/html/test_app/vendor/symfony/runtime/Runner/Symfony/HttpKernelRunner.php (35)\n in Symfony\\Component\\Runtime\\Runner\\Symfony\\HttpKernelRunner::run called at /var/www/html/test_app/vendor/autoload_runtime.php (29)\n in require_once called at /var/www/html/test_app/public/index.php (5)",
				},
			],
			objectInfo: {
				repoId: "65cbdf91cdfbbcc904d4ca95",
				remote: "https://github.com/TeamCodeStream/php-clm.git",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNjY5OTE2",
				entityName: "clm-demo-php-symfony",
			},
			postId: "65cbe0048dc38b2471c72822",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65cbe0048dc38b2471c72824",
			creatorId: "651ed16ac2f7dee11c938920",
			followerIds: ["651ed16ac2f7dee11c938920"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/zd7LvncgQL-M9dqA5QN-Jg",
			lastActivityAt: 1707859972817,
			id: "65cbe0048dc38b2471c72823",
		},
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1707852137895,
			modifiedAt: 1707852138059,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxkOTVhOWNlOC03ZDkyLTM5OGUtYjViNi01NmU0MWI5NjUwMDU",
			objectType: "errorGroup",
			title: "requests.exceptions:HTTPError",
			text: "500 Server Error: INTERNAL SERVER ERROR for url: http://localhost:<NUMBER>/error",
			stackTraces: [
				{
					text: 'Traceback (most recent call last):\nFile "/usr/local/bin/gunicorn", line 8, in <module>\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py", line 67, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 236, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 72, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 202, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 571, in manage_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 642, in spawn_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 609, in spawn_worker\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py", line 142, in init_process\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 126, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 70, in run_for_one\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 32, in accept\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 135, in handle\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 178, in handle_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 681, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 199, in __init__\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1478, in __call__\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 577, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1455, in wsgi_app\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 867, in full_dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 852, in dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py", line 82, in _nr_wrapper_handler_\nFile "/src/routes/app.py", line 53, in external_error\nFile "/usr/local/lib/python3.8/dist-packages/requests/models.py", line 1021, in raise_for_status',
					lines: [
						{
							method: "<module>",
							fullMethod: "<module>",
							fileFullPath: "/usr/local/bin/gunicorn",
							line: 8,
							error: "Unable to find matching file for path /usr/local/bin/gunicorn",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
							line: 67,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 236,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 72,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 202,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "manage_workers",
							fullMethod: "manage_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 571,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_workers",
							fullMethod: "spawn_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 642,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_worker",
							fullMethod: "spawn_worker",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 609,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "init_process",
							fullMethod: "init_process",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
							line: 142,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 126,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "run_for_one",
							fullMethod: "run_for_one",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 70,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "accept",
							fullMethod: "accept",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 32,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle",
							fullMethod: "handle",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 135,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle_request",
							fullMethod: "handle_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 178,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 681,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__init__",
							fullMethod: "__init__",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 199,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__call__",
							fullMethod: "__call__",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1478,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 577,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "wsgi_app",
							fullMethod: "wsgi_app",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1455,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "full_dispatch_request",
							fullMethod: "full_dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 867,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "dispatch_request",
							fullMethod: "dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 852,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wrapper_handler_",
							fullMethod: "_nr_wrapper_handler_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
							line: 82,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
						},
						{
							method: "external_error",
							fullMethod: "external_error",
							fileFullPath: "/src/routes/app.py",
							line: 53,
							error: "Unable to find matching file for path /src/routes/app.py",
						},
						{
							method: "raise_for_status",
							fullMethod: "raise_for_status",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/requests/models.py",
							line: 1021,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/requests/models.py",
						},
					],
					language: "python",
					repoId: "653a99484a288f08dc01b123",
					occurrenceId: "df761d7c-caa4-11ee-b32c-5a4ea6654ed0_22866_26548",
				},
			],
			objectInfo: {
				repoId: "653a99484a288f08dc01b123",
				remote: "git@source.datanerd.us:codestream/cs-e2e.git",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQyMTg1ODM2",
				entityName: "clm-demo-python",
			},
			postId: "65cbc1698dc38b2471c727c7",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65a6aade9b911224801bd1cb",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/ZRFyD5NRT7ymR0TfpuAShA",
			lastActivityAt: 1707852138059,
			id: "65cbc1698dc38b2471c727c8",
		},
		{
			version: 4,
			deactivated: false,
			numReplies: 3,
			createdAt: 1707256074119,
			modifiedAt: 1707673808458,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHwzOWJjZGRhYy01MzU4LTNiNTAtYjdlOC00NWM0MTA1YmY2ZTY",
			objectType: "errorGroup",
			title: "org.springframework.web.util.NestedServletException",
			text: "Request processing failed; nested exception is java.lang.IndexOutOfBoundsException: Index 0 out of bounds for length 0",
			stackTraces: [
				{
					lines: [
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1014,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 898,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 655,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 883,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 764,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 227,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 53,
							error:
								"Unable to find matching file for path org/apache/tomcat/websocket/server/WsFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.servlet.resource.ResourceUrlEncodingFilter",
							fullMethod:
								"org.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter",
							fileFullPath:
								"org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
							line: 67,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
							error:
								"Unable to find matching file for path org/springframework/web/filter/RequestContextFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
							error:
								"Unable to find matching file for path org/springframework/web/filter/FormContentFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter",
							fullMethod:
								"org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal",
							fileFullPath:
								"org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
							line: 96,
							error:
								"Unable to find matching file for path org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
							error:
								"Unable to find matching file for path org/springframework/web/filter/CharacterEncodingFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 197,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardWrapperValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 97,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardContextValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 541,
							error:
								"Unable to find matching file for path org/apache/catalina/authenticator/AuthenticatorBase.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 135,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardHostValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 92,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/ErrorReportValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 78,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardEngineValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 769,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/RemoteIpValve.java",
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 360,
							error:
								"Unable to find matching file for path org/apache/catalina/connector/CoyoteAdapter.java",
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 399,
							error:
								"Unable to find matching file for path org/apache/coyote/http11/Http11Processor.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 65,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProcessorLight.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 890,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProtocol.java",
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1789,
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
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
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
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
							error: "Unable to find matching file for path java/base/java/lang/Thread.java",
						},
						{
							method: "outOfBounds",
							namespace: "java.base/jdk.internal.util.Preconditions",
							fullMethod: "java.base/jdk.internal.util.Preconditions.outOfBounds",
							fileFullPath: "java/base/jdk/internal/util/Preconditions.java",
							line: 64,
							error:
								"Unable to find matching file for path java/base/jdk/internal/util/Preconditions.java",
						},
						{
							method: "outOfBoundsCheckIndex",
							namespace: "java.base/jdk.internal.util.Preconditions",
							fullMethod: "java.base/jdk.internal.util.Preconditions.outOfBoundsCheckIndex",
							fileFullPath: "java/base/jdk/internal/util/Preconditions.java",
							line: 70,
							error:
								"Unable to find matching file for path java/base/jdk/internal/util/Preconditions.java",
						},
						{
							method: "checkIndex",
							namespace: "java.base/jdk.internal.util.Preconditions",
							fullMethod: "java.base/jdk.internal.util.Preconditions.checkIndex",
							fileFullPath: "java/base/jdk/internal/util/Preconditions.java",
							line: 266,
							error:
								"Unable to find matching file for path java/base/jdk/internal/util/Preconditions.java",
						},
						{
							method: "checkIndex",
							namespace: "java.base/java.util.Objects",
							fullMethod: "java.base/java.util.Objects.checkIndex",
							fileFullPath: "java/base/java/util/Objects.java",
							line: 361,
							error: "Unable to find matching file for path java/base/java/util/Objects.java",
						},
						{
							method: "get",
							namespace: "java.base/java.util.ArrayList",
							fullMethod: "java.base/java.util.ArrayList.get",
							fileFullPath: "java/base/java/util/ArrayList.java",
							line: 427,
							error: "Unable to find matching file for path java/base/java/util/ArrayList.java",
						},
						{
							method: "get",
							namespace: "java.base/java.util.Collections$UnmodifiableList",
							fullMethod: "java.base/java.util.Collections$UnmodifiableList.get",
							fileFullPath: "java/base/java/util/Collections.java",
							line: 1347,
							error: "Unable to find matching file for path java/base/java/util/Collections.java",
						},
						{
							method: "showResourcesVetList",
							namespace: "org.springframework.samples.petclinic.vet.VetController",
							fullMethod:
								"org.springframework.samples.petclinic.vet.VetController.showResourcesVetList",
							fileFullPath:
								"/Users/wmiraglia/clme2e/clm-demo-java-spring/src/main/java/org/springframework/samples/petclinic/vet/VetController.java",
							line: 86,
							fileRelativePath:
								"src/main/java/org/springframework/samples/petclinic/vet/VetController.java",
						},
						{
							method: "invoke",
							namespace: "jdk.internal.reflect.GeneratedMethodAccessor165",
							fullMethod: "jdk.internal.reflect.GeneratedMethodAccessor165.invoke",
							error: "Unable to find matching file for path undefined",
						},
						{
							method: "invoke",
							namespace: "java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl",
							fullMethod: "java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke",
							fileFullPath: "java/base/jdk/internal/reflect/DelegatingMethodAccessorImpl.java",
							line: 43,
							error:
								"Unable to find matching file for path java/base/jdk/internal/reflect/DelegatingMethodAccessorImpl.java",
						},
						{
							method: "invoke",
							namespace: "java.base/java.lang.reflect.Method",
							fullMethod: "java.base/java.lang.reflect.Method.invoke",
							fileFullPath: "java/base/java/lang/reflect/Method.java",
							line: 568,
							error:
								"Unable to find matching file for path java/base/java/lang/reflect/Method.java",
						},
						{
							method: "doInvoke",
							namespace: "org.springframework.web.method.support.InvocableHandlerMethod",
							fullMethod: "org.springframework.web.method.support.InvocableHandlerMethod.doInvoke",
							fileFullPath: "org/springframework/web/method/support/InvocableHandlerMethod.java",
							line: 205,
							error:
								"Unable to find matching file for path org/springframework/web/method/support/InvocableHandlerMethod.java",
						},
						{
							method: "invokeForRequest",
							namespace: "org.springframework.web.method.support.InvocableHandlerMethod",
							fullMethod:
								"org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest",
							fileFullPath: "org/springframework/web/method/support/InvocableHandlerMethod.java",
							line: 150,
							error:
								"Unable to find matching file for path org/springframework/web/method/support/InvocableHandlerMethod.java",
						},
						{
							method: "invokeAndHandle",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/ServletInvocableHandlerMethod.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/mvc/method/annotation/ServletInvocableHandlerMethod.java",
						},
						{
							method: "invokeHandlerMethod",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
							line: 895,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
						},
						{
							method: "handleInternal",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
							line: 808,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
						},
						{
							method: "handle",
							namespace: "org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/AbstractHandlerMethodAdapter.java",
							line: 87,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/mvc/method/AbstractHandlerMethodAdapter.java",
						},
						{
							method: "doDispatch",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doDispatch",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 1070,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "doService",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doService",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 963,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1006,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 898,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 655,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 883,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 764,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 227,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 53,
							error:
								"Unable to find matching file for path org/apache/tomcat/websocket/server/WsFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.servlet.resource.ResourceUrlEncodingFilter",
							fullMethod:
								"org.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter",
							fileFullPath:
								"org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
							line: 67,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
							error:
								"Unable to find matching file for path org/springframework/web/filter/RequestContextFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
							error:
								"Unable to find matching file for path org/springframework/web/filter/FormContentFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter",
							fullMethod:
								"org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal",
							fileFullPath:
								"org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
							line: 96,
							error:
								"Unable to find matching file for path org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
							error:
								"Unable to find matching file for path org/springframework/web/filter/CharacterEncodingFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 197,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardWrapperValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 97,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardContextValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 541,
							error:
								"Unable to find matching file for path org/apache/catalina/authenticator/AuthenticatorBase.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 135,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardHostValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 92,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/ErrorReportValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 78,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardEngineValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 769,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/RemoteIpValve.java",
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 360,
							error:
								"Unable to find matching file for path org/apache/catalina/connector/CoyoteAdapter.java",
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 399,
							error:
								"Unable to find matching file for path org/apache/coyote/http11/Http11Processor.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 65,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProcessorLight.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 890,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProtocol.java",
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1789,
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
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
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
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
							error: "Unable to find matching file for path java/base/java/lang/Thread.java",
						},
					],
					language: "java",
					repoId: "652ef6c3661efa9c92050e24",
					sha: "release-6",
					occurrenceId: "3815d68b-c539-11ee-91b3-faf14c8b1a88_14381_25806",
					text: "\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1014)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:898)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:655)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:764)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter(ResourceUrlEncodingFilter.java:67)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:96)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:541)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:135)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:769)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:360)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:399)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:890)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1789)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)\n \n caused by java.lang.IndexOutOfBoundsException: Index 0 out of bounds for length 0\n\tjava.base/jdk.internal.util.Preconditions.outOfBounds(Preconditions.java:64)\n\tjava.base/jdk.internal.util.Preconditions.outOfBoundsCheckIndex(Preconditions.java:70)\n\tjava.base/jdk.internal.util.Preconditions.checkIndex(Preconditions.java:266)\n\tjava.base/java.util.Objects.checkIndex(Objects.java:361)\n\tjava.base/java.util.ArrayList.get(ArrayList.java:427)\n\tjava.base/java.util.Collections$UnmodifiableList.get(Collections.java:1347)\n\torg.springframework.samples.petclinic.vet.VetController.showResourcesVetList(VetController.java:86)\n\tjdk.internal.reflect.GeneratedMethodAccessor165.invoke(Unknown Source)\n\tjava.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n\tjava.base/java.lang.reflect.Method.invoke(Method.java:568)\n\torg.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)\n\torg.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)\n\torg.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:117)\n\torg.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:895)\n\torg.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:808)\n\torg.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)\n\torg.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1070)\n\torg.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:963)\n\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:898)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:655)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:764)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter(ResourceUrlEncodingFilter.java:67)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:96)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:541)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:135)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:769)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:360)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:399)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:890)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1789)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)",
				},
			],
			objectInfo: {
				repoId: "652ef6c3661efa9c92050e24",
				remote: "https://source.datanerd.us/codestream/clm-demo-java-spring",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNTQ5NzMx",
				entityName: "clm-demo-java-spring (staging.stg-red-car)",
			},
			postId: "65c2a90ad1029184a42623d1",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "654a4e5b17a8f28b7fef235d",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793", "652db11a7c271413e88b4ae3"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/sngSmcQcQe639Ly9nu3ljw",
			lastActivityAt: 1707673808458,
			id: "65c2a90ad1029184a42623d2",
		},
		{
			version: 4,
			deactivated: false,
			numReplies: 3,
			createdAt: 1699647727380,
			modifiedAt: 1707323454469,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxiM2E5ZGFjYy1hYzhjLTNmYmQtYWIyYy02MTA5MDI4ZWI1NDg",
			objectType: "errorGroup",
			title: "builtins:ValueError",
			text: "1 != 0",
			stackTraces: [
				{
					text: 'Traceback (most recent call last):\nFile "/usr/local/bin/gunicorn", line 8, in <module>\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py", line 67, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 236, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 72, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 202, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 571, in manage_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 642, in spawn_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 609, in spawn_worker\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py", line 142, in init_process\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 126, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 70, in run_for_one\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 32, in accept\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 135, in handle\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 178, in handle_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 681, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 199, in __init__\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1478, in __call__\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 577, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1455, in wsgi_app\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 867, in full_dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 852, in dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py", line 82, in _nr_wrapper_handler_\nFile "/src/routes/app.py", line 34, in error',
					lines: [
						{
							method: "<module>",
							fullMethod: "<module>",
							fileFullPath: "/usr/local/bin/gunicorn",
							line: 8,
							error: "Unable to find matching file for path /usr/local/bin/gunicorn",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
							line: 67,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 236,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 72,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 202,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "manage_workers",
							fullMethod: "manage_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 571,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_workers",
							fullMethod: "spawn_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 642,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_worker",
							fullMethod: "spawn_worker",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 609,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "init_process",
							fullMethod: "init_process",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
							line: 142,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 126,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "run_for_one",
							fullMethod: "run_for_one",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 70,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "accept",
							fullMethod: "accept",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 32,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle",
							fullMethod: "handle",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 135,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle_request",
							fullMethod: "handle_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 178,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 681,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__init__",
							fullMethod: "__init__",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 199,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__call__",
							fullMethod: "__call__",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1478,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 577,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "wsgi_app",
							fullMethod: "wsgi_app",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1455,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "full_dispatch_request",
							fullMethod: "full_dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 867,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "dispatch_request",
							fullMethod: "dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 852,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wrapper_handler_",
							fullMethod: "_nr_wrapper_handler_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
							line: 82,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
						},
						{
							method: "error",
							fullMethod: "error",
							fileFullPath: "/Users/dhersh/src/clm-demo-python/src/routes/app.py",
							line: 34,
							fileRelativePath: "src/routes/app.py",
						},
					],
					language: "python",
					repoId: "65406f3c997c90258e2c349e",
					sha: "release-14",
					occurrenceId: "9b9aa175-8006-11ee-8d21-7e7be849061b_17229_20864",
				},
			],
			objectInfo: {
				repoId: "65406f3c997c90258e2c349e",
				remote: "https://source.datanerd.us/codestream/clm-demo-python",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQyMTg1ODM2",
				entityName: "clm-demo-python",
			},
			postId: "654e90efdaa0e165ffaad7e4",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "654e90efdaa0e165ffaad7e6",
			creatorId: "651ed16ac2f7dee11c938920",
			followerIds: ["651ed16ac2f7dee11c938920"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/44OAktDBR_erC28tU0TMxA",
			lastActivityAt: 1707323454469,
			id: "654e90efdaa0e165ffaad7e5",
		},
		{
			version: 8,
			deactivated: false,
			numReplies: 7,
			createdAt: 1707159282500,
			modifiedAt: 1707321204781,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHw0NGQzYzI5My01ZTE1LTNkMzUtODgxNy0wODA4MzAxM2MwZDc",
			objectType: "errorGroup",
			title: "builtins:TypeError",
			text: "'NoneType' object is not subscriptable",
			stackTraces: [
				{
					text: 'Traceback (most recent call last):\nFile "/usr/local/bin/gunicorn", line 8, in <module>\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py", line 67, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 236, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 72, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 202, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 571, in manage_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 642, in spawn_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 609, in spawn_worker\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py", line 142, in init_process\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 126, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 70, in run_for_one\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 32, in accept\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 135, in handle\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 178, in handle_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 681, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 199, in __init__\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1478, in __call__\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 577, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1455, in wsgi_app\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 867, in full_dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 852, in dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py", line 82, in _nr_wrapper_handler_\nFile "/src/routes/app.py", line 62, in db_call',
					lines: [
						{
							method: "<module>",
							fullMethod: "<module>",
							fileFullPath: "/usr/local/bin/gunicorn",
							line: 8,
							error: "Unable to find matching file for path /usr/local/bin/gunicorn",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
							line: 67,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 236,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 72,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 202,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "manage_workers",
							fullMethod: "manage_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 571,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_workers",
							fullMethod: "spawn_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 642,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_worker",
							fullMethod: "spawn_worker",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 609,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "init_process",
							fullMethod: "init_process",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
							line: 142,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 126,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "run_for_one",
							fullMethod: "run_for_one",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 70,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "accept",
							fullMethod: "accept",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 32,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle",
							fullMethod: "handle",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 135,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle_request",
							fullMethod: "handle_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 178,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 681,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__init__",
							fullMethod: "__init__",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 199,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__call__",
							fullMethod: "__call__",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1478,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 577,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "wsgi_app",
							fullMethod: "wsgi_app",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1455,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "full_dispatch_request",
							fullMethod: "full_dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 867,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "dispatch_request",
							fullMethod: "dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 852,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wrapper_handler_",
							fullMethod: "_nr_wrapper_handler_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
							line: 82,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
						},
						{
							method: "db_call",
							fullMethod: "db_call",
							fileFullPath: "/Users/wmiraglia/pdorg/python/clm-demo-python/src/routes/app.py",
							line: 62,
							fileRelativePath: "src/routes/app.py",
						},
					],
					language: "python",
					repoId: "65406f3c997c90258e2c349e",
					sha: "release-14",
					occurrenceId: "fd7c204b-c456-11ee-98e4-7eaacf3afdaf_16948_20410",
				},
			],
			objectInfo: {
				repoId: "65406f3c997c90258e2c349e",
				remote: "https://source.datanerd.us/codestream/clm-demo-python",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQyMTg1ODM2",
				entityName: "clm-demo-python",
			},
			postId: "65c12ef28704f9ec0de8386b",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65b7daa7a912a12c076db092",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793", "651ed16ac2f7dee11c938920"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/pHlLouE3TZOXKBfuUawDaw",
			lastActivityAt: 1707321204781,
			id: "65c12ef28704f9ec0de8386c",
		},
		{
			version: 4,
			deactivated: false,
			numReplies: 3,
			createdAt: 1707161896085,
			modifiedAt: 1707162094571,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxmNTc1ZDcyYy03M2FmLTM4MTEtOGNlNy1hMzNiOWRjMTBhODI",
			objectType: "errorGroup",
			title: "org.springframework.web.util.NestedServletException",
			text: "Request processing failed; nested exception is java.lang.RuntimeException: Explody",
			stackTraces: [
				{
					lines: [
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1014,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 898,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 655,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 883,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 764,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 227,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 53,
							error:
								"Unable to find matching file for path org/apache/tomcat/websocket/server/WsFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.servlet.resource.ResourceUrlEncodingFilter",
							fullMethod:
								"org.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter",
							fileFullPath:
								"org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
							line: 67,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
							error:
								"Unable to find matching file for path org/springframework/web/filter/RequestContextFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
							error:
								"Unable to find matching file for path org/springframework/web/filter/FormContentFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter",
							fullMethod:
								"org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal",
							fileFullPath:
								"org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
							line: 96,
							error:
								"Unable to find matching file for path org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
							error:
								"Unable to find matching file for path org/springframework/web/filter/CharacterEncodingFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 197,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardWrapperValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 97,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardContextValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 541,
							error:
								"Unable to find matching file for path org/apache/catalina/authenticator/AuthenticatorBase.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 135,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardHostValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 92,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/ErrorReportValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 78,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardEngineValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 769,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/RemoteIpValve.java",
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 360,
							error:
								"Unable to find matching file for path org/apache/catalina/connector/CoyoteAdapter.java",
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 399,
							error:
								"Unable to find matching file for path org/apache/coyote/http11/Http11Processor.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 65,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProcessorLight.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 890,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProtocol.java",
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1789,
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
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
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
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
							error: "Unable to find matching file for path java/base/java/lang/Thread.java",
						},
						{
							method: "iAmError",
							namespace: "org.springframework.samples.petclinic.clm.ErrorService",
							fullMethod: "org.springframework.samples.petclinic.clm.ErrorService.iAmError",
							fileFullPath:
								"/Users/wmiraglia/clme2e/clm-demo-java-spring/src/main/java/org/springframework/samples/petclinic/clm/ErrorService.java",
							line: 11,
							fileRelativePath:
								"src/main/java/org/springframework/samples/petclinic/clm/ErrorService.java",
						},
						{
							method: "error",
							namespace: "org.springframework.samples.petclinic.clm.ClmController",
							fullMethod: "org.springframework.samples.petclinic.clm.ClmController.error",
							fileFullPath:
								"/Users/wmiraglia/clme2e/clm-demo-java-spring/src/main/java/org/springframework/samples/petclinic/clm/ClmController.java",
							line: 55,
							fileRelativePath:
								"src/main/java/org/springframework/samples/petclinic/clm/ClmController.java",
						},
						{
							method: "invoke",
							namespace: "org.springframework.cglib.proxy.MethodProxy",
							fullMethod: "org.springframework.cglib.proxy.MethodProxy.invoke",
							fileFullPath: "org/springframework/cglib/proxy/MethodProxy.java",
							line: 218,
							error:
								"Unable to find matching file for path org/springframework/cglib/proxy/MethodProxy.java",
						},
						{
							method: "invokeJoinpoint",
							namespace: "org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation",
							fullMethod:
								"org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.invokeJoinpoint",
							fileFullPath: "org/springframework/aop/framework/CglibAopProxy.java",
							line: 793,
							error:
								"Unable to find matching file for path org/springframework/aop/framework/CglibAopProxy.java",
						},
						{
							method: "proceed",
							namespace: "org.springframework.aop.framework.ReflectiveMethodInvocation",
							fullMethod: "org.springframework.aop.framework.ReflectiveMethodInvocation.proceed",
							fileFullPath: "org/springframework/aop/framework/ReflectiveMethodInvocation.java",
							line: 163,
							error:
								"Unable to find matching file for path org/springframework/aop/framework/ReflectiveMethodInvocation.java",
						},
						{
							method: "proceed",
							namespace: "org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation",
							fullMethod:
								"org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed",
							fileFullPath: "org/springframework/aop/framework/CglibAopProxy.java",
							line: 763,
							error:
								"Unable to find matching file for path org/springframework/aop/framework/CglibAopProxy.java",
						},
						{
							method: "invoke",
							namespace: "org.springframework.aop.interceptor.ExposeInvocationInterceptor",
							fullMethod: "org.springframework.aop.interceptor.ExposeInvocationInterceptor.invoke",
							fileFullPath: "org/springframework/aop/interceptor/ExposeInvocationInterceptor.java",
							line: 97,
							error:
								"Unable to find matching file for path org/springframework/aop/interceptor/ExposeInvocationInterceptor.java",
						},
						{
							method: "proceed",
							namespace: "org.springframework.aop.framework.ReflectiveMethodInvocation",
							fullMethod: "org.springframework.aop.framework.ReflectiveMethodInvocation.proceed",
							fileFullPath: "org/springframework/aop/framework/ReflectiveMethodInvocation.java",
							line: 186,
							error:
								"Unable to find matching file for path org/springframework/aop/framework/ReflectiveMethodInvocation.java",
						},
						{
							method: "proceed",
							namespace: "org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation",
							fullMethod:
								"org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed",
							fileFullPath: "org/springframework/aop/framework/CglibAopProxy.java",
							line: 763,
							error:
								"Unable to find matching file for path org/springframework/aop/framework/CglibAopProxy.java",
						},
						{
							method: "intercept",
							namespace:
								"org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor",
							fullMethod:
								"org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept",
							fileFullPath: "org/springframework/aop/framework/CglibAopProxy.java",
							line: 708,
							error:
								"Unable to find matching file for path org/springframework/aop/framework/CglibAopProxy.java",
						},
						{
							method: "invoke",
							namespace: "jdk.internal.reflect.GeneratedMethodAccessor166",
							fullMethod: "jdk.internal.reflect.GeneratedMethodAccessor166.invoke",
						},
						{
							method: "invoke",
							namespace: "java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl",
							fullMethod: "java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke",
							fileFullPath: "java/base/jdk/internal/reflect/DelegatingMethodAccessorImpl.java",
							line: 43,
						},
						{
							method: "invoke",
							namespace: "java.base/java.lang.reflect.Method",
							fullMethod: "java.base/java.lang.reflect.Method.invoke",
							fileFullPath: "java/base/java/lang/reflect/Method.java",
							line: 568,
						},
						{
							method: "doInvoke",
							namespace: "org.springframework.web.method.support.InvocableHandlerMethod",
							fullMethod: "org.springframework.web.method.support.InvocableHandlerMethod.doInvoke",
							fileFullPath: "org/springframework/web/method/support/InvocableHandlerMethod.java",
							line: 205,
						},
						{
							method: "invokeForRequest",
							namespace: "org.springframework.web.method.support.InvocableHandlerMethod",
							fullMethod:
								"org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest",
							fileFullPath: "org/springframework/web/method/support/InvocableHandlerMethod.java",
							line: 150,
						},
						{
							method: "invokeAndHandle",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/ServletInvocableHandlerMethod.java",
							line: 117,
						},
						{
							method: "invokeHandlerMethod",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
							line: 895,
						},
						{
							method: "handleInternal",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
							line: 808,
						},
						{
							method: "handle",
							namespace: "org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/AbstractHandlerMethodAdapter.java",
							line: 87,
						},
						{
							method: "doDispatch",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doDispatch",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 1070,
						},
						{
							method: "doService",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doService",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 963,
						},
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1006,
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 898,
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 655,
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 883,
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 764,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 227,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 53,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.servlet.resource.ResourceUrlEncodingFilter",
							fullMethod:
								"org.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter",
							fileFullPath:
								"org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
							line: 67,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter",
							fullMethod:
								"org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal",
							fileFullPath:
								"org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
							line: 96,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 197,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 97,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 541,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 135,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 92,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 78,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 769,
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 360,
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 399,
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 65,
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 890,
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1789,
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.net.SocketProcessorBase",
							fullMethod: "org.apache.tomcat.util.net.SocketProcessorBase.run",
							fileFullPath: "org/apache/tomcat/util/net/SocketProcessorBase.java",
							line: 49,
						},
						{
							method: "runWorker",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.TaskThread$WrappingRunnable",
							fullMethod: "org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run",
							fileFullPath: "org/apache/tomcat/util/threads/TaskThread.java",
							line: 61,
						},
						{
							method: "run",
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
						},
					],
					language: "java",
					repoId: "652ef6c3661efa9c92050e24",
					sha: "release-6",
					occurrenceId: "06989787-c45d-11ee-91ec-b2ce62e8fbf5_3637_15705",
					text: "\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1014)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:898)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:655)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:764)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter(ResourceUrlEncodingFilter.java:67)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:96)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:541)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:135)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:769)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:360)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:399)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:890)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1789)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)\n \n caused by java.lang.RuntimeException: Explody\n\torg.springframework.samples.petclinic.clm.ErrorService.iAmError(ErrorService.java:11)\n\torg.springframework.samples.petclinic.clm.ClmController.error(ClmController.java:55)\n\torg.springframework.samples.petclinic.clm.ClmController$$FastClassBySpringCGLIB$$80d309c3.invoke(<generated>)\n\torg.springframework.cglib.proxy.MethodProxy.invoke(MethodProxy.java:218)\n\torg.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.invokeJoinpoint(CglibAopProxy.java:793)\n\torg.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:163)\n\torg.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:763)\n\torg.springframework.aop.interceptor.ExposeInvocationInterceptor.invoke(ExposeInvocationInterceptor.java:97)\n\torg.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:186)\n\torg.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:763)\n\torg.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:708)\n\torg.springframework.samples.petclinic.clm.ClmController$$EnhancerBySpringCGLIB$$4de3e404.error(<generated>)\n\tjdk.internal.reflect.GeneratedMethodAccessor166.invoke(Unknown Source)\n\tjava.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n\tjava.base/java.lang.reflect.Method.invoke(Method.java:568)\n\torg.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)\n\torg.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)\n\torg.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:117)\n\torg.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:895)\n\torg.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:808)\n\torg.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)\n\torg.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1070)\n\torg.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:963)\n\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:898)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:655)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:764)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter(ResourceUrlEncodingFilter.java:67)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:96)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:541)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:135)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:769)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:360)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:399)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:890)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1789)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)",
				},
			],
			objectInfo: {
				repoId: "652ef6c3661efa9c92050e24",
				remote: "https://source.datanerd.us/codestream/clm-demo-java-spring",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNTQ5NzMx",
				entityName: "clm-demo-java-spring (staging.stg-red-car)",
			},
			postId: "65c139287cc35f0eda6bc836",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65c139287cc35f0eda6bc838",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/QeKqv87DQwmfm-oJsod_zg",
			lastActivityAt: 1707162094571,
			id: "65c139287cc35f0eda6bc837",
		},
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1707161817048,
			modifiedAt: 1707161817248,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxjMTg4YzdiZC0zMjY4LTNjMDktYjAwMi0yYzczNDk4OGY3YTA",
			objectType: "errorGroup",
			title: "org.springframework.web.util.NestedServletException",
			text: "Request processing failed; nested exception is org.thymeleaf.exceptions.TemplateInputException: Error resolving template [never], template might not exist or might not be accessible by any of the configured Template Resolvers",
			stackTraces: [
				{
					lines: [
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1014,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 898,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 655,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 883,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 764,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 227,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 53,
							error:
								"Unable to find matching file for path org/apache/tomcat/websocket/server/WsFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.servlet.resource.ResourceUrlEncodingFilter",
							fullMethod:
								"org.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter",
							fileFullPath:
								"org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
							line: 67,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
							error:
								"Unable to find matching file for path org/springframework/web/filter/RequestContextFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
							error:
								"Unable to find matching file for path org/springframework/web/filter/FormContentFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter",
							fullMethod:
								"org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal",
							fileFullPath:
								"org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
							line: 96,
							error:
								"Unable to find matching file for path org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
							error:
								"Unable to find matching file for path org/springframework/web/filter/CharacterEncodingFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 197,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardWrapperValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 97,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardContextValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 541,
							error:
								"Unable to find matching file for path org/apache/catalina/authenticator/AuthenticatorBase.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 135,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardHostValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 92,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/ErrorReportValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 78,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardEngineValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 769,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/RemoteIpValve.java",
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 360,
							error:
								"Unable to find matching file for path org/apache/catalina/connector/CoyoteAdapter.java",
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 399,
							error:
								"Unable to find matching file for path org/apache/coyote/http11/Http11Processor.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 65,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProcessorLight.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 890,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProtocol.java",
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1789,
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
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
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
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
							error: "Unable to find matching file for path java/base/java/lang/Thread.java",
						},
						{
							method: "resolveTemplate",
							namespace: "org.thymeleaf.engine.TemplateManager",
							fullMethod: "org.thymeleaf.engine.TemplateManager.resolveTemplate",
							fileFullPath: "org/thymeleaf/engine/TemplateManager.java",
							line: 869,
							error:
								"Unable to find matching file for path org/thymeleaf/engine/TemplateManager.java",
						},
						{
							method: "parseAndProcess",
							namespace: "org.thymeleaf.engine.TemplateManager",
							fullMethod: "org.thymeleaf.engine.TemplateManager.parseAndProcess",
							fileFullPath: "org/thymeleaf/engine/TemplateManager.java",
							line: 607,
							error:
								"Unable to find matching file for path org/thymeleaf/engine/TemplateManager.java",
						},
						{
							method: "process",
							namespace: "org.thymeleaf.TemplateEngine",
							fullMethod: "org.thymeleaf.TemplateEngine.process",
							fileFullPath: "org/thymeleaf/TemplateEngine.java",
							line: 1098,
							error: "Unable to find matching file for path org/thymeleaf/TemplateEngine.java",
						},
						{
							method: "process",
							namespace: "org.thymeleaf.TemplateEngine",
							fullMethod: "org.thymeleaf.TemplateEngine.process",
							fileFullPath: "org/thymeleaf/TemplateEngine.java",
							line: 1072,
							error: "Unable to find matching file for path org/thymeleaf/TemplateEngine.java",
						},
						{
							method: "renderFragment",
							namespace: "org.thymeleaf.spring5.view.ThymeleafView",
							fullMethod: "org.thymeleaf.spring5.view.ThymeleafView.renderFragment",
							fileFullPath: "org/thymeleaf/spring5/view/ThymeleafView.java",
							line: 366,
							error:
								"Unable to find matching file for path org/thymeleaf/spring5/view/ThymeleafView.java",
						},
						{
							method: "render",
							namespace: "org.thymeleaf.spring5.view.ThymeleafView",
							fullMethod: "org.thymeleaf.spring5.view.ThymeleafView.render",
							fileFullPath: "org/thymeleaf/spring5/view/ThymeleafView.java",
							line: 190,
							error:
								"Unable to find matching file for path org/thymeleaf/spring5/view/ThymeleafView.java",
						},
						{
							method: "render",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.render",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 1404,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "processDispatchResult",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.processDispatchResult",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 1148,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "doDispatch",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doDispatch",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 1087,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "doService",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doService",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 963,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/DispatcherServlet.java",
						},
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1006,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 898,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 655,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 883,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/FrameworkServlet.java",
						},
						{
							method: "service",
							namespace: "javax.servlet.http.HttpServlet",
							fullMethod: "javax.servlet.http.HttpServlet.service",
							fileFullPath: "javax/servlet/http/HttpServlet.java",
							line: 764,
							error: "Unable to find matching file for path javax/servlet/http/HttpServlet.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 227,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 53,
							error:
								"Unable to find matching file for path org/apache/tomcat/websocket/server/WsFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.servlet.resource.ResourceUrlEncodingFilter",
							fullMethod:
								"org.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter",
							fileFullPath:
								"org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
							line: 67,
							error:
								"Unable to find matching file for path org/springframework/web/servlet/resource/ResourceUrlEncodingFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
							error:
								"Unable to find matching file for path org/springframework/web/filter/RequestContextFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
							error:
								"Unable to find matching file for path org/springframework/web/filter/FormContentFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter",
							fullMethod:
								"org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal",
							fileFullPath:
								"org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
							line: 96,
							error:
								"Unable to find matching file for path org/springframework/boot/actuate/metrics/web/servlet/WebMvcMetricsFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
							error:
								"Unable to find matching file for path org/springframework/web/filter/CharacterEncodingFilter.java",
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 117,
							error:
								"Unable to find matching file for path org/springframework/web/filter/OncePerRequestFilter.java",
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 189,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 162,
							error:
								"Unable to find matching file for path org/apache/catalina/core/ApplicationFilterChain.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 197,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardWrapperValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 97,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardContextValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 541,
							error:
								"Unable to find matching file for path org/apache/catalina/authenticator/AuthenticatorBase.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 135,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardHostValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 92,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/ErrorReportValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 78,
							error:
								"Unable to find matching file for path org/apache/catalina/core/StandardEngineValve.java",
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 769,
							error:
								"Unable to find matching file for path org/apache/catalina/valves/RemoteIpValve.java",
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 360,
							error:
								"Unable to find matching file for path org/apache/catalina/connector/CoyoteAdapter.java",
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 399,
							error:
								"Unable to find matching file for path org/apache/coyote/http11/Http11Processor.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 65,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProcessorLight.java",
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 890,
							error:
								"Unable to find matching file for path org/apache/coyote/AbstractProtocol.java",
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1789,
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
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
							error:
								"Unable to find matching file for path org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
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
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
							error: "Unable to find matching file for path java/base/java/lang/Thread.java",
						},
					],
					language: "java",
					repoId: "652ef6c3661efa9c92050e24",
					sha: "release-6",
					occurrenceId: "c032c930-c45d-11ee-91ec-b2ce62e8fbf5_11392_22118",
					text: "\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1014)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:898)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:655)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:764)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter(ResourceUrlEncodingFilter.java:67)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:96)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:541)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:135)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:769)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:360)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:399)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:890)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1789)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)\n \n caused by org.thymeleaf.exceptions.TemplateInputException: Error resolving template [never], template might not exist or might not be accessible by any of the configured Template Resolvers\n\torg.thymeleaf.engine.TemplateManager.resolveTemplate(TemplateManager.java:869)\n\torg.thymeleaf.engine.TemplateManager.parseAndProcess(TemplateManager.java:607)\n\torg.thymeleaf.TemplateEngine.process(TemplateEngine.java:1098)\n\torg.thymeleaf.TemplateEngine.process(TemplateEngine.java:1072)\n\torg.thymeleaf.spring5.view.ThymeleafView.renderFragment(ThymeleafView.java:366)\n\torg.thymeleaf.spring5.view.ThymeleafView.render(ThymeleafView.java:190)\n\torg.springframework.web.servlet.DispatcherServlet.render(DispatcherServlet.java:1404)\n\torg.springframework.web.servlet.DispatcherServlet.processDispatchResult(DispatcherServlet.java:1148)\n\torg.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1087)\n\torg.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:963)\n\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:898)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:655)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tjavax.servlet.http.HttpServlet.service(HttpServlet.java:764)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.servlet.resource.ResourceUrlEncodingFilter.doFilter(ResourceUrlEncodingFilter.java:67)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:96)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:541)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:135)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:769)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:360)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:399)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:890)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1789)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)",
				},
			],
			objectInfo: {
				repoId: "652ef6c3661efa9c92050e24",
				remote: "https://source.datanerd.us/codestream/clm-demo-java-spring",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNTQ5NzMx",
				entityName: "clm-demo-java-spring (staging.stg-red-car)",
			},
			postId: "65c138d97cc35f0eda6bc830",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65c138d97cc35f0eda6bc832",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/eBTa-hWCT46YfJ74lPgRXw",
			lastActivityAt: 1707161817248,
			id: "65c138d97cc35f0eda6bc831",
		},
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1706547231279,
			modifiedAt: 1706547231682,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxlOTUxYTc4Yi05MzI1LTM3ODktOGM5MS1kNDlkOTk4MWRiY2E",
			objectType: "errorGroup",
			title: "Newtonsoft.Json.JsonReaderException",
			text: "Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.",
			stackTraces: [
				{
					text: "\tNewtonsoft.Json.JsonReaderException: Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.\n\t   at Newtonsoft.Json.JsonReader.ReadDateTimeString(String s)\n\t   at Newtonsoft.Json.JsonTextReader.FinishReadQuotedStringValue(ReadType readType)\n\t   at Newtonsoft.Json.JsonTextReader.ReadStringValue(ReadType readType)\n\t   at Newtonsoft.Json.JsonTextReader.ReadAsDateTime()\n\t   at Newtonsoft.Json.JsonReader.ReadForType(JsonContract contract, Boolean hasConverter)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.PopulateObject(Object newObject, JsonReader reader, JsonObjectContract contract, JsonProperty member, String id)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateObject(JsonReader reader, Type objectType, JsonContract contract, JsonProperty member, JsonContainerContract containerContract, JsonProperty containerMember, Object existingValue)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateValueInternal(JsonReader reader, Type objectType, JsonContract contract, JsonProperty member, JsonContainerContract containerContract, JsonProperty containerMember, Object existingValue)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.Deserialize(JsonReader reader, Type objectType, Boolean checkAdditionalContent)\n\t   at Newtonsoft.Json.JsonSerializer.DeserializeInternal(JsonReader reader, Type objectType)\n\t   at Newtonsoft.Json.JsonConvert.DeserializeObject(String value, Type type, JsonSerializerSettings settings)\n\t   at NewRelic.CodeStream.CLMDemo.Web.Helpers.JsonStuffTwo() in /NewRelic.CodeStream.CLMDemo.Web/Helpers.cs:line 59\n\t   at NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController.RealisticError() in /NewRelic.CodeStream.CLMDemo.Web/Controllers/AgentsController.cs:line 65\n\t   at lambda_method495(Closure , Object , Object[] )\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor.Execute(IActionResultTypeMapper mapper, ObjectMethodExecutor executor, Object controller, Object[] arguments)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeActionMethodAsync()\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeNextActionFilterAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Rethrow(ActionExecutedContextSealed context)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeInnerFilterAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResourceFilter>g__Awaited|25_0(ResourceInvoker invoker, Task lastTask, State next, Scope scope, Object state, Boolean isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow(ResourceExecutedContextSealed context)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeFilterPipelineAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0(ResourceInvoker invoker, Task task, IDisposable scope)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0(ResourceInvoker invoker, Task task, IDisposable scope)\n\t   at Microsoft.AspNetCore.Routing.EndpointMiddleware.<Invoke>g__AwaitRequestTask|6_0(Endpoint endpoint, Task requestTask, ILogger logger)\n\t   at Microsoft.AspNetCore.Authorization.AuthorizationMiddleware.Invoke(HttpContext context)\n\t   at Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware.<Invoke>g__Awaited|6_0(ExceptionHandlerMiddleware middleware, HttpContext context, Task task)",
					lines: [
						{
							namespace: "Newtonsoft.Json.JsonReader",
							method: "ReadDateTimeString",
							fullMethod: "Newtonsoft.Json.JsonReader.ReadDateTimeString",
							arguments: ["String s"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonTextReader",
							method: "FinishReadQuotedStringValue",
							fullMethod: "Newtonsoft.Json.JsonTextReader.FinishReadQuotedStringValue",
							arguments: ["ReadType readType"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonTextReader",
							method: "ReadStringValue",
							fullMethod: "Newtonsoft.Json.JsonTextReader.ReadStringValue",
							arguments: ["ReadType readType"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonTextReader",
							method: "ReadAsDateTime",
							fullMethod: "Newtonsoft.Json.JsonTextReader.ReadAsDateTime",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonReader",
							method: "ReadForType",
							fullMethod: "Newtonsoft.Json.JsonReader.ReadForType",
							arguments: ["JsonContract contract", "Boolean hasConverter"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "PopulateObject",
							fullMethod:
								"Newtonsoft.Json.Serialization.JsonSerializerInternalReader.PopulateObject",
							arguments: [
								"Object newObject",
								"JsonReader reader",
								"JsonObjectContract contract",
								"JsonProperty member",
								"String id",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "CreateObject",
							fullMethod: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateObject",
							arguments: [
								"JsonReader reader",
								"Type objectType",
								"JsonContract contract",
								"JsonProperty member",
								"JsonContainerContract containerContract",
								"JsonProperty containerMember",
								"Object existingValue",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "CreateValueInternal",
							fullMethod:
								"Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateValueInternal",
							arguments: [
								"JsonReader reader",
								"Type objectType",
								"JsonContract contract",
								"JsonProperty member",
								"JsonContainerContract containerContract",
								"JsonProperty containerMember",
								"Object existingValue",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "Deserialize",
							fullMethod: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader.Deserialize",
							arguments: ["JsonReader reader", "Type objectType", "Boolean checkAdditionalContent"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonSerializer",
							method: "DeserializeInternal",
							fullMethod: "Newtonsoft.Json.JsonSerializer.DeserializeInternal",
							arguments: ["JsonReader reader", "Type objectType"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonConvert",
							method: "DeserializeObject",
							fullMethod: "Newtonsoft.Json.JsonConvert.DeserializeObject",
							arguments: ["String value", "Type type", "JsonSerializerSettings settings"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "NewRelic.CodeStream.CLMDemo.Web.Helpers",
							method: "JsonStuffTwo",
							fullMethod: "NewRelic.CodeStream.CLMDemo.Web.Helpers.JsonStuffTwo",
							fileFullPath: "/NewRelic.CodeStream.CLMDemo.Web/Helpers.cs",
							line: 59,
							error:
								"Unable to find matching file for path /NewRelic.CodeStream.CLMDemo.Web/Helpers.cs",
						},
						{
							namespace: "NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController",
							method: "RealisticError",
							fullMethod:
								"NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController.RealisticError",
							fileFullPath: "/NewRelic.CodeStream.CLMDemo.Web/Controllers/AgentsController.cs",
							line: 65,
							error:
								"Unable to find matching file for path /NewRelic.CodeStream.CLMDemo.Web/Controllers/AgentsController.cs",
						},
						{
							method: "lambda_method495",
							fullMethod: "lambda_method495",
							arguments: ["Closure", "Object", "Object[]"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor",
							method: "Execute",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor.Execute",
							arguments: [
								"IActionResultTypeMapper mapper",
								"ObjectMethodExecutor executor",
								"Object controller",
								"Object[] arguments",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeActionMethodAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeActionMethodAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeNextActionFilterAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeNextActionFilterAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Rethrow",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Rethrow",
							arguments: ["ActionExecutedContextSealed context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeInnerFilterAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeInnerFilterAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeNextResourceFilter>g__Awaited|25_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResourceFilter>g__Awaited|25_0",
							arguments: [
								"ResourceInvoker invoker",
								"Task lastTask",
								"State next",
								"Scope scope",
								"Object state",
								"Boolean isCompleted",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "Rethrow",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow",
							arguments: ["ResourceExecutedContextSealed context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "InvokeFilterPipelineAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeFilterPipelineAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeAsync>g__Awaited|17_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0",
							arguments: ["ResourceInvoker invoker", "Task task", "IDisposable scope"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeAsync>g__Awaited|17_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0",
							arguments: ["ResourceInvoker invoker", "Task task", "IDisposable scope"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Routing.EndpointMiddleware",
							method: "<Invoke>g__AwaitRequestTask|6_0",
							fullMethod:
								"Microsoft.AspNetCore.Routing.EndpointMiddleware.<Invoke>g__AwaitRequestTask|6_0",
							arguments: ["Endpoint endpoint", "Task requestTask", "ILogger logger"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Authorization.AuthorizationMiddleware",
							method: "Invoke",
							fullMethod: "Microsoft.AspNetCore.Authorization.AuthorizationMiddleware.Invoke",
							arguments: ["HttpContext context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware",
							method: "<Invoke>g__Awaited|6_0",
							fullMethod:
								"Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware.<Invoke>g__Awaited|6_0",
							arguments: [
								"ExceptionHandlerMiddleware middleware",
								"HttpContext context",
								"Task task",
							],
							error: "Unable to find matching file for path undefined",
						},
					],
					language: "csharp",
					header:
						"\tNewtonsoft.Json.JsonReaderException: Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.",
					error:
						"Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.",
					repoId: "6554221656b82e78fb93bf0d",
					occurrenceId: "ccb23105-bec6-11ee-81be-7298e2275e37_1832_7123",
				},
			],
			objectInfo: {
				repoId: "6554221656b82e78fb93bf0d",
				remote: "https://github.com/TeamCodeStream/codestream-server.git",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNTUwOTU0",
				entityName: "clm-demo-csharp (staging.stg-red-car)",
			},
			postId: "65b7d81f95e8dd8a9a837544",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65b7d23195e8dd8a9a83753c",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/XgeGFsG5SleEREZHycrtJg",
			lastActivityAt: 1706547231682,
			id: "65b7d81f95e8dd8a9a837545",
		},
		{
			version: 4,
			deactivated: false,
			numReplies: 3,
			createdAt: 1699295629815,
			modifiedAt: 1706546602313,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHw3NTQ2MWNlNS0wM2RjLTNmMmItOTQ2Ny1lZDNjMzI2NTZmMWM",
			objectType: "errorGroup",
			title: "System.Exception",
			text: "Agitated",
			stackTraces: [
				{
					text: "\tSystem.Exception: Agitated\n\t   at NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController.DoError() in /NewRelic.CodeStream.CLMDemo.Web/Controllers/AgentsController.cs:line 35\n\t   at lambda_method508(Closure , Object , Object[] )\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor.Execute(IActionResultTypeMapper mapper, ObjectMethodExecutor executor, Object controller, Object[] arguments)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeActionMethodAsync()\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeNextActionFilterAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Rethrow(ActionExecutedContextSealed context)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeInnerFilterAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResourceFilter>g__Awaited|25_0(ResourceInvoker invoker, Task lastTask, State next, Scope scope, Object state, Boolean isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow(ResourceExecutedContextSealed context)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeFilterPipelineAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0(ResourceInvoker invoker, Task task, IDisposable scope)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0(ResourceInvoker invoker, Task task, IDisposable scope)\n\t   at Microsoft.AspNetCore.Routing.EndpointMiddleware.<Invoke>g__AwaitRequestTask|6_0(Endpoint endpoint, Task requestTask, ILogger logger)\n\t   at Microsoft.AspNetCore.Authorization.AuthorizationMiddleware.Invoke(HttpContext context)\n\t   at Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware.<Invoke>g__Awaited|6_0(ExceptionHandlerMiddleware middleware, HttpContext context, Task task)",
					lines: [
						{
							namespace: "NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController",
							method: "DoError",
							fullMethod: "NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController.DoError",
							fileFullPath: "c:/code/csharp-clm/AspNetCoreMvc/Controllers/AgentsController.cs",
							line: 35,
							fileRelativePath: "AspNetCoreMvc\\Controllers\\AgentsController.cs",
							warning: "Missing sha",
						},
						{
							method: "lambda_method508",
							fullMethod: "lambda_method508",
							arguments: ["Closure", "Object", "Object[]"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor",
							method: "Execute",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor.Execute",
							arguments: [
								"IActionResultTypeMapper mapper",
								"ObjectMethodExecutor executor",
								"Object controller",
								"Object[] arguments",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeActionMethodAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeActionMethodAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeNextActionFilterAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeNextActionFilterAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Rethrow",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Rethrow",
							arguments: ["ActionExecutedContextSealed context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeInnerFilterAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeInnerFilterAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeNextResourceFilter>g__Awaited|25_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResourceFilter>g__Awaited|25_0",
							arguments: [
								"ResourceInvoker invoker",
								"Task lastTask",
								"State next",
								"Scope scope",
								"Object state",
								"Boolean isCompleted",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "Rethrow",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow",
							arguments: ["ResourceExecutedContextSealed context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "InvokeFilterPipelineAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeFilterPipelineAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeAsync>g__Awaited|17_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0",
							arguments: ["ResourceInvoker invoker", "Task task", "IDisposable scope"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeAsync>g__Awaited|17_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0",
							arguments: ["ResourceInvoker invoker", "Task task", "IDisposable scope"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Routing.EndpointMiddleware",
							method: "<Invoke>g__AwaitRequestTask|6_0",
							fullMethod:
								"Microsoft.AspNetCore.Routing.EndpointMiddleware.<Invoke>g__AwaitRequestTask|6_0",
							arguments: ["Endpoint endpoint", "Task requestTask", "ILogger logger"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Authorization.AuthorizationMiddleware",
							method: "Invoke",
							fullMethod: "Microsoft.AspNetCore.Authorization.AuthorizationMiddleware.Invoke",
							arguments: ["HttpContext context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware",
							method: "<Invoke>g__Awaited|6_0",
							fullMethod:
								"Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware.<Invoke>g__Awaited|6_0",
							arguments: [
								"ExceptionHandlerMiddleware middleware",
								"HttpContext context",
								"Task task",
							],
							error: "Unable to find matching file for path undefined",
						},
					],
					language: "csharp",
					header: "\tSystem.Exception: Agitated",
					error: "Agitated",
					repoId: "652e9b37c8f8b462ccfa85e5",
					occurrenceId: "f109b281-7cd2-11ee-9f2a-2a0151792b3d_5275_8694",
				},
			],
			objectInfo: {
				repoId: "652e9b37c8f8b462ccfa85e5",
				remote: "https://github.com/TeamCodeStream/csharp-clm",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNTUwOTU0",
				entityName: "clm-demo-csharp (staging.stg-red-car)",
			},
			postId: "6549318d089ea8fb600fdb3a",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "6549318d089ea8fb600fdb3c",
			creatorId: "6543b46415c05faf29b9d073",
			followerIds: ["6543b46415c05faf29b9d073", "6543eb35264286732a9a5793"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/7sM9TGjaToq9bYfDwRLeYg",
			lastActivityAt: 1706546602313,
			id: "6549318d089ea8fb600fdb3b",
		},
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1705429234521,
			modifiedAt: 1705429234706,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhYjBjNDFmMC04NDVlLTMzZWQtYWIxMy03NmI5ODg2NWE5ZDA",
			objectType: "errorGroup",
			title: "java.io.IOException",
			text: "Unable to connect to downstream service",
			stackTraces: [
				{
					lines: [
						{
							method: "getRandomFact",
							namespace: "com.example.animalfacts.api.AnimalFactUseCase",
							fullMethod: "com.example.animalfacts.api.AnimalFactUseCase.getRandomFact",
							fileFullPath: "com/example/animalfacts/api/AnimalFactUseCase.java",
							line: 32,
						},
						{
							method: "getRandomFact",
							namespace: "com.example.animalfacts.api.DogFactService",
							fullMethod: "com.example.animalfacts.api.DogFactService.getRandomFact",
							fileFullPath: "com/example/animalfacts/api/DogFactService.java",
							line: 20,
						},
						{
							method: "getRandomDogFact",
							namespace: "com.example.animalfacts.web.AnimalFactController",
							fullMethod: "com.example.animalfacts.web.AnimalFactController.getRandomDogFact",
							fileFullPath: "com/example/animalfacts/web/AnimalFactController.java",
							line: 42,
						},
						{
							method: "invoke",
							namespace: "jdk.internal.reflect.GeneratedMethodAccessor12",
							fullMethod: "jdk.internal.reflect.GeneratedMethodAccessor12.invoke",
						},
						{
							method: "invoke",
							namespace: "java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl",
							fullMethod: "java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke",
							fileFullPath: "java/base/jdk/internal/reflect/DelegatingMethodAccessorImpl.java",
							line: 43,
						},
						{
							method: "invoke",
							namespace: "java.base/java.lang.reflect.Method",
							fullMethod: "java.base/java.lang.reflect.Method.invoke",
							fileFullPath: "java/base/java/lang/reflect/Method.java",
							line: 568,
						},
						{
							method: "doInvoke",
							namespace: "org.springframework.web.method.support.InvocableHandlerMethod",
							fullMethod: "org.springframework.web.method.support.InvocableHandlerMethod.doInvoke",
							fileFullPath: "org/springframework/web/method/support/InvocableHandlerMethod.java",
							line: 205,
						},
						{
							method: "invokeForRequest",
							namespace: "org.springframework.web.method.support.InvocableHandlerMethod",
							fullMethod:
								"org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest",
							fileFullPath: "org/springframework/web/method/support/InvocableHandlerMethod.java",
							line: 150,
						},
						{
							method: "invokeAndHandle",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/ServletInvocableHandlerMethod.java",
							line: 118,
						},
						{
							method: "invokeHandlerMethod",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
							line: 884,
						},
						{
							method: "handleInternal",
							namespace:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java",
							line: 797,
						},
						{
							method: "handle",
							namespace: "org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter",
							fullMethod:
								"org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle",
							fileFullPath:
								"org/springframework/web/servlet/mvc/method/AbstractHandlerMethodAdapter.java",
							line: 87,
						},
						{
							method: "doDispatch",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doDispatch",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 1081,
						},
						{
							method: "doService",
							namespace: "org.springframework.web.servlet.DispatcherServlet",
							fullMethod: "org.springframework.web.servlet.DispatcherServlet.doService",
							fileFullPath: "org/springframework/web/servlet/DispatcherServlet.java",
							line: 974,
						},
						{
							method: "processRequest",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.processRequest",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 1011,
						},
						{
							method: "doGet",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.doGet",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 903,
						},
						{
							method: "service",
							namespace: "jakarta.servlet.http.HttpServlet",
							fullMethod: "jakarta.servlet.http.HttpServlet.service",
							fileFullPath: "jakarta/servlet/http/HttpServlet.java",
							line: 564,
						},
						{
							method: "service",
							namespace: "org.springframework.web.servlet.FrameworkServlet",
							fullMethod: "org.springframework.web.servlet.FrameworkServlet.service",
							fileFullPath: "org/springframework/web/servlet/FrameworkServlet.java",
							line: 885,
						},
						{
							method: "service",
							namespace: "jakarta.servlet.http.HttpServlet",
							fullMethod: "jakarta.servlet.http.HttpServlet.service",
							fileFullPath: "jakarta/servlet/http/HttpServlet.java",
							line: 658,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 205,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 149,
						},
						{
							method: "doFilter",
							namespace: "org.apache.tomcat.websocket.server.WsFilter",
							fullMethod: "org.apache.tomcat.websocket.server.WsFilter.doFilter",
							fileFullPath: "org/apache/tomcat/websocket/server/WsFilter.java",
							line: 51,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 174,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 149,
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.RequestContextFilter",
							fullMethod: "org.springframework.web.filter.RequestContextFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/RequestContextFilter.java",
							line: 100,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 116,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 174,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 149,
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.FormContentFilter",
							fullMethod: "org.springframework.web.filter.FormContentFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/FormContentFilter.java",
							line: 93,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 116,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 174,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 149,
						},
						{
							method: "doFilterInternal",
							namespace: "org.springframework.web.filter.CharacterEncodingFilter",
							fullMethod: "org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal",
							fileFullPath: "org/springframework/web/filter/CharacterEncodingFilter.java",
							line: 201,
						},
						{
							method: "doFilter",
							namespace: "org.springframework.web.filter.OncePerRequestFilter",
							fullMethod: "org.springframework.web.filter.OncePerRequestFilter.doFilter",
							fileFullPath: "org/springframework/web/filter/OncePerRequestFilter.java",
							line: 116,
						},
						{
							method: "internalDoFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.internalDoFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 174,
						},
						{
							method: "doFilter",
							namespace: "org.apache.catalina.core.ApplicationFilterChain",
							fullMethod: "org.apache.catalina.core.ApplicationFilterChain.doFilter",
							fileFullPath: "org/apache/catalina/core/ApplicationFilterChain.java",
							line: 149,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardWrapperValve",
							fullMethod: "org.apache.catalina.core.StandardWrapperValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardWrapperValve.java",
							line: 167,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardContextValve",
							fullMethod: "org.apache.catalina.core.StandardContextValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardContextValve.java",
							line: 90,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.authenticator.AuthenticatorBase",
							fullMethod: "org.apache.catalina.authenticator.AuthenticatorBase.invoke",
							fileFullPath: "org/apache/catalina/authenticator/AuthenticatorBase.java",
							line: 482,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardHostValve",
							fullMethod: "org.apache.catalina.core.StandardHostValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardHostValve.java",
							line: 115,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.ErrorReportValve",
							fullMethod: "org.apache.catalina.valves.ErrorReportValve.invoke",
							fileFullPath: "org/apache/catalina/valves/ErrorReportValve.java",
							line: 93,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.core.StandardEngineValve",
							fullMethod: "org.apache.catalina.core.StandardEngineValve.invoke",
							fileFullPath: "org/apache/catalina/core/StandardEngineValve.java",
							line: 74,
						},
						{
							method: "invoke",
							namespace: "org.apache.catalina.valves.RemoteIpValve",
							fullMethod: "org.apache.catalina.valves.RemoteIpValve.invoke",
							fileFullPath: "org/apache/catalina/valves/RemoteIpValve.java",
							line: 735,
						},
						{
							method: "service",
							namespace: "org.apache.catalina.connector.CoyoteAdapter",
							fullMethod: "org.apache.catalina.connector.CoyoteAdapter.service",
							fileFullPath: "org/apache/catalina/connector/CoyoteAdapter.java",
							line: 340,
						},
						{
							method: "service",
							namespace: "org.apache.coyote.http11.Http11Processor",
							fullMethod: "org.apache.coyote.http11.Http11Processor.service",
							fileFullPath: "org/apache/coyote/http11/Http11Processor.java",
							line: 391,
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProcessorLight",
							fullMethod: "org.apache.coyote.AbstractProcessorLight.process",
							fileFullPath: "org/apache/coyote/AbstractProcessorLight.java",
							line: 63,
						},
						{
							method: "process",
							namespace: "org.apache.coyote.AbstractProtocol$ConnectionHandler",
							fullMethod: "org.apache.coyote.AbstractProtocol$ConnectionHandler.process",
							fileFullPath: "org/apache/coyote/AbstractProtocol.java",
							line: 896,
						},
						{
							method: "doRun",
							namespace: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor",
							fullMethod: "org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun",
							fileFullPath: "org/apache/tomcat/util/net/NioEndpoint.java",
							line: 1744,
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.net.SocketProcessorBase",
							fullMethod: "org.apache.tomcat.util.net.SocketProcessorBase.run",
							fileFullPath: "org/apache/tomcat/util/net/SocketProcessorBase.java",
							line: 52,
						},
						{
							method: "runWorker",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 1191,
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker",
							fullMethod: "org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run",
							fileFullPath: "org/apache/tomcat/util/threads/ThreadPoolExecutor.java",
							line: 659,
						},
						{
							method: "run",
							namespace: "org.apache.tomcat.util.threads.TaskThread$WrappingRunnable",
							fullMethod: "org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run",
							fileFullPath: "org/apache/tomcat/util/threads/TaskThread.java",
							line: 61,
						},
						{
							method: "run",
							namespace: "java.base/java.lang.Thread",
							fullMethod: "java.base/java.lang.Thread.run",
							fileFullPath: "java/base/java/lang/Thread.java",
							line: 840,
						},
					],
					language: "java",
					repoId: "65496df617a8f28b7fef230e",
					occurrenceId: "b64ebbec-b49b-11ee-9957-aaccf498dab9_55470_61574",
					text: "\tcom.example.animalfacts.api.AnimalFactUseCase.getRandomFact(AnimalFactUseCase.java:32)\n\tcom.example.animalfacts.api.DogFactService.getRandomFact(DogFactService.java:20)\n\tcom.example.animalfacts.web.AnimalFactController.getRandomDogFact(AnimalFactController.java:42)\n\tjdk.internal.reflect.GeneratedMethodAccessor12.invoke(Unknown Source)\n\tjava.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n\tjava.base/java.lang.reflect.Method.invoke(Method.java:568)\n\torg.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)\n\torg.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)\n\torg.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:118)\n\torg.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:884)\n\torg.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:797)\n\torg.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)\n\torg.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1081)\n\torg.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:974)\n\torg.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1011)\n\torg.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:903)\n\tjakarta.servlet.http.HttpServlet.service(HttpServlet.java:564)\n\torg.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:885)\n\tjakarta.servlet.http.HttpServlet.service(HttpServlet.java:658)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:205)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149)\n\torg.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:51)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149)\n\torg.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149)\n\torg.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149)\n\torg.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\torg.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116)\n\torg.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174)\n\torg.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149)\n\torg.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:167)\n\torg.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:90)\n\torg.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:482)\n\torg.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:115)\n\torg.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:93)\n\torg.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:74)\n\torg.apache.catalina.valves.RemoteIpValve.invoke(RemoteIpValve.java:735)\n\torg.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:340)\n\torg.apache.coyote.http11.Http11Processor.service(Http11Processor.java:391)\n\torg.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:63)\n\torg.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:896)\n\torg.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1744)\n\torg.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:52)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\torg.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\torg.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tjava.base/java.lang.Thread.run(Thread.java:840)",
				},
			],
			objectInfo: {
				repoId: "65496df617a8f28b7fef230e",
				remote: "git@github.com:TeamCodeStream/codestream.git",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxODcyODQ5",
				entityName: "clm-demo-java-animal-facts (staging.stg-red-car)",
			},
			postId: "65a6c8f29b911224801bd204",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "655e1979f9338495e85549be",
			creatorId: "652db11a7c271413e88b4ae3",
			followerIds: ["652db11a7c271413e88b4ae3"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/OKCQ93ZjQOynynBXUEufXg",
			lastActivityAt: 1705429234706,
			id: "65a6c8f29b911224801bd205",
		},
		{
			version: 2,
			deactivated: false,
			numReplies: 1,
			createdAt: 1700011186865,
			modifiedAt: 1700011187023,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHwzMWIzNGE1My01ZjFhLTM4NzgtYmM0MC02NWYyYzljYzcxMTU",
			objectType: "errorGroup",
			title: "*errors.errorString",
			text: "my error message",
			stackTraces: [
				{
					text: "main.noticeError (/app/server/main.go:34)\nhttp.HandlerFunc.ServeHTTP (/usr/local/go/src/net/http/server.go:2084)\nnewrelic.WrapHandle.func1 (/go/pkg/mod/github.com/newrelic/go-agent/v3@v3.27.0/newrelic/instrumentation.go:98)\nhttp.HandlerFunc.ServeHTTP (/usr/local/go/src/net/http/server.go:2084)\nnewrelic.WrapHandleFunc.func1 (/go/pkg/mod/github.com/newrelic/go-agent/v3@v3.27.0/newrelic/instrumentation.go:184)\nhttp.HandlerFunc.ServeHTTP (/usr/local/go/src/net/http/server.go:2084)\nhttp.(*ServeMux).ServeHTTP (/usr/local/go/src/net/http/server.go:2462)\nhttp.serverHandler.ServeHTTP (/usr/local/go/src/net/http/server.go:2916)\nhttp.(*conn).serve (/usr/local/go/src/net/http/server.go:1966)\nruntime.goexit (/usr/local/go/src/runtime/asm_amd64.s:1571)",
					lines: [
						{
							namespace: "main",
							method: "noticeError",
							fullMethod: "main.noticeError",
							fileFullPath: "/Users/dsellars/workspace/clm2/clm-demo-go/server/main.go",
							line: 34,
							fileRelativePath: "server/main.go",
							warning: "Missing sha",
						},
						{
							namespace: "http.HandlerFunc",
							method: "ServeHTTP",
							fullMethod: "http.HandlerFunc.ServeHTTP",
							fileFullPath: "/usr/local/go/src/net/http/server.go",
							line: 2084,
							error: "Unable to find matching file for path /usr/local/go/src/net/http/server.go",
						},
						{
							namespace: "newrelic.WrapHandle",
							method: "func1",
							fullMethod: "newrelic.WrapHandle.func1",
							fileFullPath:
								"/go/pkg/mod/github.com/newrelic/go-agent/v3@v3.27.0/newrelic/instrumentation.go",
							line: 98,
							error:
								"Unable to find matching file for path /go/pkg/mod/github.com/newrelic/go-agent/v3@v3.27.0/newrelic/instrumentation.go",
						},
						{
							namespace: "http.HandlerFunc",
							method: "ServeHTTP",
							fullMethod: "http.HandlerFunc.ServeHTTP",
							fileFullPath: "/usr/local/go/src/net/http/server.go",
							line: 2084,
							error: "Unable to find matching file for path /usr/local/go/src/net/http/server.go",
						},
						{
							namespace: "newrelic.WrapHandleFunc",
							method: "func1",
							fullMethod: "newrelic.WrapHandleFunc.func1",
							fileFullPath:
								"/go/pkg/mod/github.com/newrelic/go-agent/v3@v3.27.0/newrelic/instrumentation.go",
							line: 184,
							error:
								"Unable to find matching file for path /go/pkg/mod/github.com/newrelic/go-agent/v3@v3.27.0/newrelic/instrumentation.go",
						},
						{
							namespace: "http.HandlerFunc",
							method: "ServeHTTP",
							fullMethod: "http.HandlerFunc.ServeHTTP",
							fileFullPath: "/usr/local/go/src/net/http/server.go",
							line: 2084,
							error: "Unable to find matching file for path /usr/local/go/src/net/http/server.go",
						},
						{
							namespace: "http.(*ServeMux)",
							method: "ServeHTTP",
							fullMethod: "http.(*ServeMux).ServeHTTP",
							fileFullPath: "/usr/local/go/src/net/http/server.go",
							line: 2462,
							error: "Unable to find matching file for path /usr/local/go/src/net/http/server.go",
						},
						{
							namespace: "http.serverHandler",
							method: "ServeHTTP",
							fullMethod: "http.serverHandler.ServeHTTP",
							fileFullPath: "/usr/local/go/src/net/http/server.go",
							line: 2916,
							error: "Unable to find matching file for path /usr/local/go/src/net/http/server.go",
						},
						{
							namespace: "http.(*conn)",
							method: "serve",
							fullMethod: "http.(*conn).serve",
							fileFullPath: "/usr/local/go/src/net/http/server.go",
							line: 1966,
							error: "Unable to find matching file for path /usr/local/go/src/net/http/server.go",
						},
						{
							namespace: "runtime",
							method: "goexit",
							fullMethod: "runtime.goexit",
							fileFullPath: "/usr/local/go/src/runtime/asm_amd64.s",
							line: 1571,
							error: "Unable to find matching file for path /usr/local/go/src/runtime/asm_amd64.s",
						},
					],
					language: "go",
					repoId: "654bd92f089ea8fb600fde44",
					occurrenceId: "cf5d417e-8354-11ee-b08d-a2e0ac9ed656_10648_12724",
				},
			],
			objectInfo: {
				repoId: "654bd92f089ea8fb600fde44",
				remote: "https://source.datanerd.us/codestream/clm-demo-go",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNzQzNjkw",
				entityName: "clm-demo-go (staging.stg-red-car)",
			},
			postId: "65541cb256b82e78fb93bf09",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65541cb256b82e78fb93bf0b",
			creatorId: "652db11a7c271413e88b4ae3",
			followerIds: ["652db11a7c271413e88b4ae3"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/iq7pWdiFRc-hc16TLzEwSw",
			lastActivityAt: 1700011187023,
			id: "65541cb256b82e78fb93bf0a",
		},
		{
			version: 3,
			deactivated: true,
			numReplies: 0,
			createdAt: 1707242459087,
			modifiedAt: 1707242646447,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxkOTVhOWNlOC03ZDkyLTM5OGUtYjViNi01NmU0MWI5NjUwMDU",
			objectType: "errorGroup",
			title: "requests.exceptions:HTTPError",
			text: "500 Server Error: INTERNAL SERVER ERROR for url: http://localhost:<NUMBER>/error",
			stackTraces: [
				{
					text: 'Traceback (most recent call last):\nFile "/usr/local/bin/gunicorn", line 8, in <module>\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py", line 67, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 236, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 72, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 202, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 571, in manage_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 642, in spawn_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 609, in spawn_worker\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py", line 142, in init_process\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 126, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 70, in run_for_one\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 32, in accept\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 135, in handle\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 178, in handle_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 681, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 199, in __init__\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1478, in __call__\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 577, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1455, in wsgi_app\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 867, in full_dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 852, in dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py", line 82, in _nr_wrapper_handler_\nFile "/src/routes/app.py", line 53, in external_error\nFile "/usr/local/lib/python3.8/dist-packages/requests/models.py", line 1021, in raise_for_status',
					lines: [
						{
							method: "<module>",
							fullMethod: "<module>",
							fileFullPath: "/usr/local/bin/gunicorn",
							line: 8,
							error: "Unable to find matching file for path /usr/local/bin/gunicorn",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
							line: 67,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 236,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 72,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 202,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "manage_workers",
							fullMethod: "manage_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 571,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_workers",
							fullMethod: "spawn_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 642,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_worker",
							fullMethod: "spawn_worker",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 609,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "init_process",
							fullMethod: "init_process",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
							line: 142,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 126,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "run_for_one",
							fullMethod: "run_for_one",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 70,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "accept",
							fullMethod: "accept",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 32,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle",
							fullMethod: "handle",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 135,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle_request",
							fullMethod: "handle_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 178,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 681,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__init__",
							fullMethod: "__init__",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 199,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__call__",
							fullMethod: "__call__",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1478,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 577,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "wsgi_app",
							fullMethod: "wsgi_app",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1455,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "full_dispatch_request",
							fullMethod: "full_dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 867,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "dispatch_request",
							fullMethod: "dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 852,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wrapper_handler_",
							fullMethod: "_nr_wrapper_handler_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
							line: 82,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
						},
						{
							method: "external_error",
							fullMethod: "external_error",
							fileFullPath: "/Users/dsellars/workspace/clm2/clm-demo-python/src/routes/app.py",
							line: 53,
							fileRelativePath: "src/routes/app.py",
						},
						{
							method: "raise_for_status",
							fullMethod: "raise_for_status",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/requests/models.py",
							line: 1021,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/requests/models.py",
						},
					],
					language: "python",
					repoId: "65406f3c997c90258e2c349e",
					sha: "release-14",
					occurrenceId: "2d35c496-c519-11ee-894b-068eae1a6a25_19656_23337",
				},
			],
			objectInfo: {
				repoId: "65406f3c997c90258e2c349e",
				remote: "https://source.datanerd.us/codestream/clm-demo-python",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQyMTg1ODM2",
				entityName: "clm-demo-python",
			},
			postId: "65c273dbd1029184a426232b",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65a6aade9b911224801bd1cb",
			creatorId: "652db11a7c271413e88b4ae3",
			followerIds: ["652db11a7c271413e88b4ae3"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/o4Og-mnEQUOcUwhG_Dqfbg",
			lastActivityAt: 1707242459253,
			id: "65c273dbd1029184a426232c",
		},
		{
			version: 4,
			deactivated: true,
			numReplies: 1,
			createdAt: 1706545713346,
			modifiedAt: 1706547057558,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxlOTUxYTc4Yi05MzI1LTM3ODktOGM5MS1kNDlkOTk4MWRiY2E",
			objectType: "errorGroup",
			title: "Newtonsoft.Json.JsonReaderException",
			text: "Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.",
			stackTraces: [
				{
					text: "\tNewtonsoft.Json.JsonReaderException: Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.\n\t   at Newtonsoft.Json.JsonReader.ReadDateTimeString(String s)\n\t   at Newtonsoft.Json.JsonTextReader.FinishReadQuotedStringValue(ReadType readType)\n\t   at Newtonsoft.Json.JsonTextReader.ReadStringValue(ReadType readType)\n\t   at Newtonsoft.Json.JsonTextReader.ReadAsDateTime()\n\t   at Newtonsoft.Json.JsonReader.ReadForType(JsonContract contract, Boolean hasConverter)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.PopulateObject(Object newObject, JsonReader reader, JsonObjectContract contract, JsonProperty member, String id)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateObject(JsonReader reader, Type objectType, JsonContract contract, JsonProperty member, JsonContainerContract containerContract, JsonProperty containerMember, Object existingValue)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateValueInternal(JsonReader reader, Type objectType, JsonContract contract, JsonProperty member, JsonContainerContract containerContract, JsonProperty containerMember, Object existingValue)\n\t   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.Deserialize(JsonReader reader, Type objectType, Boolean checkAdditionalContent)\n\t   at Newtonsoft.Json.JsonSerializer.DeserializeInternal(JsonReader reader, Type objectType)\n\t   at Newtonsoft.Json.JsonConvert.DeserializeObject(String value, Type type, JsonSerializerSettings settings)\n\t   at NewRelic.CodeStream.CLMDemo.Web.Helpers.JsonStuffTwo() in /NewRelic.CodeStream.CLMDemo.Web/Helpers.cs:line 59\n\t   at NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController.RealisticError() in /NewRelic.CodeStream.CLMDemo.Web/Controllers/AgentsController.cs:line 65\n\t   at lambda_method495(Closure , Object , Object[] )\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor.Execute(IActionResultTypeMapper mapper, ObjectMethodExecutor executor, Object controller, Object[] arguments)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeActionMethodAsync()\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeNextActionFilterAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Rethrow(ActionExecutedContextSealed context)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeInnerFilterAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResourceFilter>g__Awaited|25_0(ResourceInvoker invoker, Task lastTask, State next, Scope scope, Object state, Boolean isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow(ResourceExecutedContextSealed context)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeFilterPipelineAsync()\n\t--- End of stack trace from previous location ---\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0(ResourceInvoker invoker, Task task, IDisposable scope)\n\t   at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0(ResourceInvoker invoker, Task task, IDisposable scope)\n\t   at Microsoft.AspNetCore.Routing.EndpointMiddleware.<Invoke>g__AwaitRequestTask|6_0(Endpoint endpoint, Task requestTask, ILogger logger)\n\t   at Microsoft.AspNetCore.Authorization.AuthorizationMiddleware.Invoke(HttpContext context)\n\t   at Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware.<Invoke>g__Awaited|6_0(ExceptionHandlerMiddleware middleware, HttpContext context, Task task)",
					lines: [
						{
							namespace: "Newtonsoft.Json.JsonReader",
							method: "ReadDateTimeString",
							fullMethod: "Newtonsoft.Json.JsonReader.ReadDateTimeString",
							arguments: ["String s"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonTextReader",
							method: "FinishReadQuotedStringValue",
							fullMethod: "Newtonsoft.Json.JsonTextReader.FinishReadQuotedStringValue",
							arguments: ["ReadType readType"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonTextReader",
							method: "ReadStringValue",
							fullMethod: "Newtonsoft.Json.JsonTextReader.ReadStringValue",
							arguments: ["ReadType readType"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonTextReader",
							method: "ReadAsDateTime",
							fullMethod: "Newtonsoft.Json.JsonTextReader.ReadAsDateTime",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonReader",
							method: "ReadForType",
							fullMethod: "Newtonsoft.Json.JsonReader.ReadForType",
							arguments: ["JsonContract contract", "Boolean hasConverter"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "PopulateObject",
							fullMethod:
								"Newtonsoft.Json.Serialization.JsonSerializerInternalReader.PopulateObject",
							arguments: [
								"Object newObject",
								"JsonReader reader",
								"JsonObjectContract contract",
								"JsonProperty member",
								"String id",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "CreateObject",
							fullMethod: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateObject",
							arguments: [
								"JsonReader reader",
								"Type objectType",
								"JsonContract contract",
								"JsonProperty member",
								"JsonContainerContract containerContract",
								"JsonProperty containerMember",
								"Object existingValue",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "CreateValueInternal",
							fullMethod:
								"Newtonsoft.Json.Serialization.JsonSerializerInternalReader.CreateValueInternal",
							arguments: [
								"JsonReader reader",
								"Type objectType",
								"JsonContract contract",
								"JsonProperty member",
								"JsonContainerContract containerContract",
								"JsonProperty containerMember",
								"Object existingValue",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader",
							method: "Deserialize",
							fullMethod: "Newtonsoft.Json.Serialization.JsonSerializerInternalReader.Deserialize",
							arguments: ["JsonReader reader", "Type objectType", "Boolean checkAdditionalContent"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonSerializer",
							method: "DeserializeInternal",
							fullMethod: "Newtonsoft.Json.JsonSerializer.DeserializeInternal",
							arguments: ["JsonReader reader", "Type objectType"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Newtonsoft.Json.JsonConvert",
							method: "DeserializeObject",
							fullMethod: "Newtonsoft.Json.JsonConvert.DeserializeObject",
							arguments: ["String value", "Type type", "JsonSerializerSettings settings"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "NewRelic.CodeStream.CLMDemo.Web.Helpers",
							method: "JsonStuffTwo",
							fullMethod: "NewRelic.CodeStream.CLMDemo.Web.Helpers.JsonStuffTwo",
							fileFullPath: "/NewRelic.CodeStream.CLMDemo.Web/Helpers.cs",
							line: 59,
							error:
								"Unable to find matching file for path /NewRelic.CodeStream.CLMDemo.Web/Helpers.cs",
						},
						{
							namespace: "NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController",
							method: "RealisticError",
							fullMethod:
								"NewRelic.CodeStream.CLMDemo.Web.Controllers.AgentsController.RealisticError",
							fileFullPath: "/NewRelic.CodeStream.CLMDemo.Web/Controllers/AgentsController.cs",
							line: 65,
							error:
								"Unable to find matching file for path /NewRelic.CodeStream.CLMDemo.Web/Controllers/AgentsController.cs",
						},
						{
							method: "lambda_method495",
							fullMethod: "lambda_method495",
							arguments: ["Closure", "Object", "Object[]"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor",
							method: "Execute",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor.Execute",
							arguments: [
								"IActionResultTypeMapper mapper",
								"ObjectMethodExecutor executor",
								"Object controller",
								"Object[] arguments",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeActionMethodAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeActionMethodAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeNextActionFilterAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeNextActionFilterAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Rethrow",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Rethrow",
							arguments: ["ActionExecutedContextSealed context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker",
							method: "InvokeInnerFilterAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker.InvokeInnerFilterAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeNextResourceFilter>g__Awaited|25_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResourceFilter>g__Awaited|25_0",
							arguments: [
								"ResourceInvoker invoker",
								"Task lastTask",
								"State next",
								"Scope scope",
								"Object state",
								"Boolean isCompleted",
							],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "Rethrow",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow",
							arguments: ["ResourceExecutedContextSealed context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "Next",
							fullMethod: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Next",
							arguments: ["State& next", "Scope& scope", "Object& state", "Boolean& isCompleted"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "InvokeFilterPipelineAsync",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeFilterPipelineAsync",
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeAsync>g__Awaited|17_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0",
							arguments: ["ResourceInvoker invoker", "Task task", "IDisposable scope"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker",
							method: "<InvokeAsync>g__Awaited|17_0",
							fullMethod:
								"Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0",
							arguments: ["ResourceInvoker invoker", "Task task", "IDisposable scope"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Routing.EndpointMiddleware",
							method: "<Invoke>g__AwaitRequestTask|6_0",
							fullMethod:
								"Microsoft.AspNetCore.Routing.EndpointMiddleware.<Invoke>g__AwaitRequestTask|6_0",
							arguments: ["Endpoint endpoint", "Task requestTask", "ILogger logger"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Authorization.AuthorizationMiddleware",
							method: "Invoke",
							fullMethod: "Microsoft.AspNetCore.Authorization.AuthorizationMiddleware.Invoke",
							arguments: ["HttpContext context"],
							error: "Unable to find matching file for path undefined",
						},
						{
							namespace: "Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware",
							method: "<Invoke>g__Awaited|6_0",
							fullMethod:
								"Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware.<Invoke>g__Awaited|6_0",
							arguments: [
								"ExceptionHandlerMiddleware middleware",
								"HttpContext context",
								"Task task",
							],
							error: "Unable to find matching file for path undefined",
						},
					],
					language: "csharp",
					header:
						"\tNewtonsoft.Json.JsonReaderException: Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.",
					error:
						"Could not convert string to DateTime: Invalid. Path 'CreatedDate', line 1, position 49.",
					repoId: "6554221656b82e78fb93bf0d",
					occurrenceId: "2adcc347-bec3-11ee-91ec-b2ce62e8fbf5_14332_19624",
				},
			],
			objectInfo: {
				repoId: "6554221656b82e78fb93bf0d",
				remote: "https://github.com/TeamCodeStream/codestream-server.git",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNTUwOTU0",
				entityName: "clm-demo-csharp (staging.stg-red-car)",
			},
			postId: "65b7d23195e8dd8a9a83753a",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65b7d23195e8dd8a9a83753c",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793", "651ed16ac2f7dee11c938920"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/6_gyf6oGR-2B44Fo69Xqkg",
			lastActivityAt: 1706547057558,
			id: "65b7d23195e8dd8a9a83753b",
		},
		{
			version: 3,
			deactivated: true,
			numReplies: 0,
			createdAt: 1707246974763,
			modifiedAt: 1707329765039,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxkOTVhOWNlOC03ZDkyLTM5OGUtYjViNi01NmU0MWI5NjUwMDU",
			objectType: "errorGroup",
			title: "requests.exceptions:HTTPError",
			text: "500 Server Error: INTERNAL SERVER ERROR for url: http://localhost:<NUMBER>/error",
			stackTraces: [
				{
					text: 'Traceback (most recent call last):\nFile "/usr/local/bin/gunicorn", line 8, in <module>\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py", line 67, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 236, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 72, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 202, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 571, in manage_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 642, in spawn_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 609, in spawn_worker\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py", line 142, in init_process\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 126, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 70, in run_for_one\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 32, in accept\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 135, in handle\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 178, in handle_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 681, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 199, in __init__\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1478, in __call__\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 577, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1455, in wsgi_app\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 867, in full_dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 852, in dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py", line 82, in _nr_wrapper_handler_\nFile "/src/routes/app.py", line 53, in external_error\nFile "/usr/local/lib/python3.8/dist-packages/requests/models.py", line 1021, in raise_for_status',
					lines: [
						{
							method: "<module>",
							fullMethod: "<module>",
							fileFullPath: "/usr/local/bin/gunicorn",
							line: 8,
							error: "Unable to find matching file for path /usr/local/bin/gunicorn",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
							line: 67,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 236,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 72,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 202,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "manage_workers",
							fullMethod: "manage_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 571,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_workers",
							fullMethod: "spawn_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 642,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_worker",
							fullMethod: "spawn_worker",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 609,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "init_process",
							fullMethod: "init_process",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
							line: 142,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 126,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "run_for_one",
							fullMethod: "run_for_one",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 70,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "accept",
							fullMethod: "accept",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 32,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle",
							fullMethod: "handle",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 135,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle_request",
							fullMethod: "handle_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 178,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 681,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__init__",
							fullMethod: "__init__",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 199,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__call__",
							fullMethod: "__call__",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1478,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 577,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "wsgi_app",
							fullMethod: "wsgi_app",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1455,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "full_dispatch_request",
							fullMethod: "full_dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 867,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "dispatch_request",
							fullMethod: "dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 852,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wrapper_handler_",
							fullMethod: "_nr_wrapper_handler_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
							line: 82,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
						},
						{
							method: "external_error",
							fullMethod: "external_error",
							fileFullPath: "/Users/wmiraglia/pdorg/python/clm-demo-python/src/routes/app.py",
							line: 53,
							fileRelativePath: "src/routes/app.py",
						},
						{
							method: "raise_for_status",
							fullMethod: "raise_for_status",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/requests/models.py",
							line: 1021,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/requests/models.py",
						},
					],
					language: "python",
					repoId: "65406f3c997c90258e2c349e",
					sha: "release-14",
					occurrenceId: "90d2b86c-c523-11ee-894b-068eae1a6a25_21798_25479",
				},
			],
			objectInfo: {
				repoId: "65406f3c997c90258e2c349e",
				remote: "https://source.datanerd.us/codestream/clm-demo-python",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQyMTg1ODM2",
				entityName: "clm-demo-python",
			},
			postId: "65c2857ed1029184a426238c",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65a6aade9b911224801bd1cb",
			creatorId: "6543eb35264286732a9a5793",
			followerIds: ["6543eb35264286732a9a5793"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/UT5itScfRhW4dPZSmHZ1Cw",
			lastActivityAt: 1707246974918,
			id: "65c2857ed1029184a426238d",
		},
		{
			version: 3,
			deactivated: true,
			numReplies: 0,
			createdAt: 1707329768728,
			modifiedAt: 1707329906225,
			accountId: 11879688,
			objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxkOTVhOWNlOC03ZDkyLTM5OGUtYjViNi01NmU0MWI5NjUwMDU",
			objectType: "errorGroup",
			title: "requests.exceptions:HTTPError",
			text: "500 Server Error: INTERNAL SERVER ERROR for url: http://localhost:<NUMBER>/error",
			stackTraces: [
				{
					text: 'Traceback (most recent call last):\nFile "/usr/local/bin/gunicorn", line 8, in <module>\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py", line 67, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 236, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py", line 72, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 202, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 571, in manage_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 642, in spawn_workers\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py", line 609, in spawn_worker\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py", line 142, in init_process\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 126, in run\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 70, in run_for_one\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 32, in accept\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 135, in handle\nFile "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py", line 178, in handle_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 681, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 199, in __init__\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1478, in __call__\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py", line 577, in _nr_wsgi_application_wrapper_\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 1455, in wsgi_app\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 867, in full_dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/flask/app.py", line 852, in dispatch_request\nFile "/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py", line 82, in _nr_wrapper_handler_\nFile "/src/routes/app.py", line 53, in external_error\nFile "/usr/local/lib/python3.8/dist-packages/requests/models.py", line 1021, in raise_for_status',
					lines: [
						{
							method: "<module>",
							fullMethod: "<module>",
							fileFullPath: "/usr/local/bin/gunicorn",
							line: 8,
							error: "Unable to find matching file for path /usr/local/bin/gunicorn",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
							line: 67,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/wsgiapp.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 236,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
							line: 72,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/app/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 202,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "manage_workers",
							fullMethod: "manage_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 571,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_workers",
							fullMethod: "spawn_workers",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 642,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "spawn_worker",
							fullMethod: "spawn_worker",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
							line: 609,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/arbiter.py",
						},
						{
							method: "init_process",
							fullMethod: "init_process",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
							line: 142,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/base.py",
						},
						{
							method: "run",
							fullMethod: "run",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 126,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "run_for_one",
							fullMethod: "run_for_one",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 70,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "accept",
							fullMethod: "accept",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 32,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle",
							fullMethod: "handle",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 135,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "handle_request",
							fullMethod: "handle_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
							line: 178,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/gunicorn/workers/sync.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 681,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__init__",
							fullMethod: "__init__",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 199,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "__call__",
							fullMethod: "__call__",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1478,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wsgi_application_wrapper_",
							fullMethod: "_nr_wsgi_application_wrapper_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
							line: 577,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/api/wsgi_application.py",
						},
						{
							method: "wsgi_app",
							fullMethod: "wsgi_app",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 1455,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "full_dispatch_request",
							fullMethod: "full_dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 867,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "dispatch_request",
							fullMethod: "dispatch_request",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/flask/app.py",
							line: 852,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/flask/app.py",
						},
						{
							method: "_nr_wrapper_handler_",
							fullMethod: "_nr_wrapper_handler_",
							fileFullPath:
								"/usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
							line: 82,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/newrelic/hooks/framework_flask.py",
						},
						{
							method: "external_error",
							fullMethod: "external_error",
							fileFullPath: "/Users/dsellars/workspace/clm2/clm-demo-python/src/routes/app.py",
							line: 53,
							fileRelativePath: "src/routes/app.py",
						},
						{
							method: "raise_for_status",
							fullMethod: "raise_for_status",
							fileFullPath: "/usr/local/lib/python3.8/dist-packages/requests/models.py",
							line: 1021,
							error:
								"Unable to find matching file for path /usr/local/lib/python3.8/dist-packages/requests/models.py",
						},
					],
					language: "python",
					repoId: "65406f3c997c90258e2c349e",
					sha: "release-14",
					occurrenceId: "5a0e411c-c5e4-11ee-91b3-faf14c8b1a88_29776_33468",
				},
			],
			objectInfo: {
				repoId: "65406f3c997c90258e2c349e",
				remote: "https://source.datanerd.us/codestream/clm-demo-python",
				accountId: "11879688",
				entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQyMTg1ODM2",
				entityName: "clm-demo-python",
			},
			postId: "65c3c8e81fc8a68ba44a1d4d",
			teamId: "651ed16ac2f7dee11c938922",
			streamId: "65a6aade9b911224801bd1cb",
			creatorId: "652db11a7c271413e88b4ae3",
			followerIds: ["652db11a7c271413e88b4ae3"],
			permalink:
				"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/LbfigKkyRK-W2N2ri4lIQg",
			lastActivityAt: 1707329768929,
			id: "65c3c8e81fc8a68ba44a1d4e",
		},
	],
};
