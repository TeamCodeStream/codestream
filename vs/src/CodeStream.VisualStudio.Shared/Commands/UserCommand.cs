using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.Shell;
using System;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Services;
using Serilog;
using Microsoft.VisualStudio.Shell.Interop;

#if X86
	using CodeStream.VisualStudio.Vsix.x86;
#else
	using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands {
	public class UserCommand : VsCommandBase {
		private static readonly ILogger Log = LogManager.ForContext<UserCommand>();

		private const string DefaultText = "Sign In...";
		private string _loggedInLabel;
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
							UpdateStatusBar("Ready");
							break;
						}
						case SessionState.UserSigningIn: {
							UpdateStatusBar("CodeStream: Signing In...");
							break;
						}
						case SessionState.UserSigningOut: {
							UpdateStatusBar("CodeStream: Signing Out...");
							break;
						}
						case SessionState.UserSignedIn: {
							var user = _sessionService.User;
							var env = _codeStreamSettingsManager?.GetUsefulEnvironmentName();
							var label = env.IsNullOrWhiteSpace() ? user.UserName : $"{env}: {user.UserName}";

							Visible = true;
							Enabled = true;

							Text = _loggedInLabel = user.HasSingleOrg ? label : $"{label} - {user.OrgName}";
							
							UpdateStatusBar("Ready");
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

		public void UpdateAfterLogin(UserUnreadsChangedEvent eventArgs) {
			ThreadHelper.ThrowIfNotOnUIThread();
			
			var totalMentions = eventArgs.Data?.TotalMentions ?? 0;
			var totalUnreads = eventArgs.Data?.TotalUnreads ?? 0;

			if (totalMentions > 0) {
				Text = $"{_loggedInLabel} ({totalMentions})";
			}
			else if (totalUnreads > 0) {
				Text = $"{_loggedInLabel} ·";
			}
			else {
				Text = _loggedInLabel;
			}
			
			UpdateStatusBar("Ready");
		}

		private static void UpdateStatusBar(string text) {
			var statusBar = (IVsStatusbar)Package.GetGlobalService(typeof(SVsStatusbar));
			statusBar.IsFrozen(out var frozen);
			if (frozen != 0) {
				statusBar.FreezeOutput(0);
			}
			statusBar.SetText(text);
			statusBar.FreezeOutput(1);
		}
	}
}
