"use strict";

import { describe, expect, it } from "@jest/globals";

import { AnomalyDetectorDrillDown } from "../../../../src/providers/newrelic/anomalyDetectionDrillDown";
import { GetObservabilityAnomaliesRequest } from "../../../../../util/src/protocol/agent/agent.protocol.providers";

describe("anomalyDetectorDrillDown", () => {
	const anomalyDetector = new AnomalyDetectorDrillDown(
		{
			//irrelevant for the test case, but needed to pass ctor
			entityGuid: "MTExODgxMzl8QVBNfEFQUExJQ0FUSU9OfDMzMjE0MjMy",
		} as GetObservabilityAnomaliesRequest,
		{} as any,
		{} as any,
		{} as any
	);

	it("properly escapes embeddded scopes with backslashes", async () => {
		const result = anomalyDetector.getMetricFilter(
			"WebTransaction/Custom/App\\Http\\Controllers\\Api\\ControllerName@MethodName"
		);

		expect(result).toEqual(
			`scope = 'WebTransaction/Custom/App\\\\\\\\Http\\\\\\\\Controllers\\\\\\\\Api\\\\\\\\ControllerName@MethodName'`
		);
	});

	it("leaves embeddded scopes with forward slashes alone", async () => {
		const result = anomalyDetector.getMetricFilter(
			"WebTransaction/Custom/App/Http/Controllers/Api/ControllerName@MethodName"
		);

		expect(result).toEqual(
			`scope = 'WebTransaction/Custom/App/Http/Controllers/Api/ControllerName@MethodName'`
		);
	});
});
