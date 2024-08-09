import React from "react";
import { useCallback, useState } from "react";
import { Mention, MentionsInput } from "react-mentions";
import { Emoji, emojis } from "./emojis";
import { debounce as _debounce } from "lodash";
import Headshot from "./Headshot";
import { useUserSearch } from "./RequestTypeHooks/useUserSearch";

interface MentionsTextInputProps {
	onSubmit?: Function;
	setTextCallback: Function;
	value: string;
}

export const MentionsTextInput: React.FC<MentionsTextInputProps> = props => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const neverMatchingRegex = /($a)/;
	const { fetchUsers } = useUserSearch();

	const debouncedFetchUsers = useCallback(
		_debounce((query, callback) => fetchUsers(query, "mentions", callback), 300),
		[]
	);
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
		props.setTextCallback(comment);
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
				value={props.value}
				onChange={e => handleChange(e)}
				isLoading={isLoading}
				style={mentionInputStyle}
			>
				<Mention
					trigger="@"
					style={mentionStyle}
					data={debouncedFetchUsers}
					markup="@[__display__](__id__)"
					renderSuggestion={renderSuggestion}
					appendSpaceOnAdd={true}
				/>
				<Mention trigger=":" data={fetchEmojis} markup="__id__" regex={neverMatchingRegex} />
			</MentionsInput>
		</div>
	);
};

const mentionInputStyle = {
	highlighter: {
		boxSizing: "border-box",
		padding: 9,
		border: "1px solid transparent",
		lineHeight: "1.2em",
	},
	input: {
		boxSizing: "border-box",
		padding: 9,
		border: "1px solid silver",
		lineHeight: "1.2em",
	},
	"&multiLine": {
		control: {
			minHeight: 80,
		},
		highlighter: {
			padding: 9,
			border: "1px solid transparent",
		},
		input: {
			padding: 9,
			border: "1px solid var(--base-border-color)",
			color: "var(--text-color)",
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
};
