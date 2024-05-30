"use strict";

import { describe, expect, it } from "@jest/globals";
import { NRManager } from "../../../src/managers/NRManager";
import { mockDeep } from "jest-mock-extended";
import { CodeStreamSession } from "../../../src/session";

jest.mock("../../../src/session");

const mockCodeStreamSession = mockDeep<CodeStreamSession>();

describe("NRManager", () => {
	it("getBestMatchingPath", () => {
		const all = [
			"/Users/johnd/code/error-tracking-sample-java/.gitignore",
			"/Users/johnd/code/error-tracking-sample-java/FindBugsFilter.xml",
			"/Users/johnd/code/error-tracking-sample-java/README.md",
			"/Users/johnd/code/error-tracking-sample-java/build.gradle",
			"/Users/johnd/code/error-tracking-sample-java/gradle/wrapper/gradle-wrapper.jar",
			"/Users/johnd/code/error-tracking-sample-java/gradle/wrapper/gradle-wrapper.properties",
			"/Users/johnd/code/error-tracking-sample-java/gradle.properties",
			"/Users/johnd/code/error-tracking-sample-java/gradlew",
			"/Users/johnd/code/error-tracking-sample-java/gradlew.bat",
			"/Users/johnd/code/error-tracking-sample-java/grandcentral.yml",
			"/Users/johnd/code/error-tracking-sample-java/papers_manifest.yml",
			"/Users/johnd/code/error-tracking-sample-java/settings.gradle",
			"/Users/johnd/code/error-tracking-sample-java/src/dist/config/newrelic.yml",
			"/Users/johnd/code/error-tracking-sample-java/src/dist/config/server.yml",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/ErrorTrackingSampleJavaApplication.java",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/ErrorTrackingSampleJavaApplicationModule.java",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/ErrorTrackingSampleJavaConfiguration.java",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/HighThroughputExceptionService.java",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/HighThroughputStackTraceExceptionService.java",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/LowThroughputExceptionService.java",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/VariableThroughputExceptionService.java",
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/status/ErrorTrackingSampleJavaHealthCheck.java",
			"/Users/johnd/code/error-tracking-sample-java/src/test/java/com/newrelic/errortrackingsamplejava/ErrorTrackingSampleJavaApplicationTest.java",
		];
		let result = NRManager.getBestMatchingPath(
			"HighThroughputStackTraceExceptionService.java",
			all
		);
		expect(result).toEqual(
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/HighThroughputStackTraceExceptionService.java"
		);
		result = NRManager.getBestMatchingPath(
			"com/newrelic/errortrackingsamplejava/HighThroughputStackTraceExceptionService.java",
			all
		);
		expect(result).toEqual(
			"/Users/johnd/code/error-tracking-sample-java/src/main/java/com/newrelic/errortrackingsamplejava/HighThroughputStackTraceExceptionService.java"
		);
	});

	it("guessStackTraceLanguage guesses javascript", async () => {
		const nrManager = new NRManager(mockCodeStreamSession);
		const result = await nrManager.parseStackTrace({
			entityGuid: "eg",
			errorGroupGuid: "egg",
			stackTrace: `NavigationDuplicated: Avoided redundant navigation to current location: "/asdf/acme/logitech/asdfx-anasdfwhre-5s-afrt-610-105253-nnn-6555678/".
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
		at runMicrotasks (<anonymous>)`,
			occurrenceId: "oc",
		});
		expect(result?.language).toBe("javascript");
		expect(result?.warning).toBeUndefined();
	});

	it("guessStackTraceLanguage guesses javascript when all lines internal", async () => {
		const nrManager = new NRManager(mockCodeStreamSession);
		const result = await nrManager.parseStackTrace({
			entityGuid: "eg",
			errorGroupGuid: "egg",
			stackTrace: `Error: Client network socket disconnected before secure TLS connection was established
    at connResetException (node:internal/errors:704:14)
    at TLSSocket.onConnectEnd (node:_tls_wrap:1590:19)
    at TLSSocket.emit (node:events:525:35)
    at endReadableNT (node:internal/streams/readable:1358:12)
    at processTicksAndRejections (node:internal/process/task_queues:83:21)`,
			occurrenceId: "oc",
		});
		expect(result?.language).toBe("javascript");
		expect(result?.warning).toBeUndefined();
	});
});
