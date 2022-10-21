using System;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Services;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Models {
	public class IpcScope : IDisposable {
		private bool _disposed;
		private readonly IBrowserService _browserService;
		private WebviewIpcMessage _message;

		public IpcScope(IBrowserService browserService, WebviewIpcMessage message) {
			if (_disposed)
			{
				throw new ObjectDisposedException($"{nameof(IpcScope)}");
			}

			_browserService = browserService;
			_message = new WebviewIpcMessage(message.Id);
		}

		/// <summary>
		/// Creates a scope, that if not completed, sends a generic response message
		/// </summary>
		/// <param name="ipc"></param>
		/// <param name="message"></param>
		/// <returns></returns>
		public static IpcScope Create(IBrowserService ipc, WebviewIpcMessage message) => new IpcScope(ipc, message);

		/// <summary>
		/// Attach additional data to the response message
		/// </summary>
		public void FulfillRequest(JToken @params, string errorMsg = null, ResponseError responseError = null) {
			if (_disposed)
			{
				throw new ObjectDisposedException($"{nameof(FulfillRequest)}");
			}

			if (errorMsg == null && responseError == null) {
				_message = new WebviewIpcMessage(_message.Id, null,@params, null);
				return;
			}

			_message = errorMsg != null
				? new WebviewIpcMessage(_message.Id, null, @params, new JValue(errorMsg))
				: new WebviewIpcMessage(_message.Id, null, @params, responseError.ToJToken());
		}

		/// <summary>
		/// Attach an error, if any, to the response
		/// </summary>
		/// <param name="error"></param>
		public void FulfillRequest(string error) {
			if (_disposed)
			{
				throw new ObjectDisposedException($"{nameof(FulfillRequest)}");
			}

			if (error.IsNullOrWhiteSpace())
			{
				return;
			}

			_message = new WebviewIpcMessage(_message.Id, null, _message.Params, new JValue(error));
		}

		/// <summary>
		/// "Marker" to signify the scope is finished -- no additional data is required
		/// </summary>
		public void FulfillRequest() {
			if (_disposed)
			{
				throw new ObjectDisposedException($"{nameof(FulfillRequest)}");
			}
		}

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed)
			{
				return;
			}

			if (disposing) {
				_browserService.Send(_message);
			}

			_disposed = true;
		}
	}
}
