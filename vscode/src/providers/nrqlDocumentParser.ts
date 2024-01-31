export interface NrqlStatement {
	text: string;
	range: RangeLike;
}

export interface RangeLike {
	start: number;
	end: number;
}

export class NrqlDocumentParser {
	prefixes = ["/*", "--", "*", "//", "#"];
	parse(text: string): NrqlStatement[] {
		// first we split on the lines
		// we also want to get the positions of said lines
		const pattern = /(?<=\r?\n)/;
		const lines = text.split(pattern);

		const matches: NrqlStatement[] = [];
		let currentPosition = 0;
		for (const line of lines) {
			const start = currentPosition;
			const end = currentPosition + line.length - 1;
			matches.push({
				text: line,
				range: { start, end }
			});
			currentPosition += line.length;
		}

		// next we filter out any lines that start with comments
		const potentialStatements: NrqlStatement[] = [];
		{
			let buffer: NrqlStatement[] = [];
			for (let i = 0; i < matches.length; i++) {
				let curr = matches[i];
				let text = curr.text.trim().replace(/\n/g, "");
				if (!text) continue;
				if (this.prefixes.some(prefix => text.startsWith(prefix))) {
					// skip this line, but pop anything in the buffer
					// into the final list
					if (buffer.length) {
						potentialStatements.push(...buffer);
						buffer = [];
					}
				} else {
					buffer.push(curr);
				}
			}
			if (buffer.length) {
				potentialStatements.push(...buffer);
			}
		}

		// lastly, we try to join the text and ranges together of
		// lines that are not part of a comment, but are multi-lined
		const statements = [];
		let buffer: NrqlStatement | undefined = undefined;
		let i = 0;
		while (i < potentialStatements.length) {
			const curr = potentialStatements[i];
			if (buffer) {
				if (curr.range.start === buffer.range.end + 1) {
					buffer.text += `${curr.text}`;
					buffer.range.end = curr.range.end;
				} else {
					statements.push(buffer);
					buffer = curr;
				}
			} else {
				buffer = curr;
			}
			i++;
		}
		if (buffer) {
			statements.push(buffer);
		}

		return statements.filter(_ => this.validate(_.text));
	}

	/**
	 * Asserts the string starts with the correct keyword, as well as includes
	 * the most basic of options
	 *
	 * @param text
	 * @returns
	 */
	private validate(text: string) {
		const startsWithRegex = /^(SELECT|FROM|SHOW|WITH)\b/gi;
		const containsRegex = /^(?=.*(?:SELECT.*FROM|FROM.*SELECT|WITH.*SELECT|SHOW))/gis;

		const startsWithMatch = startsWithRegex.test(text);
		const containsMatch = containsRegex.test(text);

		return startsWithMatch && containsMatch;
	}
}
