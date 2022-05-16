namespace CodeStream.VisualStudio.Shared {
	public interface ICodeLevelMetricsListener {
		bool IsClmReady();
		int GetVisualStudioPid();
	}
}
