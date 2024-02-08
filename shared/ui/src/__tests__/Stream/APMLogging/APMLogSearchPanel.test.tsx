/**
 * @jest-environment jsdom
 */


import { createTheme } from "@codestream/webview/src/themes";
import { APMLogSearchPanel } from "@codestream/webview/Stream/APMLogging/APMLogSearchPanel";
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

jest.mock("@codestream/webview/webview-api");

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
		return true;
	},
};

MockedHostApi.mockImplementation(() => {
	return mockHostApi;
});
// YUCK yuck yuck, static singletons are bad bad bad for testing
MockedHostApi.instance = mockHostApi;

describe("APM Logging Panel UI", () => {
	let container: HTMLDivElement | undefined = undefined;

	it("should render using basic required fields", async () => {
		const props = {
			entityAccounts: [],
			entryPoint: "test",
		};

		await act(async () => {
			render(
				<ThemeProvider theme={createTheme()}>
					<APMLogSearchPanel {...props}></APMLogSearchPanel>
				</ThemeProvider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("default-message")).toBeVisible();
			expect(screen.queryByTestId("query-btn")).toBeEnabled();
			expect(screen.queryByTestId("query-text")).toHaveFocus();
			expect(screen.queryByTestId("query-text")).not.toHaveValue();

			expect(mockTrack).toHaveBeenCalledTimes(1);
			expect(mockTrack).toHaveBeenCalledWith("codestream/logs/webview opened", {
				event_type: "click",
				meta_data: `entry_point: ${props.entryPoint}`,
			});
		});
	});
});
