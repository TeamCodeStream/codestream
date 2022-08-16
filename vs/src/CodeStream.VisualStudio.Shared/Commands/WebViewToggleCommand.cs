using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using CodeStream.VisualStudio.Shared.Packages;

#if X86
	using CodeStream.VisualStudio.Vsix.x86;
#else
	using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands {
	internal sealed class WebViewToggleCommand : VsCommandBase {
		private static readonly ILogger Log = LogManager.ForContext<WebViewToggleCommand>();
		public WebViewToggleCommand() : base(PackageGuids.guidWebViewPackageCmdSet, PackageIds.WebViewToggleCommandId) { }

		protected override void ExecuteUntyped(object parameter) {
			ThreadHelper.ThrowIfNotOnUIThread();
			try {
				Log.Verbose(nameof(WebViewToggleCommand) + " " + nameof(ExecuteUntyped));

				var toolWindowProvider = Package.GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
				var result = toolWindowProvider?.ToggleToolWindowVisibility(Guids.WebViewToolWindowGuid);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(WebViewToggleCommand));
			}
		}
	}
}
