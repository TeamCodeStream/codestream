using CodeStream.VisualStudio.Core.Logging;

using Newtonsoft.Json.Linq;
using Serilog;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Microsoft.VisualStudio.LanguageServer.Client;

using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.LanguageServer
{
	public class MiddleLayerProvider : ILanguageClientMiddleLayer
	{
		private readonly ILogger _log;
		private readonly IMessageInterceptorService _messageInterceptorService;

		public MiddleLayerProvider(
			ILogger log,
			IMessageInterceptorService messageInterceptorService
		)
		{
			_log = log;
			_messageInterceptorService = messageInterceptorService;
		}

		private static readonly HashSet<string> IgnoredMethods = new HashSet<string>
		{
			// this throws some bizarro internal exception -- we don't use it anyway
			// (most likely a versioning issue [aka we're too old])
			"textDocument/completion",
			"textDocument/hover"
		};

		/// <summary>
		/// Specifies whether we can handle this methodName. All methods except
		/// those specified in the ignore hashset are handled.
		/// </summary>
		/// <param name="methodName"></param>
		/// <returns></returns>
		public bool CanHandle(string methodName)
		{
			var isIgnored = IgnoredMethods.Contains(methodName);
			if (_log.IsVerboseEnabled())
			{
				_log.Verbose($"{nameof(MiddleLayerProvider)} {methodName} Ignored={isIgnored}");
			}
			return !isIgnored;
		}

		public Task HandleNotificationAsync(
			string methodName,
			JToken methodParam,
			Func<JToken, Task> sendNotification
		)
		{
			try
			{
				// intercept any Temp or Diff-Schemed file paths and
				// do not send them along to the agent
				var uriTokens = _messageInterceptorService.GetUriTokens(methodParam);
				var hasTempFiles = _messageInterceptorService.DoesMessageContainTempFiles(
					uriTokens
				);

				if (hasTempFiles)
				{
					return Task.CompletedTask;
				}

				if (_log.IsVerboseEnabled())
				{
					LogHandler(methodName, methodParam);
				}
			}
			catch (Exception ex)
			{
				_log.Error(ex, nameof(HandleNotificationAsync));
			}

			return sendNotification(methodParam);
		}

		public Task<JToken> HandleRequestAsync(
			string methodName,
			JToken methodParam,
			Func<JToken, Task<JToken>> sendRequest
		)
		{
			if (_log.IsVerboseEnabled())
			{
				LogHandler(methodName, methodParam);
			}

			return sendRequest(methodParam);
		}

		private void LogHandler(string methodName, JToken methodParam)
		{
			var value = "";
			try
			{
				if (methodParam != null)
				{
					var textDocument = methodParam.SelectToken("textDocument");
					if (textDocument != null)
					{
						value = textDocument.SelectToken("uri")?.ToString();
					}
				}
			}
			catch
			{
				// ignore
			}
			_log.Verbose("lsp: " + methodName + " = " + value);
		}
	}
}
