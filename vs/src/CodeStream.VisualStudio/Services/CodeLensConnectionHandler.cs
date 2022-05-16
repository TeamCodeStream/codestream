using System;
using System.Diagnostics;
using System.IO.Pipes;
using System.Linq;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using StreamJsonRpc;

using CodeLensConnections = System.Collections.Concurrent.ConcurrentDictionary<System.Guid, CodeStream.VisualStudio.Services.CodeLensConnectionHandler>;

namespace CodeStream.VisualStudio.Services {
	public class CodeLensConnectionHandler : IRemoteVisualStudio, IDisposable {

		private static readonly CodeLensConnections Connections = new CodeLensConnections();
		private JsonRpc _rpc;
		private Guid? _dataPointId;

		public static async Task AcceptCodeLensConnectionsAsync() {
			while (true) {
				var stream = new NamedPipeServerStream(
					PipeName.Get(Process.GetCurrentProcess().Id),
					PipeDirection.InOut,
					NamedPipeServerStream.MaxAllowedServerInstances,
					PipeTransmissionMode.Byte,
					PipeOptions.Asynchronous);

				await stream.WaitForConnectionAsync().ConfigureAwait(false);

				HandleConnection(stream);
			}
		}

		private static void HandleConnection(NamedPipeServerStream stream) {
			var handler = new CodeLensConnectionHandler();
			var rpc = JsonRpc.Attach(stream, handler);
			handler._rpc = rpc;
			stream.Dispose();
		}

		public static async Task RefreshCodeLensDataPointAsync(Guid id) {
			if (!Connections.TryGetValue(id, out var connectionHandler)) {
				throw new InvalidOperationException($"CodeLens data point {id} was not registered.");
			}

			await connectionHandler._rpc.InvokeAsync(nameof(IRemoteCodeLens.Refresh)).ConfigureAwait(false);
		}

		public static async Task RefreshAllCodeLensDataPointsAsync()
			=> await Task.WhenAll(Connections.Keys.Select(RefreshCodeLensDataPointAsync)).ConfigureAwait(false);

		public void Dispose() {
			if (_dataPointId.HasValue) {
				_ = Connections.TryRemove(_dataPointId.Value, out _);
			}
		}

		public void RegisterCodeLensDataPoint(Guid codeLensId) {
			_dataPointId = codeLensId;
			Connections[codeLensId] = this;
		}
	}
}
