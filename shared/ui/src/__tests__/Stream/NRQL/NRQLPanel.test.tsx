/**
 * @jest-environment jsdom
 */
import {
	GetAllAccountsResponse,
	GetNRQLRecentQueriesResponse,
	GetNRQLResponse,
} from "@codestream/protocols/agent";
import { createTheme } from "@codestream/webview/src/themes";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";
import { NRQLPanel } from "@codestream/webview/Stream/NRQL/NRQLPanel";
import { HostApi } from "@codestream/webview/webview-api";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider } from "styled-components";

global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
}));

jest.mock("@codestream/webview/store/apiVersioning/reducer");
jest.mock("@codestream/webview/webview-api");
jest.mock("@codestream/webview/store/providers/reducer");

const mockIsFeatureEnabled = jest.mocked(isFeatureEnabled);
mockIsFeatureEnabled.mockReturnValue(true);

const MockedHostApi = HostApi as any;
const mockTrack = jest.fn();
const mockHostApi = {
	track: mockTrack,
	on: () => {
		return {
			dispose: () => {},
		};
	},
	send: async (a: { method: string }, b, c) => {
		if (a.method === "codestream/newrelic/nrql/queries/recent") {
			return {
				items: [
					{
						query: "SELECT * FROM FOO",
						accounts: [{ id: 1, name: "foo" }],
						createdAt: new Date().getTime(),
					},
				],
			} as GetNRQLRecentQueriesResponse;
		}
		if (a.method === "codestream/newrelic/accounts/all") {
			return {
				accounts: [{ id: 1, name: "account1" }],
			} as GetAllAccountsResponse;
		}
		if (a.method === "codestream/newrelic/nrql/search") {
			return {
				results: [{ foo: "bar" }],
				accountId: 1,
				resultsTypeGuess: { selected: "json", enabled: [] },
			} as GetNRQLResponse;
		}
		return true;
	},
};

MockedHostApi.mockImplementation(() => {
	return mockHostApi;
});
// YUCK yuck yuck, static singletons are bad bad bad for testing
MockedHostApi.instance = mockHostApi;

describe("NRQL Panel UI", () => {
	let container: HTMLDivElement | undefined = undefined;

	it("should render", async () => {
		const props = {
			accountId: 1,
			entryPoint: "test",
			query: "FROM foo SELECT *",
		};

		await act(async () => {
			render(
				<ThemeProvider theme={createTheme()}>
					<NRQLPanel {...props}></NRQLPanel>
				</ThemeProvider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("run")).toHaveTextContent("Run");

			expect(mockTrack).toHaveBeenCalledTimes(2);
			expect(mockTrack).toHaveBeenCalledWith("codestream/nrql/webview opened", {
				event_type: "click",
				meta_data: `entry_point: ${props.entryPoint}`,
			});
			expect(mockTrack).toHaveBeenCalledWith("codestream/nrql/query submitted", {
				account_id: props.accountId,
				event_type: "response",
				meta_data: `default_visualization: json`,
				meta_data_2: `recent_query: false`,
			});
		});
	});
});
