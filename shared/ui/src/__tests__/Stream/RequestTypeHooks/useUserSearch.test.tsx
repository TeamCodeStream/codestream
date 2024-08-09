/**
 * @jest-environment jsdom
 */
import React, { useEffect } from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { HostApi } from "@codestream/webview/webview-api";
import { UserSearchRequestType } from "@codestream/protocols/agent";
import { useUserSearch } from "@codestream/webview/stream/RequestTypeHooks/useUserSearch";

jest.mock("@codestream/webview/webview-api");

describe("useUserSearch Hook", () => {
	const mockHostApi = {
		send: jest.fn(),
	};

	beforeEach(() => {
		const MockedHostApi = HostApi as any;

		MockedHostApi.mockImplementation(() => {
			return mockHostApi;
		});

		MockedHostApi.instance = mockHostApi;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	// A component using the hook
	const UserSearchComponent: React.FC<{ query: string }> = ({ query }) => {
		const { userSearchResults, fetchUsers } = useUserSearch();

		useEffect(() => {
			fetchUsers(query);
		}, [fetchUsers, query]);

		return (
			<div>
				{userSearchResults.length === 0 ? (
					<div data-testid="no-results">No results</div>
				) : (
					<ul>
						{userSearchResults.map(user => (
							<li key={user.id} data-testid="user-item">
								{user.fullName || user.display} ({user.email})
							</li>
						))}
					</ul>
				)}
			</div>
		);
	};

	it("should return user search results", async () => {
		const mockResponse = {
			users: [
				{ id: "1", email: "user1@example.com", name: "User One" },
				{ id: "2", email: "user2@example.com", name: "User Two" },
			],
		};

		mockHostApi.send.mockResolvedValue(mockResponse);

		render(<UserSearchComponent query="user" />);

		// Use getAllByTestId and assert on the length of the returned array
		await waitFor(() => {
			const items = screen.getAllByTestId("user-item");
			expect(items).toHaveLength(2);
		});

		expect(mockHostApi.send).toHaveBeenCalledWith(UserSearchRequestType, { query: "user" });

		const items = screen.getAllByTestId("user-item");
		expect(items[0]).toHaveTextContent("User One (user1@example.com)");
		expect(items[1]).toHaveTextContent("User Two (user2@example.com)");
	});

	it("should handle empty search results", async () => {
		const mockResponse = { users: [] };

		mockHostApi.send.mockResolvedValue(mockResponse);

		render(<UserSearchComponent query="xyz" />);

		await waitFor(() => screen.getByTestId("no-results"));

		expect(mockHostApi.send).toHaveBeenCalledWith(UserSearchRequestType, { query: "xyz" });
		expect(screen.getByTestId("no-results")).toBeInTheDocument();
	});

	it("should handle search query with less than 3 characters gracefully", async () => {
		render(<UserSearchComponent query="ab" />);

		await waitFor(() => screen.getByTestId("no-results"));

		expect(mockHostApi.send).not.toHaveBeenCalled();
		expect(screen.getByTestId("no-results")).toBeInTheDocument();
	});

	it("should handle errors gracefully", async () => {
		mockHostApi.send.mockRejectedValue(new Error("Test Error"));

		render(<UserSearchComponent query="user" />);

		await waitFor(() => screen.getByTestId("no-results"));

		expect(mockHostApi.send).toHaveBeenCalledWith(UserSearchRequestType, { query: "user" });
		expect(screen.getByTestId("no-results")).toBeInTheDocument();
	});
});
