using System.Threading.Tasks;
using System.Windows;

using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Services {
	public interface IBrowserService {
		Task InitializeAsync();
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
		void Send(IAbstractMessageType message);
		void Notify(INotificationType message);
		Task NotifyAsync(INotificationType message);
		void EnqueueNotification(INotificationType message);
		void SetZoomInBackground(double zoomPercentage);
	}
}
