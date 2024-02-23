import { describe, expect, it } from "@jest/globals";
import { EntityGuidDocumentParser } from "../../../../src/providers/newrelic/entity/entityGuidDocumentParser";
import { EntityProvider } from "../../../../src/providers/newrelic/entity/entityProvider";
import { mockDeep } from "jest-mock-extended";
import { DocumentManager } from "../../../../src/documentManager";
import {
	EditorEntityGuidsRequest,
	GetObservabilityEntitiesByIdResponse,
} from "../../../../../util/src/protocol/agent/agent.protocol.providers";

jest.mock("../../../../src/documentManager");
jest.mock("../../../../src/providers/newrelic/entity/entityProvider");

describe("EntityGuidDocumentParser", () => {
	it("should find an entityGuid", async () => {
		const mockDocumentManager = mockDeep<DocumentManager>();

		mockDocumentManager.get.mockReturnValue({
			getText: () => `
		
		foo

		MXxBUE18QVBQTElDQVRJT058MjM

		bar
		
		`,
		} as any);

		const mockEntityProvider = mockDeep<EntityProvider>({
			coreUrl: "http://foo.com",
		});
		mockEntityProvider.getEntitiesById.mockReturnValue(
			Promise.resolve({
				entities: [
					{
						account: {
							id: 1,
							name: "foo",
						},
						name: "MyName",
						type: "APPLICATION",
						guid: "MXxBUE18QVBQTElDQVRJT058MjM",
					},
				],
			} as GetObservabilityEntitiesByIdResponse)
		);
		const request = {} as EditorEntityGuidsRequest;
		const parser = new EntityGuidDocumentParser(mockDocumentManager, mockEntityProvider);

		const response = await parser.parse(request);
		expect(response).toStrictEqual({
			items: [
				{
					guid: "MXxBUE18QVBQTElDQVRJT058MjM",
					range: {
						start: 13,
						end: 40,
					},
					metadata: {
						found: true,
					},
					entity: {
						account: {
							id: 1,
							name: "foo",
						},
						name: "MyName",
						type: "APPLICATION",
						guid: "MXxBUE18QVBQTElDQVRJT058MjM",
					},
					url: "http://foo.com/redirect/entity/MXxBUE18QVBQTElDQVRJT058MjM",
					markdownString: "Entity Name: MyName\n\nAccount: 1 - foo\n\nType: APPLICATION",
				},
			],
		});
	});

	it("should not find an entityGuid", async () => {
		const mockDocumentManager = mockDeep<DocumentManager>();

		mockDocumentManager.get.mockReturnValue({
			getText: () => `
		
		foo

		MXxBUE18QVqqqBQTElDQVRJT058MjM

		bar
		
		`,
		} as any);

		const parser = new EntityGuidDocumentParser(
			mockDocumentManager,
			mockDeep<EntityProvider>({
				coreUrl: "http://foo.com",
			})
		);

		const response = await parser.parse({} as EditorEntityGuidsRequest);
		expect(response).toStrictEqual({
			items: [],
		});
	});
});
