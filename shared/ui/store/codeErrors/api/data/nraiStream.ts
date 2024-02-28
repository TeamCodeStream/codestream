import { ChangeDataType, CSGrokStream } from "@codestream/protocols/agent";

export type GrokStreamActionType = {
	type: ChangeDataType.GrokStream;
	data: CSGrokStream[];
};

export function getDemoNrAiStream(
	streamId,
	postId: string,
	parentPostId: string
): GrokStreamActionType[] {
	return [
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 0,
					content: {
						content: "",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 1,
					content: {
						content: "**INT",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 2,
					content: {
						content:
							"RO**\n\nThe error message `TypeError: Cannot read properties of undefined (reading 'get')` suggests that the `map` object",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 3,
					content: {
						content: " is `undefined` at the time",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 4,
					content: {
						content: " when the",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 5,
					content: {
						content: " `get` method is being",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 6,
					content: {
						content: " called. This is happening because",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 9,
					content: {
						content: " iteration",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 7,
					content: {
						content: " the `reduce` function is not returning the `",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 8,
					content: {
						content: "map` object at the end of each",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 10,
					content: {
						content: ".\n\n**",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 11,
					content: {
						content: "CODE_FIX**\n\nHere is the",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 12,
					content: {
						content: " corrected code:\n\n```javascript\nfunction count",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 13,
					content: {
						content: "UsersByState() {\n ",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 14,
					content: {
						content: " return userData.reduce((map,",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 15,
					content: {
						content: " user) => {\n    const",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 16,
					content: {
						content: " count =",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 17,
					content: {
						content: " map.get",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 18,
					content: {
						content: "(user.address.state) ?? 0;\n",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 19,
					content: {
						content: "    map.set(user.address.state, count + ",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 20,
					content: {
						content:
							"1);\n    return map;\n  }, new Map());\n}\n```\n\n**DESCRIPTION**\n\nThe `reduce` function",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 21,
					content: {
						content: " in JavaScript",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 22,
					content: {
						content: " takes a callback function as its first",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 23,
					content: {
						content: " argument. This callback function is",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 24,
					content: {
						content: " expected to return a value which",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 25,
					content: {
						content: " is then used as the first argument",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 26,
					content: {
						content: " (`map",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 27,
					content: {
						content: "` in",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 28,
					content: {
						content: " this case) in",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 29,
					content: {
						content: " the next iteration.",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 30,
					content: {
						content: " In the original code, there",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 31,
					content: {
						content: " was no return statement",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 32,
					content: {
						content: " in the callback function",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 33,
					content: {
						content: ", so `map` was `undefined",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 34,
					content: {
						content: "` in",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 35,
					content: {
						content: " the next",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 36,
					content: {
						content: " iteration. This was",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 37,
					content: {
						content: " causing the error",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 38,
					content: {
						content: ". \n\nThe fix is to",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 40,
					content: {
						content: " end of",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 41,
					content: {
						content: " the callback function to return the `map",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 42,
					content: {
						content: "` object",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 39,
					content: {
						content: " add a return statement at the",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 43,
					content: {
						content: ". This",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 44,
					content: {
						content: " ensures that `map` is correctly passed",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					sequence: 45,
					content: {
						content:
							" to the next iteration and is not `undefined` when the `get` method is called.",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
					},
				},
			],
		},
		{
			type: ChangeDataType.GrokStream,
			data: [
				{
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65d663cd4a77c135cf388b51",
						postId: postId,
						streamId: streamId,
						done: true,
					},
				},
			],
		},
	];
}
