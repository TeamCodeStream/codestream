import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";

import { GetMethodLevelTelemetryResponse } from "@codestream/protocols/agent";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import { waitFor } from "@testing-library/react";

import { setupCommunication } from "../../index";
import { MethodLevelTelemetryPanel } from "../../Stream/MethodLevelTelemetry/MethodLevelTelemetryPanel";
import { HostApi } from "../../webview-api";

// HostApi is now a mock constructor
jest.mock("../../webview-api");

setupCommunication({
	postMessage: function() {}
});

let container: any = undefined;
beforeEach(() => {
	// setup a DOM element as a render target
	container = document.createElement("div");
	document.body.appendChild(container);

	HostApi.instance = {};
	HostApi.mockClear();
});

afterEach(() => {
	// cleanup on exiting
	unmountComponentAtNode(container);
	container.remove();
	container = undefined;
});

const storeFactory = () => {
	return {
		context: {
			currentTeamId: "",
			currentPullRequest: undefined,
			currentMethodLevelTelemetry: {
				repo: {
					id: "123",
					name: "repoName",
					remote: "http://"
				},
				relativeFilePath: "/foo/bar.py",
				functionName: "hello_world",
				metricTimesliceNameMapping: {}
			} as CurrentMethodLevelTelemetry
		},
		ide: {
			name: "VSC"
		},
		configs: {
			showGoldenSignalsInEditor: true
		},
		users: {
			"123": {
				status: {}
			}
		},
		session: {
			userId: "123"
		}
	};
};

it("renders default state", async () => {
	let mockHostApi = {
		track: async function() {},
		send: async (a, b, c) => {
			//	console.warn(a, a.method, b, c);
			if (a.method === "codestream/newrelic/methodLevelMethodTelemetry") {
				return {
					newRelicEntityGuid: "123",
					newRelicUrl: "https://",
					goldenMetrics: [{}],
					newRelicEntityAccounts: [{}],
					newRelicEntityName: "entityName"
				} as GetMethodLevelTelemetryResponse;
			}
			return new Promise(resolve => resolve(true));
		},
		on: () => {
			return {
				dispose: function() {}
			};
		}
	};
	HostApi.mockImplementation(() => {
		return mockHostApi;
	});
	// YUCK yuck yuck, static singletons are bad bad bad for testing
	HostApi.instance = mockHostApi;

	const mockStore = configureStore();

	act(() => {
		render(
			<Provider store={mockStore(storeFactory())}>
				<MethodLevelTelemetryPanel />{" "}
			</Provider>,
			container
		);
	});
	await waitFor(() => {
		expect((container as any).textContent).toBe(
			"entityName hello_world telemetryEntity: entityNameRepo: repoNameFile: /foo/bar.py "
		);
	});
});
