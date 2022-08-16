using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared.LanguageServer {
	public interface ILanguageServerClientManager {
		Task RestartAsync();
	}
}
