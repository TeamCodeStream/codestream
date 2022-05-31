/**
 * @jest-environment jsdom
 */
import { CSNotificationDeliveryPreference, CSUser } from "@codestream/protocols/api";
import { CodeStreamState } from "@codestream/webview/store";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";
import * as storeActions from "@codestream/webview/Stream/actions";
import { Notifications } from "@codestream/webview/Stream/Notifications";
import { HostApi } from "@codestream/webview/webview-api";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import * as providerSelectors from "@codestream/webview/store/providers/reducer";

jest.mock("@codestream/webview/store/apiVersioning/reducer");
jest.mock("@codestream/webview/webview-api");
jest.mock("@codestream/webview/store/providers/reducer");

const mockIsFeatureEnabled = jest.mocked(isFeatureEnabled);
mockIsFeatureEnabled.mockReturnValue(true);

const mockProviderSelectors = jest.mocked(providerSelectors);

const spySetUserPreference = jest.spyOn(storeActions, "setUserPreference");

const middlewares = [thunk];

const MockedHostApi = HostApi as any;

const mockHostApi = {
	track: jest.fn(),
	on: jest.fn(),
	send: jest.fn()
};

MockedHostApi.mockImplementation(() => {
	return mockHostApi;
});
// YUCK yuck yuck, static singletons are bad bad bad for testing
MockedHostApi.instance = mockHostApi;

const user: Partial<CSUser> = {
	id: "abcd1234",
	createdAt: 1641415000000
};

const baseState: Partial<CodeStreamState> = {
	session: {
		userId: "abcd1234"
	},
	users: {
		abcd1234: user as CSUser
	},
	preferences: {
		reviewCreateOnDetectUnreviewedCommits: true
	},
	ide: {
		name: "JETBRAINS"
	}
};

describe("Notifications UI", () => {
	it("Should show PR notification settings for supported providers", async () => {
		const mockStore = configureStore();
		mockProviderSelectors.getConnectedSupportedPullRequestHosts.mockReturnValue([
			{
				id: "github*com",
				isConnected: true,
				name: "name",
				host: "host",
				hasAccessTokenError: false
			}
		]);
		render(
			<Provider store={mockStore(baseState)}>
				<Notifications />
			</Provider>
		);

		expect(screen.queryByText("Notify me about pull requests assigned to me")).toBeInTheDocument();
		expect(
			screen.queryByText("Notify me about new unreviewed commits from teammates when I pull")
		).toBeInTheDocument();
	});

	it("Should not show PR notification settings for unsupported providers", async () => {
		mockProviderSelectors.getConnectedSupportedPullRequestHosts.mockReturnValue([
			{
				id: "bitbucket",
				isConnected: true,
				name: "name",
				host: "host",
				hasAccessTokenError: false
			}
		]);
		const mockStore = configureStore();
		render(
			<Provider store={mockStore(baseState)}>
				<Notifications />
			</Provider>
		);

		expect(
			screen.queryByText("Notify me about pull requests assigned to me")
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Notify me about new unreviewed commits from teammates when I pull")
		).toBeInTheDocument();
	});

	it("Should not show PR notification settings for unsupported IDE", async () => {
		const state = { ...baseState, ide: "VS" };
		mockProviderSelectors.getConnectedSupportedPullRequestHosts.mockReturnValue([
			{
				id: "github*com",
				isConnected: true,
				name: "name",
				host: "host",
				hasAccessTokenError: false
			}
		]);
		const mockStore = configureStore();
		render(
			<Provider store={mockStore(state)}>
				<Notifications />
			</Provider>
		);

		expect(
			screen.queryByText("Notify me about pull requests assigned to me")
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Notify me about new unreviewed commits from teammates when I pull")
		).not.toBeInTheDocument();
	});

	it("shows desktop and email explainer when hasDesktopNotifications", async () => {
		const mockStore = configureStore();
		mockProviderSelectors.getConnectedSupportedPullRequestHosts.mockReturnValue([
			{
				id: "github*com",
				isConnected: true,
				name: "name",
				host: "host",
				hasAccessTokenError: false
			}
		]);
		render(
			<Provider store={mockStore(baseState)}>
				<Notifications />
			</Provider>
		);
		expect(
			screen.queryByText(
				"Follow codemarks and feedback requests to receive desktop and email notifications."
			)
		).toBeInTheDocument();
	});

	it("shows only email explainer when not hasDesktopNotifications", async () => {
		const state = { ...baseState, ide: "VS" };
		mockProviderSelectors.getConnectedSupportedPullRequestHosts.mockReturnValue([
			{
				id: "github*com",
				isConnected: true,
				name: "name",
				host: "host",
				hasAccessTokenError: false
			}
		]);
		const mockStore = configureStore();
		render(
			<Provider store={mockStore(state)}>
				<Notifications />
			</Provider>
		);
		expect(
			screen.queryByText("Follow codemarks and feedback requests to receive email notifications.")
		).toBeInTheDocument();
	});

	it("selects correct radio button for notificationDeliveryPreference", async () => {
		const mockStore = configureStore(middlewares);
		mockProviderSelectors.getConnectedSupportedPullRequestHosts.mockReturnValue([
			{
				id: "github*com",
				isConnected: true,
				name: "name",
				host: "host",
				hasAccessTokenError: false
			}
		]);
		let state = baseState;
		const store = mockStore(() => state);
		render(
			<Provider store={store}>
				<Notifications />
			</Provider>
		);

		expect(screen.getByTestId("delivery-all")).toBeChecked();
		expect(screen.getByTestId("delivery-email")).not.toBeChecked();
		expect(screen.getByTestId("delivery-desktop")).not.toBeChecked();
		expect(screen.getByTestId("delivery-none")).not.toBeChecked();

		act(() => {
			fireEvent.click(screen.getByTestId("delivery-desktop"));
		});

		// Verify action called
		expect(spySetUserPreference).toHaveBeenCalledWith(
			["notificationDelivery"],
			CSNotificationDeliveryPreference.ToastOnly
		);

		// Verify correct action to update state was dispatched
		const expectedPayload = {
			type: "UPDATE_PREFERENCES",
			payload: {
				notificationDelivery: "toastOnly"
			}
		};

		expect(store.getActions()).toEqual([expectedPayload]);

		// Simulate state change and check UI (redux-mock-store does not update state)
		state = {
			...state,
			preferences: {
				...state.preferences,
				notificationDelivery: CSNotificationDeliveryPreference.ToastOnly
			}
		};

		store.dispatch({ type: "ANY_ACTION" });

		expect(screen.getByTestId("delivery-desktop")).toBeChecked();
		expect(screen.getByTestId("delivery-all")).not.toBeChecked();
		expect(screen.getByTestId("delivery-email")).not.toBeChecked();
		expect(screen.getByTestId("delivery-none")).not.toBeChecked();
	});
});
