using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.Shell;
using System;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.Vssdk.Commands;
using Serilog;
using Microsoft.VisualStudio.Shell.Interop;

namespace CodeStream.VisualStudio.Commands {
	public class UserCommand : VsCommandBase {
		private static readonly ILogger Log = LogManager.ForContext<UserCommand>();

		private const string DefaultText = "Sign In...";
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamSettingsManager _codeStreamSettingsManager;

		private static bool DefaultVisibility = false;

		public UserCommand(ISessionService sessionService, ICodeStreamSettingsManager codeStreamSettingManager) : base(PackageGuids.guidWebViewPackageCmdSet, PackageIds.UserCommandId) {
			_sessionService = sessionService;
			_codeStreamSettingsManager = codeStreamSettingManager;

#if DEBUG
			// make this visible in DEUBG so we can see the Developer tools command
			DefaultVisibility = true;
#endif
			Visible = DefaultVisibility;
			Enabled = DefaultVisibility;
			Text = DefaultText;
		}

		public void Update() {
			ThreadHelper.ThrowIfNotOnUIThread();
			using (Log.WithMetrics($"{nameof(UserCommand)} {nameof(Update)}")) {
				var state = _sessionService.SessionState;
				var agentReady = _sessionService.IsAgentReady;
				Log.Debug($"Updating {nameof(UserCommand)} SessionState={_sessionService.SessionState} AgentReady={agentReady} state={state}...");

				if (!agentReady) {
					Visible = false;
					Enabled = false;
					Text = DefaultText;					
					return;
				}

				try {
					switch (state) {
						case SessionState.UserSignInFailed: {
								// the caching on this sucks and it doesn't always update...
								//Visible = false;
								//Enabled = false;
								//Text = DefaultText;

								var statusBar = (IVsStatusbar)Package.GetGlobalService(typeof(SVsStatusbar));
								statusBar.IsFrozen(out var frozen);
								if (frozen != 0) {
									statusBar.FreezeOutput(0);
								}
								statusBar.SetText("Ready");
								statusBar.FreezeOutput(1);
								break;
							}
						case SessionState.UserSigningIn: {
								var statusBar = (IVsStatusbar)Package.GetGlobalService(typeof(SVsStatusbar));
								statusBar.IsFrozen(out var frozen);

								if (frozen != 0) {
									statusBar.FreezeOutput(0);
								}

								statusBar.SetText("CodeStream: Signing In...");
								statusBar.FreezeOutput(1);
								break;
							}
						case SessionState.UserSigningOut: {
								// the caching on this sucks and it doesn't always update...
								//if (!_sessionService.IsReady) {
								//	Text = "Loading...";
								//	Visible = false;
								//	Enabled = false;
								//}
								var statusBar = (IVsStatusbar)Package.GetGlobalService(typeof(SVsStatusbar));
								statusBar.IsFrozen(out var frozen);
								if (frozen != 0) {
									statusBar.FreezeOutput(0);
								}
								statusBar.SetText("CodeStream: Signing Out...");
								statusBar.FreezeOutput(1);
								break;
							}
						case SessionState.UserSignedIn: {
								var user = _sessionService.User;
								var env = _codeStreamSettingsManager?.GetUsefulEnvironmentName();
								var label = env.IsNullOrWhiteSpace() ? user.UserName : $"{env}: {user.UserName}";

								Visible = true;
								Enabled = true;
								Text = user.HasSingleTeam() ? label : $"{label} - {user.TeamName}";

								var statusBar = (IVsStatusbar)Package.GetGlobalService(typeof(SVsStatusbar));
								statusBar.IsFrozen(out var frozen);
								if (frozen != 0) {
									statusBar.FreezeOutput(0);
								}
								statusBar.SetText("Ready");
								statusBar.FreezeOutput(1);

								break;
							}
						default: {
								Visible = false;
								Enabled = false;
								Text = DefaultText;
								break;
							}
					}
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(UserCommand));
				}
			}
		}

		protected override void ExecuteUntyped(object parameter) {
			//noop
		}
	}
}
