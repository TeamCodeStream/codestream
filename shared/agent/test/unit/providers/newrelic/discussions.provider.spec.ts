import { describe, expect, it } from "@jest/globals";
import { DiscussionsProvider } from "../../../../src/providers/newrelic/discussions/discussions.provider";
import { CollaborationComment } from "@codestream/protocols/agent";
import { NewRelicGraphqlClient } from "../../../../src/providers/newrelic/newRelicGraphqlClient";
import { mockDeep } from "jest-mock-extended";

jest.mock("../../../../src/providers/newrelic/newRelicGraphqlClient");

const mockNewRelicGraphqlClient = mockDeep<NewRelicGraphqlClient>();

describe("DiscussionsProvider", () => {
	it("parseCommentForMentions handles multiple mentions with attributes in different order", async () => {
		const discussionsProvider = new DiscussionsProvider(mockNewRelicGraphqlClient);
		const comment: CollaborationComment = {
			id: "id",
			body:
				'<collab-mention data-value="@wmiraglia+pd4" data-type="NR_USER" data-mentionable-item-id="1001036877">\n            wmiraglia+pd4\n        </collab-mention>test 2 ' +
				'<collab-mention data-type="NR_USER" data-value="@wmiraglia+pd3" data-mentionable-item-id="55555">\n            wmiraglia+pd3\n        </collab-mention>test 3',
			createdAt: "12345",
			deactivated: false,
			creator: {
				name: "bob mcgee",
				userId: "2346",
			},
		};
		const result = await discussionsProvider.parseCommentForMentions(comment);
		expect(result.body).toEqual("@wmiraglia+pd4 test 2 @wmiraglia+pd3 test 3");
	});
});
