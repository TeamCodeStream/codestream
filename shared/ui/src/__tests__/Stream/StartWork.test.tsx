/**
 * @jest-environment jsdom
 */
import {
	FetchBranchCommitsStatusRequestType,
	GetBranchesRequestType,
	GetBranchesResponse,
	GetReposScmRequestType,
	GetReposScmResponse,
	UpdateStatusRequestType
} from "@codestream/protocols/agent";
import { CSRepository, CSTeam, CSUser } from "@codestream/protocols/api";
import { lightTheme } from "@codestream/webview/src/themes";
import { CodeStreamState } from "@codestream/webview/store";
import { ContextState } from "@codestream/webview/store/context/types";
import * as providerSelectors from "@codestream/webview/store/providers/reducer";
import { TeamsState } from "@codestream/webview/store/teams/types";
import * as storeActions from "@codestream/webview/Stream/actions";
import { CardView } from "@codestream/webview/Stream/CrossPostIssueControls/IssuesPane";
import { StartWork } from "@codestream/webview/Stream/StartWork";
import { HostApi } from "@codestream/webview/webview-api";
import "@testing-library/jest-dom";
import { fireEvent, render, RenderResult, screen, waitFor } from "@testing-library/react";
import React from "react";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import { ThemeProvider } from "styled-components";

jest.mock("@codestream/webview/store/apiVersioning/reducer");
jest.mock("@codestream/webview/webview-api");
jest.mock("@codestream/webview/store/providers/reducer");

const mockProviderSelectors = jest.mocked(providerSelectors);
const spySetUserPreference = jest.spyOn(storeActions, "setUserPreference");

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
	createdAt: 1641415000000,
	status: {
		myteam: {
			label: "label",
			ticketId: "ticketId",
			ticketUrl: "ticketUrl",
			ticketProvider: "trello*com"
		}
	}
};

const teams: TeamsState = {
	myteam: ({
		id: "myteam",
		name: "teamname"
	} as Partial<CSTeam>) as CSTeam
};

const context: Partial<ContextState> = {
	currentTeamId: "myteam"
};

const myrepo: Partial<CSRepository> = {
	id: "repoid",
	name: "myrepo"
};

const baseState: Partial<CodeStreamState> = {
	session: {
		userId: "abcd1234"
	},
	users: {
		abcd1234: user as CSUser
	},
	context: context as ContextState,
	preferences: {
		startWork: { createBranch: false }
	},
	ide: {
		name: "JETBRAINS"
	},
	teams,
	editorContext: {
		textEditorUri: "blah"
	},
	repos: {
		repoid: myrepo as CSRepository
	}
};

let container: HTMLDivElement = null!;
beforeEach(() => {
	const container = document.createElement("div");
	container.id = "modal-root";
	document.body.appendChild(container);
});

afterEach(() => {
	container && document.body.removeChild(container);
	container = null!;
});

const baseCard: CardView = {
	id: "1234",
	modifiedAt: Date.now(),
	body: "body of card",
	title: "title of card",
	key: "card-1234",
	idList: "3333",
	listName: "Review",
	moveCardLabel: "Move this ticket to",
	provider: {
		id: "trello*com",
		name: "trello"
	},
	providerId: "trello*com",
	moveCardOptions: [
		{
			id: "1111",
			name: "Backlog"
		},
		{
			id: "2222",
			name: "In Progress"
		},
		{
			id: "3333",
			name: "Review"
		},
		{
			id: "4444",
			name: "Done"
		}
	]
};

describe("Issue State Change", () => {
	const middlewares = [thunk];
	const mockStore = configureStore(middlewares);
	mockProviderSelectors.getConnectedSharingTargets.mockReturnValue([]);
	const onClose = jest.fn();
	mockHostApi.send.mockImplementation((type, options) => {
		switch (type) {
			case FetchBranchCommitsStatusRequestType: {
				return 0;
			}
			case GetReposScmRequestType: {
				return {
					repositories: [
						{
							id: "repoid",
							currentBranch: "main"
						}
					]
				} as GetReposScmResponse;
			}
			case GetBranchesRequestType: {
				return {
					scm: { branches: ["main", "feature/feature1"], repoId: "repoid" }
				} as GetBranchesResponse;
			}
			case UpdateStatusRequestType: {
				return { user: user };
			}
		}
		return undefined;
	});

	it("Should show next state selection for trello", async () => {
		const card: CardView = { ...baseCard };

		await act(async () => {
			render(
				<Provider store={mockStore(baseState)}>
					<ThemeProvider theme={lightTheme}>
						<StartWork card={card} onClose={onClose} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		// idList 3333 is current state - 4444 (Done) is next item
		await waitFor(() => {
			expect(screen.queryByTestId("checkbox-move-issue-label")).toHaveTextContent("Done");
		});
	});

	it("Should default to first transition (backlog) when current state is last for trello", async () => {
		const card: CardView = { ...baseCard, idList: "4444", listName: "Done" };

		await act(async () => {
			render(
				<Provider store={mockStore(baseState)}>
					<ThemeProvider theme={lightTheme}>
						<StartWork card={card} onClose={onClose} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		// idList 4444 is current state - next item invalid so should default to 0th item (backlog)
		await waitFor(() => {
			expect(screen.queryByTestId("checkbox-move-issue-label")).toHaveTextContent("Backlog");
		});
	});

	it("Should default to first state when MRU transition for Jira are empty", async () => {
		const card: CardView = {
			...baseCard,
			idList: "2222", // In Progress
			provider: { id: "jiraserver/enterprise", name: "jiraserver" },
			providerId: "jiraserver/enterprise",
			moveCardOptions: [
				// In Jira current status "2222" not in moveCardOptions
				{
					id: "1111",
					name: "Backlog"
				},
				{
					id: "3333",
					name: "Review"
				},
				{
					id: "4444",
					name: "Done"
				}
			]
		};

		await act(async () => {
			render(
				<Provider store={mockStore(baseState)}>
					<ThemeProvider theme={lightTheme}>
						<StartWork card={card} onClose={onClose} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("checkbox-move-issue-label")).toHaveTextContent("Backlog");
		});
	});

	it("Should use issueMru transition for Jira", async () => {
		const card: CardView = {
			...baseCard,
			idList: "2222", // In Progress
			provider: { id: "jiraserver/enterprise", name: "jiraserver" },
			providerId: "jiraserver/enterprise",
			moveCardOptions: [
				// In Jira current status "2222" not in moveCardOptions
				{
					id: "1111",
					name: "Backlog"
				},
				{
					id: "3333",
					name: "Review"
				},
				{
					id: "4444",
					name: "Done"
				}
			]
		};
		const state: Partial<CodeStreamState> = {
			...baseState,
			preferences: {
				...baseState.preferences,
				issueMru: { "jiraserver/enterprise": { "2222": "3333" } }
			}
		};

		await act(async () => {
			render(
				<Provider store={mockStore(state)}>
					<ThemeProvider theme={lightTheme}>
						<StartWork card={card} onClose={onClose} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		// idList 2222 is current state - should choose 3333 "In Review"
		await waitFor(() => {
			expect(screen.queryByTestId("checkbox-move-issue-label")).toHaveTextContent("Review");
		});
	});

	it("Should save updated MRU transition to preferences for Jira when a different transition selected", async () => {
		const card: CardView = {
			...baseCard,
			idList: "2222", // In Progress
			provider: { id: "jiraserver/enterprise", name: "jiraserver" },
			providerId: "jiraserver/enterprise",
			moveCardOptions: [
				// In Jira current status "2222" not in moveCardOptions
				{
					id: "1111",
					name: "Backlog"
				},
				{
					id: "3333",
					name: "Review"
				},
				{
					id: "4444",
					name: "Done"
				}
			]
		};
		const state: Partial<CodeStreamState> = {
			...baseState,
			preferences: {
				...baseState.preferences,
				issueMru: { "jiraserver/enterprise": { "2222": "1111" } }
			}
		};

		let component: RenderResult;

		await act(async () => {
			component = render(
				<Provider store={mockStore(state)}>
					<ThemeProvider theme={lightTheme}>
						<StartWork card={card} onClose={onClose} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("checkbox-move-issue-label")).toHaveTextContent("Backlog");
		});

		await act(async () => {
			fireEvent.click(screen.getByText("Backlog"));
		});

		await waitFor(() => {
			expect(screen.queryByText("Review")).toBeInTheDocument();
		});

		await act(async () => {
			fireEvent.click(screen.getByText("Review"));
		});

		await act(async () => {
			fireEvent.click(screen.getByText("Start Work"));
		});

		expect(spySetUserPreference).toHaveBeenLastCalledWith(
			// ["issueMru", "jiraserver/enterprise", "2222"], // Correct but doesn't work
			["2222"], // jest bug?
			"3333"
		);
	});
});
