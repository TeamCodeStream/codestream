using Microsoft.VisualStudio.Shell;
using System;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.ComponentModelHost;
using Serilog;
using CodeStream.VisualStudio.Vsix.x64;

namespace CodeStream.VisualStudio.Shared.Commands
{
	internal sealed class WebViewReloadCommand : VsCommandBase
	{
		private static readonly ILogger Log = LogManager.ForContext<WebViewReloadCommand>();
		private readonly ISessionService _sessionService;

		public WebViewReloadCommand(ISessionService sessionService)
			: base(PackageGuids.guidWebViewPackageCmdSet, PackageIds.WebViewReloadCommandId)
		{
			_sessionService = sessionService;
		}

		protected override void OnBeforeQueryStatus(OleMenuCommand sender, EventArgs e)
		{
			try
			{
				ThreadHelper.ThrowIfNotOnUIThread();
				Log.Verbose(nameof(WebViewReloadCommand) + " " + nameof(OnBeforeQueryStatus));
				sender.Visible = _sessionService?.IsReady == true;
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(WebViewReloadCommand));
			}
		}

		protected override void ExecuteUntyped(object parameter)
		{
			try
			{
				ThreadHelper.ThrowIfNotOnUIThread();
				Log.Verbose(nameof(WebViewReloadCommand) + " " + nameof(ExecuteUntyped));
				var componentModel =
					Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel;
				var browserService = componentModel?.GetService<IBrowserService>();

				browserService?.ReloadWebView();
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(WebViewReloadCommand));
			}
		}
	}
}
