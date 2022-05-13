using System;
using System.IO.Pipes;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using StreamJsonRpc;

namespace CodeStream.VisualStudio.CodeLens {
	public class VisualStudioConnectionHandler : IRemoteCodeLens, IDisposable {

		private readonly CodeLevelMetricDataPoint _owner;
		private readonly NamedPipeClientStream _stream;
		private JsonRpc _rpc;

		public static async Task<VisualStudioConnectionHandler> CreateAsync(CodeLevelMetricDataPoint owner, int vsPid) {
			var handler = new VisualStudioConnectionHandler(owner, vsPid);
			await handler.ConnectAsync().ConfigureAwait(false);
			return handler;
		}

		public VisualStudioConnectionHandler(CodeLevelMetricDataPoint owner, int vsPid) {
			this._owner = owner;
			_stream = new NamedPipeClientStream(
				serverName: ".",
				PipeName.Get(vsPid),
				PipeDirection.InOut,
				PipeOptions.Asynchronous);
		}

		public async Task ConnectAsync() {
			await _stream.ConnectAsync().ConfigureAwait(false);
			_rpc = JsonRpc.Attach(_stream, this);
			//await rpc.InvokeAsync(nameof(IRemoteVisualStudio.RegisterCodeLensDataPoint), owner.id).Caf();
		}

		public void Dispose()
		{
			_stream.Dispose();
		}
	}
}
