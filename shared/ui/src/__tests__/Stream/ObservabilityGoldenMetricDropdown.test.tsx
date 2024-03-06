import { CodeStreamState } from "@codestream/webview/store";
import { ConfigsState } from "@codestream/webview/store/configs/types";
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { CSRepository, CSUser } from "../../../../util/src/protocol/agent/api.protocol.models";
import { ObservabilityGoldenMetricDropdown } from "../../../Stream/ObservabilityGoldenMetricDropdown";
import { ContextState } from "@codestream/webview/store/context/types";

function createState(options: {
	goldenMetricsDropdownIsExpanded: boolean;
}): Partial<CodeStreamState> {
	return {
		capabilities: {
			openLink: true,
		},
		session: {
			userId: "abcd1234",
		},
		users: {
			abcd1234: {} as CSUser as any,
		},
		configs: {
			showGoldenSignalsInEditor: true,
		} as ConfigsState,
		context: {} as ContextState as any,
		preferences: {
			goldenMetricsDropdownIsExpanded: options?.goldenMetricsDropdownIsExpanded,
		},
		providers: {
			"newrelic*com": {
				id: "newrelic*com",
				name: "newrelic",
				host: "newrelichost.co",
			},
		},
		ide: {
			name: "JETBRAINS",
		},

		editorContext: {
			textEditorUri: "blah",
		},
		repos: {
			repoid: {} as CSRepository,
		},
	};
}

describe("ObservabilityGoldenMetricDropdown", () => {
	const mockProps = {
		errors: [],
		entityGuid: "entity-guid",
		accountId: 123,
		entityGoldenMetrics: {
			metrics: [
				{
					name: "errorRate",
					title: "Error Rate",
					value: 0.1,
					displayValue: "10%",
					displayUnit: "%",
					queries: {
						timeseries: "FROM Foo select count(*) TIMESERIES",
					},
					unit: "",
				},
				{
					name: "responseTimeMs",
					title: "Response Time",
					value: 100,
					displayValue: "100 ms",
					displayUnit: "ms",
					queries: {
						timeseries: "FROM Baz select count(*) TIMESERIES",
					},
					unit: "",
				},
			],
			pillsData: {
				responseTimeData: {
					percentChange: 5,
					permalinkUrl: "responseTimePermalink",
				},
				errorRateData: {
					percentChange: 10,
					permalinkUrl: "errorRatePermalink",
				},
			},
			lastUpdated: "2022-01-01",
			since: "1 day",
		},
		loadingGoldenMetrics: false,
		noDropdown: false,
	};

	it("renders the golden metrics when expanded", async () => {
		const mockStore = configureStore([]);

		await act(async () => {
			render(
				<Provider store={mockStore(createState({ goldenMetricsDropdownIsExpanded: true }))}>
					<ObservabilityGoldenMetricDropdown {...mockProps} />
				</Provider>
			);
		});

		expect(screen.queryByTestId("golden-metrics-entity-guid")).toHaveTextContent("Golden Metrics");
		expect(screen.queryByTestId("responseTimeMs-entity-guid")).toHaveTextContent("Response Time");
	});

	it("renders the golden metrics section but not expanded", async () => {
		const mockStore = configureStore([]);

		await act(async () => {
			render(
				<Provider store={mockStore(createState({ goldenMetricsDropdownIsExpanded: false }))}>
					<ObservabilityGoldenMetricDropdown {...mockProps} />
				</Provider>
			);
		});

		expect(screen.queryByTestId("golden-metrics-entity-guid")).toHaveTextContent("Golden Metrics");
		expect(screen.queryByTestId("responseTimeMs-entity-guid")).toBeNull();
	});
});
