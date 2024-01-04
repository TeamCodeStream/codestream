import { describe, expect, it } from "@jest/globals";
import {
	advanceRecombinedStream,
	GROK_TIMEOUT,
	isGrokStreamDone,
	RecombinedStream,
	updateParts,
} from "@codestream/webview/store/posts/recombinedStream";

describe("RecombinedStream", () => {
	it("should updateParts", () => {
		const recombinedStream: RecombinedStream = {
			items: [],
			content:
				"INTRO:\nintro\nblah blah\nCODE_FIX:\ncodeFix\nblah blah\nDESCRIPTION:\ndescription\nblahblah\n",
			receivedDoneEvent: false,
		};
		updateParts(recombinedStream);
		expect(recombinedStream.parts?.intro).toBe("INTRO:\nintro\nblah blah\n");
		expect(recombinedStream.parts?.codeFix).toBe("CODE_FIX:\ncodeFix\nblah blah\n");
		expect(recombinedStream.parts?.description).toBe("DESCRIPTION:\ndescription\nblahblah\n");
	});

	it("should updateParts when only DESCRIPTION is present", () => {
		const recombinedStream: RecombinedStream = {
			items: [],
			content: "DESCRIPTION:\ndescription\nblahblah\n",
			receivedDoneEvent: false,
		};
		updateParts(recombinedStream);
		expect(recombinedStream.parts?.intro).toBe("");
		expect(recombinedStream.parts?.codeFix).toBe("");
		expect(recombinedStream.parts?.description).toBe("DESCRIPTION:\ndescription\nblahblah\n");
	});

	it("should updateParts when only INTRO is present", () => {
		const recombinedStream: RecombinedStream = {
			items: [],
			content: "INTRO:\nintro\nblah blah\n",
			receivedDoneEvent: false,
		};
		updateParts(recombinedStream);
		expect(recombinedStream.parts?.intro).toBe("INTRO:\nintro\nblah blah\n");
		expect(recombinedStream.parts?.codeFix).toBe("");
		expect(recombinedStream.parts?.description).toBe("");
	});

	it("should updateParts when only CODE_FIX is present", () => {
		const recombinedStream: RecombinedStream = {
			items: [],
			content: "CODE_FIX:\ncodeFix\nblah blah\n",
			receivedDoneEvent: false,
		};
		updateParts(recombinedStream);
		expect(recombinedStream.parts?.intro).toBe("");
		expect(recombinedStream.parts?.codeFix).toBe("CODE_FIX:\ncodeFix\nblah blah\n");
		expect(recombinedStream.parts?.description).toBe("");
	});

	it("should updateParts when CODE_FIX is missing", () => {
		const recombinedStream: RecombinedStream = {
			items: [],
			content: "INTRO:\nintro\nblah blah\nDESCRIPTION:\ndescription\nblahblah\n",
			receivedDoneEvent: false,
		};
		updateParts(recombinedStream);
		expect(recombinedStream.parts?.intro).toBe("INTRO:\nintro\nblah blah\n");
		expect(recombinedStream.parts?.codeFix).toBe("");
		expect(recombinedStream.parts?.description).toBe("DESCRIPTION:\ndescription\nblahblah\n");
	});

	it("should start from empty without dupes", () => {
		const recombinedStream: RecombinedStream = {
			items: [],
			content: "",
			receivedDoneEvent: false,
		};

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 0,
				streamId: "streamId",
				postId: "postId",
				content: "hot",
				done: false,
			},
		]);

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 1,
				streamId: "streamId",
				postId: "postId",
				content: " sauce",
				done: false,
			},
		]);
		expect(recombinedStream.content).toBe("hot sauce");
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(2);
		expect(recombinedStream.lastMessageReceivedAt).toBeDefined();
	});

	it("should not have content when sequence 0 is missing", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 1,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 2,
				streamId: "streamId",
				postId: "postId",
				content: " sauce",
				done: false,
			},
		]);
		expect(recombinedStream.content).toBe("");
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(2);
		expect(recombinedStream.lastMessageReceivedAt).toBeDefined();
	});

	it("should have content when sequence 0 is present", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 1,
				streamId: "streamId",
				postId: "postId",
				content: " sauce",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("hot sauce");
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(2);
	});

	it("should include content up to first missing sequence", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
				{
					sequence: 2,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 3,
				streamId: "streamId",
				postId: "postId",
				content: " burns",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("hot");
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(3);
	});

	it("should handle out of order sequence", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
				{
					sequence: 2,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
				{
					sequence: 3,
					streamId: "streamId",
					postId: "postId",
					content: " burns",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 1,
				streamId: "streamId",
				postId: "postId",
				content: " tangy",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("hot tangy sauce burns");
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(4);
	});

	it("should handle out of order sequence multiple advances", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 1,
					streamId: "streamId",
					postId: "postId",
					content: " hot",
					done: false,
				},
				{
					sequence: 2,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
				{
					sequence: 3,
					streamId: "streamId",
					postId: "postId",
					content: " burns. ",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
		};

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 0,
				streamId: "streamId",
				postId: "postId",
				content: "tangy",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("tangy hot sauce burns. ");
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(4);
		expect(recombinedStream.lastContentIndex).toBe(3);

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 8,
				streamId: "streamId",
				postId: "postId",
				content: "Hamburgers ",
				done: false,
			},
			{
				sequence: 9,
				streamId: "streamId",
				postId: "postId",
				content: "are ",
				done: false,
			},
			{
				sequence: 10,
				streamId: "streamId",
				postId: "postId",
				content: "food. ",
				done: false,
			},
		]);

		// No change yet
		expect(recombinedStream.content).toBe("tangy hot sauce burns. ");
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(7);
		expect(recombinedStream.lastContentIndex).toBe(3);

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 4,
				streamId: "streamId",
				postId: "postId",
				content: "i ",
				done: false,
			},
			{
				sequence: 5,
				streamId: "streamId",
				postId: "postId",
				content: "ran out",
				done: false,
			},
			{
				sequence: 6,
				streamId: "streamId",
				postId: "postId",
				content: " of clever",
				done: false,
			},
			{
				sequence: 7,
				streamId: "streamId",
				postId: "postId",
				content: " comments. ",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe(
			"tangy hot sauce burns. i ran out of clever comments. Hamburgers are food. "
		);
		expect(recombinedStream.receivedDoneEvent).toBe(false);
		expect(recombinedStream.items.length).toBe(11);
		expect(recombinedStream.lastContentIndex).toBe(10);
	});

	it("should report done for completed stream", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
				{
					sequence: 1,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
		};

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 2,
				streamId: "streamId",
				postId: "postId",
				content: " tangy",
				done: false,
			},
			{
				sequence: 3,
				streamId: "streamId",
				postId: "postId",
				done: true,
			},
		]);

		expect(recombinedStream.content).toBe("hot sauce tangy");
		expect(recombinedStream.receivedDoneEvent).toBe(true);
		expect(recombinedStream.items.length).toBe(4);
		expect(recombinedStream.lastContentIndex).toBe(2);

		expect(isGrokStreamDone(recombinedStream)).toBe(true);
	});

	it("should not report done for missing sequence", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
				{
					sequence: 1,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
		};

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 3,
				streamId: "streamId",
				postId: "postId",
				content: " tangy",
				done: false,
			},
			{
				sequence: 4,
				streamId: "streamId",
				postId: "postId",
				done: true,
			},
		]);

		expect(recombinedStream.content).toBe("hot sauce");
		expect(recombinedStream.receivedDoneEvent).toBe(true);
		expect(recombinedStream.items.length).toBe(4);
		expect(recombinedStream.lastContentIndex).toBe(1);

		expect(isGrokStreamDone(recombinedStream)).toBe(false);
	});

	it("should report done for incomplete stream with lastMessageReceivedAt > 2 minutes ago", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
				{
					sequence: 2,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
			],
			content: "",
			receivedDoneEvent: false,
			lastMessageReceivedAt: Date.now() - (GROK_TIMEOUT + 1000),
		};

		expect(isGrokStreamDone(recombinedStream)).toBe(true);
	});
});
