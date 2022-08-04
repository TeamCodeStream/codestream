"use strict";

import { describe, expect, it } from "@jest/globals";
import { ClientError, GraphQLClient } from "graphql-request";
import { GraphQLError } from "graphql-request/dist/types";
import { mock, mockDeep } from "jest-mock-extended";
import { User } from "../../../../src/api/extensions";
import { SessionContainer, SessionServiceContainer } from "../../../../src/container";
import { FetchThirdPartyPullRequestRequest } from "../../../../src/protocol/agent.protocol.providers";
import { CSMe } from "../../../../src/protocol/api.protocol.models";
import { GitHubProvider } from "../../../../src/providers/github";

jest.mock("../../../../src/container");
jest.mock("../../../../src/session");
jest.mock("../../../../src/api/extensions");

const mockSessionContainer = mock(SessionContainer);
const mockUser = mock(User);
const mockSessionServiceContainer = mockDeep<SessionServiceContainer>();

mockSessionServiceContainer.users.getMe.mockResolvedValue({ id: "user1" } as CSMe);
mockSessionContainer.instance.mockReturnValue(mockSessionServiceContainer);
mockUser.getProviderInfo.mockReturnValue({ userId: "user1", accessToken: "accessToken1" });

describe("getOwnerFromRemote", () => {
	const provider = new GitHubProvider({} as any, {} as any);

	it("generic", () => {
		const owner = provider.getOwnerFromRemote("//github.com/foo/bar");
		expect(owner).toEqual({ name: "bar", owner: "foo" });
	});
});

describe("getPullRequest", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("fails after 3 retries if getRepoOwnerFromPullRequestId returns NOT_FOUND", async () => {
		const provider = new GitHubProvider({} as any, {} as any);
		const mockResponseBody = {
			response: {
				data: {
					rateLimit: {
						limit: 5000,
						cost: 1,
						remaining: 4767,
						resetAt: "2022-07-01T22:22:27Z"
					},
					nodes: [null]
				},
				errors: <GraphQLError[]>(<unknown>[
					{
						type: "NOT_FOUND",
						path: ["nodes", 0],
						locations: [
							{
								line: 8,
								column: 4
							}
						],
						message: "Could not resolve to a node with the global id of 'PR_kwDODOEm5M46u4DC'."
					}
				]),
				status: 200,
				headers: {}
			},
			request: {
				query:
					"query GetRepoIdFromPullRequestId($id: [ID!]!) { rateLimit { limit cost remaining resetAt } nodes(ids: $id) { ... on PullRequest { number repository { name owner { login } } } } }",
				variables: {
					id: "PR_kwABCDEm5M46u4DC"
				}
			}
		};

		const error = new ClientError(mockResponseBody.response, mockResponseBody.request);

		const requestSpy = jest.spyOn(GraphQLClient.prototype, "request").mockImplementation(() => {
			throw error;
		});

		const request: FetchThirdPartyPullRequestRequest = {
			providerId: "github*com",
			pullRequestId: "PR_kwABCDEm5M46u4DC"
		};

		const response = await provider.getPullRequest(request);
		console.info(response);
		expect(requestSpy).toHaveBeenCalledTimes(3);
		expect(requestSpy).toHaveBeenCalledWith(expect.stringContaining("GetRepoIdFromPullRequestId"), {
			id: "PR_kwABCDEm5M46u4DC"
		});
	}, 10000);

	it("gets to next step after 2 retries if getRepoOwnerFromPullRequestId returns NOT_FOUND twice", async () => {
		const provider = new GitHubProvider({} as any, {} as any);
		const mockResponseBody = {
			response: {
				data: {
					rateLimit: {
						limit: 5000,
						cost: 1,
						remaining: 4767,
						resetAt: "2022-07-01T22:22:27Z"
					},
					nodes: [null]
				},
				errors: <GraphQLError[]>(<unknown>[
					{
						type: "NOT_FOUND",
						path: ["nodes", 0],
						locations: [
							{
								line: 8,
								column: 4
							}
						],
						message: "Could not resolve to a node with the global id of 'PR_kwDODOEm5M46u4DC'."
					}
				]),
				status: 200,
				headers: {}
			},
			request: {
				query:
					"query GetRepoIdFromPullRequestId($id: [ID!]!) { rateLimit { limit cost remaining resetAt } nodes(ids: $id) { ... on PullRequest { number repository { name owner { login } } } } }",
				variables: {
					id: "PR_kwABCDEm5M46u4DC"
				}
			}
		};

		const error = new ClientError(mockResponseBody.response, mockResponseBody.request);

		// First attempt NOT_FOUND
		jest.spyOn(GraphQLClient.prototype, "request").mockImplementationOnce(() => {
			throw error;
		});
		// Second attempt NOT_FOUND
		jest.spyOn(GraphQLClient.prototype, "request").mockImplementationOnce(() => {
			throw error;
		});

		// Last attempt - valid response
		jest.spyOn(GraphQLClient.prototype, "request").mockResolvedValueOnce({
			nodes: [
				{
					number: 1234,
					repository: { name: "repoName", owner: { login: "ownerLogin" } }
				}
			]
		});

		// Make the next graphql call fail - mocking all the rest of requests / responses is not needed
		const requestSpy = jest
			.spyOn(GraphQLClient.prototype, "request")
			.mockRejectedValueOnce(new Error("All done"));

		const request: FetchThirdPartyPullRequestRequest = {
			providerId: "github*com",
			pullRequestId: "PR_kwABCDEm5M46u4DC"
		};

		const response = await provider.getPullRequest(request);
		console.info(response);
		expect(requestSpy).toHaveBeenCalledTimes(4);

		expect(requestSpy).nthCalledWith(1, expect.stringContaining("GetRepoIdFromPullRequestId"), {
			id: "PR_kwABCDEm5M46u4DC"
		});
		expect(requestSpy).nthCalledWith(2, expect.stringContaining("GetRepoIdFromPullRequestId"), {
			id: "PR_kwABCDEm5M46u4DC"
		});
		expect(requestSpy).nthCalledWith(3, expect.stringContaining("GetRepoIdFromPullRequestId"), {
			id: "PR_kwABCDEm5M46u4DC"
		});
		// If we got the query pr call the GetRepoIdFromPullRequestId query passed on 3rd attempt
		expect(requestSpy).nthCalledWith(
			4,
			expect.stringContaining("query pr($owner:String!, $name:String!, $pullRequestNumber:Int!)"),
			{
				name: "repoName",
				owner: "ownerLogin",
				pullRequestNumber: 1234
			}
		);
	}, 10000);
});
