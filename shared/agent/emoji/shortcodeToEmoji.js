const fs = require("fs");
const https = require("https");
const path = require("path");

async function generate() {
	let map = Object.create(null);

	// Get emoji data from https://github.com/milesj/emojibase
	// https://github.com/milesj/emojibase/blob/master/packages/data/en/data.raw.json
	await download(
		"https://raw.githubusercontent.com/milesj/emojibase/master/packages/data/en/data.raw.json",
		"data.raw.json"
	);

	// https://github.com/milesj/emojibase/blob/master/packages/data/en/shortcodes/github.raw.json
	await download(
		"https://raw.githubusercontent.com/milesj/emojibase/master/packages/data/en/shortcodes/github.raw.json",
		"github.raw.json"
	);

	const emojis = require(path.join(process.cwd(), "data.raw.json"));
	const shortcodes = require(path.join(process.cwd(), "github.raw.json"));

	for (const emoji of emojis) {
		if (emoji.hexcode == null || emoji.hexcode.length === 0) continue;
		const code = emoji.hexcode;
		const short = shortcodes[code];

		if (short !== undefined && !(typeof short !== "string")) {
			map[short] = emoji.emoji;
		} else if (short !== undefined && typeof Array.isArray(short)) {
			for (const shortString of short) {
				map[shortString] = emoji.emoji;
			}
		}
	}

	fs.unlink("data.raw.json", () => {});
	fs.unlink("github.raw.json", () => {});

	// Get gitmoji data from https://github.com/carloscuesta/gitmoji
	// https://github.com/carloscuesta/gitmoji/blob/master/src/data/gitmojis.json
	await download(
		"https://raw.githubusercontent.com/carloscuesta/gitmoji/master/src/data/gitmojis.json",
		"gitmojis.json"
	);

	const gitmojis = require(path.join(process.cwd(), "gitmojis.json")).gitmojis;
	for (const emoji of gitmojis) {
		if (map[emoji.code] !== undefined) {
			console.warn(emoji.code);
			continue;
		}
		map[emoji.code] = emoji.emoji;
	}

	fs.unlink("gitmojis.json", () => {});

	// Sort the emojis for easier diff checking
	const list = Object.entries(map);
	list.sort();

	map = list.reduce((m, [key, value]) => {
		m[key] = value;
		return m;
	}, Object.create(null));

	fs.writeFileSync(path.join(process.cwd(), "emojis.json"), JSON.stringify(map), "utf8");
}

function download(url, destination) {
	return new Promise((resolve, reject) => {
		const stream = fs.createWriteStream(destination);
		https.get(url, rsp => {
			rsp.pipe(stream);
			stream.on("finish", () => {
				stream.close();
				resolve();
			});
		});
	});
}

generate();
