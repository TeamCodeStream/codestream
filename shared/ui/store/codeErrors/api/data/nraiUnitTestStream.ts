import { GrokStreamActionType } from "@codestream/webview/store/codeErrors/api/data/nraiStream";
import { ChangeDataType } from "@codestream/protocols/agent";

export function getNraiUnitTestStream(
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
						content: "**DESCRIPTION",
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
						content: "**\n\nHere is a simple unit test for",
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
						content: " the `getUserViewByState` method. This test checks",
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
						content: " if the method correctly handles a",
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
						content: " `User` object with",
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
						content: " a `",
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
						content: "null` phone field.\n\n```java\n@Test\npublic void testGetUser",
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
						content: "ViewByState() {\n    // Create a mock",
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
						content: " User object with a null phone field\n    User mockUser",
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
						content: " = new",
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
						content: " User();\n    mock",
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
						content: 'User.setFirstName("John");\n    mockUser.set',
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
						content: 'LastName("Doe");\n   ',
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
						content: " Address mockAddress = new Address();\n   ",
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
						content: ' mockAddress.setState("',
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
						content: 'NY");\n',
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
						content: "Address);\n    mockUser.set",
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
						content: "Phone(null);\n\n    // Add the mock User to the user",
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
						content: "Db\n    Map<String, User> userDb",
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
						content: " = new HashMap",
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
						content: "<>();\n   ",
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
						content: ' userDb.put("1", mock',
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
						content: "User);\n    userData.setUserDb(userDb);\n\n    // Call",
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
						content: " the method to test\n    List<UserView> userViewList = userDataManager",
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
						content: ".getUserView",
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
						content: 'ByState("NY");\n\n    // Check',
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
						content: " that the returned list",
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
						content: " has one element\n    assertEquals(1, userViewList.size());\n\n",
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
						content: "    // Check that the phone",
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
						content: " number of",
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
						content: " the returned User",
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
						content: 'View is "N/A"\n    assertEquals("N',
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
						content: '/A", userViewList.get(0',
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
						content: ").getPhoneNumber());\n}\n```\n\nThis",
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
						content: " test assumes that the `User",
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
						content: "`, `Address",
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
						content: "`, and",
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
					sequence: 39,
					content: {
						content: " `UserDataManager",
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
					sequence: 40,
					content: {
						content: "` classes have appropriate getter and setter methods",
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
					sequence: 41,
					content: {
						content: ", and that the `UserView` class has",
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
					sequence: 42,
					content: {
						content: " a `getPhoneNumber()` method",
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
					sequence: 43,
					content: {
						content: ". The test creates",
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
					sequence: 44,
					content: {
						content: " a `",
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
					sequence: 45,
					content: {
						content: "User` object with a",
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
					sequence: 46,
					content: {
						content: " `null` phone field,",
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
					sequence: 47,
					content: {
						content: " adds it to the `userDb`, and then",
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
					sequence: 48,
					content: {
						content: " calls `getUserView",
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
					sequence: 49,
					content: {
						content: "ByState()`. It checks that the",
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
					sequence: 50,
					content: {
						content: " returned `UserView` list",
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
					sequence: 51,
					content: {
						content: " has one",
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
					sequence: 52,
					content: {
						content: " element and that the phone",
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
					sequence: 53,
					content: {
						content: ' number of this element is "',
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
					sequence: 54,
					content: {
						content: 'N/A".',
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
