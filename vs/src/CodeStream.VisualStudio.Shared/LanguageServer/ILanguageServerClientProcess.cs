using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.LanguageServer {
	public interface ILanguageServerClientProcess {
		System.Diagnostics.Process Create(ICodeStreamSettingsManager codeStreamSettingsManager, IHttpClientService httpClient);
	}
}
