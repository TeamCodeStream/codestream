using System.IO.Pipes;
using StreamJsonRpc;

namespace CodeStream.VisualStudio.Shared.Models {

	/// <summary>
	/// Responsible for handling the connections from Visual Studio down to the CodeLens provider
	/// </summary>
	public class CodeLensConnection {
		public JsonRpc Rpc;
		private readonly NamedPipeServerStream _stream;

		public CodeLensConnection(NamedPipeServerStream stream) {
			_stream = stream;
			Rpc = JsonRpc.Attach(_stream, this);
		}
	}
}
