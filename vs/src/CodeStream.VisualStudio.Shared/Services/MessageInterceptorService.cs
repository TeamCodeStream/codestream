﻿using System.Collections.Generic;
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
		public MessageInterceptorService(IIdeService ideService) 
			=> _ideService = ideService;

		public bool DoesMessageContainTempFiles(List<JToken> uriTokens)
			=> uriTokens
				.Where(x => x is JValue)
				.Any(x => x.Value<string>().IsTempFile());

		public List<JToken> GetUriTokens(JToken messageToken) 
			=> messageToken?
				.SelectTokens("$..uri")?
				.ToList() ?? new List<JToken>();

		public JToken InterceptAndModify(IAbstractMessageType message)
		{
			var messageToken = message?.ToJToken();

			var updatedMessage = InterceptAndModify(messageToken);

			return updatedMessage;
		}

		public WebviewIpcMessage InterceptAndModify(WebviewIpcMessage message)
		{
			var updatedMessage = InterceptAndModify(message.TParams);

			message.TParams = updatedMessage;

			return message;
		}

		private JToken InterceptAndModify(JToken originalToken)
		{
			var uriTokens = GetUriTokens(originalToken);
			var hasTempFiles = DoesMessageContainTempFiles(uriTokens);

			return !hasTempFiles
				? originalToken
				: UpdateMessage(originalToken, uriTokens);
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

				if(uri.IsTempFile() && (diffViewer.Properties?.TryGetProperty(PropertyNames.OverrideFileUri, out string codeStreamDiffUri) ?? false)){
					message?.SelectToken(uriToken.Path)?.Replace(new JValue(codeStreamDiffUri));
				}
			}

			return message;
		}
	}
}
