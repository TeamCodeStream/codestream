using System;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;

#if X86
	using CodeStream.VisualStudio.Vsix.x86;
#else
	using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands {
	internal class WebViewDevToolsCommand : VsCommandBase {
		private static readonly ILogger Log = LogManager.ForContext<WebViewDevToolsCommand>();

		public WebViewDevToolsCommand() : base(PackageGuids.guidWebViewPackageCmdSet, PackageIds.WebViewDevToolsCommandId) { }
		protected override void ExecuteUntyped(object parameter) {
			ThreadHelper.ThrowIfNotOnUIThread();
			try {
				Log.Verbose(nameof(WebViewDevToolsCommand) + " " + nameof(ExecuteUntyped));
				var componentModel = Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel;
				var browserService = componentModel?.GetService<IBrowserService>();
				var url = browserService?.GetDevToolsUrl();
				if (url != null) {
					System.Diagnostics.Process.Start("chrome.exe", url);
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(WebViewDevToolsCommand));
			}

		}
	}
}
