using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.LanguageServer;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.LanguageServer.Client;
using Microsoft.VisualStudio.Threading;
using Newtonsoft.Json;
using Serilog;
using StreamJsonRpc;
using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shell._2017.LanguageServer {

	public class LanguageServerClient2017 { }
	/// <summary>
	/// NOTE: See ContentDefinitions.cs for the LanguageClient partial class attributes
	/// </summary>
	[Export(typeof(ICodestreamLanguageClient))]
	[Export(typeof(ILanguageClient))]
	[Guid(Guids.LanguageClientId)]
	public partial class Client : LanguageServerClientBase, ILanguageClient, ICodestreamLanguageClient, ILanguageClientCustomMessage, IDisposable {
		private static readonly ILogger Log = LogManager.ForContext<LanguageServerClient2017>();
		private bool _disposed;
		private JsonRpc _rpc;
		private ISolutionEventsListener _solutionEventListener;

		private bool _hasStartedOnce;
		private int _state;


		public event AsyncEventHandler<EventArgs> StartAsync;
#pragma warning disable 0067
		public event AsyncEventHandler<EventArgs> StopAsync;
#pragma warning restore 0067

		//#if DEBUG
		//		/// <summary>
		//		/// This is how we can see a list of contentTypes (used to generate the attrs for this class)
		//		/// </summary>
		//		[Import]
		//		internal IContentTypeRegistryService ContentTypeRegistryService { get; set; }
		//#endif

		[ImportingConstructor]
		public Client(
			[Import(typeof(Microsoft.VisualStudio.Shell.SVsServiceProvider))] IServiceProvider serviceProvider,
			ISessionService sessionService,
			IEventAggregator eventAggregator,
			IBrowserServiceFactory browserServiceFactory,
			ISettingsServiceFactory settingsServiceFactory,
			IHttpClientService httpClientService)
			: base(serviceProvider, sessionService, eventAggregator, browserServiceFactory, settingsServiceFactory, httpClientService, Log) {
		}

		public string Name => Application.Name;
		public IEnumerable<string> ConfigurationSections => null;
		public object InitializationOptions {
			get {
				return InitializationOptionsBase;
			}
		}

		public IEnumerable<string> FilesToWatch => null;

		public object MiddleLayer => null;
		//// MiddleLayer2017Provider.Instance;

		//private class MiddleLayer2017Provider {
		//	internal readonly static MiddleLayer2017Provider Instance = new MiddleLayer2017Provider();
		//	private MiddleLayerProvider _middleLayerProvider;
		//	private MiddleLayer2017Provider() {
		//		_middleLayerProvider = new MiddleLayerProvider(Log);
		//	}

		//	public bool CanHandle(string methodName) => _middleLayerProvider.CanHandle(methodName);

		//	public Task HandleNotificationAsync(string methodName, JToken methodParam, Func<JToken, Task> sendNotification) {
		//		return _middleLayerProvider.HandleNotificationAsync(methodName, methodParam, sendNotification);
		//	}

		//	public Task<JToken> HandleRequestAsync(string methodName, JToken methodParam, Func<JToken, Task<JToken>> sendRequest) {
		//		return _middleLayerProvider.HandleRequestAsync(methodName, methodParam, sendRequest);
		//	}

		//	public Task<SymbolInformation[]> RequestWorkspaceSymbols(WorkspaceSymbolParams param, Func<WorkspaceSymbolParams, Task<SymbolInformation[]>> sendRequest) {
		//		throw new NotImplementedException();
		//	}
		//}

		public object CustomMessageTarget {
			get {
				return CustomMessageTargetBase;
			}
		}

		public async Task<Connection> ActivateAsync(CancellationToken token) {
			await System.Threading.Tasks.Task.Yield();
			Connection connection = null;
			try {
				var settingsManager = SettingsServiceFactory.GetOrCreate(nameof(Client));
				var process = LanguageServerProcess.Create(settingsManager, HttpClientService);

				using (Log.CriticalOperation($"Started language server process. FileName={process.StartInfo.FileName} Arguments={process.StartInfo.Arguments}", Serilog.Events.LogEventLevel.Information)) {
					if (process.Start()) {
						connection = new Connection(process.StandardOutput.BaseStream, process.StandardInput.BaseStream);
					}
					else {
						Log.Warning("Could not start process");
					}
				}
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(ActivateAsync));
			}

			return connection;
		}

		public override async Task RestartAsync() {
			await StartStopRestartAsync(true);
		}

		private async Task StartStopRestartAsync(bool isReload) {
			try {
				if (isReload) {
					isReloading = true;
				}
				OnStopping();
				await StopAsync?.InvokeAsync(this, EventArgs.Empty);
				OnStopped();
				await StartAsync?.InvokeAsync(this, EventArgs.Empty);

				var componentModel = ServiceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
				Assumes.Present(componentModel);

				var agentService = componentModel.GetService<ICodeStreamAgentService>();
				await agentService.ReinitializeAsync();

				Interlocked.Exchange(ref _state, 1);
				Log.Debug($"SetState={_state}");
			}
			catch (NullReferenceException ex) {
				Log.LocalWarning(ex?.Message);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(StartStopRestartAsync));
			}
			finally {
				if (isReload) {
					isReloading = false;
				}
			}
			await Task.CompletedTask;
		}

		public async Task OnLoadedAsync() {
			try {
				var prefix = $"{nameof(OnLoadedAsync)}";
				using (Log.CriticalOperation(prefix)) {
					// ReSharper disable once PossibleNullReferenceException
					await StartAsync?.InvokeAsync(this, EventArgs.Empty);
					Log.Verbose($"{prefix} StartAsync done");
					_hasStartedOnce = true;
					Interlocked.Exchange(ref _state, 1);

					if (_solutionEventListener == null) {
						var componentModel = ServiceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
						Log.Verbose($"{prefix} componentModel isNull={componentModel == null}");
						Assumes.Present(componentModel);
						Log.Verbose($"{prefix} componentModel present");

						_solutionEventListener = componentModel.GetService<ISolutionEventsListener>();
						Log.Verbose($"{prefix} _solutionEventListener isNull={_solutionEventListener == null}...");
						_solutionEventListener.Closed += SolutionOrFolder_Closed;
						_solutionEventListener.Opened += SolutionOrFolder_Opened;
						Log.Verbose($"{prefix} {nameof(_solutionEventListener)} present");
					}
				}
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(OnLoadedAsync));
			}
		}

		public async System.Threading.Tasks.Task AttachForCustomMessageAsync(JsonRpc rpc) {
			await System.Threading.Tasks.Task.Yield();
			_rpc = rpc;

			// Slight hack to use camelCased properties when serializing requests
			_rpc.JsonSerializer.ContractResolver = new CustomCamelCasePropertyNamesContractResolver(new HashSet<Type> { typeof(TelemetryProperties) });
			_rpc.JsonSerializer.NullValueHandling = NullValueHandling.Ignore;

			await OnAttachedForCustomMessageAsync();
			Log.Debug(nameof(AttachForCustomMessageAsync));
		}

		public async System.Threading.Tasks.Task OnServerInitializedAsync() {
			try {
				using (Log.CriticalOperation($"{nameof(OnServerInitializedAsync)}", Serilog.Events.LogEventLevel.Debug)) {
					_rpc.Disconnected += Rpc_Disconnected;

					var componentModel = ServiceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
					Assumes.Present(componentModel);
					await OnServerInitializedBaseAsync(_rpc, componentModel);
				}
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(OnServerInitializedAsync));
				throw;
			}
			await System.Threading.Tasks.Task.CompletedTask;
		}

		private void Rpc_Disconnected(object sender, JsonRpcDisconnectedEventArgs e) {
			base.OnRpcDisconnected(e);
		}

		public System.Threading.Tasks.Task OnServerInitializeFailedAsync(Exception ex) {
			if (_hasStartedOnce) {
				Log.Warning(ex, nameof(OnServerInitializeFailedAsync));
			}
			else {
				Log.Fatal(ex, nameof(OnServerInitializeFailedAsync));
			}

			return System.Threading.Tasks.Task.FromResult(0);
		}

		private readonly object locker = new object();
		ProjectType projectType;
		private void SolutionOrFolder_Opened(object sender, HostOpenedEventArgs e) {
			projectType = e.ProjectType;

			if (projectType == ProjectType.Folder) return;
			if (_state == 0) {
				lock (locker) {
					if (_state == 0) {
						try {
							using (Log.CriticalOperation($"{nameof(SolutionOrFolder_Opened)}")) {
								Microsoft.VisualStudio.Shell.ThreadHelper.JoinableTaskFactory.RunAsync(async () => {
									// there's a bug in the MS LanguageServer code that creates
									// an object disposed exception on the rpc object when
									// a folder is opened after a solution (and the solutionClose triggered a StopAsync)
									// so for now, solution closing won't trigger a LanguageServer Client Stop, it will stop/start
									// when _another_ solution has opened
									await RestartAsync();
								});
							}
						}
						catch (Exception ex) {
							Log.Error(ex, nameof(SolutionOrFolder_Opened));
						}
					}
				}
			}
		}

		private void SolutionOrFolder_Closed(object sender, HostClosedEventArgs e) {
			try {
				if (projectType == ProjectType.Folder || e.ProjectType == ProjectType.Folder) return;

				if (_state == 1) {
					lock (locker) {
						if (_state == 1) {
							using (Log.CriticalOperation($"{nameof(SolutionOrFolder_Closed)}")) {
								// there's a bug in the MS LanguageServer code that creates
								// an object disposed exception on the rpc object when
								// a folder is opened after a solution (and the solutionClose triggered a StopAsync)
								Interlocked.Exchange(ref _state, 0);
								Log.Debug($"SetState={_state}");
							}
						}
					}
				}
			}
			finally {
				projectType = ProjectType.Unknown;
			}
		}

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed) return;

			if (disposing) {
				if (_rpc != null) {
					_rpc.Disconnected -= Rpc_Disconnected;
				}

				var disposable = CustomMessageTarget as IDisposable;
				disposable?.Dispose();

				if (_solutionEventListener != null) {
					_solutionEventListener.Closed -= SolutionOrFolder_Closed;
					_solutionEventListener.Opened -= SolutionOrFolder_Opened;
				}
				_state = 0;
				_hasStartedOnce = false;
			}

			_disposed = true;
		}
	}
}
