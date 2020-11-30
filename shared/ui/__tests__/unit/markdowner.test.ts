import { describe, expect, it } from "@jest/globals";
import { markdownify } from "@codestream/webview/Stream/Markdowner";

describe("markdownify (no options)", () => {
	test.each([
		["", ""],
		["a", "<p>a</p>"],
		["<p>b</p>\n", "<p>&lt;p&gt;b&lt;/p&gt;</p>"],
		[">hello", "<blockquote><p>hello</p></blockquote>"],
		[`- asdasd\n- asdad\n- aa`, "<ul><li>asdasd</li><li>asdad</li><li>aa</li></ul>\n"],
		[`1) one\n2) two\n3) three`, "<ol><li>one</li><li>two</li><li>three</li></ol>\n"],
		[
			`# Chunk from The Goonies\n\n## Chunk from The Goonies\n### Chunk from The Goonies\n#### Chunk from The Goonies\n\n\n[imdb](https://www.imdb.com/title/tt0089218/)\n\n\n>See you guys, you never listen to me. I said there was gonna be trouble, but you didn't listen to me. \n\n\n\`truffle shuffle\`\n\n\n\`\`\`\ntruffle shuffle\ntruffle shuffle\ntruffle shuffle\n\`\`\`\n\n\n~~truffle shuffle~~\n\nOkay! I'll talk! \n\n\n1) In third grade, I cheated on my history exam\n2) In fourth grade, I stole my uncle Max's toupee and I glued it on my face when I was Moses in my Hebrew school play. \n3) In fifth grade, I knocked my sister Edie down the stairs and I blamed it on the dog... \n\n\n- When my mom sent me to the summer camp for fat kids and then they served lunch I got nuts and I pigged out and they kicked me out... \n- But the *worst* thing I ever done - I mixed a pot of fake puke at home and then I went to this movie theater, hid the puke in my jacket, climbed up to the balcony and then, t-t-then, I made a noise like this: _hua-hua-hua-huaaaaaaa_ - and then I dumped it over the side, all over the people in the audience. And then, this was horrible, all the people started getting sick and throwing up all over each other. I never felt so bad in my entire life`,
			`<h1>Chunk from The Goonies</h1>\n<h2>Chunk from The Goonies</h2>\n<h3>Chunk from The Goonies</h3>\n<h4>Chunk from The Goonies</h4>\n<p><a href="https://www.imdb.com/title/tt0089218/">imdb</a></p><br/><blockquote><p>See you guys, you never listen to me. I said there was gonna be trouble, but you didn't listen to me.</p></blockquote><p><code>truffle shuffle</code></p><br/><pre class="code prettyprint" data-scrollable="true"><ol class="linenums"><li class="L0"><span class="pln">truffle shuffle</span></li><li class="L1"><span class="pln">truffle shuffle</span></li><li class="L2"><span class="pln">truffle shuffle</span></li></ol></pre>\n<p><s>truffle shuffle</s></p><br/><p>Okay! I'll talk!</p><br/><ol><li>In third grade, I cheated on my history exam</li><li>In fourth grade, I stole my uncle Max's toupee and I glued it on my face when I was Moses in my Hebrew school play.</li><li>In fifth grade, I knocked my sister Edie down the stairs and I blamed it on the dog...</li></ol>\n<ul><li>When my mom sent me to the summer camp for fat kids and then they served lunch I got nuts and I pigged out and they kicked me out...</li><li>But the <strong>worst</strong> thing I ever done - I mixed a pot of fake puke at home and then I went to this movie theater, hid the puke in my jacket, climbed up to the balcony and then, t-t-then, I made a noise like this: <em>hua-hua-hua-huaaaaaaa</em> - and then I dumped it over the side, all over the people in the audience. And then, this was horrible, all the people started getting sick and throwing up all over each other. I never felt so bad in my entire life</li></ul>\n`
		]
	])(".markdownify(%j, %j)", (a, expected) => {
		expect(markdownify(a)).toStrictEqual(expected);
	});
});

describe("markdownify (with options)", () => {
	test.each([
		["a", "a"],
		["<p>b</p>", "&lt;p&gt;b&lt;/p&gt;"]
	])(".markdownify(%j, %j)", (a, expected) => {
		expect(markdownify(a, { inline: true, excludeOnlyEmoji: false })).toStrictEqual(expected);
	});
});

describe("markdownify (only emoji)", () => {
	it("is only emoji", () => {
		expect(markdownify(":+1:", { inline: true, excludeOnlyEmoji: false })).toContain("only-emoji");
	});
});

describe("markdownify with code fences", () => {
	test.each([
		[
			`\`\`\`.icon.rotate {
				transform: rotate(90deg);
			}
			.getting-started {
				float: right;
			}\`\`\``,
			`<code>.icon.rotate { \t\t\t\ttransform: rotate(90deg); \t\t\t} \t\t\t.getting-started { \t\t\t\tfloat: right; \t\t\t}</code>`
		]
	])(".markdownify(%j, %j)", (a, expected) => {
		const actual = markdownify(a, { inline: true, excludeOnlyEmoji: false });
		console.log(actual);
		expect(actual).toStrictEqual(expected);
	});
	test.each([["```testing```", "<p><code>testing</code></p>"]])(
		".markdownify(%j, %j)",
		(a, expected) => {
			expect(markdownify(a, { inline: false, excludeOnlyEmoji: false })).toStrictEqual(expected);
		}
	);
});
