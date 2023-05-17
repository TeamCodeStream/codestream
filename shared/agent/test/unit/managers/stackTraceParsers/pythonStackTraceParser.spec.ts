"use strict";

import { describe, expect, it } from "@jest/globals";
import { Parser } from "../../../../src/managers/stackTraceParsers/pythonStackTraceParser";

describe("pythonStackTraceParser", () => {
	describe("python", () => {
		it("stack1", () => {
			const str = `Traceback (most recent call last):
			File \"/usr/local/bin/gunicorn\", line 8, in <module>
			File \"/usr/local/lib/python3.7/sitepackages/gunicorn/app/wsgiapp.py\", line 58, in run
			File \"/usr/local/lib/python3.7/sitepackages/gunicorn/app/base.py\", line 228, in run
			File \"/usr/local/lib/python3.7/sitepackages/gunicorn/app/base.py\", line 72, in run
			File \"/usr/local/lib/python3.7/sitepackages/gunicorn/arbiter.py\", line 211, in run
			File \"/usr/local/lib/python3.7/sitepackages/gunicorn/arbiter.py\", line 545, in manage_workers
			File \"/usr/local/lib/python3.7/sitepackages/gunicorn/arbiter.py\", line 616, in spawn_workers
			File \"pyarrow/table.pxi\", line 1394, in pyarrow.lib.Table.from_pandas
			File \"pyarrow/array.pxi\", line 83, in pyarrow.lib._ndarray_to_array`;

			const result = Parser(str);

			expect(result).toEqual({
				language: "python",
				lines: [
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "/usr/local/bin/gunicorn",
						line: 8,
						method: "<module>",
						fullMethod: "<module>",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "/usr/local/lib/python3.7/sitepackages/gunicorn/app/wsgiapp.py",
						line: 58,
						method: "run",
						fullMethod: "run",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "/usr/local/lib/python3.7/sitepackages/gunicorn/app/base.py",
						line: 228,
						method: "run",
						fullMethod: "run",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "/usr/local/lib/python3.7/sitepackages/gunicorn/app/base.py",
						line: 72,
						method: "run",
						fullMethod: "run",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "/usr/local/lib/python3.7/sitepackages/gunicorn/arbiter.py",
						line: 211,
						method: "run",
						fullMethod: "run",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "/usr/local/lib/python3.7/sitepackages/gunicorn/arbiter.py",
						line: 545,
						method: "manage_workers",
						fullMethod: "manage_workers",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "/usr/local/lib/python3.7/sitepackages/gunicorn/arbiter.py",
						line: 616,
						method: "spawn_workers",
						fullMethod: "spawn_workers",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "pyarrow/table.pxi",
						line: 1394,
						namespace: "pyarrow.lib.Table",
						method: "from_pandas",
						fullMethod: "pyarrow.lib.Table.from_pandas",
					},
					{
						arguments: undefined,
						column: undefined,
						fileFullPath: "pyarrow/array.pxi",
						line: 83,
						namespace: "pyarrow.lib",
						method: "_ndarray_to_array",
						fullMethod: "pyarrow.lib._ndarray_to_array",
					},
				],
				text: str,
			});
		});
	});
});
