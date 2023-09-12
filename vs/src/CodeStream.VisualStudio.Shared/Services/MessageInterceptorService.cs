using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Linq;

using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;

using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Services
{
	[Export(typeof(IMessageInterceptorService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class MessageInterceptorService : IMessageInterceptorService
	{
		private readonly IIdeService _ideService;

		[ImportingConstructor]
		public MessageInterceptorService(IIdeService ideService) => _ideService = ideService;

		public bool DoesMessageContainTempFiles(List<JToken> uriTokens) =>
			uriTokens.Where(x => x is JValue).Any(x => x.Value<string>().IsTempFile());

		public List<JToken> GetUriTokens(JToken messageToken) =>
			messageToken?.SelectTokens("$..uri").ToList() ?? new List<JToken>();

		public JToken InterceptAndModify(IAbstractMessageType message)
		{
			var messageToken = message?.ToJToken();

			var updatedMessage = InterceptAndModify(messageToken);

			return updatedMessage;
		}

		public WebviewIpcMessage InterceptAndModify(WebviewIpcMessage message)
		{
			var updatedMessage = InterceptAndModify(message.Params);

			message.Params = updatedMessage;

			return message;
		}

		private JToken InterceptAndModify(JToken originalToken)
		{
			var uriTokens = GetUriTokens(originalToken);
			var hasTempFiles = DoesMessageContainTempFiles(uriTokens);

			return !hasTempFiles ? originalToken : UpdateMessage(originalToken, uriTokens);
		}

		private JToken UpdateMessage(JToken message, IEnumerable<JToken> tokensToUpdate)
		{
			var diffViewer = _ideService.GetActiveDiffEditor();

			if (diffViewer == null)
			{
				return message;
			}

			foreach (var uriToken in tokensToUpdate)
			{
				var uri = uriToken.Value<string>();

				// 1. Must be a temp file URId
				// 2. DiffViewer must contain the OverrideFileUri
				// 3. DiffViewer must contain the original temp file URI, and it must match our token path

				var codeStreamDiffUri = string.Empty;
				if (
					!diffViewer.Properties?.TryGetProperty(
						PropertyNames.OverrideFileUri,
						out codeStreamDiffUri
					) ?? false
				)
				{
					continue;
				}

				var tempFileUri = string.Empty;
				if (
					!diffViewer.Properties?.TryGetProperty(
						PropertyNames.OriginalTempFileUri,
						out tempFileUri
					) ?? false
				)
				{
					continue;
				}

				if (uri.IsTempFile() && tempFileUri.ToUri().EqualsIgnoreCase(uri.ToUri()))
				{
					message?.SelectToken(uriToken.Path)?.Replace(new JValue(codeStreamDiffUri));
				}
			}

			return message;
		}
	}
}
