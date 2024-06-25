/**
 * @jest-environment jsdom
 */
import { CSUser } from "@codestream/protocols/api";
import { CodeStreamState } from "@codestream/webview/store";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";
import { Notifications } from "@codestream/webview/Stream/Notifications";
import { HostApi } from "@codestream/webview/webview-api";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";

jest.mock("@codestream/webview/store/apiVersioning/reducer");
jest.mock("@codestream/webview/webview-api");
jest.mock("@codestream/webview/store/providers/reducer");

const mockIsFeatureEnabled = jest.mocked(isFeatureEnabled);
mockIsFeatureEnabled.mockReturnValue(true);

const MockedHostApi = HostApi as any;

const mockHostApi = {
	track: jest.fn(),
	on: jest.fn(),
	send: jest.fn(),
};

MockedHostApi.mockImplementation(() => {
	return mockHostApi;
});
// YUCK yuck yuck, static singletons are bad bad bad for testing
MockedHostApi.instance = mockHostApi;

const user: Partial<CSUser> = {
	id: "abcd1234",
	createdAt: 1641415000000,
};

const baseState: Partial<CodeStreamState> = {
	session: {
		userId: "abcd1234",
	},
	users: {
		abcd1234: user as CSUser,
	},
	preferences: {},
	ide: {
		name: "JETBRAINS",
	},
};

describe("Notifications UI", () => {
	it("shows notify me about performance issues", async () => {
		const mockStore = configureStore();
		render(
			<Provider store={mockStore(baseState)}>
				<Notifications />
			</Provider>
		);
		expect(
			screen.queryByText("Notify me about services with performance problems")
		).toBeInTheDocument();
	});
});
