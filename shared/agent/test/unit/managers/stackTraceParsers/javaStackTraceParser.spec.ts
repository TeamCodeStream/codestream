"use strict";

import { describe, expect, it } from "@jest/globals";
import { Parser } from "../../../../src/managers/stackTraceParsers/javaStackTraceParser";

describe("javaStackTraceParser", () => {
	it("stack1", () => {
		const str = `javax.servlet.ServletException: Something bad happened
at com.example.myproject.OpenSessionInViewFilter.doFilter(OpenSessionInViewFilter.java:60)
at org.mortbay.jetty.servlet.ServletHandler$CachedChain.doFilter(ServletHandler.java:1157)
at com.example.myproject.ExceptionHandlerFilter.doFilter(ExceptionHandlerFilter.java:28)
at org.mortbay.jetty.servlet.ServletHandler$CachedChain.doFilter(ServletHandler.java:1157)
at com.example.myproject.OutputBufferFilter.doFilter(OutputBufferFilter.java:33)
at org.mortbay.jetty.servlet.ServletHandler$CachedChain.doFilter(ServletHandler.java:1157)
at org.mortbay.jetty.servlet.ServletHandler.handle(ServletHandler.java:388)
at org.mortbay.jetty.security.SecurityHandler.handle(SecurityHandler.java:216)
at org.mortbay.jetty.servlet.SessionHandler.handle(SessionHandler.java:182)
at org.mortbay.jetty.handler.ContextHandler.handle(ContextHandler.java:765)
at org.mortbay.jetty.webapp.WebAppContext.handle(WebAppContext.java:418)
at org.mortbay.jetty.handler.HandlerWrapper.handle(HandlerWrapper.java:152)
at org.mortbay.jetty.Server.handle(Server.java:326)
at org.mortbay.jetty.HttpConnection.handleRequest(HttpConnection.java:542)
at org.mortbay.jetty.HttpConnection$RequestHandler.content(HttpConnection.java:943)
at org.mortbay.jetty.HttpParser.parseNext(HttpParser.java:756)
at org.mortbay.jetty.HttpParser.parseAvailable(HttpParser.java:218)
at org.mortbay.jetty.HttpConnection.handle(HttpConnection.java:404)
at org.mortbay.jetty.bio.SocketConnector$Connection.run(SocketConnector.java:228)
at org.mortbay.thread.QueuedThreadPool$PoolThread.run(QueuedThreadPool.java:582)`;

		const result = Parser(str);

		expect(result).toEqual({
			language: "java",
			lines: [
				{
					method: "com.example.myproject.OpenSessionInViewFilter.doFilter",
					fileFullPath: "com/example/myproject/OpenSessionInViewFilter.java",
					line: 60
				},
				{
					method: "org.mortbay.jetty.servlet.ServletHandler$CachedChain.doFilter",
					fileFullPath: "org/mortbay/jetty/servlet/ServletHandler.java",
					line: 1157
				},
				{
					method: "com.example.myproject.ExceptionHandlerFilter.doFilter",
					fileFullPath: "com/example/myproject/ExceptionHandlerFilter.java",
					line: 28
				},
				{
					method: "org.mortbay.jetty.servlet.ServletHandler$CachedChain.doFilter",
					fileFullPath: "org/mortbay/jetty/servlet/ServletHandler.java",
					line: 1157
				},
				{
					method: "com.example.myproject.OutputBufferFilter.doFilter",
					fileFullPath: "com/example/myproject/OutputBufferFilter.java",
					line: 33
				},
				{
					method: "org.mortbay.jetty.servlet.ServletHandler$CachedChain.doFilter",
					fileFullPath: "org/mortbay/jetty/servlet/ServletHandler.java",
					line: 1157
				},
				{
					method: "org.mortbay.jetty.servlet.ServletHandler.handle",
					fileFullPath: "org/mortbay/jetty/servlet/ServletHandler.java",
					line: 388
				},
				{
					method: "org.mortbay.jetty.security.SecurityHandler.handle",
					fileFullPath: "org/mortbay/jetty/security/SecurityHandler.java",
					line: 216
				},
				{
					method: "org.mortbay.jetty.servlet.SessionHandler.handle",
					fileFullPath: "org/mortbay/jetty/servlet/SessionHandler.java",
					line: 182
				},
				{
					method: "org.mortbay.jetty.handler.ContextHandler.handle",
					fileFullPath: "org/mortbay/jetty/handler/ContextHandler.java",
					line: 765
				},
				{
					method: "org.mortbay.jetty.webapp.WebAppContext.handle",
					fileFullPath: "org/mortbay/jetty/webapp/WebAppContext.java",
					line: 418
				},
				{
					method: "org.mortbay.jetty.handler.HandlerWrapper.handle",
					fileFullPath: "org/mortbay/jetty/handler/HandlerWrapper.java",
					line: 152
				},
				{
					method: "org.mortbay.jetty.Server.handle",
					fileFullPath: "org/mortbay/jetty/Server.java",
					line: 326
				},
				{
					method: "org.mortbay.jetty.HttpConnection.handleRequest",
					fileFullPath: "org/mortbay/jetty/HttpConnection.java",
					line: 542
				},
				{
					method: "org.mortbay.jetty.HttpConnection$RequestHandler.content",
					fileFullPath: "org/mortbay/jetty/HttpConnection.java",
					line: 943
				},
				{
					method: "org.mortbay.jetty.HttpParser.parseNext",
					fileFullPath: "org/mortbay/jetty/HttpParser.java",
					line: 756
				},
				{
					method: "org.mortbay.jetty.HttpParser.parseAvailable",
					fileFullPath: "org/mortbay/jetty/HttpParser.java",
					line: 218
				},
				{
					method: "org.mortbay.jetty.HttpConnection.handle",
					fileFullPath: "org/mortbay/jetty/HttpConnection.java",
					line: 404
				},
				{
					method: "org.mortbay.jetty.bio.SocketConnector$Connection.run",
					fileFullPath: "org/mortbay/jetty/bio/SocketConnector.java",
					line: 228
				},
				{
					method: "org.mortbay.thread.QueuedThreadPool$PoolThread.run",
					fileFullPath: "org/mortbay/thread/QueuedThreadPool.java",
					line: 582
				}
			],
			header: "javax.servlet.ServletException: Something bad happened",
			error: "Something bad happened"
		});
	});

	describe("stack2", () => {
		const str = `\tjava.base/sun.nio.fs.UnixException.translateToIOException(UnixException.java:92)\n\tjava.base/sun.nio.fs.UnixException.rethrowAsIOException(UnixException.java:111)\n\tjava.base/sun.nio.fs.UnixException.rethrowAsIOException(UnixException.java:116)\n\tjava.base/sun.nio.fs.UnixFileSystemProvider.newByteChannel(UnixFileSystemProvider.java:219)\n\tjava.base/java.nio.file.Files.newByteChannel(Files.java:371)\n\tjava.base/java.nio.file.Files.newByteChannel(Files.java:422)\n\tjava.base/java.nio.file.Files.readAll…va.util.concurrent.Executors$RunnableAdapter.call(Executors.java:515)\n\tjava.base/java.util.concurrent.FutureTask.runAndReset(FutureTask.java:305)\n\tjava.base/java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:305)\n\tjava.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1128)\n\tjava.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:628)\n\tjava.base/java.lang.Thread.run(Thread.java:834)`;
		const result = Parser(str);
		expect(result).toEqual({
			language: "java",
			lines: [
				{
					fileFullPath: "java/base/sun/nio/fs/UnixException.java",
					line: 92,
					method: "java.base/sun.nio.fs.UnixException.translateToIOException"
				},
				{
					fileFullPath: "java/base/sun/nio/fs/UnixException.java",
					line: 111,
					method: "java.base/sun.nio.fs.UnixException.rethrowAsIOException"
				},
				{
					fileFullPath: "java/base/sun/nio/fs/UnixException.java",
					line: 116,
					method: "java.base/sun.nio.fs.UnixException.rethrowAsIOException"
				},
				{
					fileFullPath: "java/base/sun/nio/fs/UnixFileSystemProvider.java",
					line: 219,
					method: "java.base/sun.nio.fs.UnixFileSystemProvider.newByteChannel"
				},
				{
					fileFullPath: "java/base/java/nio/file/Files.java",
					line: 371,
					method: "java.base/java.nio.file.Files.newByteChannel"
				},
				{
					fileFullPath: "java/base/java/nio/file/Files.java",
					line: 422,
					method: "java.base/java.nio.file.Files.newByteChannel"
				},
				{
					fileFullPath: "java/base/java/util/concurrent/FutureTask.java",
					line: 305,
					method: "java.base/java.util.concurrent.FutureTask.runAndReset"
				},
				{
					fileFullPath: "java/base/java/util/concurrent/ScheduledThreadPoolExecutor.java",
					line: 305,
					method:
						"java.base/java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run"
				},
				{
					fileFullPath: "java/base/java/util/concurrent/ThreadPoolExecutor.java",
					line: 1128,
					method: "java.base/java.util.concurrent.ThreadPoolExecutor.runWorker"
				},
				{
					fileFullPath: "java/base/java/util/concurrent/ThreadPoolExecutor.java",
					line: 628,
					method: "java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run"
				},
				{
					fileFullPath: "java/base/java/lang/Thread.java",
					line: 834,
					method: "java.base/java.lang.Thread.run"
				}
			]
		});

		it("stack with java and kotlin", () => {
			const str = `\tcom.newrelic.distributedtracingservice.util.ExceptionUtilsKt.apiGet(ExceptionUtils.kt:25)\n\tcom.newrelic.distributedtracingservice.nrdb.NrdbApi.getAccountsWritingSpans(NrdbApi.kt:1212)\n\tjava.base/sun.nio.fs.UnixException.translateToIOException(UnixException.java:92)\n\tjava.base/sun.nio.fs.UnixException.rethrowAsIOException(UnixException.java:111)\n\tjava.base/sun.nio.fs.UnixException.rethrowAsIOException(UnixException.java:116)\n\tjava.base/sun.nio.fs.UnixFileSystemProvider.newByteChannel(UnixFileSystemProvider.java:219)\n\tjava.base/java.nio.file.Files.newByteChannel(Files.java:371)\n\tjava.base/java.nio.file.Files.newByteChannel(Files.java:422)\n\tjava.base/java.nio.file.Files.readAll…va.util.concurrent.Executors$RunnableAdapter.call(Executors.java:515)\n\tjava.base/java.util.concurrent.FutureTask.runAndReset(FutureTask.java:305)\n\tjava.base/java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:305)\n\tjava.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1128)\n\tjava.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:628)\n\tjava.base/java.lang.Thread.run(Thread.java:834)`;
			const result = Parser(str);
			expect(result).toEqual({
				language: "java",
				lines: [
					{
						method: "com.newrelic.distributedtracingservice.util.ExceptionUtilsKt.apiGet",
						fileFullPath: "com/newrelic/distributedtracingservice/util/ExceptionUtils.kt",
						line: 25
					},
					{
						method: "com.newrelic.distributedtracingservice.nrdb.NrdbApi.getAccountsWritingSpans",
						fileFullPath: "com/newrelic/distributedtracingservice/nrdb/NrdbApi.kt",
						line: 1212
					},
					{
						method: "java.base/sun.nio.fs.UnixException.translateToIOException",
						fileFullPath: "java/base/sun/nio/fs/UnixException.java",
						line: 92
					},
					{
						fileFullPath: "java/base/sun/nio/fs/UnixException.java",
						line: 111,
						method: "java.base/sun.nio.fs.UnixException.rethrowAsIOException"
					},
					{
						fileFullPath: "java/base/sun/nio/fs/UnixException.java",
						line: 116,
						method: "java.base/sun.nio.fs.UnixException.rethrowAsIOException"
					},
					{
						fileFullPath: "java/base/sun/nio/fs/UnixFileSystemProvider.java",
						line: 219,
						method: "java.base/sun.nio.fs.UnixFileSystemProvider.newByteChannel"
					},
					{
						fileFullPath: "java/base/java/nio/file/Files.java",
						line: 371,
						method: "java.base/java.nio.file.Files.newByteChannel"
					},
					{
						fileFullPath: "java/base/java/nio/file/Files.java",
						line: 422,
						method: "java.base/java.nio.file.Files.newByteChannel"
					},
					{
						fileFullPath: "java/base/java/util/concurrent/FutureTask.java",
						line: 305,
						method: "java.base/java.util.concurrent.FutureTask.runAndReset"
					},
					{
						fileFullPath: "java/base/java/util/concurrent/ScheduledThreadPoolExecutor.java",
						line: 305,
						method:
							"java.base/java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run"
					},
					{
						fileFullPath: "java/base/java/util/concurrent/ThreadPoolExecutor.java",
						line: 1128,
						method: "java.base/java.util.concurrent.ThreadPoolExecutor.runWorker"
					},
					{
						fileFullPath: "java/base/java/util/concurrent/ThreadPoolExecutor.java",
						line: 628,
						method: "java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run"
					},
					{
						fileFullPath: "java/base/java/lang/Thread.java",
						line: 834,
						method: "java.base/java.lang.Thread.run"
					}
				]
			});
		});
	});

	it("stack with unknown source", () => {
		const result = Parser("\tsun.reflect.GeneratedMethodAccessor77.invoke(Unknown Source)");
		expect(result).toEqual({
			language: "java",
			lines: [
				{
					method: "sun.reflect.GeneratedMethodAccessor77.invoke",
					fileFullPath: undefined,
					line: undefined
				}
			]
		});
	});
});
