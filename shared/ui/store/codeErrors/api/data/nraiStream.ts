import { ChangeDataType, CSGrokStream } from "@codestream/protocols/agent";

export type GrokStreamActionType = {
	type: ChangeDataType.GrokStream;
	data: CSGrokStream[];
};

export function getDemoNrAiStream(
	streamId: string,
	postId: string,
	parentPostId: string,
	codeErrorId: string
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
						codeErrorId: codeErrorId,
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
						codeErrorId: codeErrorId,
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
						content: "RO**\n\nThe stack trace indicates",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " a `NullPointerException` at line",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " 240 of `",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "UserDataManager.java`. The error message suggests",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " that the method `getPhone",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "User` class is",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " returning `null`, and the program is",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " trying to invoke `getCountryCode()` on this",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " `null` value.\n\n**CODE_FIX",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "**\n\n```java\n@Trace",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "()` of the `",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " List<UserView> getUserView",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "\npublic",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "ByState(String state",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
							") {\n    List<UserView> userViewList = new ArrayList<>();\n    for (User user :",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " userData.userDb.values",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "()) {\n",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "        if (user.getAddress",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "().getState().equals(state))",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " {\n            String phoneNumber = (user.getPhone() != null",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: ') ? "+" + user.getPhone().get',
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "CountryCode",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content:
							'() + " " + user.getPhone().getNumber() : "N/A";\n            userViewList.add(new UserView(user.getFirstName(),\n                    user.get',
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "LastName(),\n",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content:
							"                    phoneNumber,\n                    user.getAddress().getState()));\n       ",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " }\n    }\n    return userViewList",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: ";\n}\n```\n\n**DESCRIPTION",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "**\n\nThe",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " code fix involves adding a null check before",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: " invoking `getCountryCode()` and `",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "getNumber()` on the `Phone` object returned by `",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "getPhone()`. If `",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "getPhone",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "()` returns",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: ' `null`, the phone number is set to "N/A". This prevents',
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content:
							" the `NullPointerException` from being thrown when `getPhone()` returns `null",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
						content: "`.",
						role: "assistant",
					},
					extra: {
						topmostPostId: parentPostId,
						codeErrorId: codeErrorId,
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
