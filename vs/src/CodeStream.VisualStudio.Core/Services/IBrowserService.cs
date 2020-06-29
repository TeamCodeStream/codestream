using System.Threading.Tasks;
using System.Windows;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Core.Services {
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
		void Notify(INotificationType message);
		Task NotifyAsync(INotificationType message);
		void EnqueueNotification(INotificationType message);
		T GetItem<T>(string name);
		void SetIsReloading();
		void SetZoomInBackground(double zoomPercentage);
	}
}
