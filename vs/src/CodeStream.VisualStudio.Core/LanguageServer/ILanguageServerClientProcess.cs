using CodeStream.VisualStudio.Core.Services;

namespace CodeStream.VisualStudio.Core.LanguageServer {
	public interface ILanguageServerClientProcess {
		System.Diagnostics.Process Create(ICodeStreamSettingsManager codeStreamSettingsManager, IHttpClientService httpClient);
	}
}
