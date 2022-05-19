using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared {
	public interface ICodeLevelMetricsCallbackService {
		Task<string> CurrentSolutionPath();
		CodeLevelMetricStatus GetClmStatus();
		int GetVisualStudioPid();
		string GetClmFormatSetting();
		Task InitializeRpcAsync(string dataPointId);
	}
}
