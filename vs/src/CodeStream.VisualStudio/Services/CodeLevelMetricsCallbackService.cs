using System;
using System.Collections.Concurrent;
using System.ComponentModel.Composition;
using System.Diagnostics;
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
using CodeStream.VisualStudio.Core.Extensions;
using Microsoft;

namespace CodeStream.VisualStudio.Services {

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

		public async Task<string> GetTelemetryAsync(string codeNamespace, string functionName) {
			var settings = _settingsServiceFactory.GetOrCreate(nameof(CodeLevelMetricsCallbackService));
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
			var solution = _vsSolution.GetSolutionFile();

			//example: "avg duration: ${averageDuration} | throughput: ${throughput} | error rate: ${errorsPerMinute} - since ${since}"
			var formatString = settings.GoldenSignalsInEditorFormat.ToLower();
			var includeThroughput = formatString.Contains("${throughput}");
			var includeAverageDuration = formatString.Contains("${averageduration}");
			var includeErrorRate = formatString.Contains("${errorsperminute}");

			try {
				var metrics = await _codeStreamAgentService.GetFileLevelTelemetryAsync(
					solution,
					"csharp",
					false,
					codeNamespace,
					functionName,
					includeThroughput,
					includeAverageDuration,
					includeErrorRate
				);

				var throughput = metrics.Throughput.FirstOrDefault(x => $"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase($"{codeNamespace}.{functionName}"))?.RequestsPerMinute;
				var errors = metrics.ErrorRate.FirstOrDefault(x => $"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase($"{codeNamespace}.{functionName}"))?.ErrorsPerMinute;
				var avgDuration = metrics.AverageDuration.FirstOrDefault(x => $"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase($"{codeNamespace}.{functionName}"))?.AverageDuration;

				var formatted = formatString
					.Replace("${throughput}", throughput is null ? "n/a" : $"{throughput.ToFixed(3)}rpm")
					.Replace("${averageduration}", avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms")
					.Replace("${errorsperminute}", errors is null ? "n/a" : $"{errors.ToFixed(3)}epm")
					.Replace("${since}", metrics.SinceDateFormatted);

				return formatted;
			}
			catch (Exception ex) {
				Log.Error(ex, "Something happened");
				return ex.Message;
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

			if (!settings.ShowGoldenSignalsInEditor) {
				return CodeLevelMetricStatus.Disabled;
			}

			return CodeLevelMetricStatus.Ready;
		}

		public int GetVisualStudioPid() => Process.GetCurrentProcess().Id;

		public async Task InitializeRpcAsync(string dataPointId) {
			try {
				var stream = new NamedPipeServerStream(
					PipeName.Get(Process.GetCurrentProcess().Id),
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

		public static async Task RefreshCodeLensDataPointAsync(string dataPointId) {
			if (!Connections.TryGetValue(dataPointId, out var connectionHandler)) {
				throw new InvalidOperationException($"CodeLens data point {dataPointId} was not registered.");
			}

			await connectionHandler.Rpc.InvokeAsync(nameof(IRemoteCodeLens.Refresh)).ConfigureAwait(false);
		}

		public static async Task RefreshAllCodeLensDataPointsAsync()
			=> await Task
				.WhenAll(Connections.Keys.Select(RefreshCodeLensDataPointAsync))
				.ConfigureAwait(false);
	}
}
