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

namespace CodeStream.VisualStudio.Core.LanguageServer {
	public abstract class LanguageServerClientBase : ILanguageServerClientManager {
		private readonly ILogger Log;
		protected readonly IEventAggregator EventAggregator;
		protected readonly ISessionService SessionService;
		protected readonly IServiceProvider ServiceProvider;
		protected readonly ISettingsServiceFactory SettingsServiceFactory;
		protected readonly ILanguageServerClientProcess LanguageServerProcess;
		protected bool isReloading { get; set; }
		protected LanguageServerClientBase(
			IServiceProvider serviceProvider,
			ISessionService sessionService,
			IEventAggregator eventAggregator,
			IBrowserServiceFactory browserServiceFactory,
			ISettingsServiceFactory settingsServiceFactory,
			ILogger logger) {
			Log = logger;
			try {
				ServiceProvider = serviceProvider;
				SessionService = sessionService;
				EventAggregator = eventAggregator;
				SettingsServiceFactory = settingsServiceFactory;
				var browserService = browserServiceFactory.Create();

				LanguageServerProcess = new LanguageServerClientProcess();
				CustomMessageTargetBase = new CustomMessageHandler(serviceProvider, EventAggregator, browserService, SettingsServiceFactory);

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
				var settingsManager = SettingsServiceFactory.Create();
				if (settingsManager == null) {
					Log.Fatal($"{nameof(settingsManager)} is null");
				}
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
					DisableStrictSSL = settingsManager.DisableStrictSSL
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
						SettingsServiceFactory.Create(),
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
