using System.Collections.Specialized;
using System.IO;
using System.Reflection;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Process;
using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.LanguageServer
{
	public class LanguageServerClientProcess : ILanguageServerClientProcess
	{
		/// <summary>
		/// Creates the lsp server process object
		/// </summary>
		/// <returns></returns>
		public System.Diagnostics.Process Create(
			ICodeStreamSettingsManager codeStreamSettingsManager,
			IHttpClientService httpClient
		)
		{
			var assembly = Assembly.GetAssembly(typeof(LanguageServerClientProcess));
			string arguments = null;
			string exe = null;
			var logPath = $"{Application.LogPath}{Application.LogNameAgent}";

			var path = Path.GetDirectoryName(assembly.Location) + @"\agent\agent.js";

#if DEBUG
			// globally installed node
			exe = "node.exe";
			arguments = $@"--nolazy --inspect=6009 ""{path}"" --stdio --log={logPath}";
#else
			// the specific version we ship in the VSIX
			exe = Path.GetDirectoryName(assembly.Location) + @"\agent\node.exe";
			arguments = $@"--nolazy ""{path}"" --stdio- -log={logPath}";
#endif

			Node.EnsureVersion(exe);

			var nrSettings = httpClient.GetNREnvironmentSettings();

			var additionalEnv = new StringDictionary
			{
				{
					"NODE_TLS_REJECT_UNAUTHORIZED",
					codeStreamSettingsManager.DisableStrictSSL ? "0" : "1"
				},
				// do not want to release with NEW_RELIC_LOG_ENABLED=true
				{ "NEW_RELIC_LOG_ENABLED", "false" }
			};

			if (!string.IsNullOrEmpty(codeStreamSettingsManager.ExtraCertificates))
			{
				additionalEnv.Add(
					"NODE_EXTRA_CA_CERTS",
					codeStreamSettingsManager.ExtraCertificates
				);
			}

			if (nrSettings.HasValidSettings)
			{
				additionalEnv.Add("NEW_RELIC_HOST", nrSettings.Host);
				additionalEnv.Add("NEW_RELIC_APP_NAME", nrSettings.AppName);
				additionalEnv.Add("NEW_RELIC_LICENSE_KEY", nrSettings.LicenseKey);
			}

			return ProcessFactory.Create(exe, arguments, additionalEnv);
		}
	}
}
