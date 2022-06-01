using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared {
	public interface ICodeLevelMetricsCallbackService {
		CodeLevelMetricStatus GetClmStatus();
		int GetVisualStudioPid();
		string GetEditorFormat();
		Task InitializeRpcAsync(string dataPointId);
		Task<GetFileLevelTelemetryResponse> GetTelemetryAsync(string codeNamespace, string functionName);
	}
}
