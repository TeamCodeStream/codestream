using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared {
	public interface ICodeLevelMetricsCallbackService {
		CodeLevelMetricStatus GetClmStatus();
		int GetVisualStudioPid();
		Task InitializeRpcAsync(string dataPointId);
		Task<string> GetTelemetryAsync(string codeNamespace, string functionName);
	}
}
