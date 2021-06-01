"use strict";
/**
Portions adapted from ttps://github.com/eamodio/vscode-gitlens/blob/12a93fe5f609f0bb154dca1a8d09ac3e980b9b3b/src/git/shell.ts which carries this notice:

The MIT License (MIT)

Copyright (c) 2016-2021 Eric Amodio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Copyright (c) 2018-2021 CodeStream Inc.

*/
import { ChildProcess, execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logger";
import { SupressedGitWarnings } from "./git";

export const isWindows = process.platform === "win32";

/**
 * Search PATH to see if a file exists in any of the path folders.
 *
 * @param  {string} exe The file to search for
 * @return {string}     A fully qualified path, or the original path if nothing
 *                      is found
 *
 * @private
 */
function runDownPath(exe: string): string {
	// NB: Windows won't search PATH looking for executables in spawn like
	// Posix does

	// Files with any directory path don't get this applied
	if (exe.match(/[\\\/]/)) return exe;

	const target = path.join(".", exe);
	try {
		if (fs.statSync(target)) return target;
	} catch {}

	const haystack = process.env.PATH!.split(isWindows ? ";" : ":");
	for (const p of haystack) {
		const needle = path.join(p, exe);
		try {
			if (fs.statSync(needle)) return needle;
		} catch {}
	}

	return exe;
}

/**
 * Finds the executable and parameters to run on Windows. This method
 * mimics the POSIX behavior of being able to run scripts as executables by
 * replacing the passed-in executable with the script runner, for PowerShell,
 * CMD, and node scripts.
 *
 * This method also does the work of running down PATH, which spawn on Windows
 * also doesn't do, unlike on POSIX.
 */
export function findExecutable(exe: string, args: string[]): { cmd: string; args: string[] } {
	// POSIX can just execute scripts directly, no need for silly goosery
	if (!isWindows) return { cmd: runDownPath(exe), args: args };

	if (!fs.existsSync(exe)) {
		// NB: When you write something like `surf-client ... -- surf-build` on Windows,
		// a shell would normally convert that to surf-build.cmd, but since it's passed
		// in as an argument, it doesn't happen
		const possibleExts = [".exe", ".bat", ".cmd", ".ps1"];
		for (const ext of possibleExts) {
			const possibleFullPath = runDownPath(`${exe}${ext}`);

			if (fs.existsSync(possibleFullPath)) return findExecutable(possibleFullPath, args);
		}
	}

	if (exe.match(/\.ps1$/i)) {
		const cmd = path.join(
			process.env.SYSTEMROOT!,
			"System32",
			"WindowsPowerShell",
			"v1.0",
			"PowerShell.exe"
		);
		const psargs = ["-ExecutionPolicy", "Unrestricted", "-NoLogo", "-NonInteractive", "-File", exe];

		return { cmd: cmd, args: psargs.concat(args) };
	}

	if (exe.match(/\.(bat|cmd)$/i)) {
		const cmd = path.join(process.env.SYSTEMROOT!, "System32", "cmd.exe");
		const cmdArgs = ["/C", exe, ...args];

		return { cmd: cmd, args: cmdArgs };
	}

	if (exe.match(/\.(js)$/i)) {
		const cmd = process.execPath;
		const nodeArgs = [exe];

		return { cmd: cmd, args: nodeArgs.concat(args) };
	}

	return { cmd: exe, args: args };
}

export interface CommandOptions {
	readonly cwd?: string;
	readonly env?: NodeJS.ProcessEnv;
	readonly encoding?: BufferEncoding;
	/**
	 * The size the output buffer to allocate to the spawned process. Set this
	 * if you are anticipating a large amount of output.
	 *
	 * If not specified, this will be 10MB (10485760 bytes) which should be
	 * enough for most Git operations.
	 */
	readonly maxBuffer?: number;
	/**
	 * An optional string or buffer which will be written to
	 * the child process stdin stream immediately immediately
	 * after spawning the process.
	 */
	readonly stdin?: string | Buffer;
	/**
	 * The encoding to use when writing to stdin, if the stdin
	 * parameter is a string.
	 */
	readonly stdinEncoding?: string;
	/**
	 * If true, errors won't be logged
	 */
	readonly throwRawExceptions?: boolean;
}

export function runCommand(command: string, args: any[], options: CommandOptions = {}) {
	const { stdin, stdinEncoding, ...opts } = {
		maxBuffer: 100 * 1024 * 1024,
		...options
	} as CommandOptions;

	return new Promise<string>((resolve, reject) => {
		const proc = execFile(
			command,
			args,
			opts,
			(err: (Error & { code?: string | number }) | null, stdout: string, stderr: string) => {
				if (!err) {
					if (stderr) {
						Logger.warn(`Warning(${command} ${args.join(" ")}): ${stderr}`);
					}
					resolve(stdout);

					return;
				}

				if (err.message === "stdout maxBuffer exceeded") {
					reject(
						new Error(
							`Command output exceeded the allocated stdout buffer. Set 'options.maxBuffer' to a larger value than ${opts.maxBuffer} bytes`
						)
					);
				}

				if (!SupressedGitWarnings.find(_ => _.test(err.message))) {
					Logger.warn(
						`Error(${opts.cwd}): ${command} ${args.join(" ")})\n    (${err.code}) ${
							err.message
						}\n${stderr}`
					);
				}
				reject(err);
			}
		);

		ignoreClosedInputStream(proc);

		if (stdin) {
			proc.stdin.end(stdin, stdinEncoding || "utf8");
		}
	});
}

/**
 * Borrowed from https://github.com/desktop/dugite/commit/e5e11d73324a76d1336607fa7cf30b441f257b6e
 *
 * Prevent errors originating from the stdin stream related
 * to the child process closing the pipe from bubbling up and
 * causing an unhandled exception when no error handler is
 * attached to the input stream.
 *
 * The common scenario where this happens is if the consumer
 * is writing data to the stdin stream of a child process and
 * the child process for one reason or another decides to either
 * terminate or simply close its standard input. Imagine this
 * scenario
 *
 *  cat /dev/zero | head -c 1
 *
 * The 'head' command would close its standard input (by terminating)
 * the moment it has read one byte. In the case of Git this could
 * happen if you for example pass badly formed input to apply-patch.
 */
function ignoreClosedInputStream(process: ChildProcess) {
	process.stdin.on("error", err => {
		const errWithCode = err as ErrorWithCode;

		// Is the error one that we'd expect from the input stream being
		// closed, i.e. EPIPE on macOS and EOF on Windows?
		if (errWithCode.code !== "EPIPE" && errWithCode.code !== "EOF") {
			// Nope, this is something else. Are there any other error listeners
			// attached than us? If not we'll have to mimic the behavior of
			// EventEmitter.
			//
			// See https://nodejs.org/api/errors.html#errors_error_propagation_and_interception
			//
			// "For all EventEmitter objects, if an 'error' event handler is not
			//  provided, the error will be thrown"
			if (process.stdin.listeners("error").length > 1) {
				throw err;
			}
		}
	});
}

interface ErrorWithCode extends Error {
	code: string | number | undefined;
}
