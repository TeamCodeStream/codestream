"use strict";

import { describe, expect, it } from "@jest/globals";
import { Parser } from "../../../../src/managers/stackTraceParsers/elixirStackTraceParser";

describe("elixirStackTraceParser", () => {
	it("stack1", () => {
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

	describe("stack2", () => {
		const str = `(FunctionClauseError) no function clause matching in BusinessLogic.Nrdb.metadata/1

(business_logic 0.1.0) lib/nrdb.ex:567: BusinessLogic.Nrdb.metadata(%{"queryProgress" => %{"completed" => false, "retryAfterSeconds" => 10, "retryDeadlineSeconds" => 60, "token" => "MV9hOWRjZTk3My02NGRiLTQ3MTQtODQzOC1mYzhkN2EyN2RhYjk"}})
(nerd_graph 0.1.0) lib/schema/nerd/resolvers/data_dictionary.ex:11: Nerd.Resolvers.DataDictionary.event_definitions/3
(absinthe 1.6.6) lib/absinthe/resolution.ex:209: Absinthe.Resolution.call/2
(absinthe 1.6.6) lib/absinthe/phase/document/execution/resolution.ex:230: Absinthe.Phase.Document.Execution.Resolution.reduce_resolution/1
(absinthe 1.6.6) lib/absinthe/phase/document/execution/resolution.ex:185: Absinthe.Phase.Document.Execution.Resolution.do_resolve_field/3
(absinthe 1.6.6) lib/absinthe/phase/document/execution/resolution.ex:170: Absinthe.Phase.Document.Execution.Resolution.do_resolve_fields/6
(absinthe 1.6.6) lib/absinthe/phase/document/execution/resolution.ex:88: Absinthe.Phase.Document.Execution.Resolution.walk_result/5
(absinthe 1.6.6) lib/absinthe/phase/document/execution/resolution.ex:280: Absinthe.Phase.Document.Execution.Resolution.build_result/3`;

		const result = Parser(str);

		expect(result).toEqual({
			language: "elixir",
			lines: [
				{
					method:
						'BusinessLogic.Nrdb.metadata(%{"queryProgress" => %{"completed" => false, "retryAfterSeconds" => 10, "retryDeadlineSeconds" => 60, "token" => "MV9hOWRjZTk3My02NGRiLTQ3MTQtODQzOC1mYzhkN2EyN2RhYjk"}})',
					fileFullPath: "business_logic/lib/nrdb.ex",
					line: 567,
				},
				{
					method: "Nerd.Resolvers.DataDictionary.event_definitions/3",
					fileFullPath: "nerd_graph/lib/schema/nerd/resolvers/data_dictionary.ex",
					line: 11,
				},
				{
					method: "Absinthe.Resolution.call/2",
					fileFullPath: "absinthe/lib/absinthe/resolution.ex",
					line: 209,
				},
				{
					method: "Absinthe.Phase.Document.Execution.Resolution.reduce_resolution/1",
					fileFullPath: "absinthe/lib/absinthe/phase/document/execution/resolution.ex",
					line: 230,
				},
				{
					method: "Absinthe.Phase.Document.Execution.Resolution.do_resolve_field/3",
					fileFullPath: "absinthe/lib/absinthe/phase/document/execution/resolution.ex",
					line: 185,
				},
				{
					method: "Absinthe.Phase.Document.Execution.Resolution.do_resolve_fields/6",
					fileFullPath: "absinthe/lib/absinthe/phase/document/execution/resolution.ex",
					line: 170,
				},
				{
					method: "Absinthe.Phase.Document.Execution.Resolution.walk_result/5",
					fileFullPath: "absinthe/lib/absinthe/phase/document/execution/resolution.ex",
					line: 88,
				},
				{
					method: "Absinthe.Phase.Document.Execution.Resolution.build_result/3",
					fileFullPath: "absinthe/lib/absinthe/phase/document/execution/resolution.ex",
					line: 280,
				},
			],
			header: "(FunctionClauseError) no function clause matching in BusinessLogic.Nrdb.metadata/1",
			error: "no function clause matching in BusinessLogic.Nrdb.metadata/1",
		});
	});
});
