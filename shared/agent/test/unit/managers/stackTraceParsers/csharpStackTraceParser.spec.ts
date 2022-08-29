"use strict";

import { describe, expect, it } from "@jest/globals";
import { Parser } from "../../../../src/managers/stackTraceParsers/csharpStackTraceParser";

describe("csharpStackTraceParser", () => {
	describe(".net framework", () => {
		// TODO get some "classic" .NET framework stacks
	});

	describe("dotnet core", () => {
		it("console app macOS", () => {
			const str = `   at Somethingelse.Baz.Initialize() in /Users/jdoe/code/dotnet_console/Program.cs:line 37
	   at dotnet_console.Bar.Execute() in /Users/jdoe/code/dotnet_console/Program.cs:line 26
	   at dotnet_console.Foo.Go() in /Users/jdoe/code/dotnet_console/Program.cs:line 20
	   at dotnet_console.Program.Main(String[] args) in /Users/jdoe/code/dotnet_console/Program.cs:line 10`;

			const result = Parser(str);
			expect(result).toEqual({
				language: "csharp",
				lines: [
					{
						arguments: undefined,
						fileFullPath: "/Users/jdoe/code/dotnet_console/Program.cs",
						method: "Initialize",
						line: 37,
						column: undefined
					},
					{
						arguments: undefined,
						fileFullPath: "/Users/jdoe/code/dotnet_console/Program.cs",
						method: "Execute",
						line: 26,
						column: undefined
					},
					{
						arguments: undefined,
						fileFullPath: "/Users/jdoe/code/dotnet_console/Program.cs",
						method: "Go",
						line: 20,
						column: undefined
					},
					{
						arguments: ["String[] args"],
						fileFullPath: "/Users/jdoe/code/dotnet_console/Program.cs",
						method: "Main",
						line: 10,
						column: undefined
					}
				],
				text:
					"   at Somethingelse.Baz.Initialize() in /Users/jdoe/code/dotnet_console/Program.cs:line 37\n\t   at dotnet_console.Bar.Execute() in /Users/jdoe/code/dotnet_console/Program.cs:line 26\n\t   at dotnet_console.Foo.Go() in /Users/jdoe/code/dotnet_console/Program.cs:line 20\n\t   at dotnet_console.Program.Main(String[] args) in /Users/jdoe/code/dotnet_console/Program.cs:line 10"
			});
		});

		it("dotnet mvc", () => {
			const str = `System.DivideByZeroException: Attempted to divide by zero.
			at AspNetCore.Views_Home_Index.ExecuteAsync() in /Users/jdoe/code/dotnet_mvc/Views/Home/Index.cshtml:line 5
			at Microsoft.AspNetCore.Mvc.Razor.RazorView.RenderPageCoreAsync(IRazorPage page, ViewContext context)
			at Microsoft.AspNetCore.Mvc.Razor.RazorView.RenderPageAsync(IRazorPage page, ViewContext context, Boolean invokeViewStarts)
			at Microsoft.AspNetCore.Mvc.Razor.RazorView.RenderAsync(ViewContext context)
			at Microsoft.AspNetCore.Mvc.ViewFeatures.ViewExecutor.ExecuteAsync(ViewContext viewContext, String contentType, Nullable\`1 statusCode)
			at Microsoft.AspNetCore.Mvc.ViewFeatures.ViewExecutor.ExecuteAsync(ViewContext viewContext, String contentType, Nullable\`1 statusCode)
			at Microsoft.AspNetCore.Mvc.ViewFeatures.ViewExecutor.ExecuteAsync(ActionContext actionContext, IView view, ViewDataDictionary viewData, ITempDataDictionary tempData, String contentType, Nullable\`1 statusCode)
			at Microsoft.AspNetCore.Mvc.ViewFeatures.ViewResultExecutor.ExecuteAsync(ActionContext context, ViewResult result)
			at Microsoft.AspNetCore.Mvc.ViewResult.ExecuteResultAsync(ActionContext context)
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResultFilterAsync>g__Awaited|29_0[TFilter,TFilterAsync](ResourceInvoker invoker, Task lastTask, State next, Scope scope, Object state, Boolean isCompleted)
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow(ResultExecutedContextSealed context)
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.ResultNext[TFilter,TFilterAsync](State& next, Scope& scope, Object& state, Boolean& isCompleted)
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeResultFilters()
		 --- End of stack trace from previous location ---
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeNextResourceFilter>g__Awaited|24_0(ResourceInvoker invoker, Task lastTask, State next, Scope scope, Object state, Boolean isCompleted)
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Rethrow(ResourceExecutedContextSealed context)
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.Next(State& next, Scope& scope, Object& state, Boolean& isCompleted)
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.InvokeFilterPipelineAsync()
		 --- End of stack trace from previous location ---
			at Microsoft.AspNetCore.Mvc.Infrastructure.ResourceInvoker.<InvokeAsync>g__Awaited|17_0(ResourceInvoker invoker, Task task, IDisposable scope)
			at Microsoft.AspNetCore.Routing.EndpointMiddleware.<Invoke>g__AwaitRequestTask|6_0(Endpoint endpoint, Task requestTask, ILogger logger)
			at Microsoft.AspNetCore.Authorization.AuthorizationMiddleware.Invoke(HttpContext context)
			at Microsoft.AspNetCore.Diagnostics.DeveloperExceptionPageMiddleware.Invoke(HttpContext context)`;

			const result = Parser(str);
			expect(result.header).toEqual("System.DivideByZeroException: Attempted to divide by zero.");
			expect(result.error).toEqual("Attempted to divide by zero.");
			expect(result.lines[0]).toEqual({
				arguments: undefined,
				fileFullPath: "/Users/jdoe/code/dotnet_mvc/Views/Home/Index.cshtml",
				method: "ExecuteAsync",
				line: 5,
				column: undefined
			});
			expect(result.lines[1]).toEqual({
				arguments: ["IRazorPage page", "ViewContext context"],
				fileFullPath: undefined,
				method: "RenderPageCoreAsync",
				line: NaN,
				column: undefined
			});
		});
	});
});
