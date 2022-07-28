import { ChildProcess } from "child_process";

declare namespace opn {}

declare const opn: {
	(target: string, opts: any): Promise<ChildProcess>;
};

export = opn;
