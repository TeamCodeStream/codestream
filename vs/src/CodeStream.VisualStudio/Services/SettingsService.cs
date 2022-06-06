using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Services;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.ComponentModel.Composition;
using Serilog.Events;

namespace CodeStream.VisualStudio.Services {
	[Export(typeof(ISettingsServiceFactory))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class SettingsServiceFactory : ISettingsServiceFactory {
		private static readonly ILogger Log = LogManager.ForContext<SettingsServiceFactory>();

		private volatile ICodeStreamSettingsManager _codeStreamSettingsManager;
		private static readonly object Locker = new object();

		/// <summary>
		/// DO NOT call this in another constructor -- it is possible that SOptionsDialogPageAccessor has not been registered yet
		/// </summary>
		/// <returns></returns>
		public ICodeStreamSettingsManager GetOrCreate(string source = null) {
			try {
				if (_codeStreamSettingsManager == null) {
					lock (Locker) {
						if (_codeStreamSettingsManager == null) {
							ThreadHelper.ThrowIfNotOnUIThread();
							using (Log.CriticalOperation($"{nameof(SettingsServiceFactory)} {nameof(GetOrCreate)}d by source={source}", LogEventLevel.Information)) {
								var accessor = Package.GetGlobalService(typeof(SSettingsManagerAccessor)) as
										ISettingsManagerAccessor;
								Microsoft.Assumes.Present(accessor);
								_codeStreamSettingsManager = accessor?.GetSettingsManager();
								return _codeStreamSettingsManager;
							}
						}
					}
				}

				Log.Verbose($"Already {nameof(GetOrCreate)}d (source={source})");
				return _codeStreamSettingsManager;
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(GetOrCreate));
				throw;
			}
		}
	}

	public class CodeStreamSettingsManager : ICodeStreamSettingsManager, IOptions {
		// once we don't support VS 2017, we'll be able to use something like...
		// the _lazy.GetValue() method only exists on the v16.0 version of MS.VS.Threading assembly

		//By using this your pain will be legendary, even in hell.
		//private readonly AsyncLazy<IOptionsDialogPage> _lazy = new AsyncLazy<IOptionsDialogPage>(async () => {
		//	var dialogPage = await OptionsDialogPage.GetLiveInstanceAsync();
		//	return dialogPage;
		//}, ThreadHelper.JoinableTaskFactory);

		//By using this your pain will be legendary, even in hell.
		//public async System.Threading.Tasks.Task InitializeAsync() {
		//	DialogPage = await OptionsDialogPage.GetLiveInstanceAsync();
		//}

		private CodeStreamEnvironmentInfo _environmentInfo;
		public CodeStreamSettingsManager(IOptionsDialogPage dialogPage) {
			DialogPage = dialogPage;
			DialogPage.LoadSettingsFromStorage();
		}

		public IOptionsDialogPage DialogPage { get; private set; }

		public void SaveSettingsToStorage() {
			DialogPage.SaveSettingsToStorage();
		}

		public Settings GetSettings() {
			return new Settings {
				Options = this
			};
		}

		public string Email {
			get => DialogPage.Email;
			set => DialogPage.Email = value;
		}

		public bool ShowAvatars {
			get => DialogPage.ShowAvatars;
			set => DialogPage.ShowAvatars = value;
		}

		public string ServerUrl {
			get => DialogPage.ServerUrl.IsNullOrWhiteSpace() ? DialogPage.ServerUrl : DialogPage.ServerUrl.TrimEnd('/');
			set => DialogPage.ServerUrl = value.IsNullOrWhiteSpace() ? value : value.TrimEnd('/');
		}

		public bool ShowMarkerGlyphs {
			get => DialogPage.ShowMarkerGlyphs;
			set => DialogPage.ShowMarkerGlyphs = value;
		}

		public TraceLevel TraceLevel {
			get {
				return DialogPage.TraceLevel;
			}
			set {
				DialogPage.TraceLevel = value;
			}
		}

		public bool AutoSignIn {
			get => DialogPage.AutoSignIn;
			set => DialogPage.AutoSignIn = value;
		}

		public bool AutoHideMarkers {
			get => DialogPage.AutoHideMarkers;
			set => DialogPage.AutoHideMarkers = value;
		}

		public bool ProxyStrictSsl {
			get => DialogPage.ProxyStrictSsl;
			set => DialogPage.ProxyStrictSsl = value;
		}

		public ProxySupport ProxySupport {
			get => DialogPage.ProxySupport;
			set => DialogPage.ProxySupport = value;
		}

		public Proxy Proxy => DialogPage.Proxy;

		public bool DisableStrictSSL {
			get => DialogPage.DisableStrictSSL;
			set => DialogPage.DisableStrictSSL = value;
		}

		public string ExtraCertificates {
			get => DialogPage.ExtraCertificates;
			set => DialogPage.ExtraCertificates = value;
		}

		public string GoldenSignalsInEditorFormat {
			get => DialogPage.GoldenSignalsInEditorFormat;
			set => DialogPage.GoldenSignalsInEditorFormat = value;
		}

		public Ide GetIdeInfo() {
			return new Ide {
				Name = Application.IdeMoniker,
				Version = Application.VisualStudioVersionString,
				Detail = Application.VisualStudioDisplayName
			};
		}

		public Extension GetExtensionInfo() {
			return new Extension {
				Version = Application.ExtensionVersionShort.ToString(),
				VersionFormatted = GetEnvironmentVersionFormatted(),
				Build = Application.BuildNumber.ToString(),
				BuildEnv = Application.BuildEnv
			};
		}

		public CodeStreamEnvironmentInfo GetCodeStreamEnvironmentInfo {
			get {
				return _environmentInfo;
			}
		}

		/// <summary>
		/// This is the environment dictated by the urls the user is using
		/// </summary>
		/// <returns></returns>
		public string GetEnvironmentName() {
			if (ServerUrl == null) return "unknown";

			var match = RegularExpressions.EnvironmentRegex.Match(ServerUrl);
			if (!match.Success) return "unknown";

			if (match.Groups[1].Value.EqualsIgnoreCase("localhost")) {
				return "local";
			}

			if (match.Groups[2].Value.IsNullOrWhiteSpace()) {
				return "prod";
			}

			return match.Groups[2].Value.ToLowerInvariant();
		}

		public string GetUsefulEnvironmentName() {
			var envName = _environmentInfo?.Environment ?? string.Empty;
			switch (envName) {
				case "pd":
					return envName.ToUpperInvariant();
				case "prod":
				case "us":
				case "eu":
					return null;
				default:
					return null;
			}
		}

		public string GetEnvironmentVersionFormatted() {
			var environmentName = _environmentInfo?.Environment;
			return $"{Application.ExtensionVersionSemVer}{(environmentName != "prod" ? " (" + environmentName + ")" : "")}";
		}

		public TraceLevel GetAgentTraceLevel() {
			if (TraceLevel == TraceLevel.Info)
				return TraceLevel.Verbose;
			if (TraceLevel == TraceLevel.Debug || TraceLevel == TraceLevel.Verbose)
				return TraceLevel.Debug;

			return TraceLevel;
		}

		public TraceLevel GetExtensionTraceLevel() {
			return TraceLevel;
		}

		///<inheritdoc/>
		public void PauseNotifications() {
			DialogPage.PauseNotifyPropertyChanged = true;
		}

		///<inheritdoc/>
		public void ResumeNotifications() {
			DialogPage.PauseNotifyPropertyChanged = false;
		}

		public void SetEnvironment(CodeStreamEnvironmentInfo environment) {
			_environmentInfo = environment;
		}
	}
}
