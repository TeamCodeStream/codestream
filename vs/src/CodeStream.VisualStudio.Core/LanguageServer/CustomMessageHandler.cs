using CodeStream.VisualStudio.Core.Controllers;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Services;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Newtonsoft.Json.Linq;
using Serilog;
using StreamJsonRpc;
using System;
using System.Reactive.Linq;
using System.Reactive.Subjects;

// ReSharper disable UnusedMember.Global

namespace CodeStream.VisualStudio.Core.LanguageServer {
	public class CustomMessageHandler : IDisposable {
		private static readonly ILogger Log = LogManager.ForContext<CustomMessageHandler>();

		private readonly IServiceProvider _serviceProvider;
		private readonly IEventAggregator _eventAggregator;
		private readonly IBrowserServiceFactory _browserServiceFactory;
		private readonly ISettingsServiceFactory _settingsServiceFactory;

		private readonly Subject<DocumentMarkerChangedSubjectArgs> _documentMarkerChangedSubject;
		private readonly Subject<UserPreferencesChangedSubjectArgs> _userPreferencesChangedSubject;
		private readonly IDisposable _documentMarkerChangedSubscription;
		private readonly IDisposable _userPreferencesChangedSubscription;

		public CustomMessageHandler(
			IServiceProvider serviceProvider,
			IEventAggregator eventAggregator,
			IBrowserServiceFactory browserServiceFactory,
			ISettingsServiceFactory settingsServiceFactory) {
			_serviceProvider = serviceProvider;
			_eventAggregator = eventAggregator;
			_browserServiceFactory = browserServiceFactory;
			_settingsServiceFactory = settingsServiceFactory;

			_documentMarkerChangedSubject = new Subject<DocumentMarkerChangedSubjectArgs>();
			_userPreferencesChangedSubject = new Subject<UserPreferencesChangedSubjectArgs>();

			_documentMarkerChangedSubscription = _documentMarkerChangedSubject
				.Throttle(TimeSpan.FromMilliseconds(500))
				.Subscribe(e => {
					_eventAggregator.Publish(new DocumentMarkerChangedEvent {
						Uri = e.Uri.ToUri()
					});
				});

			_userPreferencesChangedSubscription = _userPreferencesChangedSubject
				.Throttle(TimeSpan.FromMilliseconds(500))
				.Subscribe(e => {
					_eventAggregator.Publish(new UserPreferencesChangedEvent(e.Data));
				});
		}

		private IBrowserService _browserService;
		private IBrowserService BrowserService {
			get {
				if (_browserService == null) {
					_browserService = _browserServiceFactory.Create();
				}
				return _browserService;
			}
		}

		/// <summary>
		/// React to the agent requesting that a url be opened
		/// </summary>
		/// <param name="e"></param>
		/// <param name="someOtherPropThatNeedsToBeHereForRequests">Request needs 2 props</param>
		/// <returns></returns>
		[JsonRpcMethod(AgentOpenUrlRequestType.MethodName)]
		public async System.Threading.Tasks.Task OnOpenUrlAsync(JToken e, JToken someOtherPropThatNeedsToBeHereForRequests) {
			using (Log.CriticalOperation(
				$"{nameof(OnOpenUrlAsync)} Method={OpenUrlRequestType.MethodName}",
				Serilog.Events.LogEventLevel.Information)) {
				await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
				try {
					var url = e.ToObject<AgentOpenUrlRequest>().Url;
					var componentModel = _serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
					Assumes.Present(componentModel);
					componentModel.GetService<IIdeService>().Navigate(url);
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(AgentOpenUrlRequestType));
				}
			}
		}

		/// <summary>
		/// Agent message stating we received data change
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		[JsonRpcMethod(DidChangeDataNotificationType.MethodName)]
		public void OnDidChangeData(JToken e) {

			var type = e["type"];
			if (type?.Value<string>() == "preferences") {
				var preferences = e.ToObjectSafe<DidChangeUserPreferencesEvent>();
				if (preferences?.Data != null) {
					_userPreferencesChangedSubject.OnNext(new UserPreferencesChangedSubjectArgs(preferences.Data));
				}
			}

			BrowserService.EnqueueNotification(new DidChangeDataNotificationType(e));
		}

		/// <summary>
		/// Agent message stating we have changed our connection status
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		[JsonRpcMethod(DidChangeConnectionStatusNotificationType.MethodName)]
		public void OnDidChangeConnectionStatus(JToken e) {
			var @params = e.ToObject<DidChangeConnectionStatusNotification>();
			Log.Information($"{nameof(OnDidChangeConnectionStatus)} {@params.Status}");

			switch (@params.Status) {
				case ConnectionStatus.Disconnected: {
						// TODO: Handle this
						break;
					}
				case ConnectionStatus.Reconnecting:
					BrowserService.EnqueueNotification(new DidChangeConnectionStatusNotificationType(@params));
					break;
				case ConnectionStatus.Reconnected: {
						if (@params.Reset == true) {
							BrowserService.ReloadWebView();
							return;
						}

						BrowserService.EnqueueNotification(new DidChangeConnectionStatusNotificationType(@params));
						break;
					}
				default: {
						break;
					}
			}
		}

		/// <summary>
		/// Agent message stating we need to react to a version compatibility message
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		[JsonRpcMethod(DidChangeApiVersionCompatibilityNotificationType.MethodName)]
		public void OnDidChangeApiVersionCompatibilityNotification(JToken e) {
			using (Log.CriticalOperation($"{nameof(OnDidChangeApiVersionCompatibilityNotification)} Method={DidChangeApiVersionCompatibilityNotificationType.MethodName}", Serilog.Events.LogEventLevel.Information)) {
				var info = e.ToObject<DidChangeApiVersionCompatibilityNotification>();
				if (info?.Compatibility != ApiVersionCompatibility.ApiCompatible) {
					ThreadHelper.JoinableTaskFactory.Run(async delegate {
						await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
						try {
							var toolWindowProvider = _serviceProvider.GetService(typeof(SToolWindowProvider)) as IToolWindowProvider;
							Assumes.Present(toolWindowProvider);
							if (!toolWindowProvider.IsVisible(Guids.WebViewToolWindowGuid)) {
								toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid);
							}
						}
						catch (Exception ex) {
							Log.Error(ex, nameof(OnDidChangeApiVersionCompatibilityNotification));
						}
					});
				}

				BrowserService.EnqueueNotification(new DidChangeApiVersionCompatibilityNotificationType(e));
			}
		}

		public class DocumentMarkerChangedSubjectArgs {
			public DocumentMarkerChangedSubjectArgs(string uri) {
				Uri = uri;
			}
			public string Uri { get; private set; }
			public JToken Token { get; set; }
		}

		public class UserPreferencesChangedSubjectArgs {
			public DidChangeUserPreferencesData Data { get; }
			public UserPreferencesChangedSubjectArgs(DidChangeUserPreferencesData data ) {
				Data = data;			 
			}		 
		}

		/// <summary>
		/// Agent message stating we need have changed document markers
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		[JsonRpcMethod(DidChangeDocumentMarkersNotificationType.MethodName)]
		public void OnDidChangeDocumentMarkers(JToken e) {
			var @params = e.ToObject<DidChangeDocumentMarkersNotification>();
			if (@params == null) return;

			//this is too loud...
			//Log.Verbose($"{nameof(OnDidChangeDocumentMarkers)} {@params?.TextDocument?.Uri}");

			var uriString = @params.TextDocument.Uri;
			BrowserService.EnqueueNotification(new DidChangeDocumentMarkersNotificationType {
				Params = new DidChangeDocumentMarkersNotification {
					TextDocument = new TextDocumentIdentifier {
						Uri = uriString
					}
				}
			});

			if (@params.Reason == ChangeReason.Codemarks) {
				//allow the response to the webview to happen immediately, but do not send
				//this event always -- it will try to re-render margins, which can be cpu heavy
				_documentMarkerChangedSubject.OnNext(new DocumentMarkerChangedSubjectArgs(uriString));
			}
		}

		/// <summary>
		/// Agent message stating we need to react to a version compatibility message
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		[JsonRpcMethod(DidChangeVersionCompatibilityNotificationType.MethodName)]
		public void OnDidChangeVersionCompatibility(JToken e) {
			using (Log.CriticalOperation($"{nameof(OnDidChangeVersionCompatibility)} Method={DidChangeVersionCompatibilityNotificationType.MethodName}", Serilog.Events.LogEventLevel.Information)) {
				ThreadHelper.JoinableTaskFactory.Run(async delegate {
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
					try {
						var toolWindowProvider = _serviceProvider.GetService(typeof(SToolWindowProvider)) as IToolWindowProvider;
						Assumes.Present(toolWindowProvider);
						if (!toolWindowProvider.IsVisible(Guids.WebViewToolWindowGuid)) {
							toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid);
						}
					}
					catch (Exception ex) {
						Log.Error(ex, nameof(OnDidChangeVersionCompatibility));
					}
				});

				BrowserService.EnqueueNotification(new DidChangeVersionCompatibilityNotificationType(e));
			}
		}

		/// <summary>
		/// Agent message stating we need to react to a user logging out
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		[JsonRpcMethod(DidLogoutNotificationType.MethodName)]
		public async System.Threading.Tasks.Task OnDidLogoutAsync(JToken e) {
			try {
				var @params = e.ToObject<DidLogoutNotification>();
				using (Log.CriticalOperation($"{nameof(OnDidLogin)} Method={DidLogoutNotificationType.MethodName} Reason={@params?.Reason}", Serilog.Events.LogEventLevel.Information)) {
					if (@params.Reason == LogoutReason.Token) {
						await LogoutAsync();
					}
					else {
						// TODO: Handle this
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(OnDidLogoutAsync));
			}
		}

		/// <summary>
		/// Agent message stating we need to react to a user logging in
		/// </summary>
		/// <param name="e"></param>
		/// <returns></returns>
		[JsonRpcMethod(DidLoginNotificationType.MethodName)]
		public void OnDidLogin(JToken e) {
			using (Log.CriticalOperation($"{nameof(OnDidLogin)} Method={DidLoginNotificationType.MethodName}", Serilog.Events.LogEventLevel.Debug)) {
				try {
					if (e == null) {
						Log.IsNull(nameof(OnDidLogin));
					}
					else {
						var componentModel = _serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
						Assumes.Present(componentModel);

						var authenticationController = new AuthenticationController(
							_settingsServiceFactory.GetOrCreate(nameof(OnDidLogin)),
							componentModel.GetService<ISessionService>(),
							_eventAggregator,
							componentModel.GetService<ICredentialsService>(),
							componentModel.GetService<IWebviewUserSettingsService>()
						);

						authenticationController.CompleteSignin(e["data"]);
					}
				}
				catch (Exception ex) {
					Log.Error(ex, "Problem with AutoSignIn");
				}
			}
		}

		/// <summary>
		/// Agent message stating we need to restart the agent
		/// </summary>
		/// <returns></returns>
		[JsonRpcMethod(RestartRequiredNotificationType.MethodName)]
		public async System.Threading.Tasks.Task RestartRequiredAsync() {
			using (Log.CriticalOperation($"{nameof(RestartRequiredAsync)} Method={RestartRequiredNotificationType.MethodName}", Serilog.Events.LogEventLevel.Debug)) {
				await RestartLanguageServerAsync();
			}

			await System.Threading.Tasks.Task.CompletedTask;
		}

		/// <summary>
		/// Agent message stating we need to react to maintenance mode
		/// </summary>
		/// <param name="e">the payload</param>
		/// <returns></returns>
		[JsonRpcMethod(DidEncounterMaintenanceModeNotificationType.MethodName)]
		public async System.Threading.Tasks.Task MaintenanceModeAsync(JToken e) {
			using (Log.CriticalOperation($"{nameof(MaintenanceModeAsync)} Method={DidEncounterMaintenanceModeNotificationType.MethodName}", Serilog.Events.LogEventLevel.Debug)) {
				try {
					// log the user out, passing the agent payload data, we'll need it
					// later when passing along to the webview
					await LogoutAsync(SessionSignedOutReason.MaintenanceMode, e);
				}
				catch (Exception ex) {
					Log.Error(ex, $"Problem with {nameof(MaintenanceModeAsync)}");
				}
			}

			await System.Threading.Tasks.Task.CompletedTask;
		}

		[JsonRpcMethod(DidChangeServerUrlNotificationType.MethodName)]
		public async System.Threading.Tasks.Task DidChangeServerUrlAsync(JToken e) {
			using (Log.CriticalOperation($"{nameof(DidChangeServerUrlAsync)} Method={DidChangeServerUrlNotificationType.MethodName}", Serilog.Events.LogEventLevel.Debug)) {
				try {
					BrowserService.EnqueueNotification(new DidChangeServerUrlNotificationType(e));
				}
				catch (Exception ex) {
					Log.Error(ex, $"Problem with {nameof(DidChangeServerUrlAsync)}");
				}
			}

			await System.Threading.Tasks.Task.CompletedTask;
		}

		/// <summary>
		/// Restarts the LSP agent based on the currently registered LSP manager
		/// </summary>
		/// <returns></returns>
		private async System.Threading.Tasks.Task RestartLanguageServerAsync() {
			try {
				var componentModel = _serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
				Assumes.Present(componentModel);
				if (componentModel == null) {
					Log.Error(nameof(componentModel) + " is null");
				}

				var languageServerClientManager = componentModel.GetService<ILanguageServerClientManager>();
				if (languageServerClientManager != null) {
					await languageServerClientManager.RestartAsync();
				}
				else {
					Log.IsNull(nameof(ILanguageServerClientManager));
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(RestartLanguageServerAsync));
			}
		}

		/// <summary>
		/// Logs the current CodeSteam user our
		/// </summary>
		/// <returns></returns>
		private async System.Threading.Tasks.Task LogoutAsync(SessionSignedOutReason reason = SessionSignedOutReason.UserSignedOutFromWebview, JToken payload = null) {
			try {
				await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
				var componentModel = _serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
				Assumes.Present(componentModel);
				if (componentModel == null) {
					Log.Error(nameof(componentModel) + " is null");
				}
				var authenticationServiceFactory = componentModel.GetService<IAuthenticationServiceFactory>();

				if (authenticationServiceFactory != null) {
					var authService = authenticationServiceFactory.Create();
					if (authService == null) {
						Log.Error(nameof(LogoutAsync) + " " + nameof(authService) + " is null");
					}
					else {
						await authService.LogoutAsync(reason, payload);
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(LogoutAsync));
			}
		}

		// optional messages we could use for better UI notificaitons / messages

		//[JsonRpcMethod(DidStartLoginNotificationType.MethodName)]
		//public void OnDidStartLogin() {
		//	using (Log.CriticalOperation($"{nameof(OnDidStartLogin)} Method={DidStartLoginNotificationType.MethodName}", Serilog.Events.LogEventLevel.Debug)) {
		//		try {
		//			var componentModel = _serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
		//			Assumes.Present(componentModel);

		//			componentModel.GetService<ISessionService>().SetState(SessionState.UserSigningIn);

		//			_eventAggregator.Publish(new SessionDidStartSignInEvent());
		//		}
		//		catch (Exception ex) {
		//			Log.Error(ex, nameof(OnDidStartLogin));
		//		}
		//	}
		//}

		//[JsonRpcMethod(DidFailLoginNotificationType.MethodName)]
		//public void OnFailLogin() {
		//	using (Log.CriticalOperation($"{nameof(OnFailLogin)} Method={DidFailLoginNotificationType.MethodName}", Serilog.Events.LogEventLevel.Debug)) {
		//		try {
		//			_eventAggregator.Publish(new SessionDidFailSignInEvent());
		//		}
		//		catch (Exception ex) {
		//			Log.Error(ex, nameof(OnFailLogin));
		//		}
		//	}
		//}

		private bool _disposed = false;

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed) return;

			if (disposing) {
				_documentMarkerChangedSubscription?.Dispose();
			}

			_disposed = true;
		}
	}
}
