using System.Collections.Specialized;
using System.IO;
using System.Reflection;
using CodeStream.VisualStudio.Core.Process;
using CodeStream.VisualStudio.Core.Services;

namespace CodeStream.VisualStudio.Core.LanguageServer {

	public class LanguageServerClientProcess : ILanguageServerClientProcess {
		/// <summary>
		/// Creates the lsp server process object
		/// </summary>
		/// <returns></returns>
		public System.Diagnostics.Process Create(ICodeStreamSettingsManager codeStreamSettingsManager, IHttpClientService httpClient) {
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

			var nrSettings = httpClient.GetNREnvironmentSettings();

			StringDictionary additionalEnv = new StringDictionary {
				{ "NODE_EXTRA_CA_CERTS", codeStreamSettingsManager.ExtraCertificates },
				{ "NODE_TLS_REJECT_UNAUTHORIZED", codeStreamSettingsManager.DisableStrictSSL ? "0" : "1" }
			};

			if (nrSettings.HasValidSettings) {
				additionalEnv.Add("NEW_RELIC_HOST", nrSettings.Host);
				// additionalEnv.Add("NEW_RELIC_LOG_LEVEL", nrSettings.LogLevel);
				// do not want to release with NEW_RELIC_LOG_ENABLED=true
				additionalEnv.Add("NEW_RELIC_LOG_ENABLED", "false");
				additionalEnv.Add("NEW_RELIC_APP_NAME", nrSettings.AppName);
				additionalEnv.Add("NEW_RELIC_LICENSE_KEY", nrSettings.LicenseKey);
			}

			return ProcessFactory.Create(exe, arguments, additionalEnv);
		}
	}
}
