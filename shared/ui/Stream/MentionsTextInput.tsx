import React from "react";
import { useCallback, useState } from "react";
import { Mention, MentionsInput } from "react-mentions";
import {
	CreateCollaborationCommentRequestType,
	UserSearchRequestType,
} from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";
import { Emoji, emojis } from "./emojis";
import { debounce as _debounce } from "lodash";

interface MentionsTextInputProps {
	onSubmit?: Function;
	entityGuid?: string;
	errorGroupGuid?: string;
	threadId?: string;
}

export const MentionsTextInput: React.FC<MentionsTextInputProps> = props => {
	const [comment, setComment] = useState<string>("");
	const [nrComment, setNrComment] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const neverMatchingRegex = /($a)/;

	const fetchUsers = async (query: string, callback: Function) => {
		let _query = query.toLowerCase();

		if (_query.length > 2) {
			console.warn("eric loading true");
			callback([{ display: "loading...", id: "loading" }]);

			try {
				const response = await HostApi.instance.send(UserSearchRequestType, { query: _query });
				const users = response.users.map(user => {
					const userName = user.name;
					const userId = user.id?.toString();
					const display = userName;

					const id = `<collab-mention data-value="@${userName}" data-type="${userId}" data-mentionable-item-id="${userId}">${userName}</collab-mention>`;

					// <collab-mention data-value="@__display__" data-type="__id__" data-mentionable-item-id="__id__">__display__</collab-mention>

					// const displayTest = `<collab-mention data-value="@${userName}`
					// const idTest = `" data-type="${userId}" data-mentionable-item-id="${userId}">${userName}</collab-mention>`

					return {
						display,
						id,
					};
				});
				callback(users);
			} catch (error) {
				callback([]);
			}
		} else if (_query === "ai") {
			callback([{ display: "AI", id: "NR_BOT" }]);
		} else {
			callback([]);
		}
	};

	const debouncedFetchUsers = useCallback(_debounce(fetchUsers, 300), []);

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

		// setNrComment to something better

		setComment(comment);
		console.warn(comment);
	};

	const handleSubmit = async e => {
		e.preventDefault();

		if (comment.length === 0) return;

		if (props.onSubmit) {
			props.onSubmit();
			return;
		}

		if (props.entityGuid && props.errorGroupGuid && props.threadId) {
			await HostApi.instance.send(CreateCollaborationCommentRequestType, {
				entityGuid: props.entityGuid,
				errorGroupGuid: props.errorGroupGuid,
				threadId: props.threadId,
				body: comment,
			});
		}

		setComment("");
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
				<Mention
					trigger="@"
					style={mentionStyle}
					data={debouncedFetchUsers}
					markup="@[__display__](__id__)"
				/>
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

// <collab-mention data-value="@__display__" data-type="__id__" data-mentionable-item-id="__id__">__display__</collab-mention>

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
