"use strict";

import { describe, expect, it } from "@jest/globals";
import { Parser } from "../../../../src/managers/stackTraceParsers/elixirStackTraceParser";

describe("elixirStackTraceParser", () => {
	it("stack", () => {
		const str = `(LoginService.API.Error) Server Error (503)

(http_services 0.1.0) lib/services/login_service_api.ex:3: LoginService.API.raise_unexpected_response_error!/1
(cache 0.1.0) lib/cache.ex:57: Cache.miss/4
(http_services 0.1.0) lib/services/login_service_api.ex:12: LoginService.API.also_accessible_accounts/1
(business_logic 0.1.0) lib/api_key.ex:29: BusinessLogic.ApiKey.fetch_authorized_account_ids/1
(business_logic 0.1.0) lib/api_key.ex:11: BusinessLogic.ApiKey.authorized_accounts_check/2
(elixir 1.12.3) lib/task/supervised.ex:90: Task.Supervised.invoke_mfa/2
(elixir 1.12.3) lib/task/supervised.ex:35: Task.Supervised.reply/5
(stdlib 3.16.1) proc_lib.erl:226: :proc_lib.init_p_do_apply/3`;

		const result = Parser(str);

		expect(result).toEqual({
			language: "elixir",
			lines: [
				{
					method: "LoginService.API.raise_unexpected_response_error!/1",
					fileFullPath: "http_services/lib/services/login_service_api.ex",
					line: 3,
				},
				{
					method: "Cache.miss/4",
					fileFullPath: "cache/lib/cache.ex",
					line: 57,
				},
				{
					method: "LoginService.API.also_accessible_accounts/1",
					fileFullPath: "http_services/lib/services/login_service_api.ex",
					line: 12,
				},
				{
					method: "BusinessLogic.ApiKey.fetch_authorized_account_ids/1",
					fileFullPath: "business_logic/lib/api_key.ex",
					line: 29,
				},
				{
					method: "BusinessLogic.ApiKey.authorized_accounts_check/2",
					fileFullPath: "business_logic/lib/api_key.ex",
					line: 11,
				},
				{
					method: "Task.Supervised.invoke_mfa/2",
					fileFullPath: "elixir/lib/task/supervised.ex",
					line: 90,
				},
				{
					method: "Task.Supervised.reply/5",
					fileFullPath: "elixir/lib/task/supervised.ex",
					line: 35,
				},
				{
					method: ":proc_lib.init_p_do_apply/3",
					fileFullPath: "stdlib/proc_lib.erl",
					line: 226,
				},
			],
			header: "(LoginService.API.Error) Server Error (503)",
			error: "Server Error (503)",
		});
	});
});
