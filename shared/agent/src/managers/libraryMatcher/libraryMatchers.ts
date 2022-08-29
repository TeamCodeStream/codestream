import { Logger } from "../../logger";

export type LibraryMatcher = (line: string) => boolean;

const pythonLibRegex = new RegExp(/\/usr(\/local)?\/lib\/python\d/);

// TODO Python venv https://docs.python.org/3/library/venv.html
const pythonLibraryMatcher: LibraryMatcher = (line: string) => {
	const result = pythonLibRegex.test(line);
	if (result) {
		Logger.warn(`Skipping ${line} as it is a library`);
	}
	return result;
};

interface LibraryMap {
	[language: string]: LibraryMatcher;
}

export const libraryMatchers: LibraryMap = { python: pythonLibraryMatcher };
