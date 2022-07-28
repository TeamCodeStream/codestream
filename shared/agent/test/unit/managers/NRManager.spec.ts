"use strict";

import { describe, expect, it } from "@jest/globals";
import { NRManager } from "../../../src/managers/NRManager";

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
			"/Users/johnd/code/error-tracking-sample-java/src/test/java/com/newrelic/errortrackingsamplejava/ErrorTrackingSampleJavaApplicationTest.java"
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
});
