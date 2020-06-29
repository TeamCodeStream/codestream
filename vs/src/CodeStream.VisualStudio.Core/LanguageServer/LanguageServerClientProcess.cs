using System.IO;
using System.Reflection;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Process;

namespace CodeStream.VisualStudio.Core.LanguageServer {

	public class LanguageServerClientProcess : ILanguageServerClientProcess {
		/// <summary>
		/// Creates the lsp server process object
		/// </summary>
		/// <returns></returns>
		public System.Diagnostics.Process Create(TraceLevel? traceLevel = TraceLevel.Info) {
			var assembly = Assembly.GetAssembly(typeof(LanguageServerClientProcess));
			string arguments = null;
			var exe = @"node.exe";
			var logPath = $"{Application.LogPath}{Application.LogNameAgent}";
#if DEBUG
			var path = Path.GetDirectoryName(assembly.Location) + @"\dist\agent.js";
			arguments = $@"--nolazy --inspect=6010 ""{path}"" --stdio --log={logPath}";
			Node.EnsureVersion(exe);
#else
			exe = Path.GetDirectoryName(assembly.Location) + @"\dist\agent.exe";
			arguments = $@"--stdio --nolazy --log={logPath}";
#endif
			return ProcessFactory.Create(exe, arguments, false);
		}
	}
}
