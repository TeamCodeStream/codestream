import { GrokStreamEvent } from "@codestream/webview/store/posts/types";

export const GROK_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export type RecombinedStream = {
	items: GrokStreamEvent[];
	content: string;
	parts?: {
		intro: string;
		codeFix: string;
		description: string;
	};
	receivedDoneEvent: boolean;
	lastContentIndex?: number;
	lastMessageReceivedAt?: number;
};

const sections = ["INTRO:", "CODE_FIX:", "DESCRIPTION:"];
const partsMap = { "INTRO:": "intro", "CODE_FIX:": "codeFix", "DESCRIPTION:": "description" };

export function updateParts(recombinedStream: RecombinedStream) {
	const parts = {
		intro: "",
		codeFix: "",
		description: "",
	};
	// Parse 'INTRO:', 'CODE_FIX:', 'DESCRIPTION:' out of recombinedStream.content and put them in parts
	for (const section of sections) {
		const start = recombinedStream.content.indexOf(section);
		if (start !== -1) {
			for (let i = sections.indexOf(section) + 1; i <= sections.length; i++) {
				const nextSection = sections[i];
				const end = nextSection
					? recombinedStream.content.indexOf(nextSection, start)
					: recombinedStream.content.length;
				if (end !== -1) {
					const content = recombinedStream.content.substring(start, end);
					parts[partsMap[section]] = content;
					break;
				}
			}

			// const nextSection = sections[sections.indexOf(section) + 1];
			// const end = nextSection
			// 	? recombinedStream.content.indexOf(nextSection, start) - 1
			// 	: recombinedStream.content.length;
			// if (end !== -1) {
			// 	const content = recombinedStream.content.substring(start, end + 1);
			// 	parts[partsMap[section]] = content;
			// }
		}
	}
	recombinedStream.parts = parts;
}

export function advanceRecombinedStream(
	recombinedStream: RecombinedStream,
	payload: GrokStreamEvent[]
) {
	recombinedStream.lastMessageReceivedAt = Date.now();
	recombinedStream.items = recombinedStream.items.concat(payload);
	recombinedStream.items.sort((a, b) => a.sequence - b.sequence);
	recombinedStream.receivedDoneEvent = payload.find(it => it.done) !== undefined;
	const start =
		recombinedStream.lastContentIndex !== undefined ? recombinedStream.lastContentIndex + 1 : 0;
	for (let i = start; i < recombinedStream.items.length; i++) {
		const item = recombinedStream.items[i];
		if (item.sequence !== i) {
			return;
		}
		if (item.content) {
			recombinedStream.content = recombinedStream.content + item.content;
			recombinedStream.lastContentIndex = i;
		}
	}
	updateParts(recombinedStream);
}

// A stream is done if it has a done event and there are no gaps in the sequence and it is not timed out
export function isGrokStreamDone(stream: RecombinedStream) {
	if (stream.lastMessageReceivedAt && Date.now() - stream.lastMessageReceivedAt > GROK_TIMEOUT) {
		console.warn("Grok stream timed out");
		return true;
	}
	for (let i = 0; i < stream.items.length; i++) {
		const item = stream.items[i];
		if (item.sequence !== i) {
			return false;
		}
	}
	const lastItem = stream.items[stream.items.length - 1];
	return lastItem && lastItem.done;
}
