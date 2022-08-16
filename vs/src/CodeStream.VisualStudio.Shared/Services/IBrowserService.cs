using System.Threading.Tasks;
using System.Windows;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Services {
	public interface IBrowserService {
		Task InitializeAsync();
		/// <summary>
		/// Sends the string to the web view
		/// </summary>
		/// <param name="message"></param>
		void PostMessage(string message, bool canEnqueue = false);
		/// <summary>
		/// Object to be JSON-serialized before sending to the webview
		/// </summary>
		/// <param name="message"></param>
		void PostMessage(IAbstractMessageType message, bool canEnqueue = false);
		void LoadHtml(string html);
		void AddWindowMessageEvent(WindowMessageHandler messageHandler);
		/// <summary>
		/// Attaches the control to the parent element
		/// </summary>
		/// <param name="frameworkElement"></param>
		void AttachControl(FrameworkElement frameworkElement);
		/// <summary>
		/// Loads the webview
		/// </summary>
		void LoadWebView();
		/// <summary>
		/// waiting / loading / pre-LSP page
		/// </summary>
		void LoadSplashView();
		/// <summary>
		/// Reloads the webview completely
		/// </summary>
		void ReloadWebView();
		/// <summary>
		/// Gets the url for the dev tools
		/// </summary>
		/// <returns></returns>
		string GetDevToolsUrl();

		int QueueCount { get; }

		void Send(IRequestType message);
		void Send(IAbstractMessageType message);
		void Notify<T>(INotificationType<T> message);
		Task NotifyAsync<T>(INotificationType<T> message);
		void EnqueueNotification<T>(INotificationType<T> message);
		T GetItem<T>(string name);
		void SetIsReloading();
		void SetZoomInBackground(double zoomPercentage);
	}
}
