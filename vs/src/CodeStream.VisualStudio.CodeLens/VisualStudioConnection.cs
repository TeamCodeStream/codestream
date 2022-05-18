using System;
using System.IO;
using System.IO.Pipes;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using StreamJsonRpc;

namespace CodeStream.VisualStudio.CodeLens {
	public class VisualStudioConnection : IRemoteCodeLens {

		private readonly NamedPipeClientStream _stream;
		private readonly CodeLevelMetricDataPoint _owner;
		public JsonRpc Rpc;

		public VisualStudioConnection(CodeLevelMetricDataPoint owner, NamedPipeClientStream stream) {
			_owner = owner;
			_stream = stream;
		}

		public async Task ConnectAsync(CancellationToken cancellationToken) {
			await _stream.ConnectAsync(cancellationToken).ConfigureAwait(false);
			Rpc = JsonRpc.Attach(_stream, this);
		}

		public void Refresh() {
			_owner.Refresh();
		}
	}
}
