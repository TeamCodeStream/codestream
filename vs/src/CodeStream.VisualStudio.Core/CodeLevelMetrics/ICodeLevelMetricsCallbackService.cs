using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Enums;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Core.CodeLevelMetrics {
	public interface ICodeLevelMetricsCallbackService {
		CodeLevelMetricStatus GetClmStatus();
		int GetVisualStudioPid();
		Task InitializeRpcAsync(string dataPointId);
		Task<CodeLevelMetricsTelemetry> GetTelemetryAsync(string codeNamespace, string functionName);
	}
}
