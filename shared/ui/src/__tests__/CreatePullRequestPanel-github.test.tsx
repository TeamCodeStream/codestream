/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";

import { waitFor } from "@testing-library/react";

import { setupCommunication } from "../../index";
import { CreatePullRequestPanel } from "../../Stream/CreatePullRequestPanel";

import { HostApi } from "../../webview-api";
import { CheckPullRequestPreconditionsResponse } from "@codestream/protocols/agent";
// HostApi is now a mock constructor
jest.mock("../../webview-api");

// None of the typescript jest magic types type this correctly
const MockedHostApi = HostApi as any;

setupCommunication({
	postMessage: function() {}
});

let container: any = undefined;
beforeEach(() => {
	// setup a DOM element as a render target
	container = document.createElement("div");
	document.body.appendChild(container);

	MockedHostApi.instance = {};
	MockedHostApi.mockClear();
});

afterEach(() => {
	// cleanup on exiting
	unmountComponentAtNode(container);
	container.remove();
	container = undefined;
});

const storeFactory = () => {
	return {
		context: { currentTeamId: "", currentPullRequest: undefined },
		providers: {
			github: {},
			"github*com": {
				name: "GitHub"
			},
			gitlab: {},
			github_enterprise: {},
			gitlab_enterprise: {},
			bitbucket: {},
			bitbucket_server: {}
		},
		repos: {},
		providerPullRequests: {},
		ide: {
			name: "VSC"
		},
		configs: {},
		users: {
			"123": {
				status: {}
			}
		},
		session: {
			userId: "123"
		},
		preferences: {
			pullRequestFilesChangedMode: "files"
		}
	};
};

it("renders default state", async () => {
	let mockHostApi = {
		send: async (a, b, c) => {
			//	console.warn(a, a.method, b, c);
			if (a.method === "codestream/scm/latestCommit") {
				return {
					shortMesssage: "shortMessage"
				};
			} else if (a.method === "codestream/review/pr/checkPreconditions") {
				return {
					success: true,
					repo: {
						branch: "feature/foo",
						branches: [],
						remoteBranch: "origin/feature/foo",
						commitsBehindOriginHeadBranch: "0"
					},
					provider: {
						repo: {
							defaultBranch: "main",
							isFork: false
						}
					}
				} as CheckPullRequestPreconditionsResponse;
			} else if (a.method === "codestream/scm/repos") {
				return {
					repositories: []
				};
			}
			return new Promise(resolve => resolve(true));
		},
		on: () => {
			return {
				dispose: function() {}
			};
		}
	};
	MockedHostApi.mockImplementation(() => {
		return mockHostApi;
	});
	// YUCK yuck yuck, static singletons are bad bad bad for testing
	MockedHostApi.instance = mockHostApi;

	const mockStore = configureStore();

	await act(async () => {
		render(
			<Provider store={mockStore(storeFactory())}>
				<CreatePullRequestPanel closePanel={e => {}} />{" "}
			</Provider>,
			container
		);
	});
	await waitFor(() => {
		expect((container as any).textContent).toBe(
			"Open a Pull Request Choose two branches to start a new pull request.CancelCreate Pull Request "
		);
	});
});

it("renders default state 2", async () => {
	let mockHostApi = {
		send: async (a: { method: string }, b, c) => {
			if (a.method === "codestream/scm/latestCommit") {
				return {
					shortMesssage: "shortMessage"
				};
			} else if (a.method === "codestream/review/pr/checkPreconditions") {
				return {
					success: true,
					repo: {
						id: "61fac86ad537c93d8bb9bf8a",
						remoteUrl: "//github.com/TeamCodeStream/a",
						remotes: ["origin", "private"],
						remoteBranch: "origin/foo",
						branch: "foo",
						branches: ["foo", "master", "private"],
						remoteBranches: [
							{
								remote: "origin",
								branch: "foo"
							},
							{
								remote: "origin",
								branch: "master"
							},
							{
								remote: "private",
								branch: "asdf"
							},
							{
								remote: "private",
								branch: "master"
							}
						]
					},
					provider: {
						id: "github*com",
						isConnected: true,
						pullRequestTemplateNames: [],
						pullRequestTemplatePath: "/Users/TeamCodeStream/code/a/.gitlab/merge_request_templates",
						repo: {
							defaultBranch: "master"
						}
					},
					review: {
						title: "",
						text: ""
					},
					commitsBehindOriginHeadBranch: "0"
				} as CheckPullRequestPreconditionsResponse;
			} else if (a.method === "codestream/scm/repos") {
				return {
					repositories: [
						{
							id: "61fac86ad537c93d8bb9bf8a",
							path: "/Users/TeamCodeStream/code/a",
							folder: {
								uri: "file:///Users/TeamCodeStream/code/a",
								name: "a"
							},
							root: true,
							providerId: "github*com"
						}
					]
				};
			}
			return new Promise(resolve => resolve(true));
		},
		on: () => {}
	};
	MockedHostApi.mockImplementation(() => {
		return mockHostApi;
	});
	// YUCK yuck yuck, static singletons are bad bad bad for testing
	MockedHostApi.instance = mockHostApi;

	const mockStore = configureStore();

	await act(async () => {
		render(
			<Provider store={mockStore(storeFactory())}>
				<CreatePullRequestPanel closePanel={e => {}} />{" "}
			</Provider>,
			container
		);
	});
	await waitFor(() => {
		expect((container as any).textContent).toBe(
			"Open a Pull Request Choose two branches to start a new pull request.base: mastercompare: fooCancelCreate Pull Request "
		);
	});
});

it("ALREADY_HAS_PULL_REQUEST", async () => {
	let mockHostApi = {
		send: async (a: { method: string }, b, c) => {
			if (a.method === "codestream/scm/latestCommit") {
				return {
					shortMesssage: "shortMessage"
				};
			} else if (a.method === "codestream/review/pr/checkPreconditions") {
				return {
					success: false,
					error: {
						type: "ALREADY_HAS_PULL_REQUEST",
						url: "asdf.com"
					}
				};
			} else if (a.method === "codestream/scm/repos") {
				return {
					repositories: []
				};
			}
			return new Promise(resolve => resolve(true));
		},
		on: () => {
			return {
				dispose: function() {}
			};
		}
	};
	MockedHostApi.mockImplementation(() => {
		return mockHostApi;
	});
	// YUCK yuck yuck, static singletons are bad bad bad for testing
	MockedHostApi.instance = mockHostApi;

	const mockStore = configureStore();

	await act(async () => {
		render(
			<Provider store={mockStore(storeFactory())}>
				<CreatePullRequestPanel closePanel={e => {}} />{" "}
			</Provider>,
			container
		);
	});
	await waitFor(() => {
		expect((container as any).textContent).toBe(
			"Open a Pull Request Choose two branches to start a new pull request.There is already an open pull request for this branch. View pull request "
		);
	});
});

it("REQUIRES_PROVIDER", async () => {
	let mockHostApi = {
		send: async (a: { method: string }, b, c) => {
			if (a.method === "codestream/scm/latestCommit") {
				return {
					shortMesssage: "shortMessage"
				};
			} else if (a.method === "codestream/review/pr/checkPreconditions") {
				return {
					success: false,
					error: {
						type: "REQUIRES_PROVIDER"
					}
				};
			} else if (a.method === "codestream/scm/repos") {
				return {
					repositories: []
				};
			}
			return new Promise(resolve => resolve(true));
		},
		on: () => {}
	};
	MockedHostApi.mockImplementation(() => {
		return mockHostApi;
	});
	// YUCK yuck yuck, static singletons are bad bad bad for testing
	MockedHostApi.instance = mockHostApi;

	const mockStore = configureStore();

	await act(async () => {
		render(
			<Provider store={mockStore(storeFactory())}>
				<CreatePullRequestPanel closePanel={e => {}} />{" "}
			</Provider>,
			container
		);
	});
	await waitFor(() => {
		expect((container as any).textContent).toBe(
			"Open a Pull Request Choose two branches to start a new pull request.Open a pull request on  "
		);
	});
});

it("REPO_NOT_FOUND", async () => {
	let mockHostApi = {
		send: async (a: { method: string }, b, c) => {
			if (a.method === "codestream/scm/latestCommit") {
				return {
					shortMesssage: "shortMessage"
				};
			}
			if (a.method === "codestream/review/pr/checkPreconditions") {
				return {
					success: false,
					error: {
						type: "REPO_NOT_FOUND"
					}
				};
			}
			if (a.method === "codestream/scm/repos") {
				return {
					repositories: []
				};
			}
			return true;
		},
		on: () => {}
	};
	MockedHostApi.mockImplementation(() => {
		return mockHostApi;
	});
	// YUCK yuck yuck, static singletons are bad bad bad for testing
	MockedHostApi.instance = mockHostApi;

	const mockStore = configureStore();

	await act(async () => {
		render(
			<Provider store={mockStore(storeFactory())}>
				<CreatePullRequestPanel closePanel={e => {}} />{" "}
			</Provider>,
			container
		);
	});
	await waitFor(() => {
		expect((container as any).textContent).toBe(
			"Open a Pull Request Choose two branches to start a new pull request.Repo not found "
		);
	});
});

it("HAS_LOCAL_MODIFICATIONS", async () => {
	let mockHostApi = {
		send: async (a: { method: string }, b, c) => {
			if (a.method === "codestream/scm/latestCommit") {
				return {
					shortMesssage: "shortMessage"
				};
			}
			if (a.method === "codestream/review/pr/checkPreconditions") {
				return {
					success: false,
					error: {
						type: "HAS_LOCAL_MODIFICATIONS"
					}
				};
			}
			if (a.method === "codestream/scm/repos") {
				return {
					repositories: []
				};
			}
			return true;
		},
		on: () => {}
	};
	MockedHostApi.mockImplementation(() => {
		return mockHostApi;
	});
	// YUCK yuck yuck, static singletons are bad bad bad for testing
	MockedHostApi.instance = mockHostApi;

	const mockStore = configureStore();

	await act(async () => {
		render(
			<Provider store={mockStore(storeFactory())}>
				<CreatePullRequestPanel closePanel={e => {}} />{" "}
			</Provider>,
			container
		);
	});
	await waitFor(() => {
		expect((container as any).textContent).toBe(
			"Open a Pull Request Choose two branches to start a new pull request.A pull request can't be created because the compare branch includes uncommitted changes. Commit and push your changes and then try again. "
		);
	});
});
