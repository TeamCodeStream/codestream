import React from "react";
import { useState } from "react";
import { Mention, MentionsInput } from "react-mentions";
import { UserSearchRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";
import { Emoji, emojis } from "./emojis";

export const MentionsTextInput = () => {
	const [comment, setComment] = useState<string>("");
	const [nrComment, setNrComment] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const neverMatchingRegex = /($a)/;

	const fetchUsers = async (query: string, callback: Function) => {
		let _query = query.toLowerCase();

		if (_query.length > 2) {
			console.warn("eric loading true");
			setIsLoading(true);
			try {
				const response = await HostApi.instance.send(UserSearchRequestType, { query: _query });
				const users = response.users.map(user => ({
					display: user.name,
					id: user.id?.toString(),
				}));
				setIsLoading(false);
				callback(users);
			} catch (error) {
				setIsLoading(false);
				callback([]);
			}
		} else if (_query === "ai") {
			setIsLoading(false);
			callback([{ display: "AI", id: "nrai" }]);
		} else {
			setIsLoading(false);
			callback([]);
		}
	};

	const fetchEmojis = (query, callback) => {
		if (query.length === 0) return;

		const matches = emojis
			.filter((emoji: Emoji) => {
				return emoji.name.indexOf(query.toLowerCase()) > -1;
			})
			.slice(0, 10);
		return matches.map(({ emoji }) => ({ id: emoji }));
	};

	const handleChange = e => {
		let comment = e.target.value;
		setComment(comment);
		setNrComment(comment);
		console.warn(comment);
	};

	const handleSubmit = e => {
		e.preventDefault();

		//submit nrcomment to nr

		setComment("");
		setNrComment("");
	};

	return (
		<div>
			<MentionsInput
				placeholder="Add a comment..."
				value={comment}
				onChange={e => handleChange(e)}
				a11ySuggestionsListLabel={"Suggested mentions"}
				isLoading={isLoading}
				style={messageInputStyle}
			>
				<Mention trigger="@" style={mentionStyle} data={fetchUsers} />
				<Mention
					trigger=":"
					style={mentionStyle}
					data={fetchEmojis}
					markup="__id__"
					regex={neverMatchingRegex}
				/>
			</MentionsInput>
			<button onClick={handleSubmit}>Submit</button>
		</div>
	);
};

const messageInputStyle = {
	// control: {
	// 	backgroundColor: "var(--app-background-color)",
	// 	fontSize: 16,
	// },
	// loadingIndicator: {
	// 	spinner: {
	// 		marginTop: 4,
	// 		marginBottom: 4,

	// 		width: 100,
	// 		height: 8,

	// 		textAlign: "center",
	// 		fontSize: "11px",

	// 		element: {
	// 			display: "inline-block",

	// 			backgroundColor: "#999",

	// 			height: "100%",
	// 			width: 2,

	// 			marginLeft: 3,
	// 			marginRight: 3,

	// 			animation: "x 1.2s infinite ease-in-out",
	// 		},

	// 		element2: { animationDelay: "-1.1s" },
	// 		element3: { animationDelay: "-1.0s" },
	// 		element4: { animationDelay: "-0.9s" },
	// 		element5: { animationDelay: "-0.8s" },
	// 	},
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
			fontSize: "16",
			maxHeight: "300px",
			overflowY: "auto",
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
	// backgroundColor: "color: rgb(97, 175, 239)",
	// color: "var(--text-color-highlight)",
};

// var(--text-color-highlight)
// var(--app-background-color)
