using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json.Linq;
using Serilog;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Core.LanguageServer {
	public class MiddleLayerProvider {
		private ILogger Log;

		public MiddleLayerProvider(ILogger log) {
			Log = log;
		}

		private static HashSet<string> IgnoredMethods = new HashSet<string> {
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
		public bool CanHandle(string methodName) {
			var isIgnored = IgnoredMethods.Contains(methodName);
			if (Log.IsVerboseEnabled()) {
				Log.Verbose($"{nameof(MiddleLayerProvider)} {methodName} Ignored={isIgnored}");
			}
			return !isIgnored;
		}

		public Task HandleNotificationAsync(string methodName, JToken methodParam, Func<JToken, Task> sendNotification) {
			try {
				// intercept any "temp" file paths that contain codestream-diff info
				// and do not send them along to the agent
				if (methodParam != null && methodParam["textDocument"] != null &&
					methodParam["textDocument"]["uri"] != null &&
					CodeStreamDiffUri.IsTempFile(methodParam["textDocument"]["uri"].Value<string>())) {
					return Task.CompletedTask;
				}
				if (Log.IsVerboseEnabled()) {
					LogHandler(methodName, methodParam);
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(HandleNotificationAsync));
			}

			return sendNotification(methodParam);
		}

		public Task<JToken> HandleRequestAsync(string methodName, JToken methodParam, Func<JToken, Task<JToken>> sendRequest) {
			if (Log.IsVerboseEnabled()) {
				LogHandler(methodName, methodParam);
			}
			return sendRequest(methodParam);
		}

		private void LogHandler(string methodName, JToken methodParam) {
			string value = "";
			try {
				if (methodParam != null) {
					var textDocument = methodParam.SelectToken("textDocument");
					if (textDocument != null) {
						value = textDocument.SelectToken("uri")?.ToString();
					}
				}				
			}
			catch {
				// ignore
			}
			Log.Verbose("lsp: " + methodName + " = " + value);
		}
	}
}
