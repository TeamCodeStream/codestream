import React from "react";
import { useState } from "react";
import { Mention, MentionsInput } from "react-mentions";
import { UserSearchRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";

interface Comment {
	username: string;
	comment: string;
}

export const MentionsTextInput = () => {
	const [formState, setFormState] = useState({
		username: "",
		comment: "",
	});

	const [comments, setComments] = useState<Comment[]>([]);

	const submit = e => {
		e.preventDefault();
		if (formState.username === "" || formState.comment === "") {
			alert("Please fill in all fields");
			return;
		}

		setComments(comments => [
			...comments,
			{
				username: formState.username,
				comment: formState.comment,
			},
		]);

		setFormState({
			username: "",
			comment: "",
		});
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
			callback({ display: "AI", id: "nrai" });
		} else {
			return;
		}
	};

	return (
		<div className="message-input">
			<MentionsInput
				placeholder="Add a comment..."
				value={formState.comment}
				onChange={e => setFormState({ ...formState, comment: e.target.value })}
				style={messageInputStyle}
				a11ySuggestionsListLabel={"Suggested mentions"}
			>
				<Mention style={mentionStyle} data={fetchUsers} />
			</MentionsInput>
			<button onClick={submit}>Submit</button>
		</div>
	);
};

const messageInputStyle = {
	// control: {
	// 	backgroundColor: "#fff",
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
			// backgroundColor: "white",
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
	backgroundColor: "#cee4e5",
};
