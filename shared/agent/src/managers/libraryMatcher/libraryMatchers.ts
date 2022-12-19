import { Logger } from "../../logger";

export type LibraryMatcher = (line: string) => boolean;

const pythonLibRegex = new RegExp(/\/usr(\/local)?\/lib\/python\d/);
const rubyLibRegex = [new RegExp(/ruby\/gems\/\d/), new RegExp(/vendor\/bundle\/ruby\/\d/)];

// TODO Python venv https://docs.python.org/3/library/venv.html
const pythonLibraryMatcher: LibraryMatcher = (line: string) => {
	const result = pythonLibRegex.test(line);
	if (result) {
		Logger.warn(`Skipping ${line} as it is a library`);
	}
	return result;
};

const rubyLibraryMatcher: LibraryMatcher = (line: string) => {
	for (const regex of rubyLibRegex) {
		const result = regex.test(line);
		if (result) {
			Logger.warn(`Skipping ${line} as it is a library`);
			return true;
		}
	}
	return false;
};

interface LibraryMap {
	[language: string]: LibraryMatcher;
}

export const libraryMatchers: LibraryMap = {
	python: pythonLibraryMatcher,
	ruby: rubyLibraryMatcher,
};
