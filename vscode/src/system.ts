"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/88e0a1b45a9b6f53b6865798e745037207f8c2da/src/system.ts which carries this notice:

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
*/

/**
 * Modifications Copyright CodeStream Inc. under the Apache 2.0 License (Apache-2.0)
 */
export * from "./system/array";
export * from "./system/crypto";
export * as Dates from "@codestream/utils/system/date";
export * from "./system/fs";
export * from "./system/function";
export * from "./system/object";
export * as Strings from "@codestream/utils/system/string";
export * from "./system/version";

// Must keep this at the end, since they uses Functions
export * from "./system/decorators/command";
export * from "./system/decorators/gate";
export * from "./system/decorators/log";
export * from "./system/decorators/memoize";
