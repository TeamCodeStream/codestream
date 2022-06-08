using System;
using System.Collections.Concurrent;
using System.ComponentModel.Composition;
using System.IO.Pipes;
using System.Linq;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Utilities;
using Serilog;
using System.Reactive.Concurrency;
using System.Reactive.Linq;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Task = System.Threading.Tasks.Task;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared.Enums;
using CodeStream.VisualStudio.Shared.Interfaces;
using CodeStream.VisualStudio.Shared.Models;
using Constants = CodeStream.VisualStudio.Shared.Constants;
using Process = System.Diagnostics.Process;

namespace CodeStream.VisualStudio.Services {

	/// <summary>
	/// Service gets injected into the CodeLensProvider in the OOP service and allows the CodeLens datapoints to communicate
	/// back to Visual Studio.
	/// </summary>
	[Export(typeof(ICodeLensCallbackListener))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	[ContentType("CSharp")]
	public class CodeLevelMetricsCallbackService : ICodeLensCallbackListener, ICodeLevelMetricsCallbackService {
		private static readonly ILogger Log = LogManager.ForContext<CodeLevelMetricsCallbackService>();

		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;
		private readonly ISettingsServiceFactory _settingsServiceFactory;

		public static readonly ConcurrentDictionary<string, CodeLensConnection> Connections = new ConcurrentDictionary<string, CodeLensConnection>();
		private readonly IVsSolution _vsSolution;

		[ImportingConstructor]
		public CodeLevelMetricsCallbackService(
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService,
			ISettingsServiceFactory settingsServiceFactory,
			IEventAggregator eventAggregator,
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) {
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;
			_settingsServiceFactory = settingsServiceFactory;

			eventAggregator.GetEvent<SessionReadyEvent>()
				.ObserveOn(Scheduler.Default)
				.Subscribe(e => {
					_ = RefreshAllCodeLensDataPointsAsync();
				});

			eventAggregator.GetEvent<SessionLogoutEvent>()
				.ObserveOn(Scheduler.Default)
				.Subscribe(e => {
					_ = RefreshAllCodeLensDataPointsAsync();
				});

			_vsSolution = serviceProvider.GetService(typeof(SVsSolution)) as IVsSolution;
		}

		public string GetEditorFormat() {
			var settings = _settingsServiceFactory.GetOrCreate(nameof(CodeLevelMetricsCallbackService));
			return settings.GoldenSignalsInEditorFormat;
		}

		public async Task<GetFileLevelTelemetryResponse> GetTelemetryAsync(string codeNamespace, string functionName) {
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
			var solution = _vsSolution.GetSolutionFile();

			//example: "avg duration: ${averageDuration} | throughput: ${throughput} | error rate: ${errorsPerMinute} - since ${since}"
			var formatString = GetEditorFormat().ToLower();
			var includeThroughput = formatString.Contains(Constants.CodeLevelMetrics.Tokens.Throughput);
			var includeAverageDuration = formatString.Contains(Constants.CodeLevelMetrics.Tokens.AverageDuration);
			var includeErrorRate = formatString.Contains(Constants.CodeLevelMetrics.Tokens.ErrorsPerMinute);

			try {
				return await _codeStreamAgentService.GetFileLevelTelemetryAsync(
					solution,
					"csharp",
					false,
					codeNamespace,
					functionName,
					includeThroughput,
					includeAverageDuration,
					includeErrorRate
				);
			}
			catch (Exception ex) {
				Log.Error(ex, $"Unable to obtain CLM for {codeNamespace}.{functionName}");
				return new GetFileLevelTelemetryResponse();
			}
		}

		public CodeLevelMetricStatus GetClmStatus() {
			var settings = _settingsServiceFactory.GetOrCreate(nameof(CodeLevelMetricsCallbackService));

			if (!_sessionService.IsAgentReady || _sessionService.SessionState == SessionState.UserSigningIn) {
				return CodeLevelMetricStatus.Loading;
			}

			if (_sessionService.SessionState != SessionState.UserSignedIn) {
				return CodeLevelMetricStatus.SignInRequired;
			}

			return CodeLevelMetricStatus.Ready;
		}

		public int GetVisualStudioPid() => Process.GetCurrentProcess().Id;

		public async Task InitializeRpcAsync(string dataPointId) {
			try {
				var stream = new NamedPipeServerStream(
					RpcPipeNames.ForCodeLens(Process.GetCurrentProcess().Id),
					PipeDirection.InOut,
					NamedPipeServerStream.MaxAllowedServerInstances,
					PipeTransmissionMode.Byte,
					PipeOptions.Asynchronous);

				await stream.WaitForConnectionAsync().ConfigureAwait(false);

				var connection = new CodeLensConnection(stream);
				Connections[dataPointId] = connection;
			}
			catch (Exception ex) {
				Log.Error(ex, "Unable to bind CallbackService and RPC");
			}
		}

		/// <summary>
		/// Refresh a SPECIFIC CodeLens datapoint through RPC
		/// </summary>
		public static async Task RefreshCodeLensDataPointAsync(string dataPointId) {
			if (!Connections.TryGetValue(dataPointId, out var connectionHandler)) {
				throw new InvalidOperationException($"CodeLens data point {dataPointId} was not registered.");
			}

			await connectionHandler.Rpc.InvokeAsync(nameof(IRemoteCodeLens.Refresh)).ConfigureAwait(false);
		}

		/// <summary>
		/// All RPC connections to the CodeLens datapoints are tracked, therefore
		/// we can trigger them ALL to refresh using this.
		/// </summary>
		public static async Task RefreshAllCodeLensDataPointsAsync()
			=> await Task
				.WhenAll(Connections.Keys.Select(RefreshCodeLensDataPointAsync))
				.ConfigureAwait(false);
	}
}
