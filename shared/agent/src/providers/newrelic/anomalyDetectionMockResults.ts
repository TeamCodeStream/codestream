import {
	GetMethodLevelTelemetryRequest,
	GetMethodLevelTelemetryResponse,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesResponse,
	MethodGoldenMetrics,
} from "@codestream/protocols/agent";

export const getAnomalyDetectionMockResponse = (
	request: GetObservabilityAnomaliesRequest
): GetObservabilityAnomaliesResponse | undefined => {
	if (request.entityGuid === anomalyDetectionMockEntityGuid) {
		return recursivelyReplaceTemplates(
			anomalyDetectionMockResponseTemplate
		) as GetObservabilityAnomaliesResponse;
	}
	return undefined;
};

const getMethodLevelTelemetryMockResponseCheckout = (request: GetMethodLevelTelemetryRequest) => {
	const methodGoldenMetrics = [
		{
			...errorRateChartTemplate,
			result: [
				buildChartDataForNDaysAgo(10, null, null, "11.93"),
				buildChartDataForNDaysAgo(9, null, null, "11.02"),
				buildChartDataForNDaysAgo(8, null, null, "13.45"),
				buildChartDataForNDaysAgo(7, null, null, "12.34"),
				buildChartDataForNDaysAgo(6, null, null, "12.40"),
				buildChartDataForNDaysAgo(5, null, null, "11.74"),
				buildChartDataForNDaysAgo(4, null, null, "12.87"),
				buildChartDataForNDaysAgo(3, null, null, "16.40"),
				buildChartDataForNDaysAgo(2, null, null, "16.72"),
				buildChartDataForNDaysAgo(1, null, null, "16.44"),
			],
		},
		{
			...durationChartTemplate,
			result: [
				buildChartDataForNDaysAgo(10, "23.24", null, null),
				buildChartDataForNDaysAgo(9, "25.12", null, null),
				buildChartDataForNDaysAgo(8, "24.00", null, null),
				buildChartDataForNDaysAgo(7, "24.12", null, null),
				buildChartDataForNDaysAgo(6, "23.45", null, null),
				buildChartDataForNDaysAgo(5, "25.09", null, null),
				buildChartDataForNDaysAgo(4, "25.03", null, null),
				buildChartDataForNDaysAgo(3, "24.94", null, null),
				buildChartDataForNDaysAgo(2, "23.98", null, null),
				buildChartDataForNDaysAgo(1, "23.87", null, null),
			],
		},
		{
			...samplesChartTemplate,
			result: [
				buildChartDataForNDaysAgo(10, null, "970.00", null),
				buildChartDataForNDaysAgo(9, null, "1120.00", null),
				buildChartDataForNDaysAgo(8, null, "998.00", null),
				buildChartDataForNDaysAgo(7, null, "1030.00", null),
				buildChartDataForNDaysAgo(6, null, "1038.00", null),
				buildChartDataForNDaysAgo(5, null, "1202.00", null),
				buildChartDataForNDaysAgo(4, null, "1002.00", null),
				buildChartDataForNDaysAgo(3, null, "1024.00", null),
				buildChartDataForNDaysAgo(2, null, "972.00", null),
				buildChartDataForNDaysAgo(1, null, "1049.00", null),
			],
		},
	] as any as MethodGoldenMetrics[];

	return {
		newRelicEntityGuid: request.newRelicEntityGuid,
		newRelicUrl: undefined,
		goldenMetrics: methodGoldenMetrics,
		deployments: deployments,
		errors: undefined,
		newRelicAlertSeverity: undefined,
		newRelicEntityAccounts: [],
		newRelicEntityName: "WebPortal",
	};
};

const getMethodLevelTelemetryMockResponseLogin = (request: GetMethodLevelTelemetryRequest) => {
	const methodGoldenMetrics = [
		{
			...errorRateChartTemplate,
			result: [
				buildChartDataForNDaysAgo(10, null, null, "0.00"),
				buildChartDataForNDaysAgo(9, null, null, "0.00"),
				buildChartDataForNDaysAgo(8, null, null, "0.00"),
				buildChartDataForNDaysAgo(7, null, null, "0.00"),
				buildChartDataForNDaysAgo(6, null, null, "0.00"),
				buildChartDataForNDaysAgo(5, null, null, "0.00"),
				buildChartDataForNDaysAgo(4, null, null, "0.00"),
				buildChartDataForNDaysAgo(3, null, null, "0.00"),
				buildChartDataForNDaysAgo(2, null, null, "0.00"),
				buildChartDataForNDaysAgo(1, null, null, "0.00"),
			],
		},
		{
			...durationChartTemplate,
			result: [
				buildChartDataForNDaysAgo(10, "159.34", null, null),
				buildChartDataForNDaysAgo(9, "164.23", null, null),
				buildChartDataForNDaysAgo(8, "161.34", null, null),
				buildChartDataForNDaysAgo(7, "164.43", null, null),
				buildChartDataForNDaysAgo(6, "156.90", null, null),
				buildChartDataForNDaysAgo(5, "155.87", null, null),
				buildChartDataForNDaysAgo(4, "167.93", null, null),
				buildChartDataForNDaysAgo(3, "202.12", null, null),
				buildChartDataForNDaysAgo(2, "198.34", null, null),
				buildChartDataForNDaysAgo(1, "200.02", null, null),
			],
		},
		{
			...samplesChartTemplate,
			result: [
				buildChartDataForNDaysAgo(10, null, "1030.00", null),
				buildChartDataForNDaysAgo(9, null, "998.00", null),
				buildChartDataForNDaysAgo(8, null, "970.00", null),
				buildChartDataForNDaysAgo(7, null, "1120.00", null),
				buildChartDataForNDaysAgo(6, null, "1024.00", null),
				buildChartDataForNDaysAgo(5, null, "1202.00", null),
				buildChartDataForNDaysAgo(4, null, "1038.00", null),
				buildChartDataForNDaysAgo(3, null, "972.00", null),
				buildChartDataForNDaysAgo(2, null, "1049.00", null),
				buildChartDataForNDaysAgo(1, null, "1002.00", null),
			],
		},
	] as any as MethodGoldenMetrics[];

	return {
		newRelicEntityGuid: request.newRelicEntityGuid,
		newRelicUrl: undefined,
		goldenMetrics: methodGoldenMetrics,
		deployments: deployments,
		errors: undefined,
		newRelicAlertSeverity: undefined,
		newRelicEntityAccounts: [],
		newRelicEntityName: "WebPortal",
	};
};

export const getMethodLevelTelemetryMockResponse = (
	request: GetMethodLevelTelemetryRequest
): GetMethodLevelTelemetryResponse | undefined => {
	if (request.newRelicEntityGuid !== anomalyDetectionMockEntityGuid) return undefined;

	if (
		request.metricTimesliceNameMapping?.duration ===
		"Java/acme.storefront.action.PurchaseAction/checkout"
	) {
		return getMethodLevelTelemetryMockResponseCheckout(request);
	}
	if (
		request.metricTimesliceNameMapping?.duration === "Java/acme.storefront.action.LoginAction/login"
	) {
		return getMethodLevelTelemetryMockResponseLogin(request);
	}
	return undefined;
};

type AnyObject = {
	[key: string]: any;
};

function replaceStrings(value: string): string {
	const threeDaysAgo = dateFormattedNdaysAgo(3);
	return value.replace(/\$date/g, threeDaysAgo);
}

const recursivelyReplaceTemplates = (object: AnyObject): AnyObject => {
	Object.keys(object).forEach(key => {
		if (typeof object[key] === "string") {
			object[key] = replaceStrings(object[key]);
		} else if (typeof object[key] === "object" && object[key] !== null) {
			object[key] = recursivelyReplaceTemplates(object[key]);
		}
	});

	return object;
};

const dateFormattedNdaysAgo = (daysAgo: number): string => {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	const monthAbbreviation = date.toLocaleString("default", { month: "short" });
	const day = date.getDate();

	return `${monthAbbreviation} ${day}`;
};

const buildChartDataForNDaysAgo = (
	daysAgo: number,
	duration: string | null,
	samples: string | null,
	errors: string | null
): {
	beginTimeSeconds: number;
	endTimeSeconds: number;
	"Average duration (ms)": string | null;
	"Samples (per minute)": string | null;
	"Errors (per minute)": string | null;
	endDate: string;
} => {
	const beginDate = new Date();
	beginDate.setHours(0, 0, 0, 0);
	beginDate.setDate(beginDate.getDate() - daysAgo);

	const endDate = new Date(beginDate);
	endDate.setDate(endDate.getDate() + 1);

	const beginTimeSeconds = Math.floor(beginDate.getTime() / 1000);
	const endTimeSeconds = Math.floor(endDate.getTime() / 1000);

	return {
		beginTimeSeconds: beginTimeSeconds,
		endTimeSeconds: endTimeSeconds,
		"Average duration (ms)": duration,
		"Samples (per minute)": samples,
		"Errors (per minute)": errors,
		endDate: endDate.toISOString(),
	};
};

const anomalyDetectionMockCompanyId = "61718eee4387f9127e6bcb3b";
const anomalyDetectionMockRepoId = "61718ef0732aea12758207a6";
const anomalyDetectionMockEntityGuid = "MTYwNjg2MnxBUE18QVBQTElDQVRJT058NDMxOTIyMTA";
const anomalyDetectionMockResponseTemplate: GetObservabilityAnomaliesResponse = {
	responseTime: [
		{
			name: "Java/acme.storefront.action.LoginAction/login",
			oldValue: 163.33,
			newValue: 200.22,
			ratio: 1.2259,
			codeFilepath: undefined,
			codeNamespace: "acme.storefront.action.LoginAction",
			codeFunction: "login",
			language: "java",
			text: "acme.storefront.action.LoginAction/login",
			totalDays: 10,
			metricTimesliceName: "Java/acme.storefront.action.LoginAction/login",
			sinceText: "release CS42 on $date",
			errorMetricTimesliceName: "Java/acme.storefront.action.LoginAction/login",
			chartHeaderTexts: {
				"Average duration (ms)": "+22.59% since release CS42 on $date",
			},
			notificationText: "Average duration (ms) +22.59% since release CS42 on $date",
			entityName: "WebPortal",
		},
		// {
		// 	name: "Java/acme.storefront.action.PurchaseAction/checkout",
		// 	oldValue: 177.15232468106115,
		// 	newValue: 416.4159984105804,
		// 	ratio: 2.3506098447213786,
		// 	codeFilepath: undefined,
		// 	codeNamespace: "acme.storefront.action.PurchaseAction",
		// 	codeFunction: "checkout",
		// 	language: "java",
		// 	text: "acme.storefront.action.PurchaseAction/checkout",
		// 	totalDays: 10,
		// 	metricTimesliceName: "Java/acme.storefront.action.PurchaseAction/checkout",
		// 	sinceText: "release CS42 on $date",
		// 	errorMetricTimesliceName: "Java/acme.storefront.action.PurchaseAction/checkout",
		// 	chartHeaderTexts: {
		// 		"Average duration (ms)": "+135.06% since release CS42 on $date",
		// 	},
		// 	notificationText: "Average duration (ms) +135.06% since release CS42 on $date",
		// 	entityName: "WebPortal",
		// },
	],
	errorRate: [
		{
			name: "Java/acme.storefront.action.PurchaseAction/checkout",
			oldValue: 12.23,
			newValue: 16.51,
			ratio: 1.3506,
			codeFilepath: undefined,
			codeNamespace: "acme.storefront.action.PurchaseAction",
			codeFunction: "checkout",
			language: "java",
			text: "acme.storefront.action.PurchaseAction/checkout",
			totalDays: 10,
			metricTimesliceName: "Java/acme.storefront.action.PurchaseAction/checkout",
			sinceText: "release CS42 on $date",
			errorMetricTimesliceName: "Java/acme.storefront.action.PurchaseAction/checkout",
			chartHeaderTexts: {
				"Errors (per minute)": "+35.06% since release CS42 on $date",
			},
			notificationText: "Errors (per minute) +35.06% since release CS42 on $date",
			entityName: "WebPortal",
		},
	],
	allOtherAnomalies: [
		{
			name: "Java/acme.storefront.action.ViewCartAction/view",
			text: "acme.storefront.action.ViewCartAction/view",
			codeFilepath: undefined,
			codeNamespace: "acme.storefront.action.ViewCartAction",
			codeFunction: "view",
			language: "java",
			oldValue: 0,
			newValue: 0,
			ratio: 1,
			sinceText: "",
			totalDays: 0,
			chartHeaderTexts: {},
			metricTimesliceName: "",
			errorMetricTimesliceName: "",
			notificationText: "",
			entityName: "",
		},
		{
			name: "Java/acme.storefront.InsightsInterceptor/intercept",
			text: "acme.storefront.InsightsInterceptor/intercept",
			codeFilepath: undefined,
			codeNamespace: "acme.storefront.InsightsInterceptor",
			codeFunction: "intercept",
			language: "java",
			oldValue: 0,
			newValue: 0,
			ratio: 1,
			sinceText: "",
			totalDays: 0,
			chartHeaderTexts: {},
			metricTimesliceName: "",
			errorMetricTimesliceName: "",
			notificationText: "",
			entityName: "",
		},
		{
			name: "Java/acme.storefront.action.BrowsePhoneAction/browsePhone",
			text: "acme.storefront.action.BrowsePhoneAction/browsePhone",
			codeFilepath: undefined,
			codeNamespace: "acme.storefront.action.BrowsePhoneAction",
			codeFunction: "browsePhone",
			language: "java",
			oldValue: 0,
			newValue: 0,
			ratio: 1,
			sinceText: "",
			totalDays: 0,
			chartHeaderTexts: {},
			metricTimesliceName: "",
			errorMetricTimesliceName: "",
			notificationText: "",
			entityName: "",
		},
		{
			name: "Java/org.apache.http.impl.client.InternalHttpClient/execute",
			text: "org.apache.http.impl.client.CloseableHttpClient/execute",
			codeFilepath: undefined,
			codeNamespace: "org.apache.http.impl.client.CloseableHttpClient",
			codeFunction: "execute",
			language: "java",
			oldValue: 0,
			newValue: 0,
			ratio: 1,
			sinceText: "",
			totalDays: 0,
			chartHeaderTexts: {},
			metricTimesliceName: "",
			errorMetricTimesliceName: "",
			notificationText: "",
			entityName: "",
		},
		{
			name: "Java/acme.storefront.InsightsInterceptor/intercept",
			text: "acme.storefront.InsightsInterceptor/intercept",
			codeFilepath: undefined,
			codeNamespace: "acme.storefront.InsightsInterceptor",
			codeFunction: "intercept",
			language: "java",
			oldValue: 0,
			newValue: 0,
			ratio: 1,
			sinceText: "",
			totalDays: 0,
			chartHeaderTexts: {},
			metricTimesliceName: "",
			errorMetricTimesliceName: "",
			notificationText: "",
			entityName: "",
		},
		{
			name: "Java/org.apache.catalina.servlets.DefaultServlet/doPost",
			text: "org.apache.catalina.servlets.DefaultServlet/doPost",
			codeFilepath: undefined,
			codeNamespace: "org.apache.catalina.servlets.DefaultServlet",
			codeFunction: "doPost",
			language: "java",
			oldValue: 0,
			newValue: 0,
			ratio: 1,
			sinceText: "",
			totalDays: 0,
			chartHeaderTexts: {},
			metricTimesliceName: "",
			errorMetricTimesliceName: "",
			notificationText: "",
			entityName: "",
		},
	],
	detectionMethod: "Release Based",
	didNotifyNewAnomalies: false,
	isSupported: true,
};

const metricTimesliceNames = {
	source: "metric",
	duration: "Java/acme.storefront.action.LoginAction/login",
	errorRate: "Java/acme.storefront.action.LoginAction/login",
	sampleSize: "Java/acme.storefront.action.LoginAction/login",
};

const errorRateChartTemplate = {
	metricQuery:
		"SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS 'Errors (per minute)'\n\t\t\t\t\t\t\t\t\t\t\t\tFROM Metric\n                  WHERE `entity.guid` = 'MTYwNjg2MnxBUE18QVBQTElDQVRJT058NDMxOTIyMTA'\n                    AND metricTimesliceName = 'Java/acme.storefront.action.LoginAction/login' FACET metricTimesliceName TIMESERIES",
	spanQuery:
		"SELECT rate(count(*), 1 minute) AS 'Errors (per minute)'\n                               FROM Span\n                               WHERE entity.guid IN ('MTYwNjg2MnxBUE18QVBQTElDQVRJT058NDMxOTIyMTA')\n                                 AND name = 'Java/acme.storefront.action.LoginAction/login'\n                                 AND `error.group.guid` IS NOT NULL FACET name TIMESERIES",
	title: "Errors (per minute)",
	name: "errorsPerMinute",
	result: [],
	timeWindow: 1696881900000,
};

const durationChartTemplate = {
	metricQuery:
		"SELECT average(newrelic.timeslice.value) * 1000 AS 'Average duration (ms)'\n\t\t\t\t\t\t\t\t\t\t\t\tFROM Metric\n                  WHERE entity.guid IN ('MTYwNjg2MnxBUE18QVBQTElDQVRJT058NDMxOTIyMTA')\n                    AND metricTimesliceName = 'Java/acme.storefront.action.LoginAction/login' TIMESERIES",
	spanQuery:
		"SELECT average(duration) * 1000 AS 'Average duration (ms)'\n                               FROM Span\n                               WHERE entity.guid IN ('MTYwNjg2MnxBUE18QVBQTElDQVRJT058NDMxOTIyMTA')\n                                 AND name = 'Java/acme.storefront.action.LoginAction/login' FACET name TIMESERIES",
	title: "Average duration (ms)",
	name: "responseTimeMs",
	result: [],
	timeWindow: 1696881900000,
};

const samplesChartTemplate = {
	metricQuery:
		"SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'Samples (per minute)'\n\t\t\t\t\t\t\t\t\t\t\t\tFROM Metric\n                  WHERE entity.guid IN ('MTYwNjg2MnxBUE18QVBQTElDQVRJT058NDMxOTIyMTA')\n                    AND metricTimesliceName = 'Java/acme.storefront.action.LoginAction/login' TIMESERIES",
	spanQuery:
		"SELECT rate(count(*), 1 minute) AS 'Samples (per minute)'\n                               FROM Span\n                               WHERE entity.guid IN ('MTYwNjg2MnxBUE18QVBQTElDQVRJT058NDMxOTIyMTA')\n                                 AND name = 'Java/acme.storefront.action.LoginAction/login' FACET name TIMESERIES",
	title: "Samples (per minute)",
	name: "samplesPerMinute",
	result: [],
	timeWindow: 1696881900000,
};

const threeDaysAgoMidnight = new Date();
threeDaysAgoMidnight.setHours(0, 0, 0, 0);
threeDaysAgoMidnight.setDate(threeDaysAgoMidnight.getDate() - 3);
const threeDaysAgoMidnightSeconds = Math.floor(threeDaysAgoMidnight.getTime() / 1000);

const deployments = [
	{
		seconds: threeDaysAgoMidnightSeconds,
		version: "CS42",
	},
];
