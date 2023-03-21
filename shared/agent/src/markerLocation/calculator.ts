"use strict";

import { CSLocationMeta, CSMarkerLocation } from "@codestream/protocols/api";
import { ParsedDiff } from "diff";
import * as diffMatchPatch from "diff-match-patch";
import { compareTwoStrings, findBestMatch, Rating } from "string-similarity";
import { Range } from "vscode-languageserver";

import { MarkerLocation } from "../api/extensions";
import { Logger } from "../logger";
import { Id } from "../managers/entityManager";
import { buildChangeset, Change, Changeset } from "./changeset";

import fromRange = MarkerLocation.fromRange;
import toRange = MarkerLocation.toRange;
import { MarkerLocationsById } from "@codestream/protocols/agent";

export const MAX_RANGE_VALUE = 2147483647;
const LINE_SIMILARITY_THRESHOLD = 0.5;
const CHANGE_SIMILARITY_THRESHOLD = 0.5;
const DELETED = -1;

export async function findBestMatchingLine(
	text: string,
	lineContent: string,
	originalLineNumber: number
) {
	try {
		const dmp = new diffMatchPatch.diff_match_patch();
		const lines = text.split("\n");
		let guessOffset = 0;
		for (let i = 0; i < originalLineNumber - 1; i++) {
			guessOffset += lines[i].length + 1;
		}
		// patterns cannot be larger than 32 (number of bits in an int)
		const trimmedLineContent = lineContent.trim().substring(0, 32);
		const dmpOffset = dmp.match_main(text, trimmedLineContent, guessOffset);
		if (dmpOffset === -1) return -1;

		let dmpLineIndex = 0;
		let offset = 0;
		while (dmpOffset > offset + lines[dmpLineIndex].length + 1 && dmpLineIndex < lines.length) {
			offset += lines[dmpLineIndex].length + 1;
			dmpLineIndex++;
		}

		return dmpLineIndex + 1;
	} catch (e) {
		Logger.warn(`Error calculating location based on content: ${e.message}`);
		return -1;
	}
}

export async function calculateRanges(ranges: Range[], diff: ParsedDiff): Promise<Range[]> {
	const locations: MarkerLocationsById = {};
	for (let i = 0; i < ranges.length; i++) {
		const location = fromRange(ranges[i]);
		const id = i.toString();
		location.id = id;
		locations[id] = location;
	}
	const calculatedLocations = await calculateLocations(locations, diff);
	const calculatedRanges: Range[] = [];
	for (let i = 0; i < ranges.length; i++) {
		calculatedRanges[i] = toRange(calculatedLocations[i.toString()]);
	}
	return calculatedRanges;
}

export async function calculateLocations(
	locations: MarkerLocationsById,
	diff: ParsedDiff
): Promise<MarkerLocationsById> {
	const calculation = new Calculation(locations, buildChangeset(diff));
	return calculation.results();
}

export async function calculateLocation(
	location: CSMarkerLocation,
	diff: ParsedDiff
): Promise<CSMarkerLocation> {
	const calculated = await calculateLocations(MarkerLocation.toLocationById(location), diff);
	return calculated[location.id];
}

function sortNumber(a: number, b: number) {
	return a - b;
}

function sortMatches(a: Match, b: Match) {
	return a.rating.rating - b.rating.rating;
}

interface Match {
	change: Change;
	rating: Rating;
}

class CalculatedLine {
	newLine = 0;
	delContent = "";
	addContent = "";
	change?: Change;
}

class CalculatedLocation {
	readonly id: string;
	readonly lineStartOld: number;
	readonly lineEndOld: number;
	readonly colStartOld: number;
	readonly colEndOld: number;
	lineStartNew = 0;
	lineEndNew = 0;
	colStartNew = 0;
	colEndNew = 0;
	lineStartOldContent = "";
	lineEndOldContent = "";
	lineStartNewContent = "";
	lineEndNewContent = "";
	readonly meta: CSLocationMeta = {};
	private lineMap: Map<number, CalculatedLine>;

	constructor(location: CSMarkerLocation, lineMap: Map<number, CalculatedLine>) {
		this.id = location.id;
		this.lineStartOld = location.lineStart;
		this.lineEndOld = location.lineEnd;
		this.colStartOld = location.colStart;
		this.colEndOld = location.colEnd;
		this.lineMap = lineMap;
	}

	trimLineStartChange() {
		const change = this.lineStartChange();
		this.lineStartNew = change.addStart + change.adds.length;
		this.colStartNew = 1;
		this.meta.startWasDeleted = true;
	}

	trimLineEndChange() {
		const change = this.lineEndChange();
		this.lineEndNew = change.addStart - 1;
		this.colEndNew = MAX_RANGE_VALUE;
		this.meta.endWasDeleted = true;
	}

	trimLineChange() {
		this.trimLineStartChange();
		this.lineEndNew = this.lineStartNew;
		this.colEndNew = 1;
		this.meta.endWasDeleted = true;
		this.meta.entirelyDeleted = true;
	}

	isLineStartDeleted(): boolean {
		return this.lineStartNew === DELETED;
	}

	isLineEndDeleted(): boolean {
		return this.lineEndNew === DELETED;
	}

	isMultiLine(): boolean {
		return this.lineEndOld > 0;
	}

	isEntirelyDeleted(): boolean {
		if (this.isMultiLine()) {
			return (
				this.isLineStartDeleted() &&
				this.isLineEndDeleted() &&
				this.lineStartChange() === this.lineEndChange()
			);
		} else {
			return this.isLineStartDeleted();
		}
	}

	lineStartCalc(): CalculatedLine {
		const calculatedLine = this.lineMap.get(this.lineStartOld);
		if (!calculatedLine) {
			throw new Error(`Could not find calculated starting line ${this.lineStartOld}`);
		}
		return calculatedLine;
	}

	lineEndCalc(): CalculatedLine {
		const calculatedLine = this.lineMap.get(this.lineEndOld);
		if (!calculatedLine) {
			throw new Error(`Could not find calculated ending line ${this.lineEndOld}`);
		}
		return calculatedLine;
	}

	lineStartChange(): Change {
		const change = this.lineStartCalc().change;
		if (!change) {
			throw new Error("Could not find change for starting line");
		}
		return change;
	}

	lineEndChange(): Change {
		const change = this.lineEndCalc().change;
		if (!change) {
			throw new Error("Could not find change for ending line");
		}
		return change;
	}

	lineStartChangeDelContent(): string {
		return this.lineStartChange().dels.join("\n");
	}

	lineStartCalcDelContent(): string {
		return this.lineStartCalc().delContent;
	}

	lineEndCalcDelContent(): string {
		return this.lineEndCalc().delContent;
	}

	markerLocation(): CSMarkerLocation {
		return {
			id: this.id,
			lineStart: this.lineStartNew,
			colStart: this.colStartNew,
			lineEnd: this.lineEndNew,
			colEnd: this.colEndNew,
			meta: this.meta,
		};
	}
}

class Calculation {
	private readonly _lines: number[];
	private readonly _locationsStarting = new Map<number, Id[]>();
	private readonly _locationsEnding = new Map<number, Id[]>();
	private readonly _activeLocations = new Set<Id>();
	private readonly _calculatedLines: Map<number, CalculatedLine>;
	private readonly _calculatedLocations: Map<Id, CalculatedLocation>;
	private readonly _changes: Change[];
	private _lineIndex: number;
	private _finalBalance: number;

	constructor(locations: MarkerLocationsById, changeset: Changeset) {
		const calculatedLocations = new Map<Id, CalculatedLocation>();
		const linesOfInterest = new Set<number>();
		const calculatedLines = new Map<number, CalculatedLine>();

		for (const id in locations) {
			const location = locations[id];
			calculatedLocations.set(location.id, new CalculatedLocation(location, calculatedLines));
			if (location.lineStart !== DELETED) {
				linesOfInterest.add(location.lineStart);
				let starting = this._locationsStarting.get(location.lineStart);
				if (!starting) {
					starting = [];
					this._locationsStarting.set(location.lineStart, starting);
				}
				starting.push(location.id);
			}
			if (location.lineEnd !== DELETED) {
				linesOfInterest.add(location.lineEnd);
				let ending = this._locationsEnding.get(location.lineEnd);
				if (!ending) {
					ending = [];
					this._locationsEnding.set(location.lineEnd, ending);
				}
				ending.push(location.id);
			}
		}

		const lines = Array.from(linesOfInterest.values()).sort(sortNumber);
		for (const line of lines) {
			calculatedLines.set(line, new CalculatedLine());
		}

		this._lines = lines;
		this._calculatedLines = calculatedLines;
		this._calculatedLocations = calculatedLocations;
		this._changes = changeset.changes;
		this._lineIndex = 0;
		this._finalBalance = 0;
		this.activateLocationsStartingAtCurrentLine();
	}

	results(): MarkerLocationsById {
		for (const change of this._changes) {
			this.applyChange(change);
		}

		this.calculateLinesUntilEnd();
		this.assignNewLines();
		this.calculateMissingLocations();
		this.calculateColumns();

		const result: MarkerLocationsById = {};
		for (const calcLoc of this._calculatedLocations.values()) {
			result[calcLoc.id] = calcLoc.markerLocation();
		}
		return result;
	}

	private activateLocationsStartingAtCurrentLine() {
		const line = this.getCurrentLine();
		const locationIds = this._locationsStarting.get(line);
		if (locationIds) {
			for (const id of locationIds) {
				this._activeLocations.add(id);
			}
		}
	}

	private deactivateLocationsEndingAtCurrentLine() {
		const line = this.getCurrentLine();
		const locationIds = this._locationsEnding.get(line);
		if (locationIds) {
			for (const id of locationIds) {
				this._activeLocations.delete(id);
			}
		}
	}

	private getCurrentLine(): number {
		return this._lines[this._lineIndex];
	}

	// @memoize
	private getAddContentFromChanges(): string[] {
		const addContents = [];
		for (const change of this._changes) {
			addContents.push(change.adds.join("\n"));
		}
		return addContents;
	}

	private nextLine() {
		this.deactivateLocationsEndingAtCurrentLine();
		this._lineIndex++;
		this.activateLocationsStartingAtCurrentLine();
	}

	private moveCurrentLineBy(delta: number) {
		const line = this.getCurrentLine();
		const calculatedLine = this.getCalculatedLine(line);
		calculatedLine.newLine = line + delta;
	}

	private getCalculatedLine(line: number) {
		const calculatedLine = this._calculatedLines.get(line);
		if (!calculatedLine) {
			throw new Error(`Could not find calculated line ${line}`);
		}
		return calculatedLine;
	}

	private assignNewLines() {
		for (const location of this._calculatedLocations.values()) {
			if (location.lineStartOld !== DELETED) {
				const startLine = this.getCalculatedLine(location.lineStartOld);
				location.lineStartNew = startLine.newLine;
				location.lineStartOldContent = startLine.delContent;
				location.lineStartNewContent = startLine.addContent;
			}

			if (location.lineEndOld !== DELETED) {
				const endLine = this.getCalculatedLine(location.lineEndOld);
				location.lineEndNew = endLine.newLine;
				location.lineEndOldContent = endLine.delContent;
				location.lineEndNewContent = endLine.addContent;
			}
		}
	}

	private calculateColumns() {
		for (const location of this._calculatedLocations.values()) {
			// when locations are trimmed, colStartNew and/or colEndNew will be already set
			const colStartNew =
				location.colStartNew > 0
					? location.colStartNew
					: calculateColumn(
							location.colStartOld,
							location.lineStartOldContent,
							location.lineStartNewContent
					  );
			const colEndNew =
				location.colEndNew > 0
					? location.colEndNew
					: calculateColumn(
							location.colEndOld,
							location.lineEndOldContent,
							location.lineEndNewContent
					  );

			if (location.lineStartNew === location.lineEndNew && colStartNew > colEndNew) {
				location.colStartNew = 1;
				location.colEndNew = location.lineEndNewContent.length;
			} else {
				location.colStartNew = colStartNew;
				location.colEndNew = colEndNew;
			}
		}
	}

	private applyChange(change: Change) {
		this.calculateLinesUntil(change);
		this.calculateLinesIn(change);
	}

	private calculateLinesUntil(change: Change) {
		const balance = change.addStart - change.delStart;

		let line;
		while ((line = this.getCurrentLine()) && line < change.delStart) {
			this.moveCurrentLineBy(balance);
			this.nextLine();
		}
	}

	private calculateLinesIn(change: Change) {
		this.setContentChangedInActiveLocations();
		const initialBalance = change.addStart - change.delStart;
		const changeLen = change.adds.length - change.dels.length;
		const delEnd = change.delStart + change.dels.length;
		this._finalBalance = initialBalance + changeLen;

		let line;
		while ((line = this.getCurrentLine()) && line < delEnd) {
			const delIndex = line - change.delStart;
			const delContent = change.dels[delIndex];
			const [addIndex, addContent] = bestMatch(delContent, change.adds);
			let newLine = change.addStart + addIndex;
			if (addIndex < 0) {
				newLine = DELETED;
			}

			const calculatedLine = this.getCalculatedLine(line);
			calculatedLine.newLine = newLine;
			calculatedLine.delContent = delContent;
			calculatedLine.addContent = addContent;
			calculatedLine.change = change;

			this.nextLine();
		}
	}

	private calculateLinesUntilEnd() {
		while (this.getCurrentLine()) {
			this.moveCurrentLineBy(this._finalBalance);
			this.nextLine();
		}
	}

	// Iterate over locations that had its starting line(s) and/or ending line(s)
	// deleted. If the location has at least some of its original content preserved,
	// then we simply trim the removed parts. If the location was entirely deleted,
	// then we try to find it by looking at all changes in the file.
	//
	// TODO room for improvement here: we could also look at changes in other files
	// to try to find blocks of code moved across files
	private calculateMissingLocations() {
		for (const location of this._calculatedLocations.values()) {
			if (location.isEntirelyDeleted()) {
				if (!this.findMovedLocation(location)) {
					location.trimLineChange();
				}
			} else {
				if (location.isLineStartDeleted()) {
					location.trimLineStartChange();
				}
				if (location.isLineEndDeleted()) {
					location.trimLineEndChange();
				}
			}
		}
	}

	// Try to find a moved location. A location will only be considered moved if:
	//
	// - it is a single-line location, and was deleted in an change
	// - it is a multi-line location, and its entire range was deleted by a single
	//   change - this is important as we don't want to chase around a location if
	//   at least part of its content was preserved
	//
	// 1) we gather the contents of the change that deleted the location
	// 2) we find all changes that added new contents that match the contents
	//    from (1) with a minimum similarity level defined by changeSimilarityThreshold
	// 3) we iterate over the changes from (2), in order of similarity (best matches first)
	// 4) for each change, we look at its added lines and find the lines that best
	//    match the location's original starting and ending (if multi-line) lines
	// 5) if we find such lines and they have a minimum similarity level defined
	//    by LINE_SIMILARITY_THRESHOLD, and they are in order (start < end), then
	//    we say we found the location
	// 6) if we exhaust all changes from (4) without finding lines (5), then we
	//    consider the location as deleted
	private findMovedLocation(location: CalculatedLocation): boolean {
		// if a multi-line location is considered moved, it means that both its
		// lineStartChange and lineEndChange are the same, so we can always get
		// the content from lineStartChange
		const delContent = location.lineStartChangeDelContent();
		const matchingChanges = this.findChangesWithSimilarAddContent(delContent);

		for (const change of matchingChanges) {
			const adds = change.adds;
			const [lineStartIndex, lineStartContent] = bestMatch(
				location.lineStartCalcDelContent(),
				adds
			);

			if (lineStartIndex === DELETED) {
				continue;
			}

			if (location.isMultiLine()) {
				const [lineEndIndex, lineEndContent] = bestMatch(location.lineEndCalcDelContent(), adds);

				if (lineEndIndex === DELETED) {
					continue;
				}

				if (lineStartIndex > lineEndIndex) {
					// TODO room for improvement - check 2nd, 3rd best matches.
					// that would require collecting and ranking candidates from
					// all matching changes before deciding which one is the most
					// similar
					continue;
				}

				location.lineEndNewContent = lineEndContent;
				location.lineEndNew = change.addStart + lineEndIndex;
				location.lineStartNewContent = lineStartContent;
				location.lineStartNew = change.addStart + lineStartIndex;
				return true;
			} else {
				location.lineStartNewContent = location.lineEndNewContent = lineStartContent;
				location.lineStartNew = location.lineEndNew = change.addStart + lineStartIndex;
				return true;
			}
		}
		return false;
	}

	private findChangesWithSimilarAddContent(content: string): Change[] {
		const addContentFromChanges = this.getAddContentFromChanges();
		const ratings = findBestMatch(content, addContentFromChanges).ratings;
		const matches = [];

		for (let i = 0; i < addContentFromChanges.length; i++) {
			const rating = ratings[i];
			if (rating.rating >= CHANGE_SIMILARITY_THRESHOLD) {
				matches.push({
					change: this._changes[i],
					rating: rating,
				});
			}
		}

		return matches.sort(sortMatches).map(match => match.change);
	}

	private setContentChangedInActiveLocations() {
		for (const id of this._activeLocations) {
			const calculatedLocation = this._calculatedLocations.get(id);
			if (calculatedLocation) {
				calculatedLocation.meta.contentChanged = true;
			} else {
				Logger.warn(
					`Calculation error: cannot set flag contentsChanged=true in active location ${id} - calculated location object not found`
				);
			}
		}
	}
}

// Recalculates a column number based on the line's old and new contents. In
// order to find the corresponding column (position) in the new content,
// we take into account:
//
// - pre: 3 characters before column oldCol
// - mid: character at column oldCol
// - pos: 3 characters after column oldCol
//
// Since the substring pre+mid+pos may occur more than once in the old line,
// we calculate its specific index, which indicates which occurrence is located
// around oldCol.
//
// Example: "aaaabcdefghbcdefgh"
//           123456789012345678
//
// oldCol: 8  => pre: bcd, mid: e, pos: fgh, specificIndex: 0
// oldCol: 15 => pre: bcd, mid: e, pos: fgh, specificIndex: 1
// oldCol: 1  => pre:    , mid: a, pos: aaa, specificIndex: 0
//
// In possession of pre, mid, pos and specificIndex, we search all occurrences
// of pre+mid+pos in the new line and return the column number associated with
// mid at the specificIndex. In case pre+mid+pos is not found in the new line,
// we remove pre's first character and pos' last character and try again, until
// pre and pos are both empty, at which point we give up and assume the content
// is no longer present in the new line.
//
// Example:
// oldLine: function foo() {
//          1234567890123456
// newLine: function fooRenamed() {
//          12345678901234567890123
// oldCol: 14 => pre: "oo(", mid: ")", pos: " {", specificIndex: 0
//
// 1st attempt: "oo() {" => not found
// 2nd attempt: "o() "   => not found
// 3rd attempt: "()"     => found, with mid ")" at column 21
//
// Therefore, newCol = 20
//
// Example:
// oldLine: return (foo && bar) || (baz && bar)
//          12345678901234567890123456789012345
// newLine: return !(foo && bar) || !(baz && bar)
//          1234567890123456789012345678901234567
// oldCol: 34 => pre: " ba", mid: "r", pos: ")", specificIndex: 1
//
// 1st attempt: " bar)" => found, with mid "r" at columns 19 and 36
//
// Therefore, since specificIndex is 1, newCol = 36
// TODO pass boolean beginning or end
function calculateColumn(oldCol: number, oldContent: string, newContent: string) {
	if (!oldContent || !newContent || oldContent === newContent) {
		return oldCol;
	}

	if (oldCol <= 1) {
		return 1;
	} else if (oldCol > oldContent.length) {
		return newContent.length + 1;
	}

	let pre = oldContent.substring(oldCol - 4, oldCol - 1);
	const mid = oldContent.substring(oldCol - 1, oldCol);
	let pos = oldContent.substring(oldCol, oldCol + 3);
	let i;

	while (true) {
		const str = pre + mid + pos;

		const oldContentPositions = [];
		i = oldContent.indexOf(str);
		while (i > -1) {
			oldContentPositions.push(i + pre.length + 1);
			i = oldContent.indexOf(str, i + 1);
		}

		const specificIndex = oldContentPositions.indexOf(oldCol);

		const newContentPositions = [];
		i = newContent.indexOf(str);
		while (i > -1) {
			newContentPositions.push(i + pre.length + 1);
			i = oldContent.indexOf(str, i + 1);
		}

		const newColumn =
			newContentPositions[specificIndex] || newContentPositions[newContentPositions.length - 1];
		if (newColumn) {
			return newColumn;
		}

		if (!pre.length && !pos.length) {
			break;
		}

		pre = pre.substring(1, pre.length);
		pos = pos.substring(0, pos.length - 1);
	}

	return DELETED;
}

function bestMatch(content: string, candidates: string[]): [number, string] {
	let winner = -1;
	let highScore = 0;

	for (let i = 0; i < candidates.length; i++) {
		const candidate = candidates[i];

		const rating = compareTwoStrings(content, candidate);
		if (rating > highScore) {
			winner = i;
			highScore = rating;
		}
	}

	if (highScore >= LINE_SIMILARITY_THRESHOLD) {
		return [winner, candidates[winner]];
	} else {
		return [-1, ""];
	}
}
