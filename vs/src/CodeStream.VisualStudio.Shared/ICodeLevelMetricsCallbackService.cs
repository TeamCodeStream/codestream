using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared {
	public interface ICodeLevelMetricsCallbackService {
		bool IsClmReady();
		int GetVisualStudioPid();
		Task InitializeRpcAsync(string dataPointId);
	}
}
