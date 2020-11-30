import { describe, expect, it } from "@jest/globals";
import { escapeHtml, replaceHtml, arrayDiff, asPastedText } from "../../utils";

describe("utils", () => {
	test.each([
		["", ""],
		["just text", "just text"],
		["012345", "012345"],
		["true", "true"],
		["javascript::alert('hi');", "javascript::alert(&#039;hi&#039;);"],
		["<b>bold</b>", "&lt;b&gt;bold&lt;/b&gt;"],
		['"text"', "&quot;text&quot;"],
		["I didn't break it", "I didn&#039;t break it"],
		[
			"Map<string, { [repoId: string]: CSReviewDiffs }>()",
			"Map&lt;string, { [repoId: string]: CSReviewDiffs }&gt;()"
		],
		["1\n2\n3", "1<br/>2<br/>3"],
		[
			'1\n2\n3<b>bold</b>"text"I didn\'t break it',
			"1<br/>2<br/>3&lt;b&gt;bold&lt;/b&gt;&quot;text&quot;I didn&#039;t break it"
		]
	])(".escapeHtml(%s)", (a, expected) => {
		expect(escapeHtml(a)).toBe(expected);
	});

	// NOTE: document.executeCommand is not supported
	// so we can't insert text into a dom node after paste
	// (you can't programmatically paste either)
	// https://stackoverflow.com/questions/52974607/document-execcommand-is-not-a-function-in-vue-test-utils

	// NOTE: the inputs here are rather... hard to follow, but they came from
	// looking at the inputs to replaceHtml when it was called while in
	// a browser debugging session. ContentEditable uses <div>s and <br>s
	// for linebreaks and it is not possible to assume that creating a
	// contentEditable will behave the same while running tests
	// without an actual browser.
	test.each([
		["", ""],
		["just text", "just text"],
		["012345", "012345"],
		["true", "true"],
		["<div>foo</div>", "foo"],
		[`<div>1</div><div>2</div><div>3</div><div>4</div>`, `1\n2\n3\n4`],
		["a", "a"],
		// contentEditable blankline looks like below
		["<div><br></div>", ""],
		["1<div>2</div>", "1\n2"],
		[
			"1<div><br></div><div>2</div><div><br></div><div>3</div><div><br></div><div>4</div>",
			"1\n\n\n2\n\n\n3\n\n\n4"
		],
		[
			"1<div><br></div><div>2</div><div><br></div><div>3</div><div><br></div><div><br></div>",
			"1\n\n\n2\n\n\n3\n\n\n\n"
		],
		["<div><br></div><div><br></div>", ""],
		[
			"&lt;ul&gt;<div>&lt;li&gt;cat&lt;/li&gt;</div><div>&lt;li&gt;dog&lt;/li&gt;</div><div>&lt;/ul&gt;<br><div><br></div></div>",
			"<ul>\n<li>cat</li>\n<li>dog</li>\n</ul>\n\n\n"
		],
		[
			`&lt;ol&gt;<div>&lt;li&gt;bad&lt;li&gt;</div><div>&lt;li&gt;markup</div><div>&lt;/ul&gt;</div>`,
			"<ol>\n<li>bad<li>\n<li>markup\n</ul>"
		],
		[
			`\`\`\` &lt;h1&gt;h1&lt;/h1&gt;<div> &lt;h2&gt;h2&gt;&lt;/h2&gt;</div><div>\`\`\`</div>`,
			`\`\`\` <h1>h1</h1>\n <h2>h2></h2>\n\`\`\``
		],
		["<div>foo</div><div>bar</div>", "foo\nbar"]
	])(".replaceHtml(%s)", (a, expected) => {
		expect(replaceHtml(a)).toBe(expected);
	});

	test.each([
		["", ""],
		["\n\n", "\n\n"],
		[" \n \n", " \n \n"],
		["just text", "just text"],
		[`just\ntext`, `just\ntext`],
		["012345", "012345"],
		["true", "true"],
		["<div>foo</div>", "<div>foo</div>"],
		["1<br>2<br/>3", "1<br>2<br/>3"],
		["1\n2\n3", "1\n2\n3"],
		[" 1\n 2\n 3", "``` 1\n 2\n 3```"],
		["  1\n  2\n  3", "```  1\n  2\n  3```"],
		["	1\n	2\n	3", "```	1\n	2\n	3```"],
		["	1\n2\n	3", "	1\n2\n	3"]
	])(".asPastedText(%s)", (a, expected) => {
		expect(asPastedText(a)).toBe(expected);
	});

	test.each([
		[
			["one", "two", "three"],
			["one", "two", "three", "four"],
			{
				added: ["four"]
			}
		],
		[
			["one", "two", "three"],
			["one", "two"],
			{
				removed: ["three"]
			}
		]
	])(".arrayDiff(%j, %j)", (a, b, expected) => {
		expect(arrayDiff(a, b)).toStrictEqual(expected);
	});
});
