using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.LanguageServer;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Serilog;
using System;
using System.ComponentModel.Composition;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Services {

	[Export(typeof(IAuthenticationService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class AuthenticationService : IAuthenticationService {
		private static readonly ILogger Log = LogManager.ForContext<AuthenticationService>();
		private readonly IServiceProvider _serviceProvider;

		[ImportingConstructor]
		public AuthenticationService(
				[Import(typeof(Microsoft.VisualStudio.Shell.SVsServiceProvider))] IServiceProvider serviceProvider) {
			_serviceProvider = serviceProvider;
		}

		[Import]
		public ISessionService SessionService { get; set; }
		[Import]
		public IEventAggregator EventAggregator { get; set; }
		[Import]
		public ICredentialsService CredentialsService { get; set; }
		[Import]
		public ICodeStreamAgentService CodeStreamAgentService { get; set; }
		[Import]
		public IBrowserService WebviewIpc { get; set; }
		[Import]
		public ISettingsServiceFactory SettingsServiceFactory { get; set; }
		[Import]
		public IWebviewUserSettingsService WebviewUserSettingsService { get; set; }

		public async System.Threading.Tasks.Task LogoutAsync(SessionSignedOutReason reason = SessionSignedOutReason.UserSignedOutFromWebview, string newServerUrl = null, string newEnvironment = null, JToken payload = null) {
			Log.Information($"{nameof(LogoutAsync)} starting");
			try {
				try {
					SessionService.SetState(SessionState.UserSigningOut);
				}
				catch (Exception ex) {
					Log.Warning(ex, $"{nameof(LogoutAsync)} - SetState");
				}

				try {
					EventAggregator.Publish(new SessionDidStartSignOutEvent());
				}
				catch (Exception ex) {
					Log.Warning(ex, $"{nameof(LogoutAsync)} - {nameof(SessionDidStartSignOutEvent)}");
				}

				if (
					reason == SessionSignedOutReason.UserSignedOutFromWebview ||
					reason == SessionSignedOutReason.UserSignedOutFromExtension ||
					reason == SessionSignedOutReason.MaintenanceMode ||
					reason == SessionSignedOutReason.ReAuthenticating) {
					try {
						var settingsService = SettingsServiceFactory.GetOrCreate(nameof(AuthenticationService));
						await CredentialsService.DeleteAsync(settingsService.ServerUrl.ToUri(), settingsService.Email);
					}
					catch (Exception ex) {
						Log.Warning(ex, $"{nameof(LogoutAsync)} - credentials");
					}
					try {
						WebviewUserSettingsService.DeleteTeamId(SessionService.SolutionName);
					}
					catch (Exception ex) {
						Log.Error(ex, "could not delete teamId");
					}
				}

				try {
					await CodeStreamAgentService.LogoutAsync(newServerUrl);
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(LogoutAsync)} - agent");
				}

				if (reason == SessionSignedOutReason.UserSignedOutFromWebview ||
					reason == SessionSignedOutReason.UserSignedOutFromExtension
				) {
					//don't call this when ReAuthenticating -- don't want to show the login screen
					try {

#pragma warning disable VSTHRD103 // Call async methods when in an async method
						// it's possible that this method is called before the webview is ready -- enqueue it
						WebviewIpc.EnqueueNotification(new HostDidLogoutNotificationType());
#pragma warning restore VSTHRD103 // Call async methods when in an async method
					}
					catch (Exception ex) {
						Log.Error(ex, $"{nameof(LogoutAsync)} - {nameof(HostDidLogoutNotificationType)}");
					}
				}
				else if (reason == SessionSignedOutReason.MaintenanceMode) {
					try {

#pragma warning disable VSTHRD103 // Call async methods when in an async method
						// it's possible that this method is called before the webview is ready -- enqueue it
						WebviewIpc.EnqueueNotification(new DidEncounterMaintenanceModeNotificationType(payload));
#pragma warning restore VSTHRD103 // Call async methods when in an async method
					}
					catch (Exception ex) {
						Log.Error(ex, $"{nameof(LogoutAsync)} - {nameof(HostDidLogoutNotificationType)}");
					}
				}

				try {
					SessionService.Logout(reason);
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(LogoutAsync)} - session");
				}

				try {
					EventAggregator.Publish(new SessionLogoutEvent());
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(LogoutAsync)} - {nameof(SessionLogoutEvent)}");
				}

				if (reason == SessionSignedOutReason.UserSignedOutFromWebview ||
					reason == SessionSignedOutReason.UserSignedOutFromExtension ||
					reason == SessionSignedOutReason.ReAuthenticating) {
					var componentModel = _serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
					Assumes.Present(componentModel);
					var languageServerClientManager = componentModel.GetService<ILanguageServerClientManager>();
					if (languageServerClientManager != null) {
						await languageServerClientManager.RestartAsync();
					}
					else {
						Log.IsNull(nameof(ILanguageServerClientManager));
					}
				}
				Log.Information($"{nameof(LogoutAsync)} completed");
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(LogoutAsync));
			}
		}
	}
}
