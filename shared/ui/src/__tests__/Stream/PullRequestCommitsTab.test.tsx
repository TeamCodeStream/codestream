/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import { ThemeProvider } from "styled-components";
import { CodeStreamState } from "@codestream/webview/store";
import * as providerPullRequestActions from "@codestream/webview/store/providerPullRequests/actions";
import { PullRequestCommitsTab } from "@codestream/webview/Stream/PullRequestCommitsTab";
import { HostApi } from "@codestream/webview/webview-api";
import { act, render, screen, waitFor } from "@testing-library/react";
import { lightTheme } from "../../themes";

jest.mock("@codestream/webview/webview-api");
jest.mock("@codestream/webview/store/providerPullRequests/actions");

const providerPullRequestActionsMock = jest.mocked(providerPullRequestActions);
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

const baseState: Partial<CodeStreamState> = {
	context: {
		currentPullRequest: {
			id: "something",
			providerId: "bitbucket*org"
		}
	} as any,
	providerPullRequests: {
		myPullRequests: {},
		pullRequests: {}
	},
	capabilities: {
		openLink: true
	}
};

describe("PullRequestCommitsTab", () => {
	const pr = {
		providerId: "bitbucket*org",
		url: "https://example.com"
	};

	it("Should show commits in order across different years", async () => {
		const mockStore = configureStore(middlewares);

		providerPullRequestActionsMock.getPullRequestCommits.mockReturnValue(
			(dispatch, getState: Function) => {
				return Promise.resolve([
					{
						abbreviatedOid: "123456",
						author: {
							name: "jdoe",
							user: {
								login: "jdoe"
							}
						},
						committer: {
							name: "jdoe",
							user: {
								login: "jdoe"
							}
						},
						message: "my message 2",
						authoredDate: "2022-09-06T14:58:24.244Z",
						oid: "1234567890",
						url: "https://example.com"
					},
					{
						abbreviatedOid: "123456",
						author: {
							name: "jdoe",
							user: {
								login: "jdoe"
							}
						},
						committer: {
							name: "jdoe",
							user: {
								login: "jdoe"
							}
						},
						message: "my message 1",
						authoredDate: "2021-09-06T14:58:24.244Z",
						oid: "1234567890",
						url: "https://example.com"
					}
				]);
			}
		);

		await act(async () => {
			render(
				<Provider store={mockStore(baseState)}>
					<ThemeProvider theme={lightTheme}>
						<PullRequestCommitsTab pr={pr} />
					</ThemeProvider>
				</Provider>
			);
		});

		await waitFor(() => {
			const expectedOrder = ["2021-09-06T00:00:00.000Z", "2022-09-06T00:00:00.000Z"];
			const elements = screen.queryAllByTestId(/202\d\-09\-06.*/);
			expect(Array.from(elements).map(el => el.getAttribute("data-testid"))).toEqual(expectedOrder);
		});
	});
});
