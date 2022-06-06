using CodeStream.VisualStudio.Core.Controllers;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft.VisualStudio.ComponentModelHost;
using Serilog;
using StreamJsonRpc;
using System;
using System.Threading.Tasks;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell.Interop;

namespace CodeStream.VisualStudio.Core.LanguageServer {
	public abstract class LanguageServerClientBase : ILanguageServerClientManager {
		private readonly ILogger Log;
		private Guid _uiContextGuid = new Guid(Guids.ServiceProviderPackageAutoLoadId);
		protected readonly IEventAggregator EventAggregator;
		protected readonly ISessionService SessionService;
		protected readonly IServiceProvider ServiceProvider;
		protected readonly ISettingsServiceFactory SettingsServiceFactory;
		protected readonly ILanguageServerClientProcess LanguageServerProcess;
		protected readonly IHttpClientService HttpClientService;

		protected bool isReloading { get; set; }
		protected LanguageServerClientBase(
			IServiceProvider serviceProvider,
			ISessionService sessionService,
			IEventAggregator eventAggregator,
			IBrowserServiceFactory browserServiceFactory,
			ISettingsServiceFactory settingsServiceFactory,
			IHttpClientService httpClientService,
			ILogger logger) {

			Log = logger;
			try {
				ServiceProvider = serviceProvider;
				SessionService = sessionService;
				EventAggregator = eventAggregator;
				SettingsServiceFactory = settingsServiceFactory;
				HttpClientService = httpClientService;

				LanguageServerProcess = new LanguageServerClientProcess();
				CustomMessageTargetBase = new CustomMessageHandler(serviceProvider, EventAggregator, browserServiceFactory, SettingsServiceFactory);

				Log.Ctor();
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(LanguageServerClientBase));
			}
		}

		public virtual async System.Threading.Tasks.Task RestartAsync() {
			await System.Threading.Tasks.Task.CompletedTask;
		}

		public virtual async System.Threading.Tasks.Task TryStopAsync() {
			await System.Threading.Tasks.Task.CompletedTask;
		}

		public object CustomMessageTargetBase { get; }

		public object InitializationOptionsBase {
			get {
				var settingsManager = SettingsServiceFactory.GetOrCreate(nameof(LanguageServerClientBase));

				if (settingsManager == null) {
					Log.Fatal($"{nameof(settingsManager)} is null");
				}

				var nrSettings = HttpClientService.GetNREnvironmentSettings();

				var initializationOptions = new InitializationOptions {
					ServerUrl = settingsManager.ServerUrl,
					Extension = settingsManager.GetExtensionInfo(),
					Ide = settingsManager.GetIdeInfo(),
#if DEBUG
					TraceLevel = TraceLevel.Verbose.ToJsonValue(),
					IsDebugging = true,
#else
                    TraceLevel = settingsManager.GetAgentTraceLevel().ToJsonValue(),
#endif
					Proxy = settingsManager.Proxy,
					ProxySupport = settingsManager.Proxy?.Url?.IsNullOrWhiteSpace() == false ? "override" : settingsManager.ProxySupport.ToJsonValue(),
					DisableStrictSSL = settingsManager.DisableStrictSSL,
					NewRelicTelemetryEnabled = nrSettings.HasValidSettings
				};

				if (Log.IsDebugEnabled()) {
					Log.Debug(nameof(InitializationOptions) + " {@InitializationOptions}", initializationOptions);
				}
				else {
					Log.Information(nameof(InitializationOptions) + " {@InitializationOptions}", new {
						TraceLevel = initializationOptions.TraceLevel,
						Proxy = initializationOptions.Proxy != null
					});
				}

				return initializationOptions;
			}
		}

		protected async Task OnAttachedForCustomMessageAsync() {
			try {
				await Microsoft.VisualStudio.Shell.ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

				// Sets the UI context so the custom commands will be available.
				var monitorSelection =
					Microsoft.VisualStudio.Shell.Package.GetGlobalService(typeof(IVsMonitorSelection)) as
						IVsMonitorSelection;
				if (monitorSelection != null) {
					if (monitorSelection.GetCmdUIContextCookie(ref this._uiContextGuid, out uint cookie) ==
						VSConstants.S_OK) {
						monitorSelection.SetCmdUIContext(cookie, 1);
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(OnAttachedForCustomMessageAsync));
			}

			Log.Debug(nameof(OnAttachedForCustomMessageAsync));
		}

		protected virtual void OnStopping() {
			try {
				SessionService.SetAgentDisconnected();
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(OnStopping));
			}
		}

		protected virtual void OnStopped() { }

		protected void OnRpcDisconnected(JsonRpcDisconnectedEventArgs e) {
			try {
				Log.Debug(e.Exception, $"RPC Disconnected: LastMessage={e.LastMessage} Description={e.Description} Reason={e.Reason} Exception={e.Exception}");

				SessionService.SetAgentDisconnected();

				EventAggregator?.Publish(new LanguageServerDisconnectedEvent(e.LastMessage, e.Description, e.Reason.ToString(), e.Exception) {
					IsReloading = isReloading
				});
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(OnRpcDisconnected));
			}
		}

		protected async System.Threading.Tasks.Task OnServerInitializedBaseAsync(JsonRpc rpc, IComponentModel componentModel) {
			try {
				Log.Debug($"{nameof(OnServerInitializedBaseAsync)} starting...");

				var codeStreamAgentService = componentModel.GetService<ICodeStreamAgentService>();
				await codeStreamAgentService.SetRpcAsync(rpc);

				bool autoSignInResult = false;
				try {
					Log.Debug($"TryAutoSignInAsync starting...");
					var authenticationController = new AuthenticationController(
						SettingsServiceFactory.GetOrCreate(),
						componentModel.GetService<ISessionService>(),
						codeStreamAgentService,
						EventAggregator,
						componentModel.GetService<ICredentialsService>(),
						componentModel.GetService<IWebviewUserSettingsService>()
						);
					autoSignInResult = await authenticationController.TryAutoSignInAsync();
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(OnServerInitializedBaseAsync));
				}

				Log.Information($"AutoSignIn Result={autoSignInResult}");
				Log.Debug($"Publishing {nameof(LanguageServerReadyEvent)}...");
				EventAggregator.Publish(new LanguageServerReadyEvent { IsReady = true });
				Log.Debug($"Published {nameof(LanguageServerReadyEvent)}");
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(OnServerInitializedBaseAsync));
				throw;
			}
		}
	}
}
