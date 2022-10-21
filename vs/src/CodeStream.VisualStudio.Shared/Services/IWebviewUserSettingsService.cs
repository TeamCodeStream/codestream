using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Services {
	public interface IWebviewUserSettingsService {
		bool DeleteTeamId(string solutionName);
		bool SaveContext(string solutionName, WebviewContext context);
		bool TryClearContext(string solutionName, string teamId);
		bool SaveTeamId(string solutionName, string teamId);
		string TryGetTeamId(string solutionName);
		WebviewContext TryGetWebviewContext(string solutionName, string teamId);
	}
}
