import { prettyPrintOne } from "code-prettify";
import MarkdownIt from "markdown-it";
import markdownItEmoji from "markdown-it-emoji-mart";
import markdownItSlack from "markdown-it-slack";
import React from "react";
import { shallowEqual, useSelector } from "react-redux";
import { logError } from "../logger";
import { CodeStreamState } from "../store";
import { getUsernames } from "../store/users/reducer";
import { escapeHtml } from "../utils";
import Icons8 from "./Icons8";

interface MarkdownOptions {
	/**
	 * When true, the renderInline function will be used.
	 * While this does not include a wrapper <p> tag, it also
	 * will not render html highlighting, so any code wrapped in
	 * ``` will be displayed as a single line.
	 *
	 * @type {boolean}
	 * @memberof MarkdownOptions
	 */
	inline: boolean;
	excludeOnlyEmoji: boolean;
	includeCodeBlockCopy: boolean;
}

const copyIcon = (text: string) => {
	const copyText = text.replace(/"/g, "\\x22").replace(/'/g, "\\x27");
	return `<div class="code-buttons copy-icon-display-none"><span class="icon clickable" onclick="navigator.clipboard.writeText(\`${copyText}\`).then(() => console.log('Successfully copied'), () => { const textArea = document.createElement('textarea'); textArea.value = \`${copyText}\`; textArea.style.top = '0'; textArea.style.left = '0'; textArea.style.position = 'fixed'; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy') ? console.log('Successfully copied (fallback)') : console('Copy failed'); } catch (e) { console.error('Copy error', e); } document.body.removeChild(textArea); })">${Icons8.copy.toSVG()}</span></div>`;
};

type LanguageBlock = {
	language?: string;
	block: string;
};

const languages = [
	"java",
	"kotlin",
	"ruby",
	"javascript",
	"typescript",
	"python",
	"php",
	"go",
	"golang",
	"csharp",
	"ruby",
	"bash",
	"c",
	"cpp",
	"css",
	"json",
	"less",
];

function stripLanguage(str: string): LanguageBlock {
	const firstLine = str.slice(0, str.indexOf("\n"));
	if (languages.includes(firstLine)) {
		return {
			language: firstLine,
			block: str.slice(str.indexOf("\n") + 1),
		};
	}
	return {
		block: str,
	};
}

const md = new MarkdownIt({
	breaks: true,
	linkify: true,
	highlight: function (str, lang) {
		const langInfo = stripLanguage(str);
		// Could use langInfo.language later above clode block but due to this
		// <pre first requirement it can't be done easily
		const codeHTML = prettyPrintOne(escapeHtml(langInfo.block), lang, true);
		return `<pre class="code prettyprint" data-scrollable="true">${codeHTML}</pre>${copyIcon(
			str
		)}</div>`; // we need it to begin with <pre for markdown-it to behave properly, so we add the beginning div later
	},
})
	.use(markdownItSlack)
	.use(markdownItEmoji);

md.renderer.rules.emoji = function (token, idx) {
	return '<span class="emoji">' + token[idx].content + "</span>";
};

export const emojify = text => {
	return md.render(text);
};

const mdPlain = new MarkdownIt({
	breaks: true,
	linkify: true,
	highlight: function (str, lang) {
		const codeHTML = prettyPrintOne(escapeHtml(str), lang, true);
		return `<pre class="code prettyprint" data-scrollable="true">${codeHTML}</pre>${copyIcon(
			str
		)}</div>`; // we need it to begin with <pre for markdown-it to behave properly, so we add the beginning div later
	},
})
	.use(markdownItSlack)
	.use(markdownItEmoji);

mdPlain.renderer.rules.emoji = function (token, idx) {
	return token[idx].content;
};

export const emojiPlain = text => {
	return mdPlain.renderInline(text);
};

export const markdownify = (text: string, options?: MarkdownOptions) => {
	// safeguard against undefined at runtime - akonwi
	if (text == null) return text;
	const identifyOnlyEmoji = !options || !options.excludeOnlyEmoji;
	try {
		let replaced =
			options && options.inline
				? md.renderInline(text, { references: {} })
				: md.render(text, { references: {} });
		replaced = replaced
			.replace(/blockquote>\n/g, "blockquote>")
			.replace(/<br>\n/g, "\n")
			.replace(/<\/p>\n$/, "</p>")
			.replace(/<\/p>\n/g, "</p><br/>")
			.replace(/<ul>\n/g, "<ul>")
			.replace(/<ol>\n/g, "<ol>")
			.replace(/<\/li>\n/g, "</li>")
			.replace(/<br\/><\/blockquote>/g, "</blockquote>")
			// we need this for the copy icon to display properly, but we can't include it above
			.replace(/<pre/g, '<div class="related"><pre');
		if (options?.includeCodeBlockCopy) {
			replaced = replaced.replace(" copy-icon-display-none", "");
		}
		// console.log('markdownify input/output', text, replaced);
		if (identifyOnlyEmoji && text.trim().match(/^(:[\w_+]+:|\s)+$/))
			return "<span class='only-emoji'>" + replaced + "</span>";
		else return replaced;
	} catch (error) {
		logError(`Error rendering markdown: ${error.message} orig text is ${text}`);
		return text;
	}
};

const escapeRegExp = (str: string) => str?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
	The returned function will markdownify and highlight usernames.
	This hook loads whatever data it needs from the redux store.
	If configuration options are necessary, either the hook can be modified to accept parameters OR
	the returned callback can expect the parameters
*/
export function useMarkdownifyToHtml() {
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!];
		const escapedUsernames = getUsernames(state)
			.map(username => escapeRegExp(username))
			.join("|");
		const usernameRegExp = new RegExp(`@(${escapedUsernames})\\b`, "gi");
		return { currentUsername: currentUser.username, usernameRegExp, escapedUsernames };
	}, shallowEqual);

	return React.useCallback(
		(text: string, options?: MarkdownOptions) => {
			if (text == null || text === "") return "";
			const me = derivedState.currentUsername;
			const regExp = derivedState.usernameRegExp;

			const regex = /@(?:AI\b|[\w'.-]+ [\w'.-]+)/gi;

			return markdownify(text, options).replace(regex, (match, name) => {
				const isMe = me.localeCompare(name, undefined, { sensitivity: "accent" }) === 0;
				return `<span class="at-mention${isMe ? " me" : ""}">${match}</span>`;
			});
		},
		[derivedState.escapedUsernames]
	);
}
