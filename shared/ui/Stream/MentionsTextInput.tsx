import React from "react";
import { useState } from "react";
import { Mention, MentionsInput } from "react-mentions";
import { UserSearchRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";

export const MentionsTextInput = () => {
	const [comment, setComment] = useState<string>("");
	const [nrComment, setNrComment] = useState<string>("");

	const submit = e => {
		e.preventDefault();

		setComment("");
	};

	const fetchUsers = async (query: string, callback: Function) => {
		let _query = query.toLowerCase();

		if (_query.length > 2) {
			try {
				const response = await HostApi.instance.send(UserSearchRequestType, { query: _query });
				const users = response.users.map(user => ({
					display: user.name,
					id: user.id?.toString(),
				}));
				callback(users);
			} catch (error) {
				console.error("Error fetching teammates:", error);
				callback([]);
			}
		} else if (_query === "ai") {
			callback([{ display: "AI", id: "nrai" }]);
		} else {
			callback([]);
		}
	};

	const handleChange = e => {
		let comment = e.target.value;
		setComment(comment);
		setNrComment(comment);
		console.warn(comment);
	};

	return (
		<div>
			<MentionsInput
				placeholder="Add a comment..."
				value={comment}
				onChange={e => handleChange(e)}
				a11ySuggestionsListLabel={"Suggested mentions"}
			>
				<Mention data={fetchUsers} />
			</MentionsInput>
			<button onClick={submit}>Submit</button>
		</div>
	);
};

const messageInputStyle = {
	// control: {
	// 	backgroundColor: "var(--app-background-color)",
	// 	fontSize: 16,
	// },

	"&multiLine": {
		control: {
			fontFamily: "monospace",
			minHeight: 60,
		},
		highlighter: {
			padding: 9,
			border: "1px solid transparent",
		},
		input: {
			padding: 9,
			border: "1px solid silver",
		},
	},
	"&singleLine": {
		display: "inline-block",
		width: 180,
		highlighter: {
			padding: 1,
			border: "2px inset transparent",
		},
		input: {
			padding: 1,
			border: "2px inset",
		},
	},
	suggestions: {
		list: {
			backgroundColor: "var(--app-background-color)",
			border: "1px solid rgba(0,0,0,0.15)",
			fontSize: 16,
		},
		item: {
			padding: "5px 15px",
			borderBottom: "1px solid rgba(0,0,0,0.15)",
			"&focused": {
				backgroundColor: "#cee4e5",
			},
		},
	},
};

const mentionStyle = {
	backgroundColor: "color: rgb(97, 175, 239)",
	color: "var(--text-color-highlight)",
};

// var(--text-color-highlight)
// var(--app-background-color)
