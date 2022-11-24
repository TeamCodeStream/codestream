import { FileStatus } from "@codestream/protocols/api";

export interface GitNumStat {
	oldFile: string;
	file: string;
	linesAdded: number;
	linesRemoved: number;
	status: FileStatus;
	statusX: FileStatus;
	statusY: FileStatus;
}
