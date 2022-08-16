namespace CodeStream.VisualStudio.Core.Process {
	public static class ProcessExtensions {
		public static bool IsVisualStudioProcess() =>
			System.Diagnostics.Process.GetCurrentProcess().ProcessName == "devenv";
	}
}
