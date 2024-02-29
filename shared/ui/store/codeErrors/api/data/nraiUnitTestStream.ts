import { GrokStreamActionType } from "@codestream/webview/store/codeErrors/api/data/nraiStream";
import { ChangeDataType } from "@codestream/protocols/agent";

export function getNraiUnitTestStream(
	streamId: string,
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
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: "**DESCRIPTION",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
							"**\n\nHere is a simple unit test using Jest, a popular JavaScript testing framework. This test checks if the `countUsersByState` function correctly",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: " counts the",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content:
							" number of users by state, even when some users do not have an `address` property.\n\n```javascript\nconst { countUsersByState } = require('./",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: "your-file",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content:
							"-path'); // replace with your actual file path\n\ndescribe('countUsersByState', () => {\n  it('should correctly count users by state and handle users",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: " without address",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: "', () => {\n    const userData = [\n      { address: { state: 'CA",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: "' } },\n      { address: { state: 'NY' } },\n      { address: { state: 'CA",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: "' }",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content:
							" },\n      {},\n      { address: { state: 'NY' } },\n      { address: { state: 'TX' } },\n      {},\n    ];\n\n    const result = count",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: "UsersByState(userData",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: ");\n\n   ",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content:
							" expect(result.get('CA')).toBe(2);\n    expect(result.get('NY')).toBe(2);\n    expect(result.get('TX')).toBe(1);\n    expect(result.size).toBe(3);",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: " // There",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content:
							" should be 3 states in the map\n  });\n});\n```\n\nThis test creates a mock `userData` array with some users having an `address` property and some",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content:
							" should be 3 states in the map\n  });\n});\n```\n\nThis test creates a mock `userData` array with some users having an `address` property and some",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: " not.",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content:
							" It then calls `countUsersByState` with this array and checks if the returned Map has the correct counts for each state. It also checks if the total",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: " number of",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						content: " states in the Map is correct.",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: "65dfa2980bb2c59166b8e279",
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
						codeErrorId: "65dfa2980bb2c59166b8e279",
						postId: postId,
						streamId: streamId,
						done: true,
					},
				},
			],
		},
	];
}
