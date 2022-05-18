using System;
using System.Collections.Concurrent;
using System.ComponentModel.Composition;
using System.Diagnostics;
using System.IO.Pipes;
using System.Linq;
using System.Threading.Tasks;
using CodeStream.VisualStudio.CodeLens;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Utilities;
using Serilog;

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

		[ImportingConstructor]
		public CodeLevelMetricsCallbackService(
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService,
			ISettingsServiceFactory settingsServiceFactory) {
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;
			_settingsServiceFactory = settingsServiceFactory;
		}

		public bool IsClmReady() {
			var settings = _settingsServiceFactory.GetOrCreate(nameof(CodeLevelMetricsCallbackService));

			return settings.ShowGoldenSignalsInEditor && _sessionService.IsReady;
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

				//stream.BeginWaitForConnection(ar => {
					var connection = new CodeLensConnection(stream);
					Connections[dataPointId] = connection;
				//}, dataPointId);
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
