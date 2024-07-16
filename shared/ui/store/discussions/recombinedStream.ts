import { PostParts } from "@codestream/protocols/api";
import { StreamingResponseMsg } from "@codestream/webview/store/discussions/discussionsSlice";

export const NRAI_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export type RecombinedStream = {
	items: StreamingResponseMsg[];
	threadId: string;
	content: string;
	parts?: PostParts;
	finalMessageReceived: boolean;
	lastContentIndex?: number;
	lastMessageReceivedAt?: number;
};

const sections = ["**INTRO**", "**CODE_FIX**", "**DESCRIPTION**"];
const partsMap = {
	"**INTRO**": "intro",
	"**CODE_FIX**": "codeFix",
	"**DESCRIPTION**": "description",
};

export function extractParts(content: string): PostParts {
	const parts = {
		intro: "",
		codeFix: "",
		description: "",
	};
	// Parse '**INTRO**', '**CODE_FIX**', '**DESCRIPTION**' out of recombinedStream.content and put them in parts
	for (const section of sections) {
		const start = content.indexOf(section);
		if (start !== -1) {
			for (let i = sections.indexOf(section) + 1; i <= sections.length; i++) {
				const nextSection = sections[i];
				const end = nextSection ? content.indexOf(nextSection, start) : content.length;
				if (end !== -1) {
					parts[partsMap[section]] = content
						.substring(start, end)
						.replace(/^(\*\*INTRO\*\*|\*\*CODE_FIX\*\*|\*\*DESCRIPTION\*\*)\s+/, "");
					break;
				}
			}
		}
	}
	return parts;
}

export function advanceRecombinedStream(
	recombinedStream: RecombinedStream,
	payload: StreamingResponseMsg
) {
	recombinedStream.lastMessageReceivedAt = Date.now();

	if (isNrAiStreamDone(recombinedStream)) {
		return;
	}

	if (payload.last_message) {
		console.debug(`advanceRecombinedStream finalMessageReceived`);
		recombinedStream.finalMessageReceived = true;
	}

	recombinedStream.items = recombinedStream.items.concat(payload);
	recombinedStream.items.sort(
		(a, b) =>
			(a?.sequence_id ?? Number.MAX_SAFE_INTEGER) - (b?.sequence_id ?? Number.MAX_SAFE_INTEGER)
	);

	const start =
		recombinedStream.lastContentIndex !== undefined ? recombinedStream.lastContentIndex + 1 : 0;
	for (let i = start; i < recombinedStream.items.length; i++) {
		const item = recombinedStream.items[i];
		if (item.sequence_id !== i) {
			return;
		}
		if (item.content) {
			recombinedStream.content = recombinedStream.content + item.content;
			recombinedStream.lastContentIndex = i;
		}
	}
	recombinedStream.parts = extractParts(recombinedStream.content);
}

// A stream is done if it has a done event and there are no gaps in the sequence and it is not timed out
export function isNrAiStreamDone(stream: RecombinedStream) {
	if (stream.lastMessageReceivedAt && Date.now() - stream.lastMessageReceivedAt > NRAI_TIMEOUT) {
		console.warn("NRAI stream timed out");
		return true;
	}
	for (let i = 0; i < stream.items.length; i++) {
		const item = stream.items[i];
		if (item.sequence_id !== i) {
			return false;
		}
	}
	return stream.finalMessageReceived;
}
