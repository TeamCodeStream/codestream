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
import { transformAtMentions } from "@codestream/webview/utils";
import Headshot from "./Headshot";

interface MentionsTextInputProps {
	onSubmit?: Function;
	entityGuid?: string;
	errorGroupGuid?: string;
	threadId?: string;
}

export const MentionsTextInput: React.FC<MentionsTextInputProps> = props => {
	const [comment, setComment] = useState<string>("");
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
					const userName = user?.name;
					const userId = user.id?.toString();
					const email = user?.email;
					const display = userName;
					const id = `<collab-mention data-value="@${userName}" data-type="NR_USER" data-mentionable-item-id="${userId}">${userName}</collab-mention>`;
					return {
						display,
						id,
						email,
						headshot: { email, name: userName },
					};
				});
				callback(users);
			} catch (error) {
				callback([]);
			}
		} else if (_query === "ai") {
			callback([
				{
					display: "AI",
					id: `<collab-mention data-value="@AI" data-type="NR_BOT" data-mentionable-item-id="NR_BOT">AI</collab-mention>`,
				},
			]);
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
		setComment(comment);
	};

	const handleSubmit = async e => {
		e.preventDefault();

		if (comment.length === 0) return;

		if (props.onSubmit) {
			props.onSubmit();
			return;
		}

		if (props.entityGuid && props.errorGroupGuid && props.threadId) {
			const nrFriendlyComment = transformAtMentions(comment);

			await HostApi.instance.send(CreateCollaborationCommentRequestType, {
				entityGuid: props.entityGuid,
				errorGroupGuid: props.errorGroupGuid,
				threadId: props.threadId,
				body: nrFriendlyComment,
			});
		}

		setComment("");
	};

	const renderSuggestion = suggestion => (
		<div style={{ display: "flex" }}>
			{suggestion.email && (
				<>
					<span style={{ marginRight: "6px" }}>
						<Headshot size={18} person={suggestion.headshot} />
					</span>
					<span style={{ marginRight: "6px" }}>{suggestion.email}</span>
				</>
			)}
			<span className="subtle">{suggestion.display}</span>
		</div>
	);

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
					renderSuggestion={renderSuggestion}
					appendSpaceOnAdd={true}
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

const messageInputStyle = {
	"&multiLine": {
		control: {
			fontFamily: "monospace",
			minHeight: 80,
		},
		// highlighter: {
		// 	padding: "9px 12px 9px 12px !important",
		// 	border: "1px solid transparent",
		// },
		input: {
			padding: "9px 12px 9px 12px !important",
			border: "1px solid var(--base-border-color)",
		},
	},
	suggestions: {
		list: {
			backgroundColor: "var(--app-background-color)",
			border: "1px solid var(--base-border-color)",
			fontSize: "16",
			maxHeight: "300px",
			overflowY: "auto",
		},
		item: {
			padding: "5px 15px",
			borderBottom: "1px solid var(--base-border-color)",
			"&focused": {
				backgroundColor: "var(--app-background-color-hover)",
			},
		},
	},
};

const mentionStyle = {
	backgroundColor: "var(--button-background-color-hover)",
	color: "var(--text-color-highlight)",
	borderRadius: "4px",
	// padding: "1px 2px",
};
