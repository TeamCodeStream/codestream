using System;
using System.Diagnostics;
using System.IO.Pipes;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using StreamJsonRpc;

namespace CodeStream.VisualStudio {
	public class CodeLevelMetricsConnectionHandler : IRemoteVisualStudio, IDisposable {

		private JsonRpc _rpc;

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

		private static void HandleConnection(NamedPipeServerStream stream)
		{
			var handler = new CodeLevelMetricsConnectionHandler();
			var rpc = JsonRpc.Attach(stream, handler);
			handler._rpc = rpc;
			handler.Dispose();
			stream.Dispose();
		}

		public void Dispose()
		{
			_rpc.Dispose();
		}
	}
}
