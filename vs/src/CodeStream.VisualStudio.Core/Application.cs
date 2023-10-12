using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using CodeStream.VisualStudio.Core.Annotations;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Properties;
using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core
{
	public class Application
	{
		public const string FullName = "New Relic CodeStream";
		public const string ShortName = "CodeStream";

		/// <summary>
		/// Returns Major.Minor.Build for the Extension
		/// </summary>
		public static Version ExtensionVersionShort { get; }

		/// <summary>
		/// Returns a format like 1.2.3-4 if there is a revision number
		/// </summary>
		public static string ExtensionVersionSemVer { get; }

		/// <summary>
		/// Number of the build from CI
		/// </summary>
		public static int BuildNumber { get; }

		/// <summary>
		/// Environment where the build happened
		/// </summary>
		public static string BuildEnv { get; }

		/// <summary>
		/// Something like `Microsoft Visual Studio 2019`
		/// </summary>
		public static string VisualStudioName { get; }

		/// <summary>
		/// Something like `Visual Studio Community 2019`
		/// </summary>
		[NotNull]
		public static string VisualStudioDisplayName { get; }

		/// <summary>
		/// Short, abbreviated name for this IDE, returns `VS`
		/// </summary>
		public static string IdeMoniker { get; } = "VS";

		/// <summary>
		/// Something like `15.9.123.4567`
		/// </summary>
		public static string VisualStudioVersionString { get; }

		/// <summary>
		/// Something like `15.9.123.4567`
		/// </summary>
		public static Version VisualStudioVersion { get; }

		public static string VisualStudioVersionYear { get; }

		/// <summary>
		/// Path to the log directory. C:\Users\{User}\AppData\Local\CodeStream\Logs\. Ends with a backslash.
		/// </summary>
		public static string LogPath { get; }

		/// <summary>
		/// C:\Users\{User}\AppData\Local\Temp\CodeStream\Data\. Ends with a backslash.
		/// </summary>
		public static string TempDataPath { get; }

		public static DeveloperSettings DeveloperOptions = new DeveloperSettings();

		public static string LogNameExtension { get; set; } = "vs-extension.log";
		public static string LogNameAgent { get; set; } = "vs-agent.log";

		private static readonly Regex VersionPathRegex = new Regex(
			@"Microsoft Visual Studio\\(\w+)\\(\w+)\\Common7\\IDE\\devenv.exe$",
			RegexOptions.Compiled | RegexOptions.IgnoreCase
		);

		static Application()
		{
			BuildEnv = SolutionInfo.BuildEnv;

			var versionFull = Version.Parse(SolutionInfo.Version);
			BuildNumber = versionFull.Revision;

			if (versionFull.Revision > 0)
			{
				ExtensionVersionSemVer =
					$"{versionFull.Major}.{versionFull.Minor}.{versionFull.Build}-{versionFull.Revision}";
			}
			else
			{
				ExtensionVersionSemVer =
					$"{versionFull.Major}.{versionFull.Minor}.{versionFull.Build}";
			}

			// this is nullable, but should always be here...
			var fileVersionInfo = System.Diagnostics.Process
				.GetCurrentProcess()
				.MainModule.FileVersionInfo;

			// Extension versions

			ExtensionVersionShort = new Version(
				versionFull.Major,
				versionFull.Minor,
				versionFull.Build
			);

			var localApplicationData = Path.Combine(
				Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
				ShortName
			);
			var tempData = Path.Combine(Path.GetTempPath(), ShortName);

			VisualStudioName = fileVersionInfo.FileDescription;
			VisualStudioVersionString = fileVersionInfo.ProductVersion;
			VisualStudioVersion = Version.Parse(fileVersionInfo.ProductVersion);
			// normally I wouldn't condone having a ctor with side-effects, especially not
			// one that starts a process, but since this is a static ctor (only fires once) and is
			// essentially a static class of semi-primitive types that all others rely on, it's ok.
			VisualStudioDisplayName = (
				TryGetDisplayNameFromProcess(fileVersionInfo.FileName) ?? VisualStudioName
			).ToAplhaNumericPlusSafe();

			switch (VisualStudioVersion.Major)
			{
				case 15:
					VisualStudioVersionYear = "2017";
					break;
				case 16:
					VisualStudioVersionYear = "2019";
					break;
				case 17:
					VisualStudioVersionYear = "2022";
					break;
			}

#if DEBUG
			LogNameExtension = $"vs-{VisualStudioVersionYear}-extension.log";
			LogNameAgent = $"vs-{VisualStudioVersionYear}-agent.log";
#endif

			LogPath = Path.Combine(localApplicationData, "Logs") + @"\";
			TempDataPath = Path.Combine(tempData, "Data") + @"\";
		}

		/// <summary>
		/// Starts a process and deserialized the output into T
		/// </summary>
		/// <typeparam name="T"></typeparam>
		/// <param name="path"></param>
		/// <param name="arguments"></param>
		/// <returns></returns>
		private static T GetProcessOutput<T>(string path, string arguments)
		{
			try
			{
				var info = new ProcessStartInfo
				{
					FileName = path,
					Arguments = arguments,
					RedirectStandardInput = true,
					RedirectStandardOutput = true,
					RedirectStandardError = true,
					UseShellExecute = false,
					CreateNoWindow = true
				};

				var process = new System.Diagnostics.Process() { StartInfo = info };
				process.Start();
				string output = process.StandardOutput.ReadToEnd();
				string err = process.StandardError.ReadToEnd();
				if (!err.IsNullOrWhiteSpace())
				{
					return default(T);
				}

				process.WaitForExit(2000);
				return JsonConvert.DeserializeObject<T>(output);
			}
			catch
			{
				// suffer because logs aren't setup yet.
			}
			return default(T);
		}

		/// <summary>
		/// Tries to get the actual VS version (edition/year) from vswhere.exe, falls back on parsing the currently
		/// running productPath
		/// </summary>
		/// <param name="productPath">is a string like C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\Common7\\IDE\\devenv.exe</param>
		/// <returns></returns>
		private static string TryGetDisplayNameFromProcess(string productPath)
		{
			if (productPath.IsNullOrWhiteSpace())
				return null;

			string displayName = null;
			try
			{
				displayName = GetProcessOutput<List<VsWhereResult>>(
						"C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe",
						"-all -format json"
					)
					.FirstOrDefault(_ => _.ProductPath.EqualsIgnoreCase(productPath))
					?.DisplayName;
			}
			catch (Exception)
			{
				// suffer because logs aren't setup yet.
			}

			if (!displayName.IsNullOrWhiteSpace())
				return displayName;

			try
			{
				// If the displayName could not be retrieved from vswhere.exe
				// attempt to parse it from the path of the running .exe.
				// It is possible that this does not work, because the user
				// might have installed VS into a non-standard location
				var matches = VersionPathRegex.Matches(productPath);
				if (matches.Count == 1)
				{
					var match = matches[0];
					if (match.Groups.Count > 1)
					{
						var year = match.Groups[1].Value;
						var edition = match.Groups[2].Value;
						if (!year.IsNullOrWhiteSpace() && !edition.IsNullOrWhiteSpace())
						{
							return $"Visual Studio ${edition} ${year}";
						}
					}
				}
			}
			catch
			{
				// suffer because logs aren't setup yet.
				return null;
			}

			return null;
		}

		// ReSharper disable once ClassNeverInstantiated.Local
		class VsWhereResult
		{
			public string ProductPath { get; set; }
			public string DisplayName { get; set; }
		}

		public class DeveloperSettings
		{
			/// <summary>
			/// Run in the immediate window to enable or disable this
			/// </summary>
			public bool MuteIpcLogs { get; set; }
		}
	}
}
