using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Services {
	public static class BrowserServiceExtensions {
		/// <summary>
		/// Creates a scope, that if not completed, sends a generic response message
		/// </summary>
		/// <param name="ipc"></param>
		/// <param name="message"></param>
		/// <returns></returns>
		public static IpcScope CreateScope(this IBrowserService ipc, WebviewIpcMessage message) => IpcScope.Create(ipc, message);
	}
}
