using System.IO.Pipes;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using CodeStream.VisualStudio.Shared.Interfaces;
using StreamJsonRpc;

namespace CodeStream.VisualStudio.CodeLens {

	/// <summary>
	/// Sets up RPC communication between the CodeLens provider and Visual Studio
	/// </summary>
	/// <remarks>
	/// This would slightly make more sense in the Shared project, but since it needs the
	/// CodeLevelMetricsDataPoint class to coordinate the Owner, it has to stay here.
	/// </remarks>
	public class VisualStudioConnection : IRemoteCodeLens {

		private readonly NamedPipeClientStream _stream;
		private readonly CodeLevelMetricDataPoint _owner;
		public JsonRpc Rpc;

		public VisualStudioConnection(CodeLevelMetricDataPoint owner, int vsPid) {
			_owner = owner;
			_stream = new NamedPipeClientStream(
				serverName: ".",
				RpcPipeNames.ForCodeLens(vsPid),
				PipeDirection.InOut,
				PipeOptions.Asynchronous);
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
