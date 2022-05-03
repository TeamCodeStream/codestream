using CodeStream.VisualStudio.Core.Services;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Core.LanguageServer {
	public interface ILanguageServerClientProcess {
		Task<System.Diagnostics.Process> CreateAsync(ISettingsManager settingsManager, IHttpClientService httpClient);
	}
}
