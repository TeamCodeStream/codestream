/**
 * @jest-environment jsdom
 */
import { CSRepository, CSTeam, CSUser } from "@codestream/protocols/api";
import { lightTheme } from "@codestream/webview/src/themes";
import { CodeStreamState } from "@codestream/webview/store";
import { ContextState } from "@codestream/webview/store/context/types";
import * as providerSelectors from "@codestream/webview/store/providers/reducer";
import { TeamsState } from "@codestream/webview/store/teams/types";
import { HostApi } from "@codestream/webview/webview-api";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import { ThemeProvider } from "styled-components";
import { Observability } from "@codestream/webview/Stream/Observability";
import { PaneState } from "@codestream/webview/src/components/Pane";
import {
	GetEntityCountRequest,
	GetEntityCountRequestType,
	GetEntityCountResponse,
	GetFileScmInfoRequest,
	GetFileScmInfoRequestType,
	GetFileScmInfoResponse,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesRequestType,
	GetObservabilityAnomaliesResponse,
	GetObservabilityErrorAssignmentsRequest,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsRequestType,
	GetObservabilityErrorsResponse,
	GetObservabilityReposRequest,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	GetReposScmRequest,
	GetReposScmRequestType,
	GetReposScmResponse,
	GetServiceLevelObjectivesRequest,
	GetServiceLevelObjectivesRequestType,
	GetServiceLevelObjectivesResponse,
	RemoteType,
} from "@codestream/protocols/agent";
import { afterEach, beforeEach, describe, it, jest } from "@jest/globals";
import { IntlProvider } from "react-intl";
import translations from "@codestream/webview/translations/en";
import { ConfigsState } from "@codestream/webview/store/configs/types";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";

jest.mock("@codestream/webview/store/apiVersioning/reducer");
jest.mock("@codestream/webview/webview-api");
jest.mock("@codestream/webview/store/providers/reducer");

const mockIsFeatureEnabled = jest.mocked(isFeatureEnabled);

const wrapIntl = (children: any) => (
	<IntlProvider locale="en" messages={translations}>
		{children}
	</IntlProvider>
);

const mockProviderSelectors = jest.mocked(providerSelectors);

const MockedHostApi = HostApi as any;

const mockTrack = jest.fn();

const mockHostApi = {
	track: mockTrack,
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
	status: {
		myteam: {
			label: "label",
			ticketId: "ticketId",
			ticketUrl: "ticketUrl",
			ticketProvider: "trello*com",
		},
	},
};

const teams: TeamsState = {
	myteam: {
		id: "myteam",
		name: "teamname",
	} as Partial<CSTeam> as CSTeam,
};

const context: Partial<ContextState> = {
	currentTeamId: "myteam",
};

const myrepo: Partial<CSRepository> = {
	id: "repoid",
	name: "myrepo",
};

function createState(): Partial<CodeStreamState> {
	return {
		capabilities: {
			openLink: true,
		},
		session: {
			userId: "abcd1234",
		},
		users: {
			abcd1234: user as CSUser,
		},
		configs: {
			showGoldenSignalsInEditor: true,
		} as ConfigsState,
		context: context as ContextState,
		preferences: {
			startWork: { createBranch: false },
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
		teams,
		editorContext: {
			textEditorUri: "blah",
		},
		repos: {
			repoid: myrepo as CSRepository,
		},
	};
}

describe("Observability", () => {
	let container: HTMLDivElement | undefined = undefined;
	const middlewares = [thunk];
	const mockGetReposScmRequest = jest.fn<(params: GetReposScmRequest) => GetReposScmResponse>();

	const mockGetFileScmInfo = jest.fn<(params: GetFileScmInfoRequest) => GetFileScmInfoResponse>();

	const mockGetObservabilityRepos =
		jest.fn<(params: GetObservabilityReposRequest) => GetObservabilityReposResponse>();

	const mockGetEntityCount = jest.fn<(params: GetEntityCountRequest) => GetEntityCountResponse>();

	const mockGetObservabilityErrorAssignments =
		jest.fn<
			(params: GetObservabilityErrorAssignmentsRequest) => GetObservabilityErrorAssignmentsResponse
		>();

	const mockGetServiceLevelObjectives =
		jest.fn<(params: GetServiceLevelObjectivesRequest) => GetServiceLevelObjectivesResponse>();

	const mockGetObservabilityAnomalies =
		jest.fn<(params: GetObservabilityAnomaliesRequest) => GetObservabilityAnomaliesResponse>();

	const mockGetObservabilityErrors =
		jest.fn<(params: GetObservabilityErrorsRequest) => GetObservabilityErrorsResponse>();

	function mockServiceClickedMethods() {
		mockGetServiceLevelObjectives.mockImplementation(
			(_params: GetServiceLevelObjectivesRequest): GetServiceLevelObjectivesResponse => {
				return {
					serviceLevelObjectives: [
						{
							guid: "abcd1234",
							name: "something",
							actual: "myactual",
							target: "mytarget",
							timeWindow: "mytimewindow",
							result: "UNDER",
							summaryPageUrl: "https://blah",
						},
					],
				};
			}
		);

		mockGetObservabilityAnomalies.mockImplementation(
			(_params: GetObservabilityAnomaliesRequest): GetObservabilityAnomaliesResponse => {
				return {
					isSupported: true,
					responseTime: [
						{
							name: "responsename",
							codeAttrs: {
								codeNamespace: "myclassname",
								codeFunction: "myfunctionname",
							},
							type: "duration",
							language: "java",
							newValue: 500,
							oldValue: 300,
							ratio: 1,
							text: "mytext",
							totalDays: 14,
							errorMetricTimesliceName: "errorMetricTimesliceName",
							metricTimesliceName: "metricTimesliceName",
							sinceText: "some text",
							chartHeaderTexts: {},
							notificationText: "",
							entityName: "",
						},
					],
					errorRate: [],
					detectionMethod: "Release Based",
					didNotifyNewAnomalies: false,
				};
			}
		);

		mockGetObservabilityErrors.mockImplementation(
			(_params: GetObservabilityErrorsRequest): GetObservabilityErrorsResponse => {
				return {
					repos: [
						{
							repoId: "repoid",
							repoName: "repoName1",
							errors: [
								{
									appName: "appName1",
									entityId: "abcd1234",
									errorClass: "TypeError",
									message: "oh no",
									remote: "https://remote1",
									occurrenceId: "occurenceId1",
									count: 3,
									lastOccurrence: Date.now() - 50000,
									errorGroupGuid: "errorGroupGuid1",
								},
							],
						},
					],
				};
			}
		);
	}

	beforeEach(() => {
		container = document.createElement("div");
		container.id = "modal-root";
		document.body.appendChild(container);

		mockIsFeatureEnabled.mockReturnValue(true);

		mockGetReposScmRequest.mockImplementation(
			(_params: GetReposScmRequest): GetReposScmResponse => {
				return {
					repositories: [
						{
							id: "repoid",
							currentBranch: "main",
							path: "myrepopath",
							folder: { name: "myfolder", uri: "file:///my-uri" },
							remotes: [
								{
									name: "remotename",
									path: "remotes-path",
								} as RemoteType,
							],
						},
					],
				};
			}
		);

		mockGetFileScmInfo.mockImplementation((_params: GetFileScmInfoRequest) => {
			const response: GetFileScmInfoResponse = {
				uri: "https://github.com/org/myrepo",
				scm: {
					branch: "main",
					file: "file:///some-file",
					repoId: "repoid",
					repoPath: "myRepoPath",
					revision: "revision1",
					remotes: [
						{
							name: "remotename",
							url: "remotes-url",
						},
					],
				},
			};
			return response;
		});

		mockGetObservabilityRepos.mockImplementation((_params: GetObservabilityReposRequest) => {
			const response: GetObservabilityReposResponse = {
				repos: [
					{
						repoId: "repoid",
						entityAccounts: [
							{
								distributedTracingEnabled: false,
								accountId: 1234,
								accountName: "myaccountname",
								entityGuid: "abcd1234",
								entityName: "myentityname",
								tags: [],
							},
						],
						repoName: "myrepo",
						repoRemote: "https://github.com/org/myrepo",
						hasRepoAssociation: true,
						hasCodeLevelMetricSpanData: true,
					},
				],
			};
			return response;
		});

		mockGetEntityCount.mockImplementation((_params: GetEntityCountRequest) => {
			const response: GetEntityCountResponse = {
				entityCount: 3,
			};
			return response;
		});

		mockGetObservabilityErrorAssignments.mockImplementation(
			(_params: GetObservabilityErrorAssignmentsRequest) => {
				const response: GetObservabilityErrorAssignmentsResponse = {
					items: [],
				};
				return response;
			}
		);

		mockGetObservabilityAnomalies.mockImplementation(
			(_params: GetObservabilityAnomaliesRequest) => {
				const response: GetObservabilityAnomaliesResponse = {
					isSupported: false,
					responseTime: [],
					errorRate: [],
					didNotifyNewAnomalies: false,
				};
				return response;
			}
		);

		mockGetObservabilityErrors.mockImplementation((_params: GetObservabilityErrorsRequest) => {
			const response: GetObservabilityErrorsResponse = {
				repos: [],
			};
			return response;
		});

		mockHostApi.send.mockImplementation((type, params) => {
			switch (type) {
				case GetReposScmRequestType: {
					return mockGetReposScmRequest(params as GetReposScmRequest);
				}
				case GetFileScmInfoRequestType: {
					return mockGetFileScmInfo(params as GetFileScmInfoRequest);
				}
				case GetObservabilityReposRequestType: {
					return mockGetObservabilityRepos(params as GetObservabilityReposRequest);
				}
				case GetEntityCountRequestType: {
					return mockGetEntityCount(params as GetEntityCountRequest);
				}
				case GetObservabilityErrorAssignmentsRequestType: {
					return mockGetObservabilityErrorAssignments(
						params as GetObservabilityErrorAssignmentsRequest
					);
				}
				case GetServiceLevelObjectivesRequestType: {
					return mockGetServiceLevelObjectives(params as GetServiceLevelObjectivesRequest);
				}
				case GetObservabilityAnomaliesRequestType: {
					return mockGetObservabilityAnomalies(params as GetObservabilityAnomaliesRequest);
				}
				case GetObservabilityErrorsRequestType: {
					return mockGetObservabilityErrors(params as GetObservabilityErrorsRequest);
				}
			}
			return undefined;
		});
	});

	afterEach(() => {
		container && document.body.removeChild(container);
		container = undefined;
		jest.resetAllMocks();
	});

	it("should trigger O11y rendered with Services when all calls happy", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(true);
		const mockStore = configureStore(middlewares);

		await act(async () => {
			render(
				wrapIntl(
					<Provider store={mockStore(createState())}>
						<ThemeProvider theme={lightTheme}>
							<Observability paneState={PaneState.Open} />
						</ThemeProvider>
					</Provider>
				),
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
			expect(mockTrack).toHaveBeenCalledTimes(1);
			expect(mockTrack).toHaveBeenCalledWith("codestream/o11y rendered", {
				meta_data: `state: services`,
				event_type: "state_load",
			});
		});
	});

	it("should trigger O11y rendered with No Entities getEntities returns 0", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(true);
		const mockStore = configureStore(middlewares);

		mockGetEntityCount.mockImplementation(_params => {
			return { entityCount: 0 };
		});

		await act(async () => {
			render(
				<Provider store={mockStore(createState())}>
					<ThemeProvider theme={lightTheme}>
						<Observability paneState={PaneState.Open} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
			expect(mockTrack).toHaveBeenCalledTimes(1);
			expect(mockTrack).toHaveBeenCalledWith("codestream/o11y rendered", {
				meta_data: `state: no_entities`,
				event_type: "state_load",
			});
		});
	});

	it("should trigger O11y rendered with No Services when no associated repos", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(true);
		const mockStore = configureStore(middlewares);

		mockGetObservabilityRepos.mockImplementation(_params => {
			const response: GetObservabilityReposResponse = {
				repos: [
					{
						repoId: "repoid",
						entityAccounts: [],
						repoName: "myrepo",
						repoRemote: "https://github.com/org/myrepo",
						hasRepoAssociation: false,
						hasCodeLevelMetricSpanData: false,
					},
				],
			};
			return response;
		});

		await act(async () => {
			render(
				<Provider store={mockStore(createState())}>
					<ThemeProvider theme={lightTheme}>
						<Observability paneState={PaneState.Open} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
			expect(mockTrack).toHaveBeenCalledTimes(1);
			expect(mockTrack).toHaveBeenCalledWith("codestream/o11y rendered", {
				meta_data: `state: no_services`,
				event_type: "state_load",
				meta_data_2: `meta: {
					hasEntities: true,
					hasRepoForEntityAssociator: true,
					currentEntityAccounts: 0,
					observabilityRepoCount: 1,
				}`,
			});
		});
	});

	it("should trigger O11y rendered with Not Connected when NR not setup", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(false);
		const mockStore = configureStore(middlewares);

		await act(async () => {
			render(
				<Provider store={mockStore(createState())}>
					<ThemeProvider theme={lightTheme}>
						<Observability paneState={PaneState.Open} />
					</ThemeProvider>
				</Provider>,
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
			expect(mockTrack).toHaveBeenCalledTimes(1);
			expect(mockTrack).toHaveBeenCalledWith("codestream/o11y rendered", {
				meta_data: "state: Not Connected",
				event_type: "state_load",
			});
		});
	});

	it("should trigger service clicked with all services when all calls happy", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(true);
		mockServiceClickedMethods();
		const mockStore = configureStore(middlewares);

		await act(async () => {
			render(
				wrapIntl(
					<Provider store={mockStore(createState())}>
						<ThemeProvider theme={lightTheme}>
							<Observability paneState={PaneState.Open} />
						</ThemeProvider>
					</Provider>
				),
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
		});

		expect(mockTrack).toHaveBeenCalledTimes(1);

		// Close
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.queryByTestId("entity-name-abcd1234-collapsed")).toBeInTheDocument();
		});

		// And expand to trigger service clicked
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.getByTestId("entity-name-abcd1234-expanded")).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(mockTrack).toHaveBeenCalledTimes(2);
			expect(mockTrack).toHaveBeenNthCalledWith(2, "codestream/service rendered", {
				entity_guid: undefined,
				account_id: undefined,
				meta_data: `errors_listed: true`,
				meta_data_2: `slos_listed: true`,
				meta_data_4: `anomalies_listed: true`,
				meta_data_3: `vulnerabilities_listed: false`,
				event_type: "state_load",
			});
		});
	});

	it("should trigger service clicked without errors listed", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(true);
		mockServiceClickedMethods();

		mockGetObservabilityErrors.mockImplementation(_params => {
			return {
				repos: [],
			};
		});

		const mockStore = configureStore(middlewares);

		await act(async () => {
			render(
				wrapIntl(
					<Provider store={mockStore(createState())}>
						<ThemeProvider theme={lightTheme}>
							<Observability paneState={PaneState.Open} />
						</ThemeProvider>
					</Provider>
				),
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
		});

		expect(mockTrack).toHaveBeenCalledTimes(1);

		// Close
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.queryByTestId("entity-name-abcd1234-collapsed")).toBeInTheDocument();
		});

		// And expand to trigger service clicked
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.getByTestId("entity-name-abcd1234-expanded")).toBeInTheDocument();
		});

		// await waitFor(() => {
		// 	expect(mockTrack).toHaveBeenCalledTimes(2);
		// 	expect(mockTrack).toHaveBeenNthCalledWith(2, "NR Service Clicked", {
		// 		"Errors Listed": false,
		// 		"SLOs Listed": true,
		// 		"CLM Anomalies Listed": true,
		// 		"Vulnerabilities Listed": false,
		// 	});
		// });
	});

	it("should trigger service clicked without SLOs listed", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(true);
		mockServiceClickedMethods();

		mockGetServiceLevelObjectives.mockImplementation(_params => {
			return {
				serviceLevelObjectives: [],
			};
		});

		const mockStore = configureStore(middlewares);

		await act(async () => {
			render(
				wrapIntl(
					<Provider store={mockStore(createState())}>
						<ThemeProvider theme={lightTheme}>
							<Observability paneState={PaneState.Open} />
						</ThemeProvider>
					</Provider>
				),
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
		});

		expect(mockTrack).toHaveBeenCalledTimes(1);

		// Close
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.queryByTestId("entity-name-abcd1234-collapsed")).toBeInTheDocument();
		});

		// And expand to trigger service clicked
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.getByTestId("entity-name-abcd1234-expanded")).toBeInTheDocument();
		});

		// await waitFor(() => {
		// 	expect(mockTrack).toHaveBeenCalledTimes(3);
		// 	expect(mockTrack).toHaveBeenNthCalledWith(2, "NR Service Clicked", {
		// 		"Errors Listed": true,
		// 		"CLM Anomalies Listed": true,
		// 		"SLOs Listed": false,
		// 		"Vulnerabilities Listed": false,
		// 	});
		// });
	});

	it("should trigger service clicked without anomalies listed", async () => {
		mockProviderSelectors.isConnected.mockReturnValue(true);
		mockServiceClickedMethods();

		mockGetObservabilityAnomalies.mockImplementation(_params => {
			return {
				errorRate: [],
				responseTime: [],
				isSupported: true,
				didNotifyNewAnomalies: false,
			};
		});

		const mockStore = configureStore(middlewares);

		await act(async () => {
			render(
				wrapIntl(
					<Provider store={mockStore(createState())}>
						<ThemeProvider theme={lightTheme}>
							<Observability paneState={PaneState.Open} />
						</ThemeProvider>
					</Provider>
				),
				{ container }
			);
		});

		await waitFor(() => {
			expect(screen.queryByTestId("observability-label-title")).toHaveTextContent("Observability");
		});

		// expect(mockTrack).toHaveBeenCalledTimes(1);

		// Close
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.queryByTestId("entity-name-abcd1234-collapsed")).toBeInTheDocument();
		});

		// And expand to trigger service clicked
		fireEvent.click(screen.getByTestId("entity-name-abcd1234"));
		await waitFor(() => {
			expect(screen.getByTestId("entity-name-abcd1234-expanded")).toBeInTheDocument();
		});

		// await waitFor(() => {
		// 	expect(mockTrack).toHaveBeenCalledTimes(2);
		// 	expect(mockTrack).toHaveBeenNthCalledWith(2, "NR Service Clicked", {
		// 		"Errors Listed": true,
		// 		"CLM Anomalies Listed": false,
		// 		"SLOs Listed": true,
		// 		"Vulnerabilities Listed": false,
		// 	});
		// });
	});
});
