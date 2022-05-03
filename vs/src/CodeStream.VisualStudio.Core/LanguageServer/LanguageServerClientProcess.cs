using System.Collections.Specialized;
using System.IO;
using System.Reflection;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Process;
using CodeStream.VisualStudio.Core.Services;

namespace CodeStream.VisualStudio.Core.LanguageServer {

	public class LanguageServerClientProcess : ILanguageServerClientProcess {
		/// <summary>
		/// Creates the lsp server process object
		/// </summary>
		/// <returns></returns>
		public System.Diagnostics.Process Create(ISettingsManager settingsManager) {
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

			StringDictionary additionalEnv = new StringDictionary {
				{ "NODE_EXTRA_CA_CERTS", settingsManager.ExtraCertificates },
				{ "NODE_TLS_REJECT_UNAUTHORIZED", settingsManager.DisableStrictSSL ? "0" : "1" }
			};

			return ProcessFactory.Create(exe, arguments, additionalEnv);
		}
	}
}
