/*
Portions adapted from https://github.com/microsoft/vscode-pull-request-github/blob/df0b143714b6a17d74f8e22dddb0863d7e71fdb8/src/authentication/keychain.ts which carries this notice:

MIT License

Copyright (c) Microsoft Corporation. All rights reserved.

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

 */

// keytar depends on a native module shipped in vscode, so this is
// how we load it
import * as keytarType from "keytar";

function getNodeModule<T>(moduleName: string): T | undefined {
	// eslint-disable-next-line no-eval
	const vscodeRequire = eval("require");
	try {
		return vscodeRequire(moduleName);
	} catch (ex) {}
	return undefined;
}

export const keychain = getNodeModule<typeof keytarType>("keytar");
