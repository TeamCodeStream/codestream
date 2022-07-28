/**
 *
 * @param skip - number of lines of stack trace to skip
 */
export function whoCalledMe(skip: number): string {
	const e = new Error();
	if (e.stack) {
		return e.stack
			.split(/\r?\n/)
			.slice(skip + 1)
			.join("\n");
	}
	return "";
}
