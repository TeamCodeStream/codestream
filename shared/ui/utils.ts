import uuidv4 from "uuid/v4";
import { Range } from "vscode-languageserver-types";
import { MaxRangeValue } from "./ipc/webview.protocol";
import { URI } from "vscode-uri";

export interface Disposable {
	dispose(): void;
}

export const emptyObject = {};
export const emptyArray = [];
export function noop() {}

export async function wait(millis: number) {
	await new Promise(resolve => setTimeout(resolve, millis));
}

/*
	A hack to allow running a callback once after a specific update
	when we know what the next state and props will be.
*/
export class ComponentUpdateEmitter {
	private readonly _nextUpdateCallbacks: Function[] = [];

	emit() {
		this._nextUpdateCallbacks.forEach(cb => {
			try {
				cb();
			} catch (error) {}
		});
	}

	enqueue(fn: () => any) {
		const index =
			this._nextUpdateCallbacks.push(() => {
				fn();
				this._nextUpdateCallbacks.splice(index);
			}) - 1;
	}
}

export function inMillis(number: number, unit: "sec" | "min") {
	switch (unit) {
		case "sec":
			return number * 1000;
		case "min":
			return number * 60000;
	}
}

export function isNotOnDisk(uri: string) {
	return uri === "" || uri.startsWith("untitled:");
}

export interface AnyObject {
	[key: string]: any;
}

type Primitive = number | string;

export function diff<T extends Primitive>(arrayA: T[], arrayB: T[]): T[] {
	const diff: T[] = [];
	const [longer, shorter] = arrayA.length >= arrayB.length ? [arrayA, arrayB] : [arrayB, arrayA];
	for (let item of longer) {
		if (!shorter.includes(item) && !diff.includes(item)) {
			diff.push(item);
		}
	}
	return diff;
}

export function forceAsLine(range: Range): Range {
	// If the range is empty make return the whole line
	if (isRangeEmpty(range)) {
		return Range.create(range.start.line, 0, range.start.line, MaxRangeValue);
	}
	return range;
}

export function is<T>(o: any, prop: keyof T): o is T;
export function is<T>(o: any, matcher: (o: any) => boolean): o is T;
export function is<T>(o: any, matcher: keyof T | ((o: any) => boolean)): o is T {
	if (typeof matcher === "function") {
		return matcher(o);
	}

	return o[matcher] !== undefined;
}

export function isRangeEmpty(range: Range): boolean {
	return range.start.line === range.end.line && range.start.character === range.end.character;
}

export function areRangesEqual(r1: Range, r2: Range) {
	return (
		r1.start.character === r2.start.character &&
		r1.start.line === r2.start.line &&
		r1.end.line === r2.end.line &&
		r1.end.character === r2.end.character
	);
}

export function arrayToRange([startLine, startCharacter, endLine, endCharacter]: number[]): Range {
	return Range.create(startLine, startCharacter, endLine, endCharacter);
}

export function pick<T, K extends keyof T>(object: T, keys: K[]): { [K in keyof T]: any } {
	return keys.reduce((result: T, key: K) => {
		result[key] = object[key];
		return result;
	}, Object.create(null));
}

export function capitalize([first, ...rest]: string) {
	return first.toUpperCase() + rest.join("");
}

export const safe = <T>(fn: () => T): T | undefined => {
	try {
		return fn();
	} catch (e) {
		return undefined;
	}
};

export function mapFilter<A, B>(array: A[], fn: (item: A) => B | undefined | null): B[] {
	const result: B[] = [];
	array.forEach(a => {
		const mapped = fn(a);
		if (mapped) {
			result.push(mapped);
		}
	});
	return result;
}

/* keyFilter returns all of the keys for whom values are truthy (or)
  keyFilter({
	a: 7,
	b: 0,
	c: true,
	d: false
  });

  will return
  ["a", "c"]
*/
export function keyFilter<A>(hash: A): string[] {
	const result: string[] = [];
	Object.keys(hash).map(a => {
		if (hash[a]) result.push(a);
	});
	return result;
}
/* just like keyFilter only returns all the keys for whome the values are falsey */
export function keyFilterFalsey<A>(hash: A): string[] {
	const result: string[] = [];
	Object.keys(hash).map(a => {
		if (!hash[a]) result.push(a);
	});
	return result;
}

export const findLast = <T>(array: T[], fn: (item: T) => boolean): any | undefined => {
	for (let i = array.length - 1; i >= 0; i--) {
		const item = array[i];
		if (fn(item)) return item;
	}
};

export function range(start: number, endExclusive: number): number[] {
	const array: number[] = [];
	for (let i = start; i < endExclusive; i++) {
		array.push(i);
	}
	return array;
}

// let fnCount = 0;
// TODO: maybe make the debounced fn async so callers can wait for it to execute
export const debounceToAnimationFrame = (fn: Function) => {
	let requestId: number | undefined;
	// const i = fnCount++;
	// const label = `fn[${i}]`;
	// let resetTimer = true;
	// console.debug(`${label} registered for debouncing`, fn);
	return function(...args: any[]) {
		// if (resetTimer) {
		// 	console.time(label);
		// 	resetTimer = false;
		// }
		// @ts-ignore
		const context = this;
		if (requestId) {
			// console.debug(`debouncing ${label}`);
			cancelAnimationFrame(requestId);
		}
		requestId = requestAnimationFrame(() => {
			// resetTimer = true;
			requestId = undefined;
			// console.timeEnd(label);
			fn.apply(context, args);
		});
	};
};

// if the callers of fn expect their arguments to be used anytime fn is
// actually invoked, then those arguments should be collected and passed to fn.
export function debounceAndCollectToAnimationFrame(fn: Function): Function {
	let requestId: number | undefined;
	let argsToUse: any[] = [];

	return (...args: any[]) => {
		argsToUse.push(...args);

		if (requestId) {
			cancelAnimationFrame(requestId);
		}
		requestId = requestAnimationFrame(() => {
			requestId = undefined;
			fn(...argsToUse);
			argsToUse = [];
		});
	};
}

export const rAFThrottle = (fn: Function) => {
	let requestId: number | undefined;
	let lastArgs: any[] = [];

	const throttledFn = function(...args: any[]) {
		lastArgs = args;
		if (requestId) {
			console.debug(`rAFThrottle is throttling a call to ${fn}. new args are`, args);
			return;
		}
		requestId = requestAnimationFrame(() => {
			requestId = undefined;
			fn(...lastArgs);
		});
	};

	throttledFn.cancel = () => {
		if (requestId) cancelAnimationFrame(requestId);
	};

	return throttledFn;
};

export function toMapBy<Key extends keyof T, T>(key: Key, entities: T[]): { [key: string]: T } {
	return entities.reduce(function(map, entity) {
		map[entity[key]] = entity;
		return map;
	}, Object.create(null));
}

export const uuid = uuidv4;
export const shortUuid = () => {
	const data = new Uint8Array(16);
	uuidv4(null, data, 0);

	const base64 = btoa(String.fromCharCode.apply(null, data as any));
	return base64
		.replace(/\+/g, "-") // Replace + with - (see RFC 4648, sec. 5)
		.replace(/\//g, "_") // Replace / with _ (see RFC 4648, sec. 5)
		.substring(0, 22); // Drop '==' padding;
};

export const isChildOf = (node: any, parentId: string) => {
	while (node !== null) {
		if (node.id === parentId) {
			return true;
		}
		node = node.parentNode;
	}

	return false;
};

export const getCurrentCursorPosition = (parentId: string) => {
	const selection = window.getSelection();
	let charCount = -1;
	let node: any;

	// console.log(selection);
	if (selection != null && selection.focusNode) {
		if (isChildOf(selection.focusNode, parentId)) {
			node = selection.focusNode;
			charCount = selection.focusOffset;

			while (node) {
				if (node.id === parentId) {
					break;
				}

				if (node.previousSibling) {
					node = node.previousSibling;
					charCount += node.textContent.length;
				} else {
					node = node.parentNode;
					if (node === null) {
						break;
					}
				}
			}
		}
	}
	return charCount;
};

export const createRange = (node: any, chars: any, range?: any) => {
	if (!range) {
		range = document.createRange();
		range.selectNode(node);
		range.setStart(node, 0);
	}

	if (chars.count === 0) {
		range.setEnd(node, chars.count);
	} else if (node && chars.count > 0) {
		if (node.nodeType === Node.TEXT_NODE) {
			if (node.textContent.length < chars.count) {
				chars.count -= node.textContent.length;
			} else {
				range.setEnd(node, chars.count);
				chars.count = 0;
			}
		} else {
			for (const child of node.childNodes) {
				range = createRange(child, chars, range);

				if (chars.count === 0) {
					break;
				}
			}
		}
	}

	return range;
};

export function logDiff<Props, State>(context, prevProps: Props) {
	const name = context.constructor.displayName || context.constructor.name || "Component";
	console.group(name);
	console.debug("props", { prevProps, currProps: context.props });
	Object.keys(prevProps).forEach(key => {
		if (prevProps[key] !== context.props[key]) {
			console.error(`prop ${key} changed from ${prevProps[key]} to ${context.props[key]}`);
		}
	});
	console.groupEnd();
}

const htmlEscapeCharMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#039;"
};

/**
 * used to go from in-database user-input, to a contenteditable div
 * @param  {string} text
 */
export function escapeHtml(text: string) {
	const result = text
		.replace(/[&<>"']/g, c => htmlEscapeCharMap[c])
		.replace(/\r\n/g, "<br/>")
		.replace(/\n/g, "<br/>");
	// console.log("escapeHtml input/output", text, result);
	return result;
}

// https://stackoverflow.com/questions/18552336/prevent-contenteditable-adding-div-on-enter-chrome
// https://stackoverflow.com/questions/6023307/dealing-with-line-breaks-on-contenteditable-div
// https://stackoverflow.com/questions/22677931/react-js-onchange-event-for-contenteditable
// interesting implementation: https://gist.github.com/nathansmith/86b5d4b23ed968a92fd4
/**
 * used to take the contents of a contenteditable div, and save it
 * more like the plaintext that the user entered. In many cases
 * this is called before saving to the server
 * @param  {string} text
 */
export function replaceHtml(text: string) {
	const domParser = new DOMParser();
	// contentEditable renders a blank line as "<div><br></div>""
	// and a line with only "foo" as "<div>foo</div>"
	// both of those things result in newlines, so we convert them to \n
	const reconstructedText = text
		.split("<div>")
		.map(_ => _.replace(/<\/div>/, "").replace(/<br\/?>/g, "\n"))
		.join("\n");

	const parsed = domParser.parseFromString(reconstructedText, "text/html").documentElement
		.textContent;
	// console.log('replaceHtml input/output', text, result);
	return parsed;
}

/**
 * handles text from clipboard
 * @param  {string} text
 */
export function asPastedText(text: string) {
	if (text == null) return text;
	// if we think this might be code, we should treat it as code
	// if it's multiple lines and all of them start with whitespace
	// then add the code fence markdown. this regexp matches
	// any non-whitespace character at the beginning of a line.
	// if it doesn't match, then every line must start w/whitespace
	// the second regex ensures there is at least 1 non-whitespace character
	// (don't want to fence seemingly empty text)
	const lines = text.split("\n").length;
	if (lines > 1 && !text.match(/^\S/m) && text.match(/(.|\s)*\S(.|\s)*/))
		text = "```" + text + "```";

	// console.log("asPastedText result=", text);
	return text;
}

export function uriToFilePath(uri: URI | string) {
	if (typeof uri === "string") {
		return URI.parse(uri).fsPath;
	}
	return uri.fsPath;
}

interface ArrayDiffResults {
	added?: string[] | undefined;
	removed?: string[] | undefined;
}
/**
 * Compares two string arrays and returns additions and removals
 * @param  {string[]|undefined} the originalArray
 * @param  {string[]} the newArray
 * @returns ArrayDiffResults
 */
export function arrayDiff(
	originalArray: string[] | undefined,
	newArray: string[]
): ArrayDiffResults {
	let results: ArrayDiffResults = {};
	if ((!originalArray || !originalArray.length) && newArray.length) {
		// didn't have an original, now we do have items
		results.added = newArray;
	}
	if (originalArray && originalArray.length && (!newArray || !newArray.length)) {
		// had original array, now we don't have any items
		results.removed = originalArray;
	} else if (
		originalArray &&
		newArray &&
		!(
			originalArray.length === newArray.length &&
			newArray.sort().every(function(value, index) {
				return value === originalArray.sort()[index];
			})
		)
	) {
		// had array before, had array after, and they're not the same
		const added: string[] = [];
		const removed: string[] = [];
		for (const r of originalArray) {
			if (!newArray.find(_ => _ === r)) {
				removed.push(r);
			}
		}
		for (const r of newArray) {
			if (!originalArray.find(_ => _ === r)) {
				added.push(r);
			}
		}
		if (added.length) {
			results.added = added;
		}
		if (removed.length) {
			results.removed = removed;
		}
	}
	return results;
}

// from https://awik.io/determine-color-bright-dark-using-javascript/
export function lightOrDark(color) {
	// Variables for red, green, blue values
	var r, g, b, hsp;

	// Check the format of the color, HEX or RGB?
	if (color.match(/^rgb/)) {
		// If RGB --> store the red, green, blue values in separate variables
		color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

		r = color[1];
		g = color[2];
		b = color[3];
	} else {
		// If hex --> Convert it to RGB: http://gist.github.com/983661
		color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, "$&$&"));

		r = color >> 16;
		g = (color >> 8) & 255;
		b = color & 255;
	}

	// HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
	hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

	// Using the HSP value, determine whether the color is light or dark
	// we use this to determine when to switch to a black fg on tags, so we
	// want to make sure the bg is sufficiently light before switching
	// if (hsp > 127.5) {
	if (hsp > 170) {
		return "light";
	} else {
		return "dark";
	}
}

// https://stackoverflow.com/questions/40929260/find-last-index-of-element-inside-array-by-certain-condition
export function findLastIndex<T>(
	array: Array<T>,
	predicate: (value: T, index: number, obj: T[]) => boolean
): number {
	let l = array.length;
	while (l--) {
		if (predicate(array[l], l, array)) return l;
	}
	return -1;
}
