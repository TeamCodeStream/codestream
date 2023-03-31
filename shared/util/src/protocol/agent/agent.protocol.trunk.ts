export interface TrunkCheckResults {
	issues: TrunkIssue[];
	unformattedFiles: TrunkUnformattedFile[];
}

export interface TrunkIssue {
	file: string;
	line: string;
	message: string;
	code: string;
	column?: string
	level: string;
	linter: string;
	issueUrl: string;
	targetType: string;
	ranges: {
		offset: string;
		filePath: string;
		length: string;
	}[];
}

export interface TrunkUnformattedFile {
	file: string;
	line: string;
	column?: string
	message: string;
	level: string;
	issueClass: string;
	linter: string;
}