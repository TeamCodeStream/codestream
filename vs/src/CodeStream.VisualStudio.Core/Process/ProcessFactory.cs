using CodeStream.VisualStudio.Core.Logging;
using Serilog;
using System;
using System.Collections.Specialized;
using System.Diagnostics;

namespace CodeStream.VisualStudio.Core.Process {
	public class ProcessFactory {
		private static readonly ILogger Log = LogManager.ForContext<ProcessFactory>();

		/// <summary>
		/// Create a process
		/// </summary>
		/// <param name="fileName"></param>
		/// <param name="arguments"></param>
		/// <returns></returns>
		public static System.Diagnostics.Process Create(string fileName, string arguments, StringDictionary additionalEnv = null) {
			var info = new ProcessStartInfo {
				FileName = fileName,
				Arguments = arguments,
				RedirectStandardInput = true,
				RedirectStandardOutput = true,
				UseShellExecute = false,
				CreateNoWindow = true
			};

			try {
				info.EnvironmentVariables.Remove("NODE_OPTIONS");
			}
			catch (Exception ex) {
				Log.Error(ex, "Could not remove NODE_OPTIONS");
			}

			if (additionalEnv != null) {
				foreach (string key in additionalEnv.Keys) {
					try {
						info.EnvironmentVariables[key] = additionalEnv[key];
					}
					catch (Exception ex) {
						Log.Error(ex, $"Error setting environment variable: {key}");
					}
				}
			}

			return new System.Diagnostics.Process() {
				StartInfo = info
			};
		}
	}
}
