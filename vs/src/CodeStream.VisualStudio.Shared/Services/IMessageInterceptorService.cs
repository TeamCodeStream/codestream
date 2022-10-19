using System.Collections.Generic;

using CodeStream.VisualStudio.Shared.Models;

using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface IMessageInterceptorService
	{
		bool DoesMessageContainTempFiles(List<JToken> uriTokens);
		List<JToken> GetUriTokens(JToken messageToken);

		JToken InterceptAndModify(IAbstractMessageType message);
		WebviewIpcMessage InterceptAndModify(WebviewIpcMessage message);
	}
}
