using System.IO;
using System.IO.Pipes;
using StreamJsonRpc;

namespace CodeStream.VisualStudio.Services {
	public class CodeLensConnection {
		public JsonRpc Rpc;
		private readonly NamedPipeServerStream _stream;

		public CodeLensConnection(NamedPipeServerStream stream) {
			_stream = stream;
			Rpc = JsonRpc.Attach(_stream, this);
		}
	}
}
