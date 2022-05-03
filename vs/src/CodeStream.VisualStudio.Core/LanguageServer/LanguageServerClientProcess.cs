using System.Collections.Specialized;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Process;
using CodeStream.VisualStudio.Core.Services;

namespace CodeStream.VisualStudio.Core.LanguageServer {

	public class LanguageServerClientProcess : ILanguageServerClientProcess {
		/// <summary>
		/// Creates the lsp server process object
		/// </summary>
		/// <returns></returns>
		public async Task<System.Diagnostics.Process> CreateAsync(ISettingsManager settingsManager, IHttpClientService httpClient) {
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

			var nrSettings = await httpClient.GetNREnvironmentSettingsAsync();

			StringDictionary additionalEnv = new StringDictionary {
				{ "NODE_EXTRA_CA_CERTS", settingsManager.ExtraCertificates },
				{ "NODE_TLS_REJECT_UNAUTHORIZED", settingsManager.DisableStrictSSL ? "0" : "1" },
				{ "NEW_RELIC_HOST", nrSettings.Host },
				{ "NEW_RELIC_LOG_LEVEL", nrSettings.LogLevel },
				{ "NEW_RELIC_APP_NAME", nrSettings.AppName },
				{ "NEW_RELIC_LICENSE_KEY", nrSettings.LicenseKey }
			};

			return ProcessFactory.Create(exe, arguments, additionalEnv);
		}
	}
}
