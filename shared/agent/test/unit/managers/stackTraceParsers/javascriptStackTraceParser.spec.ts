"use strict";

import { describe, expect, it } from "@jest/globals";
import { Parser } from "../../../../src/managers/stackTraceParsers/javascriptStackTraceParser";

describe("javascriptStackTraceParser", () => {
	it("stack1", () => {
		const str = `TypeError: this.request.csrfToken is not a function
at LinkNewRelicRequest.createLauncherModel (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js:81:23)
at LinkNewRelicRequest.render (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js:39:33)
at LinkNewRelicRequest.process (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js:23:16)
at LinkNewRelicRequest.executePhase (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/lib/api_server/api_request.js:62:20)
at LinkNewRelicRequest.fulfill (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/lib/api_server/api_request.js:138:16)
at runMicrotasks (<anonymous>)
at processTicksAndRejections (internal/process/task_queues.js:94:5)`;

		const result = Parser(str);
		expect(result).toEqual({
			language: "javascript",
			lines: [
				{
					fileFullPath:
						"/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js",
					method: "LinkNewRelicRequest.createLauncherModel",
					arguments: [],
					line: 81,
					column: 23
				},
				{
					fileFullPath:
						"/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js",
					method: "LinkNewRelicRequest.render",
					arguments: [],
					line: 39,
					column: 33
				},
				{
					fileFullPath:
						"/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js",
					method: "LinkNewRelicRequest.process",
					arguments: [],
					line: 23,
					column: 16
				},
				{
					fileFullPath:
						"/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/lib/api_server/api_request.js",
					method: "LinkNewRelicRequest.executePhase",
					arguments: [],
					line: 62,
					column: 20
				},
				{
					fileFullPath:
						"/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/lib/api_server/api_request.js",
					method: "LinkNewRelicRequest.fulfill",
					arguments: [],
					line: 138,
					column: 16
				},
				{
					fileFullPath: "<anonymous>",
					method: "runMicrotasks",
					arguments: [],
					line: undefined,
					column: undefined
				},
				{
					fileFullPath: "internal/process/task_queues.js",
					method: "processTicksAndRejections",
					arguments: [],
					line: 94,
					column: 5
				}
			],
			text:
				"TypeError: this.request.csrfToken is not a function\nat LinkNewRelicRequest.createLauncherModel (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js:81:23)\nat LinkNewRelicRequest.render (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js:39:33)\nat LinkNewRelicRequest.process (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/modules/web/link_newrelic_request.js:23:16)\nat LinkNewRelicRequest.executePhase (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/lib/api_server/api_request.js:62:20)\nat LinkNewRelicRequest.fulfill (/Users/cstryker/dev/sandboxes/csdemo/codestream-server/api_server/lib/api_server/api_request.js:138:16)\nat runMicrotasks (<anonymous>)\nat processTicksAndRejections (internal/process/task_queues.js:94:5)",
			header: "TypeError: this.request.csrfToken is not a function",
			error: "this.request.csrfToken is not a function"
		});
	});

	it("stack2", () => {
		const str = `SyntaxError: Unexpected end of JSON input
		at JSON.parse (<anonymous>)
		at Server.<anonymous> (/Users/bobross/acme/nodexample/app.js:13:20)
		at Server.emit (events.js:196:13)
		at Server.wrapped (/Users/bobross/acme/nodexample/node_modules/acme/lib/transaction/tracer/index.js:210:22)
		at Server.wrappedHandler (/Users/bobross/acme/nodexample/node_modules/acme/lib/instrumentation/core/http.js:203:47)
		at Server.wrapped (/Users/bobross/acme/nodexample/node_modules/acme/lib/transaction/tracer/index.js:210:22)
		at Server.wrapTransactionInvocation (/Users/bobross/acme/nodexample/node_modules/acme/lib/transaction/tracer/index.js:131:71)
		at Server.wrappedEmit [as emit] (/Users/bobross/acme/nodexample/node_modules/acme/lib/instrumentation/core/http.js:486:28)
		at parserOnIncoming (_http_server.js:708:12)
		at HTTPParser.parserOnHeadersComplete (_http_common.js:116:17)`;

		const result = Parser(str);
		expect(result.lines[1].fileFullPath).toEqual("/Users/bobross/acme/nodexample/app.js");
	});

	it("stack webpack", () => {
		const str = `NavigationDuplicated: Avoided redundant navigation to current location: "/asdf/acme/logitech/asdfx-anasdfwhre-5s-afrt-610-105253-nnn-6555678/".
		at createRouterError (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js?:2066:15)
		at createNavigationDuplicatedError (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js?:2036:15)
		at AbstractHistory.confirmTransition (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js?:2329:18)
		at AbstractHistory.transitionTo (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js?:2261:8)
		at AbstractHistory.replace (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js?:2839:10)
		at eval (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js?:3040:22)
		at new Promise (<anonymous>)
		at VueRouter.replace (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js?:3039:12)
		at VueComponent.redirectToPdpOnOneResult (webpack:///./src/app/modules/searchResults/components/ProductResults.vue?/builds/acmefoo.com/develop/clientside/monorepo/node_modules/ts-loader??ref--3!/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-loader/lib??vue-loader-options:340:30)
		at VueComponent.$route (webpack:///./src/app/modules/searchResults/components/ProductResults.vue?/builds/acmefoo.com/develop/clientside/monorepo/node_modules/ts-loader??ref--3!/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-loader/lib??vue-loader-options:209:18)
		at invokeWithErrorHandling (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js?:1871:26)
		at Watcher.run (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js?:4587:9)
		at flushSchedulerQueue (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js?:4329:13)
		at Array.eval (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js?:1997:12)
		at flushCallbacks (webpack:////builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js?:1923:14)
		at runMicrotasks (<anonymous>)`;

		const result = Parser(str);

		expect(result).toEqual({
			language: "javascript",
			lines: [
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js",
					method: "createRouterError",
					arguments: [],
					line: 2066,
					column: 15
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js",
					method: "createNavigationDuplicatedError",
					arguments: [],
					line: 2036,
					column: 15
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js",
					method: "AbstractHistory.confirmTransition",
					arguments: [],
					line: 2329,
					column: 18
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js",
					method: "AbstractHistory.transitionTo",
					arguments: [],
					line: 2261,
					column: 8
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js",
					method: "AbstractHistory.replace",
					arguments: [],
					line: 2839,
					column: 10
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js",
					method: "eval",
					arguments: [],
					line: 3040,
					column: 22
				},
				{
					fileFullPath: "<anonymous>",
					method: "new Promise",
					arguments: [],
					column: undefined,
					line: undefined
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue-router/dist/vue-router.esm.js",
					method: "VueRouter.replace",
					arguments: [],
					line: 3039,
					column: 12
				},
				{
					fileFullPath: "/src/app/modules/searchResults/components/ProductResults.vue",
					method: "VueComponent.redirectToPdpOnOneResult",
					arguments: [],
					line: 340,
					column: 30
				},
				{
					fileFullPath: "/src/app/modules/searchResults/components/ProductResults.vue",
					method: "VueComponent.$route",
					arguments: [],
					line: 209,
					column: 18
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js",
					method: "invokeWithErrorHandling",
					arguments: [],
					line: 1871,
					column: 26
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js",
					method: "Watcher.run",
					arguments: [],
					line: 4587,
					column: 9
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js",
					method: "flushSchedulerQueue",
					arguments: [],
					line: 4329,
					column: 13
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js",
					method: "Array.eval",
					arguments: [],
					line: 1997,
					column: 12
				},
				{
					fileFullPath:
						"/builds/acmefoo.com/develop/clientside/monorepo/node_modules/vue/dist/vue.esm.js",
					method: "flushCallbacks",
					arguments: [],
					line: 1923,
					column: 14
				},
				{
					fileFullPath: "<anonymous>",
					method: "runMicrotasks",
					arguments: [],
					column: undefined,
					line: undefined
				}
			],
			text: str
		});
	});
});
