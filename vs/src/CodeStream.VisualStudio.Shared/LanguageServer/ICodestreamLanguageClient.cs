using Microsoft.VisualStudio.LanguageServer.Client;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared.LanguageServer
{
	public interface ICodestreamLanguageClient : ILanguageClient
	{
		Task RestartAsync();
		Task TryStopAsync();
	}
}
